"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Video, Users, MessageCircle, Shield } from "lucide-react"

interface LandingPageProps {
  onJoinRoom: (roomId: string, userName: string) => void
}

export default function LandingPage({ onJoinRoom }: LandingPageProps) {
  const [roomId, setRoomId] = useState("")
  const [userName, setUserName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Check for URL parameters on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const roomParam = urlParams.get("room")
      const nameParam = urlParams.get("name")
      
      if (roomParam) {
        setRoomId(roomParam)
      }
      if (nameParam) {
        setUserName(decodeURIComponent(nameParam))
      }
    }
  }, [])

  const handleJoinRoom = async () => {
    if (!roomId.trim() || !userName.trim()) return

    setIsLoading(true)
    // Simulate loading
    await new Promise((resolve) => setTimeout(resolve, 1000))
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">WebMeet</h1>
          <p className="text-xl text-gray-300">Secure video conferencing for everyone</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Room Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Join a Meeting</CardTitle>
              <CardDescription className="text-gray-400">Enter a room ID to join an existing meeting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-white">
                  Your Name
                </Label>
                <Input
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomId" className="text-white">
                  Room ID
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="roomId"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="Enter room ID"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  />
                  <Button
                    onClick={generateRoomId}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleJoinRoom}
                disabled={!roomId.trim() || !userName.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Joining..." : "Join Meeting"}
              </Button>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Features</CardTitle>
              <CardDescription className="text-gray-400">Everything you need for productive meetings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 text-white">
                <Video className="h-5 w-5 text-blue-400" />
                <span>HD Video & Audio</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <MessageCircle className="h-5 w-5 text-green-400" />
                <span>Real-time Chat</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Users className="h-5 w-5 text-purple-400" />
                <span>Multiple Participants</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Shield className="h-5 w-5 text-red-400" />
                <span>Secure & Private</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">Share the room ID with others to invite them to your meeting</p>
        </div>
      </div>
    </div>
  )
}
