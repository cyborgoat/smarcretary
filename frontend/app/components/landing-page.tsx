"use client"

import { useState } from "react"
import JoinRoomCard from "./landing-page/JoinRoomCard"
import FeaturesCard from "./landing-page/FeaturesCard"
import LandingPageHeader from "./landing-page/LandingPageHeader"
import LandingPageInstructions from "./landing-page/LandingPageInstructions"
import useUrlParams from "@/hooks/useUrlParams"

interface LandingPageProps {
  onJoinRoom: (roomId: string, userName: string) => void
}

export default function LandingPage({ onJoinRoom }: LandingPageProps) {
  const [roomId, setRoomId] = useState("")
  const [userName, setUserName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Check for URL parameters on mount
  useUrlParams({ setRoomId, setUserName });

  const handleJoinRoom = async () => {
    if (!roomId.trim() || !userName.trim()) return

    setIsLoading(true)
    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log(`Joining room via API: ${process.env.NEXT_PUBLIC_API_URL}`);
    onJoinRoom(roomId.trim(), userName.trim())
    setIsLoading(false)
  }

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(id)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <LandingPageHeader />

        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Room Card */}
          <JoinRoomCard
            roomId={roomId}
            setRoomId={setRoomId}
            userName={userName}
            setUserName={setUserName}
            isLoading={isLoading}
            handleJoinRoom={handleJoinRoom}
            generateRoomId={generateRoomId}
          />

          {/* Features Card */}
          <FeaturesCard />
        </div>

        {/* Instructions */}
        <LandingPageInstructions />
      </div>
    </div>
  )
}
