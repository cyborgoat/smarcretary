"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Phone, MoreVertical, ChevronDown, ChevronUp } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./ui/shadcn-dialog"

export interface ControlOverlayProps {
  isMuted: boolean;
  isVideoOn: boolean;
  onMute: () => void;
  onVideo: () => void;
  onLeave: () => void;
  localStream: MediaStream | null;
  isMobile: boolean;
  meetingNotes: string[];
  setMeetingNotes: (notes: string[]) => void;
}

export default function ControlOverlay({ isMuted, isVideoOn, onMute, onVideo, onLeave, localStream, isMobile, meetingNotes, setMeetingNotes }: ControlOverlayProps) {
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
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={handleLeave}
        >
          <Phone className="h-3 w-3" />
        </Button>
        {/* Collapse/Expand button with arrow icon */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand controls" : "Collapse controls"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {collapsed ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </motion.div>
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
                className="w-full text-left px-4 py-2 text-sm hover:bg-stone-100"
                onClick={() => { setMenuOpen(false); handleLeave(); }}
              >Leave meeting</button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-stone-100"
                onClick={() => { setMenuOpen(false); }}
              >Settings</button>
              <button
                className="w-full text-left px-4 py-2 text-sm hover:bg-stone-100"
                onClick={() => { setMenuOpen(false); }}
              >Toggle caption</button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
