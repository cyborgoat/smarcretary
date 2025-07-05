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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100">
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-stone-900 mb-2">Smart Secretary</h1>
          <p className="text-stone-600 text-sm">Connect and collaborate seamlessly</p>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoin} className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 p-8 shadow-xl shadow-stone-200/20">
            <div className="space-y-5">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-stone-700 mb-2">
                  Your Name
                </label>
                <input
                  id="userName"
                  type="text"
                  className="w-full px-4 py-3 bg-stone-50/50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-stone-700 mb-2">
                  Room ID
                </label>
                <input
                  id="roomId"
                  type="text"
                  className="w-full px-4 py-3 bg-stone-50/50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all duration-200"
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={e => setRoomId(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 bg-stone-800 hover:bg-stone-900 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-stone-300/20"
            >
              Join Meeting
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-stone-500">
            Secure video conferencing with AI-powered features
          </p>
        </div>
      </div>
    </div>
  )
}
