"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [roomId, setRoomId] = useState("")
  const [userName, setUserName] = useState("")
  const router = useRouter()

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (roomId && userName) {
      router.push(`/${roomId}?name=${encodeURIComponent(userName)}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
      <h1 className="text-3xl font-bold text-white mb-6">Welcome to Smart Secretary</h1>
      <form onSubmit={handleJoin} className="bg-gray-800 p-8 rounded-lg shadow-lg flex flex-col gap-4 w-full max-w-md">
        <input
          className="p-3 rounded bg-gray-700 text-white"
          placeholder="Your Name"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          required
        />
        <input
          className="p-3 rounded bg-gray-700 text-white"
          placeholder="Room ID"
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Join Meeting
        </button>
      </form>
    </div>
  )
}
