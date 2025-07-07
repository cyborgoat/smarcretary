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
    // Public TURN server for testing (remove for production or use your own)
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  ],
}

export function useWebRTC(
  userName: string,
  sendJsonMessage: (message: object) => void,
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const screenShareStreamRef = useRef<MediaStream | null>(null)
  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices.getDisplayMedia) {
      setError("Screen sharing is not supported in this browser.");
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenShareStreamRef.current = screenStream;
      setIsScreenSharing(true);
      // Replace video track in local stream and all peer connections
      const screenTrack = screenStream.getVideoTracks()[0];
      if (localStreamRef.current) {
        const sender = Array.from(peersRef.current.values()).flatMap(peer => peer.getSenders()).find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
        // Replace local video for self
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream([...localStreamRef.current.getAudioTracks(), screenTrack]));
      }
      // Listen for screen share end
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      // Only show error if user did not cancel (AbortError or NotAllowedError with empty message)
      if (
        err &&
        ((err instanceof DOMException && (err.name === 'AbortError' || (err.name === 'NotAllowedError' && (!err.message || err.message === '')))) ||
         (err instanceof Error && err.name === 'AbortError'))
      ) {
        // User cancelled, do not show error
        return;
      }
      setError("Failed to start screen sharing: " + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (!isScreenSharing) return;
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
      screenShareStreamRef.current = null;
    }
    setIsScreenSharing(false);
    // Restore camera video track
    navigator.mediaDevices.getUserMedia({ video: true }).then(camStream => {
      const camTrack = camStream.getVideoTracks()[0];
      if (localStreamRef.current) {
        const sender = Array.from(peersRef.current.values()).flatMap(peer => peer.getSenders()).find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(camTrack);
        }
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(oldTrack);
        localStreamRef.current.addTrack(camTrack);
        setLocalStream(new MediaStream([...localStreamRef.current.getAudioTracks(), camTrack]));
      }
    });
  }, [isScreenSharing]);

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const negotiationInProgressRef = useRef<Map<string, boolean>>(new Map())
  // Map to store pending ICE candidates for each peer
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  // Map to store pending answers for each peer
  const pendingAnswerRef = useRef<Map<string, RTCSessionDescriptionInit[]>>(new Map())

  // Polite peer logic: assign polite/impolite role per peer
  // Returns true if current user is polite with respect to peerId/peerName
  const isPoliteWith = useCallback((peerName: string) => {
    // Lexicographical order: lower name is polite
    return userName < peerName
  }, [userName])

  // Track if we are making an offer for each peer
  const makingOfferRef = useRef<Map<string, boolean>>(new Map())
  // Track if we are ignoring offers due to collision
  const ignoreOfferRef = useRef<Map<string, boolean>>(new Map())

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
          // Only add track if not already added
          const hasSender = peer.getSenders().some(sender => sender.track && sender.track.id === track.id);
          if (!hasSender) {
            peer.addTrack(track, stream);
          }
        });
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

      // Add connection state logging for debugging
      peer.onconnectionstatechange = () => {
        console.log(`Peer ${peerId} connectionState:`, peer.connectionState)
      }
      peer.oniceconnectionstatechange = () => {
        console.log(`Peer ${peerId} iceConnectionState:`, peer.iceConnectionState)
      }
      peer.onsignalingstatechange = () => {
        console.log(`Peer ${peerId} signalingState:`, peer.signalingState)
        // If we have a queued answer and now in 'have-remote-offer', process it
        const pendingAnswers = pendingAnswerRef.current.get(peerId) || []
        if (peer.signalingState === "have-remote-offer" && pendingAnswers.length > 0) {
          const answerSDP = pendingAnswers.shift()
          if (answerSDP) {
            (async () => {
              try {
                console.log(`[WebRTC] Processing queued answer for ${peerId} in signalingState:`, peer.signalingState)
                await peer.setLocalDescription(answerSDP)
                sendJsonMessage({ type: "answer", sdp: peer.localDescription, targetId: peerId, senderId: "current-user" })
              } catch (e) {
                console.warn("[WebRTC] Error setting queued local answer:", e)
              }
            })()
          }
          pendingAnswerRef.current.set(peerId, pendingAnswers)
        }
      }

      peer.ontrack = (event) => {
        setParticipants((prevParticipants) => {
          const existingParticipant = prevParticipants.find((p) => p.id === peerId)
          if (existingParticipant) {
            // Always update stream if changed
            if (existingParticipant.stream !== event.streams[0]) {
              return prevParticipants.map((p) =>
                p.id === peerId ? { ...p, stream: event.streams[0] } : p,
              )
            }
            return prevParticipants
          } else {
            // Add new participant with stream
            return [
              ...prevParticipants,
              { id: peerId, name: peerName, isMuted: false, isVideoOn: true, stream: event.streams[0] },
            ]
          }
        })
      }

      // Polite peer: listen for negotiationneeded
      peer.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current.set(peerId, true)
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          sendJsonMessage({ type: "offer", sdp: peer.localDescription, targetId: peerId, senderId: "current-user" })
        } catch (e) {
          console.warn("Negotiation needed error:", e)
        } finally {
          makingOfferRef.current.set(peerId, false)
        }
      }

      // Add all local tracks ONCE, immediately after creating the peer connection
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
        createPeerConnection(senderId, senderName)
      }

      const peer = peersRef.current.get(senderId)
      if (!peer) {
        console.warn("Peer connection not found for senderId:", senderId)
        return
      }

      // Polite peer logic variables
      const polite = isPoliteWith(senderName)
      const makingOffer = makingOfferRef.current.get(senderId) || false

      try {
        if (type === "offer") {
          if (sdp) {
            const offerCollision =
              (makingOffer || peer.signalingState !== "stable")
            if (offerCollision) {
              if (!polite) {
                // Impolite peer ignores offer
                ignoreOfferRef.current.set(senderId, true)
                console.warn("Offer collision: impolite peer ignoring offer from", senderName)
                return
              }
              // Polite peer accepts offer, rollback if needed
              await peer.setLocalDescription({ type: "rollback" })
            }
            ignoreOfferRef.current.set(senderId, false)
            negotiationInProgressRef.current.set(senderId, true)
            await peer.setRemoteDescription(new RTCSessionDescription(sdp))
            // Wait until signalingState is 'have-remote-offer' before answering
            let waitCount = 0
            while (peer.signalingState !== "have-remote-offer" && waitCount < 10) {
              await new Promise(res => setTimeout(res, 10))
              waitCount++
            }
            if (peer.signalingState !== "have-remote-offer") {
              console.warn("Peer not in 'have-remote-offer' state after setRemoteDescription, skipping answer. Current state:", peer.signalingState)
              negotiationInProgressRef.current.set(senderId, false)
              return
            }
            // Add any pending ICE candidates
            const pending = pendingCandidatesRef.current.get(senderId) || []
            for (const c of pending) {
              try { await peer.addIceCandidate(new RTCIceCandidate(c)) } catch (e) { console.warn(e) }
            }
            pendingCandidatesRef.current.set(senderId, [])
            // Only call setLocalDescription(answer) if in correct state
            if (peer.signalingState === "have-remote-offer") {
              const answer = await peer.createAnswer()
              console.log(`[WebRTC] setLocalDescription(answer) for ${senderId} in signalingState:`, peer.signalingState)
              try {
                await peer.setLocalDescription(answer)
                sendJsonMessage({ type: "answer", sdp: peer.localDescription, targetId: senderId, senderId: "current-user" })
              } catch (e) {
                if (peer.signalingState !== "have-remote-offer") {
                  // Queue the answer for later
                  console.warn(`[WebRTC] setLocalDescription(answer) failed in state ${peer.signalingState}, queuing answer for ${senderId}`)
                  const pendingAnswers = pendingAnswerRef.current.get(senderId) || []
                  pendingAnswers.push(answer)
                  pendingAnswerRef.current.set(senderId, pendingAnswers)
                } else {
                  console.warn("[WebRTC] setLocalDescription(answer) error:", e)
                }
              }
            } else {
              console.warn("Not in 'have-remote-offer' state, skipping setLocalDescription(answer). Current state:", peer.signalingState)
            }
            negotiationInProgressRef.current.set(senderId, false)
          }
        } else if (type === "answer") {
          if (sdp) {
            if (peer.signalingState === "have-local-offer") {
              await peer.setRemoteDescription(new RTCSessionDescription(sdp))
              // Add any pending ICE candidates
              const pending = pendingCandidatesRef.current.get(senderId) || []
              for (const c of pending) {
                try { await peer.addIceCandidate(new RTCIceCandidate(c)) } catch (e) { console.warn(e) }
              }
              pendingCandidatesRef.current.set(senderId, [])
            } else {
              console.warn("Cannot set remote answer in signaling state:", peer.signalingState)
            }
          }
        } else if (type === "candidate") {
          if (candidate) {
            if (
              peer.remoteDescription && peer.remoteDescription.type &&
              peer.connectionState !== "closed" &&
              peer.signalingState !== "closed"
            ) {
              try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate))
              } catch (e) {
                console.warn("Error adding ICE candidate:", e)
              }
            } else {
              // Queue candidate until remote description is set or peer is open
              const pending = pendingCandidatesRef.current.get(senderId) || []
              pending.push(candidate)
              pendingCandidatesRef.current.set(senderId, pending)
            }
          }
        } else if (type === "participantJoined") {
          if (senderId !== "current-user") {
            setParticipants((prev) => {
              if (!prev.find((p) => p.id === senderId)) {
                return [...prev, { id: senderId, name: senderName, isMuted: false, isVideoOn: true }]
              }
              return prev
            })
            // Initiate offer to new participant (only if polite)
            const newPeer = createPeerConnection(senderId, senderName)
            if (isPoliteWith(senderName) && !negotiationInProgressRef.current.get(senderId)) {
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
          makingOfferRef.current.delete(senderId)
          ignoreOfferRef.current.delete(senderId)
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
    [createPeerConnection, sendJsonMessage, isPoliteWith],
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
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    toggleMute,
    toggleVideo,
    initializeMedia,
    cleanup,
    handleSignal,
  }
}
