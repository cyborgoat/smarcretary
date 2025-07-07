"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

import { Mic, MicOff, Video, VideoOff, Phone, MoreVertical, ChevronDown, ChevronUp, MonitorUp, MonitorX } from "lucide-react"


export interface ControlOverlayProps {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  onMute: () => void;
  onVideo: () => void;
  onScreenShare: () => void;
  onStopScreenShare: () => void;
  onLeave: () => void;
  localStream: MediaStream | null;
  isMobile: boolean;
  meetingNotes: string[];
  setMeetingNotes: (notes: string[]) => void;
}


export default function ControlOverlay({ isMuted, isVideoOn, isScreenSharing, onMute, onVideo, onScreenShare, onStopScreenShare, onLeave, localStream, isMobile, meetingNotes, setMeetingNotes }: ControlOverlayProps) {
        {/* Screen Share Button */}
        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="icon"
          onClick={isScreenSharing ? onStopScreenShare : onScreenShare}
          className="rounded-full h-8 w-8 bg-stone-100 hover:bg-stone-200 text-stone-700"
          disabled={!localStream}
        >
          {isScreenSharing ? <MonitorX className="h-3 w-3" /> : <MonitorUp className="h-3 w-3" />}
        </Button>
  const [collapsed, setCollapsed] = useState(false)
  // Notes dialog state is now managed in MeetingRoom
  const [menuOpen, setMenuOpen] = useState(false)
  const handleLeave = () => {
    onLeave()
    window.location.href = "/"
  }
  return (
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 mb-2 z-30"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        className={`flex items-center justify-center bg-white/90 backdrop-blur-md rounded-xl px-1 py-1 shadow-lg border border-stone-200 ${collapsed ? 'space-x-1' : isMobile ? 'space-x-1' : 'space-x-2'}`}
        layout
      >
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          onClick={onMute}
          className="rounded-full h-8 w-8 bg-stone-100 hover:bg-stone-200 text-stone-700"
          disabled={!localStream}
        >
          {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </Button>
        <Button
          variant={isVideoOn ? "secondary" : "destructive"}
          size="icon"
          onClick={onVideo}
          className="rounded-full h-8 w-8 bg-stone-100 hover:bg-stone-200 text-stone-700"
          disabled={!localStream}
        >
          {isVideoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
        </Button>
        {/* Screen Share Button */}
        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="icon"
          onClick={isScreenSharing ? onStopScreenShare : onScreenShare}
          className="rounded-full h-8 w-8 bg-stone-100 hover:bg-stone-200 text-stone-700"
          disabled={!localStream}
        >
          {isScreenSharing ? <MonitorX className="h-3 w-3" /> : <MonitorUp className="h-3 w-3" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={handleLeave}
        >
          <Phone className="h-3 w-3" />
        </Button>
        {/* More menu button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 bottom-12 z-50 min-w-[180px] bg-white border border-stone-200 rounded-lg shadow-lg py-1">
              <button
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm hover:bg-stone-100"
                onClick={() => { setMenuOpen(false); }}
              >
                <span role="img" aria-label="settings"><svg className="h-4 w-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6 1a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                Settings
              </button>
              <button
                className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm hover:bg-stone-100"
                onClick={() => { setMenuOpen(false); }}
              >
                <span role="img" aria-label="caption"><svg className="h-4 w-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15v-2a2 2 0 012-2h2a2 2 0 012 2v2" /></svg></span>
                Toggle caption
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
