import React, { useRef, useEffect } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MicOff } from "lucide-react"

interface VideoThumbnailProps {
  stream?: MediaStream
  name: string
  isMuted: boolean
  isVideoOn: boolean
  isLocal?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  selected?: boolean
}

export function VideoThumbnail({
  stream,
  name,
  isMuted,
  isVideoOn,
  isLocal,
  className = "",
  style = {},
  onClick,
  selected,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center border-2 rounded-lg cursor-pointer ${selected ? "border-blue-500" : "border-gray-600"} ${className}`}
      style={style}
      onClick={onClick}
    >
      {stream && isVideoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover rounded-lg"
          style={isLocal ? { transform: "scaleX(-1)" } : {}}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-gray-600">
              {name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      {isMuted && (
        <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1 z-20">
          <MicOff className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 rounded px-1 py-0.5">
        <p className="text-white text-xs truncate">{name}{isLocal ? " (You)" : ""}</p>
      </div>
    </div>
  )
}
