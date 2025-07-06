"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Phone, MoreVertical } from "lucide-react"

export interface ControlOverlayProps {
  isMuted: boolean;
  isVideoOn: boolean;
  onMute: () => void;
  onVideo: () => void;
  onLeave: () => void;
  localStream: MediaStream | null;
  isMobile: boolean;
}

export default function ControlOverlay({ isMuted, isVideoOn, onMute, onVideo, onLeave, localStream, isMobile }: ControlOverlayProps) {
  const [collapsed, setCollapsed] = useState(false)
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
          onClick={onLeave}
        >
          <Phone className="h-3 w-3" />
        </Button>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand controls" : "Collapse controls"}
          >
            <motion.div
              animate={{ rotate: collapsed ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <MoreVertical className="h-3 w-3" />
            </motion.div>
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8 text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Expand controls"
          >
            <motion.div
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <MoreVertical className="h-3 w-3" />
            </motion.div>
          </Button>
        )}
      </motion.div>
    </motion.div>
  )
}
