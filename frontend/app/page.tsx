"use client"

import { useState } from "react"
import LandingPage from "./components/landing-page"
import MeetingRoom from "./components/meeting-room"

export default function App() {
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("")

  const joinRoom = (roomId: string, name: string) => {
    setCurrentRoom(roomId)
    setUserName(name)
  }

  const leaveRoom = () => {
    setCurrentRoom(null)
    setUserName("")
  }

  if (!currentRoom || !userName) {
    return <LandingPage onJoinRoom={joinRoom} />
  }

  return <MeetingRoom roomId={currentRoom} userName={userName} onLeave={leaveRoom} />
}
