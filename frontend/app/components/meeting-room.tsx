"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  Send,
  Users,
  MessageCircle,
  MoreVertical,
  Share,
  AlertTriangle,
} from "lucide-react"
import { useWebRTC } from "../hooks/useWebRTC"
import { useSocket } from "../hooks/useSocket"

interface Message {
  id: string
  user: string
  content: string
  timestamp: Date
  userId: string
}

interface Participant {
  id: string
  name: string
  isMuted: boolean
  isVideoOn: boolean
  stream?: MediaStream
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

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sendJsonMessageRef = useRef<((message: object) => void) | null>(null)

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
  } = useWebRTC(roomId, userName, sendSignalingMessage)

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

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-xl font-semibold">Room: {roomId}</h1>
          <Badge variant="secondary" className="bg-green-600 text-white">
            {isConnected ? "Connected" : "Connecting..."}
          </Badge>
          {isConnecting && (
            <Badge variant="secondary" className="bg-yellow-600 text-white">
              Initializing...
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white" onClick={copyRoomId}>
            <Share className="h-4 w-4 mr-2" />
            Share Room
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Alerts */}
      {(permissionError || webrtcError || socketError) && (
        <div className="p-4">
          <Alert className="bg-red-900 border-red-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
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
                    <li>Use HTTPS: <code className="bg-red-800 px-1 rounded">npm run dev:https</code></li>
                    <li>Or access via localhost on this device</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Network Access Helper */}
      {isConnected && !webrtcError && (
        <div className="p-4">
          <Alert className="bg-blue-900 border-blue-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-blue-200">
              <strong>Network Access:</strong> Other devices can join at{" "}
              <code className="bg-blue-800 px-1 rounded">
                {window.location.origin.replace('localhost', '10.0.0.37')}?room={roomId}&name=YourName
              </code>
              <br />
              <small>Note: Camera/microphone requires HTTPS for remote devices</small>
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 p-4">
            <div className="h-full bg-gray-800 rounded-lg relative overflow-hidden">
              {/* Local Video */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} // Mirror effect
              />

              {/* Video Off Overlay */}
              {!isVideoOn && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarFallback className="text-2xl bg-gray-600">
                        {userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold">{userName}</h3>
                    <p className="text-gray-300">Camera is off</p>
                  </div>
                </div>
              )}

              {/* Participant Videos */}
              <div className="absolute bottom-4 right-4 flex space-x-2">
                {participants.map((participant) => (
                  <ParticipantVideo key={participant.id} participant={participant} />
                ))}
              </div>

              {/* Meeting Info Overlay */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2">
                <p className="text-white text-sm">
                  {participants.length + 1} participants • {formatTime(new Date())}
                </p>
              </div>

              {/* Muted Indicator */}
              {isMuted && (
                <div className="absolute top-4 right-4 bg-red-500 rounded-full p-2">
                  <MicOff className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="lg"
              onClick={toggleMute}
              className="rounded-full h-12 w-12"
              disabled={!localStream}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant={isVideoOn ? "secondary" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full h-12 w-12"
              disabled={!localStream}
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            <Button variant="destructive" size="lg" className="rounded-full h-12 w-12" onClick={handleLeave}>
              <Phone className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="lg" className="rounded-full h-12 w-12 text-gray-300 hover:text-white">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700 m-2">
              <TabsTrigger value="chat" className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="participants" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>People ({participants.length + 1})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 flex flex-col m-2 mt-0">
              <Card className="flex-1 flex flex-col bg-gray-700 border-gray-600">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-xs bg-gray-600">
                            {message.user
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-white">{message.user}</span>
                            <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1 break-words">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-gray-600">
                  <div className="flex space-x-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-600 border-gray-500 text-white placeholder-gray-400"
                      disabled={!isConnected}
                    />
                    <Button onClick={sendMessage} size="sm" disabled={!isConnected || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="participants" className="flex-1 m-2 mt-0">
              <Card className="h-full bg-gray-700 border-gray-600">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {/* Current User */}
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-600">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-600">
                          {userName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white truncate">{userName} (You)</span>
                          <Badge variant="secondary" className="text-xs bg-blue-600 text-white">
                            Host
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1 mt-1">
                          {isMuted ? (
                            <MicOff className="h-3 w-3 text-red-400" />
                          ) : (
                            <Mic className="h-3 w-3 text-green-400" />
                          )}
                          {isVideoOn ? (
                            <Video className="h-3 w-3 text-green-400" />
                          ) : (
                            <VideoOff className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Other Participants */}
                    {participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {participant.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white truncate">{participant.name}</span>
                          <div className="flex items-center space-x-1 mt-1">
                            {participant.isMuted ? (
                              <MicOff className="h-3 w-3 text-red-400" />
                            ) : (
                              <Mic className="h-3 w-3 text-green-400" />
                            )}
                            {participant.isVideoOn ? (
                              <Video className="h-3 w-3 text-green-400" />
                            ) : (
                              <VideoOff className="h-3 w-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Participant Video Component
function ParticipantVideo({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (participant.stream && videoRef.current) {
      videoRef.current.srcObject = participant.stream
    }
  }, [participant.stream])

  return (
    <div className="relative bg-gray-700 rounded-lg w-24 h-16 overflow-hidden">
      {participant.stream && participant.isVideoOn ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {participant.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {participant.isMuted && (
        <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
          <MicOff className="h-2 w-2 text-white" />
        </div>
      )}
    </div>
  )
}
