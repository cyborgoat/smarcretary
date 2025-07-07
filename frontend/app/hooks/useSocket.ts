"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface Message {
  id: string
  user: string
  content: string
  timestamp: Date
  userId: string
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
  targetId?: string
  isMuted?: boolean
  isVideoOn?: boolean
}

export function useSocket(
  roomId: string,
  userName: string,
  onMessage: (message: Message) => void,
  onSignal: (signal: RTCSignalingMessage) => void,
) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Use only NEXT_PUBLIC_WS_URL for WebSocket endpoint, as per unified .env
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080"
    const wsEndpoint = `${wsUrl}/ws/${roomId}/${encodeURIComponent(userName)}`
    console.log("Connecting to WebSocket:", wsEndpoint)
    ws.current = new WebSocket(wsEndpoint)

    ws.current.onopen = () => {
      console.log("WebSocket connected successfully to:", wsEndpoint)
      setIsConnected(true)
      setError(null)
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "chatMessage") {
        onMessage({ ...data, timestamp: new Date(data.timestamp) })
      } else {
        onSignal(data)
      }
    }

    ws.current.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason)
      setIsConnected(false)
      if (event.code !== 1000) {
        setError(`Connection closed unexpectedly: ${event.reason || 'Unknown error'}`)
      }
    }

    ws.current.onerror = (event) => {
      console.error("WebSocket error:", event)
      if (event instanceof ErrorEvent) {
        console.error("WebSocket ErrorEvent message:", event.message)
      } else if (event.type === 'error') {
        // Generic error, may not have a specific message property
        console.error("WebSocket generic error event:", event)
      }
      setError("WebSocket connection error. Please try again.")
    }

    return () => {
      ws.current?.close()
    }
  }, [roomId, userName, onMessage, onSignal])

  const sendMessage = useCallback(
    (content: string, isTranscription = false) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        const message = {
          type: "chatMessage",
          roomId,
          user: userName,
          content,
          timestamp: new Date().toISOString(),
          userId: "current-user", // This should ideally come from backend auth
          ...(isTranscription ? { isTranscription: true } : {}),
        }
        ws.current.send(JSON.stringify(message))
      } else {
        console.warn("WebSocket not open.")
      }
    },
    [roomId, userName],
  )

  const sendJsonMessage = useCallback(
    (message: object) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(message))
      } else {
        console.warn("WebSocket not open.")
      }
    },
    [],
  )

  return {
    isConnected,
    error,
    sendMessage,
    sendJsonMessage,
  }
}
