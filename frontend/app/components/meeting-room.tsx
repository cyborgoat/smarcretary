"use client"

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from "react"
// @ts-ignore
import Recorder from "recorder-js";
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  Bot,
} from "lucide-react"
import { useWebRTC } from "../hooks/useWebRTC"
import { useSocket } from "../hooks/useSocket"
import MeetingSidebar from "./MeetingSidebar"
import ControlOverlay from "./ControlOverlay"
import MeetingNotesDialog from "./MeetingNotesDialog"
import MeetingHeader from "./meeting-room/MeetingHeader";
import VideoTile from "./meeting-room/VideoTile";
import MeetingInfoOverlay from "./meeting-room/MeetingInfoOverlay";
import PiPVideo from "./meeting-room/PiPVideo";

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
  // --- Notes Dialog State ---
  const [notesOpen, setNotesOpen] = useState(false);
  const [userNotes, setUserNotes] = useState<string>("");
  // --- All State Declarations at Top ---
  const [caption, setCaption] = useState("");
  const [captionsEnabled] = useState(true); // always on by default
  const [meetingNotes, setMeetingNotes] = useState<string[]>([]); // store all chat messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [participantVolumes, setParticipantVolumes] = useState<{ [id: string]: number }>({});
  const [mutedParticipants] = useState<{ [id: string]: boolean }>({});
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);
  const [isMainVideoLocal, setIsMainVideoLocal] = useState(true);
  const [pipPosition, setPipPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // --- All Refs ---
  const audioRecorderRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const captionIntervalRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendJsonMessageRef = useRef<((message: object) => void) | null>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartPipPos = useRef({ x: 0, y: 0 });


  // --- Only append transcriptions to meetingNotes, not all chat messages ---

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
  const handleChatMessage = useCallback((message: any) => {
    if (message.isTranscription) {
      setMeetingNotes((prev) => [...prev, `${message.user}: ${message.content}`]);
    } else {
      setMessages((prev) => [...prev, message]);
    }
  }, []);


  const {
    isConnected,
    sendMessage: _sendMessage,
    sendJsonMessage,
    error: socketError,
  } = useSocket(roomId, userName, handleChatMessage, handleSignal);

  // Wrap sendMessage to allow isTranscription flag
  const sendSocketMessage = (content: string, isTranscription = false) => {
    if (_sendMessage) {
      _sendMessage(content, isTranscription);
    }
  };

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
// (Moved to ./meeting-room/VideoTile)


  // --- Refactored main video and PiP logic ---
  // Helper to get main and PiP participant info
  const allParticipants = [
    { id: "local", name: userName, isMuted, isVideoOn, stream: localStream, isLocal: true },
    ...participants.map(p => ({ ...p, isLocal: false }))
  ];
  const mainIdx = isMainVideoLocal ? 0 : allParticipants.findIndex(p => p.id === selectedParticipantId);
  const pipIdx = isMainVideoLocal ? allParticipants.findIndex(p => p.id === selectedParticipantId) : 0;
  const mainParticipant = allParticipants[mainIdx];
  const pipParticipant = allParticipants[pipIdx];

  // --- Caption: record and send audio for main speaker only ---

  useEffect(() => {
    if (!captionsEnabled || !mainParticipant || !mainParticipant.isLocal || !mainParticipant.stream) return;
    // Only record if local user is main video
    let stopped = false;
    const startRecording = async () => {
      if (!audioRecorderRef.current) {
        const RecorderJS = (await import("recorder-js")).default;
        audioRecorderRef.current = new RecorderJS(window.AudioContext ? new window.AudioContext() : (window as any).webkitAudioContext && new (window as any).webkitAudioContext());
      }
      if (!audioStreamRef.current && mainParticipant.stream) {
        audioStreamRef.current = mainParticipant.stream;
      }
      await audioRecorderRef.current.init(audioStreamRef.current);
      const recordAndSend = async () => {
        if (stopped) return;
        await audioRecorderRef.current.start();
        setTimeout(async () => {
          const { blob } = await audioRecorderRef.current.stop();
          // Send to backend for transcription
          const formData = new FormData();
          formData.append("file", blob, "audio.wav");
          try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voice/transcribe`, { method: "POST", body: formData });
            const data = await resp.json();
            if (data.text) {
              setCaption(data.text);
              // Broadcast transcription as chatMessage to all participants, mark as transcription
              if (sendSocketMessage) {
                sendSocketMessage(data.text, true);
              }
            }
          } catch (e) { setCaption(""); }
          if (!stopped) recordAndSend();
        }, 3000); // every 3s
      };
      recordAndSend();
    };
    startRecording();
    return () => { stopped = true; audioRecorderRef.current && audioRecorderRef.current.stop(); };
  }, [captionsEnabled, mainParticipant && mainParticipant.isLocal, mainParticipant && mainParticipant.stream, sendSocketMessage]);

  // --- Host logic ---
  // The host is the user with the lexicographically smallest name (or id) in the room
  const allNames = [userName, ...participants.map(p => p.name)]
  const hostName = allNames.sort()[0]
  const isHost = userName === hostName

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-stone-100 to-stone-200">
      <MeetingHeader
        roomId={roomId}
        isConnected={isConnected}
        isConnecting={isConnecting}
        showNetworkInfo={showNetworkInfo}
        setShowNetworkInfo={setShowNetworkInfo}
        copyRoomId={copyRoomId}
        setNotesOpen={setNotesOpen}
      />

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
          <div className="flex-1 min-h-0 p-2 relative">
            <div className="h-full min-h-0 bg-white/60 backdrop-blur-sm rounded-xl relative overflow-hidden flex items-center justify-center border border-stone-200/50 shadow-lg">
              {/* Main Video (local or selected participant) - dynamic responsive sizing */}
              {useMemo(() => (
                <div
                  className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden"
                  style={{
                    width: '100%',
                    height: '100%',
                    aspectRatio: '16/9',
                    maxWidth: isMobile ? '100%' : 'calc(100vw - 400px)',
                    maxHeight: isMobile ? 'calc(100vh - 200px)' : 'calc(100vh - 150px)',
                  }}
                >
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
                  {/* Caption overlay for main screen's speaker */}
                  {captionsEnabled && caption && mainParticipant.isLocal && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-lg px-4 py-2 rounded-xl shadow-lg max-w-[80%] text-center z-30">
                      {caption}
                    </div>
                  )}
                </div>
              ), [
                mainParticipant.stream,
                mainParticipant.name,
                mainParticipant.isMuted,
                mainParticipant.isVideoOn,
                mainParticipant.isLocal,
                participantVolumes[mainParticipant.id],
                mutedParticipants[mainParticipant.id],
                isMobile,
                captionsEnabled,
                caption
              ])}

              {/* PiP/Thumbnail: show only one mini video, same logic for mobile and desktop */}
              <PiPVideo
                pipParticipant={pipParticipant}
                pipIdx={pipIdx}
                mainIdx={mainIdx}
                pipRef={pipRef}
                pipPosition={pipPosition}
                isMobile={isMobile}
                handleMouseDown={handleMouseDown}
                setIsMainVideoLocal={setIsMainVideoLocal}
                setSelectedParticipantId={setSelectedParticipantId}
              />

              {/* Meeting Info Overlay */}
              <MeetingInfoOverlay participantCount={participants.length + 1} currentTime={currentTime} />

              {/* Mute indicator */}
              {/* Only show mute indicator in VideoTile, not here to avoid duplicate icons */}

              {/* Swap button for desktop */}
              {!isMobile && selectedParticipantId && (
                <button
                  onClick={swapVideos}
                  className="absolute bottom-2 right-2 bg-stone-700 hover:bg-stone-800 rounded-full p-2 z-20 transition-colors"
                  title="Swap main and picture-in-picture"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              )}

              {/* Controls Overlay - compact, collapsible, animated */}
              <ControlOverlay
                isMuted={isMuted}
                isVideoOn={isVideoOn}
                onMute={toggleMute}
                onVideo={toggleVideo}
                onLeave={handleLeave}
                localStream={localStream}
                isMobile={isMobile}
                meetingNotes={meetingNotes}
                setMeetingNotes={setMeetingNotes}
              />
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

      {/* Meeting Notes Dialog */}
      <MeetingNotesDialog
        notesOpen={notesOpen}
        userNotes={userNotes}
        setUserNotes={setUserNotes}
        setNotesOpen={setNotesOpen}
        meetingNotes={meetingNotes}
      />
    </div>
  )
}
