"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface Participant {
  id: string
  name: string
  isMuted: boolean
  isVideoOn: boolean
  stream?: MediaStream
}

interface RTCSignalingMessage {
  type:
    | "offer"
    | "answer"
    | "candidate"
    | "participantJoined"
    | "participantLeft"
    | "toggleMute"
    | "toggleVideo"
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  senderId: string
  senderName: string
  targetId?: string // Only present when sending to a specific target
  isMuted?: boolean
  isVideoOn?: boolean
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
}

export function useWebRTC(
  roomId: string,
  userName: string,
  sendJsonMessage: (message: object) => void,
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const negotiationInProgressRef = useRef<Map<string, boolean>>(new Map())

  const initializeMedia = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      console.log("Requesting camera and microphone access...")
      
      // First check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser")
      }

      // Check if we're on HTTPS or localhost
      const isSecureContext = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1'
      
      if (!isSecureContext) {
        console.warn("Camera/microphone access requires HTTPS for remote connections")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      console.log("Media stream obtained successfully:", stream)
      console.log("Video tracks:", stream.getVideoTracks())
      console.log("Audio tracks:", stream.getAudioTracks())

      localStreamRef.current = stream
      setLocalStream(stream)
      setIsConnecting(false)

      // Add tracks to existing peers if they are already connected
      peersRef.current.forEach((peer) => {
        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream)
        })
      })
    } catch (err) {
      console.error("Error accessing media devices:", err)
      let errorMessage = "Failed to access camera/microphone. "
      
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage += "Permission denied. Please allow camera and microphone access and try again."
        } else if (err.name === "NotFoundError") {
          errorMessage += "No camera or microphone found. Please check your devices."
        } else if (err.name === "NotReadableError") {
          errorMessage += "Camera or microphone is already in use by another application."
        } else if (err.name === "OverconstrainedError") {
          errorMessage += "Camera or microphone constraints cannot be satisfied."
        } else {
          errorMessage += `Error: ${err.message}`
        }
      } else {
        errorMessage += "Please check permissions and try again."
      }
      
      // Add specific guidance for HTTPS
      const isSecureContext = window.location.protocol === 'https:' || 
                             window.location.hostname === 'localhost' || 
                             window.location.hostname === '127.0.0.1'
      
      if (!isSecureContext) {
        errorMessage += "\n\nNote: Camera/microphone access requires HTTPS for remote connections. Please access the app via HTTPS or localhost."
      }
      
      setError(errorMessage)
      setIsConnecting(false)
      throw err
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
        sendJsonMessage({ type: "toggleMute", senderId: "current-user", isMuted: !audioTrack.enabled })
      }
    }
  }, [sendJsonMessage])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)
        sendJsonMessage({ type: "toggleVideo", senderId: "current-user", isVideoOn: videoTrack.enabled })
      }
    }
  }, [sendJsonMessage])

  const createPeerConnection = useCallback(
    (peerId: string, peerName: string) => {
      const peer = new RTCPeerConnection(ICE_SERVERS)

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          sendJsonMessage({ type: "candidate", candidate: event.candidate, targetId: peerId, senderId: "current-user" })
        }
      }

      peer.ontrack = (event) => {
        setParticipants((prevParticipants) => {
          const existingParticipant = prevParticipants.find((p) => p.id === peerId)
          if (existingParticipant) {
            // Update existing participant's stream
            const newParticipants = prevParticipants.map((p) =>
              p.id === peerId ? { ...p, stream: event.streams[0] } : p,
            )
            return newParticipants
          } else {
            // Add new participant
            return [
              ...prevParticipants,
              { id: peerId, name: peerName, isMuted: false, isVideoOn: true, stream: event.streams[0] },
            ]
          }
        })
      }

      peer.onnegotiationneeded = async () => {
        if (negotiationInProgressRef.current.get(peerId)) {
          // Negotiation already in progress for this peer, skip
          return
        }
        negotiationInProgressRef.current.set(peerId, true)
        try {
          // Only create offer if signaling state is stable
          if (peer.signalingState !== "stable") {
            negotiationInProgressRef.current.set(peerId, false)
            return
          }
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          sendJsonMessage({ type: "offer", sdp: peer.localDescription, targetId: peerId, senderId: "current-user" })
        } catch (err) {
          console.error("Error creating offer:", err)
        } finally {
          negotiationInProgressRef.current.set(peerId, false)
        }
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          peer.addTrack(track, localStreamRef.current!)
        })
      }

      peersRef.current.set(peerId, peer)
      return peer
    },
    [sendJsonMessage],
  )

  const handleSignal = useCallback(
    async (signal: RTCSignalingMessage) => {
      const { type, sdp, candidate, senderId, senderName } = signal

      if (!peersRef.current.has(senderId) && senderId !== "current-user") {
        // Only create new peer connection if it doesn't exist and it's not self
        createPeerConnection(senderId, senderName)
      }

      const peer = peersRef.current.get(senderId)
      if (!peer) {
        console.warn("Peer connection not found for senderId:", senderId)
        return
      }

      try {
        if (type === "offer") {
          if (sdp) {
            // Only set remote description if signaling state allows
            if (peer.signalingState === "have-local-offer" || peer.signalingState === "stable") {
              negotiationInProgressRef.current.set(senderId, true)
              await peer.setRemoteDescription(new RTCSessionDescription(sdp))
              const answer = await peer.createAnswer()
              await peer.setLocalDescription(answer)
              sendJsonMessage({ type: "answer", sdp: peer.localDescription, targetId: senderId, senderId: "current-user" })
              negotiationInProgressRef.current.set(senderId, false)
            } else {
              console.warn("Cannot set remote offer in signaling state:", peer.signalingState)
            }
          }
        } else if (type === "answer") {
          if (sdp) {
            // Only set remote answer if signaling state allows
            if (peer.signalingState === "have-local-offer") {
              await peer.setRemoteDescription(new RTCSessionDescription(sdp))
            } else {
              console.warn("Cannot set remote answer in signaling state:", peer.signalingState)
            }
          }
        } else if (type === "candidate") {
          if (candidate) {
            await peer.addIceCandidate(new RTCIceCandidate(candidate))
          }
        } else if (type === "participantJoined") {
          if (senderId !== "current-user") {
            setParticipants((prev) => {
              if (!prev.find((p) => p.id === senderId)) {
                return [...prev, { id: senderId, name: senderName, isMuted: false, isVideoOn: true }]
              }
              return prev
            })
            // Initiate offer to new participant
            const newPeer = createPeerConnection(senderId, senderName)
            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => {
                newPeer.addTrack(track, localStreamRef.current!)
              })
            }
            if (!negotiationInProgressRef.current.get(senderId)) {
              negotiationInProgressRef.current.set(senderId, true)
              const offer = await newPeer.createOffer()
              await newPeer.setLocalDescription(offer)
              sendJsonMessage({ type: "offer", sdp: newPeer.localDescription, targetId: senderId, senderId: "current-user" })
              negotiationInProgressRef.current.set(senderId, false)
            }
          }
        } else if (type === "participantLeft") {
          setParticipants((prev) => prev.filter((p) => p.id !== senderId))
          peersRef.current.get(senderId)?.close()
          peersRef.current.delete(senderId)
          negotiationInProgressRef.current.delete(senderId)
        } else if (type === "toggleMute") {
          setParticipants((prev) =>
            prev.map((p) => (p.id === senderId ? { ...p, isMuted: signal.isMuted ?? p.isMuted } : p)),
          )
        } else if (type === "toggleVideo") {
          setParticipants((prev) =>
            prev.map((p) => (p.id === senderId ? { ...p, isVideoOn: signal.isVideoOn ?? p.isVideoOn } : p)),
          )
        }
      } catch (err) {
        console.error("Error handling signal:", err)
        negotiationInProgressRef.current.set(senderId, false)
      }
    },
    [createPeerConnection, sendJsonMessage],
  )

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      localStreamRef.current = null
      setLocalStream(null)
    }

    // Close all peer connections
    peersRef.current.forEach((peer, peerId) => {
      peer.close()
      negotiationInProgressRef.current.delete(peerId)
    })
    peersRef.current.clear()
    negotiationInProgressRef.current.clear()

    setParticipants([])
    setIsMuted(false)
    setIsVideoOn(true)
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    localStream,
    participants,
    isMuted,
    isVideoOn,
    isConnecting,
    error,
    toggleMute,
    toggleVideo,
    initializeMedia,
    cleanup,
    handleSignal,
  }
}
