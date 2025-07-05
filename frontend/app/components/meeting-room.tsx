"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Settings,
  MoreVertical,
  Share,
  AlertTriangle,
} from "lucide-react"
import { useWebRTC } from "../hooks/useWebRTC"
import { useSocket } from "../hooks/useSocket"
import { VideoThumbnail } from "@/components/ui/VideoThumbnail"
import MeetingSidebar from "./MeetingSidebar"

interface Message {
  id: string
  user: string
  content: string
  timestamp: Date
  userId: string
}


interface MeetingRoomProps {
  roomId: string
  userName: string
  onLeave: () => void
}

export default function MeetingRoom({ roomId, userName, onLeave }: MeetingRoomProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [activeTab, setActiveTab] = useState("chat")
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [participantVolumes, setParticipantVolumes] = useState<{ [id: string]: number }>({})
  const [mutedParticipants] = useState<{ [id: string]: boolean }>({})
  const [showNetworkInfo, setShowNetworkInfo] = useState(false)
  const [isMainVideoLocal, setIsMainVideoLocal] = useState(true)
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentTime, setCurrentTime] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendJsonMessageRef = useRef<((message: object) => void) | null>(null)
  const pipRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef({ x: 0, y: 0 })
  const dragStartPipPos = useRef({ x: 0, y: 0 })

  // Stable callback to send signaling messages via the WebSocket
  const sendSignalingMessage = useCallback((message: object) => {
    if (sendJsonMessageRef.current) {
      sendJsonMessageRef.current(message)
    } else {
      console.warn("sendJsonMessage is not yet available.")
    }
  }, [])

  const {
    localStream,
    participants,
    isMuted,
    isVideoOn,
    isConnecting,
    error: webrtcError,
    toggleMute,
    toggleVideo,
    initializeMedia,
    cleanup: cleanupWebRTC,
    handleSignal,
  } = useWebRTC(userName, sendSignalingMessage)

  // Stable callback to handle incoming chat messages
  const handleChatMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message])
  }, [])

  const {
    isConnected,
    sendMessage: sendSocketMessage,
    sendJsonMessage,
    error: socketError,
  } = useSocket(roomId, userName, handleChatMessage, handleSignal)

  // When the WebSocket connection is established, `sendJsonMessage` becomes available.
  // We store it in a ref so the `sendSignalingMessage` callback can access it.
  useEffect(() => {
    sendJsonMessageRef.current = sendJsonMessage
  }, [sendJsonMessage])

  useEffect(() => {
    const init = async () => {
      try {
        await initializeMedia()
      } catch (error) {
        console.error("Failed to initialize media:", error)
        setPermissionError("Failed to access camera/microphone. Please check permissions.")
      }
    }
    init()

    return () => {
      cleanupWebRTC()
    }
  }, [initializeMedia, cleanupWebRTC])

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = useCallback(() => {
    if (newMessage.trim() && isConnected) {
      sendSocketMessage(newMessage.trim())
      setNewMessage("")
    }
  }, [newMessage, isConnected, sendSocketMessage])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleLeave = () => {
    cleanupWebRTC()
    onLeave()
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const copyRoomId = async () => {
    try {
      const meetingLink = `${window.location.origin}?room=${roomId}&name=${encodeURIComponent(userName)}`
      await navigator.clipboard.writeText(meetingLink)
      // You could add a toast notification here
      console.log("Meeting link copied to clipboard:", meetingLink)
    } catch (error) {
      console.error("Failed to copy meeting link:", error)
      // Fallback: create a temporary input element
      const textArea = document.createElement("textarea")
      textArea.value = `${window.location.origin}?room=${roomId}&name=${encodeURIComponent(userName)}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  // Set default selected participant to the first remote participant
  useEffect(() => {
    if (participants.length > 0 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id)
    }
    // Remove selection if participant left
    if (selectedParticipantId && !participants.find(p => p.id === selectedParticipantId)) {
      setSelectedParticipantId(participants[0]?.id || null)
    }
  }, [participants, selectedParticipantId])

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Swap main and PiP video
  const swapVideos = () => {
    // Only swap if there is a selected participant and at least one remote participant
    if (!selectedParticipantId || participants.length === 0) return;
    setIsMainVideoLocal((prev) => !prev);
  }

  // Handle PiP dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    dragStartPipPos.current = { ...pipPosition }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - dragStartPos.current.x
    const deltaY = e.clientY - dragStartPos.current.y
    
    const newX = Math.max(0, Math.min(window.innerWidth - 200, dragStartPipPos.current.x + deltaX))
    const newY = Math.max(0, Math.min(window.innerHeight - 150, dragStartPipPos.current.y + deltaY))
    
    setPipPosition({ x: newX, y: newY })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Render all remote audio elements (so you can always hear everyone unless muted)
  const renderAllRemoteAudio = () => (
    <div style={{ display: 'none' }}>
      {participants.map((participant) => (
        <audio
          key={participant.id}
          ref={el => {
            if (el && participant.stream) {
              el.srcObject = participant.stream
              el.volume = participantVolumes[participant.id] ?? 1
              el.muted = !!mutedParticipants[participant.id]
            }
          }}
          autoPlay
          playsInline
        />
      ))}
    </div>
  )

  useEffect(() => {
    const update = () => setCurrentTime(formatTime(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { setHydrated(true); }, []);

  // --- VideoTile: Generic video/participant tile for local or remote ---
  function VideoTile({
    stream,
    name,
    isMuted,
    isVideoOn,
    isLocal,
    volume = 1,
    muted = false,
    onVolumeChange,
    className = "",
    style = {},
    showVolume = false,
  }: {
    stream?: MediaStream
    name: string
    isMuted: boolean
    isVideoOn: boolean
    isLocal?: boolean
    volume?: number
    muted?: boolean
    onVolumeChange?: (v: number) => void
    className?: string
    style?: React.CSSProperties
    showVolume?: boolean
  }) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream
      }
      if (stream && audioRef.current && !isLocal) {
        audioRef.current.srcObject = stream
        audioRef.current.volume = volume ?? 1
        audioRef.current.muted = muted ?? false
      }
    }, [stream, volume, muted, isLocal])

    return (
      <div className={`relative w-full h-full flex items-center justify-center ${className}`} style={style}>
        {stream && isVideoOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover rounded-lg"
            style={isLocal ? { transform: "scaleX(-1)" } : {}}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg">
            <Avatar className="h-24 w-24 mx-auto mb-4">
              <AvatarFallback className="text-2xl bg-gray-600">
                {name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-2 left-2 right-2 text-center text-white">
              <h3 className="text-xl font-semibold">{name}</h3>
              <p className="text-gray-300">Camera is off</p>
            </div>
          </div>
        )}
        {/* Audio for remote participant */}
        {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
        {/* Mute indicator */}
        {isMuted && (
          <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1 z-20">
            <MicOff className="h-4 w-4 text-white" />
          </div>
        )}
        {/* Volume control overlay */}
        {showVolume && onVolumeChange && !isLocal && (
          <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2 opacity-0 hover:opacity-100 transition-opacity">
            <div className="flex items-center">
              <label htmlFor="main-volume" className="text-xs text-white mr-2">Volume</label>
              <input
                id="main-volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => onVolumeChange(Number(e.target.value))}
                className="w-16"
              />
            </div>
          </div>
        )}
        {/* Name overlay for PiP/thumbnail */}
        <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 rounded px-1 py-0.5">
          <p className="text-white text-xs truncate">{name}{isLocal ? " (You)" : ""}</p>
        </div>
      </div>
    )
  }

  // --- Refactored main video and PiP logic ---
  // Helper to get main and PiP participant info
  const allParticipants = [
    { id: "local", name: userName, isMuted, isVideoOn, stream: localStream, isLocal: true },
    ...participants.map(p => ({ ...p, isLocal: false }))
  ]
  const mainIdx = isMainVideoLocal ? 0 : allParticipants.findIndex(p => p.id === selectedParticipantId)
  const pipIdx = isMainVideoLocal ? allParticipants.findIndex(p => p.id === selectedParticipantId) : 0
  const mainParticipant = allParticipants[mainIdx]
  const pipParticipant = allParticipants[pipIdx]

  // --- Host logic ---
  // The host is the user with the lexicographically smallest name (or id) in the room
  const allNames = [userName, ...participants.map(p => p.name)]
  const hostName = allNames.sort()[0]
  const isHost = userName === hostName

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-stone-100 to-stone-200">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-stone-200/50 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-stone-900 text-xl font-medium">Room: {roomId}</h1>
          <Badge variant="secondary" className={`text-white ${isConnected ? 'bg-emerald-600' : 'bg-amber-600'}`}> 
            {isConnected ? "Connected" : "Connecting..."}
          </Badge>
          {isConnecting && (
            <Badge variant="secondary" className="bg-amber-600 text-white">
              Initializing...
            </Badge>
          )}
          {/* Small network info dot/button */}
          <button
            className={`ml-2 w-3 h-3 rounded-full border-2 ${isConnected ? 'bg-emerald-500 border-emerald-700' : 'bg-amber-500 border-amber-700'} flex items-center justify-center relative`}
            title="Network info"
            onClick={() => setShowNetworkInfo((v) => !v)}
            aria-label="Show network info"
          >
            <span className="sr-only">Network info</span>
          </button>
          {showNetworkInfo && (
            <div className="absolute top-12 left-0 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-stone-200 text-xs z-50 shadow-lg min-w-[220px]">
              <strong>Network Access:</strong> Other devices can join at
              <br />
              <code className="bg-stone-900 px-1 rounded">
                {window.location.origin.replace('localhost', '10.0.0.37')}?room={roomId}&name=YourName
              </code>
              <br />
              <small>Camera/microphone requires HTTPS for remote devices</small>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-900 hover:bg-stone-100" onClick={copyRoomId}>
            <Share className="h-4 w-4 mr-2" />
            Share Room
          </Button>
          <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-900 hover:bg-stone-100">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Alerts */}
      {(permissionError || webrtcError || socketError) && (
        <div className="p-4 flex-shrink-0">
          <Alert className="bg-red-50 border-red-200 text-red-900">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {permissionError || webrtcError || socketError}
              {socketError && !isConnected && (
                <div className="mt-2 text-sm">
                  <p>Troubleshooting steps:</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Check if the backend server is running</li>
                    <li>Verify WebSocket URL in browser console</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              )}
              {webrtcError && webrtcError.includes("HTTPS") && (
                <div className="mt-2 text-sm">
                  <p>For network access with camera/microphone:</p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>Use HTTPS: <code className="bg-red-100 px-1 rounded">npm run dev:https</code></li>
                    <li>Or access via localhost on this device</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Render all remote audio elements (hidden) */}
      {renderAllRemoteAudio()}

      {/* Main Content: Video + Sidebar */}
      <div className={`flex-1 min-h-0 flex ${isMobile ? 'flex-col' : ''} w-full`}>
        {/* Main Video Area */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 min-h-0 p-4 relative">
            <div className="h-full min-h-0 bg-white/60 backdrop-blur-sm rounded-2xl relative overflow-hidden flex items-center justify-center border border-stone-200/50 shadow-lg">
              {/* Main Video (local or selected participant) - unified for mobile and desktop */}
              <div className="w-full max-w-full h-full max-h-[70vh] aspect-[16/9] mx-auto flex items-center justify-center">
                <VideoTile
                  stream={mainParticipant.stream ?? undefined}
                  name={mainParticipant.name}
                  isMuted={mainParticipant.isMuted}
                  isVideoOn={mainParticipant.isVideoOn}
                  isLocal={mainParticipant.isLocal}
                  volume={mainParticipant.isLocal ? 1 : participantVolumes[mainParticipant.id] ?? 1}
                  muted={mainParticipant.isLocal ? true : mutedParticipants[mainParticipant.id]}
                  onVolumeChange={mainParticipant.isLocal ? undefined : v => setParticipantVolumes(vols => ({ ...vols, [mainParticipant.id]: v }))}
                  showVolume={!mainParticipant.isLocal}
                  className="w-full h-full"
                />
              </div>
              {/* PiP/Thumbnail: show only one mini video, same logic for mobile and desktop */}
              {(pipParticipant && pipIdx !== -1 && pipIdx !== mainIdx) && (
                isMobile ? (
                  <>{pipParticipant && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20" style={{ width: 80, height: 60 }}>
                      <VideoThumbnail
                        stream={pipParticipant.stream ?? undefined}
                        name={pipParticipant.name}
                        isMuted={pipParticipant.isMuted}
                        isVideoOn={pipParticipant.isVideoOn}
                        isLocal={pipParticipant.isLocal}
                        onClick={() => {
                          setIsMainVideoLocal(pipParticipant.isLocal)
                          if (!pipParticipant.isLocal) setSelectedParticipantId(pipParticipant.id)
                        }}
                        selected={false}
                        style={{ width: 80, height: 60 }}
                      />
                    </div>
                  )}</>
                ) : (
                  <div
                    ref={pipRef}
                    className="absolute cursor-move bg-white/90 backdrop-blur-sm rounded-xl border-2 border-stone-300 shadow-lg"
                    style={{
                      left: pipPosition.x,
                      top: pipPosition.y,
                      width: 200,
                      height: 150,
                      zIndex: 10
                    }}
                    onMouseDown={handleMouseDown}
                    onClick={swapVideos}
                  >
                    <VideoThumbnail
                      stream={pipParticipant.stream ?? undefined}
                      name={pipParticipant.name}
                      isMuted={pipParticipant.isMuted}
                      isVideoOn={pipParticipant.isVideoOn}
                      isLocal={pipParticipant.isLocal}
                      selected={false}
                      style={{ width: 200, height: 150 }}
                    />
                  </div>
                )
              )}

              {/* Meeting Info Overlay */}
              <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-2 z-20">
                <p className="text-white text-sm">
                  {participants.length + 1} participants • {currentTime}
                </p>
              </div>
              
              {/* Mute indicator */}
              {isMuted && (
                <div className="absolute top-4 right-4 bg-red-500 rounded-full p-2 z-20">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}

              {/* Swap button for desktop */}
              {!isMobile && selectedParticipantId && (
                <button
                  onClick={swapVideos}
                  className="absolute bottom-4 right-4 bg-stone-700 hover:bg-stone-800 rounded-full p-3 z-20 transition-colors"
                  title="Swap main and picture-in-picture"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}

              {/* Controls Overlay */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-4 z-30">
                <div className="flex items-center justify-center space-x-4 bg-white/80 backdrop-blur-md rounded-2xl px-6 py-3 shadow-lg border border-stone-200">
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="lg"
                    onClick={toggleMute}
                    className="rounded-full h-12 w-12 bg-stone-100 hover:bg-stone-200 text-stone-700"
                    disabled={!localStream}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant={isVideoOn ? "secondary" : "destructive"}
                    size="lg"
                    onClick={toggleVideo}
                    className="rounded-full h-12 w-12 bg-stone-100 hover:bg-stone-200 text-stone-700"
                    disabled={!localStream}
                  >
                    {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>

                  <Button variant="destructive" size="lg" className="rounded-full h-12 w-12" onClick={handleLeave}>
                    <Phone className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 text-stone-600 hover:text-stone-900 hover:bg-stone-100">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <MeetingSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          messages={messages}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendMessage={sendMessage}
          handleKeyPress={handleKeyPress}
          hydrated={hydrated}
          isConnected={isConnected}
          userName={userName}
          isHost={isHost}
          isMuted={isMuted}
          isVideoOn={isVideoOn}
          participants={participants}
          selectedParticipantId={selectedParticipantId}
          setSelectedParticipantId={setSelectedParticipantId}
          mutedParticipants={mutedParticipants}
          hostName={hostName}
        />
      </div>
    </div>
  )
}
