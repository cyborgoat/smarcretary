import React, { memo, useRef, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MicOff } from "lucide-react";

export interface VideoTileProps {
  stream?: MediaStream;
  name: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isLocal?: boolean;
  volume?: number;
  muted?: boolean;
  onVolumeChange?: (v: number) => void;
  className?: string;
  style?: React.CSSProperties;
  showVolume?: boolean;
}

/**
 * VideoTile displays a participant's video, avatar, mute status, and volume control.
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
const VideoTile: React.FC<VideoTileProps> = memo(function VideoTile({
  stream,
  name,
  isMuted,
  isVideoOn,
  isLocal,
  volume = 1,
  muted = false,
  onVolumeChange,
  className = "",
  style = {},
  showVolume = false,
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Only update video/audio element when stream or relevant props change
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    if (stream && audioRef.current && !isLocal) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = volume ?? 1;
      audioRef.current.muted = muted ?? false;
    }
  }, [stream, volume, muted, isLocal]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center ${className}`} style={style}>
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
          <Avatar className="h-24 w-24 mx-auto mb-4">
            <AvatarFallback className="text-2xl bg-gray-600">
              {name.split(" ").map((n) => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-2 left-2 right-2 text-center text-white">
            <h3 className="text-xl font-semibold">{name}</h3>
            <p className="text-gray-300">Camera is off</p>
          </div>
        </div>
      )}
      {/* Audio for remote participant */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
      {/* Mute indicator */}
      {isMuted && (
        <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1 z-20">
          <MicOff className="h-4 w-4 text-white" />
        </div>
      )}
      {/* Volume control overlay */}
      {showVolume && onVolumeChange && !isLocal && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 rounded-lg px-3 py-2 opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center">
            <label htmlFor="main-volume" className="text-xs text-white mr-2">Volume</label>
            <input
              id="main-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={e => onVolumeChange(Number(e.target.value))}
              className="w-16"
            />
          </div>
        </div>
      )}
      {/* Name overlay for PiP/thumbnail */}
      <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-50 rounded px-1 py-0.5">
        <p className="text-white text-xs truncate">{name}{isLocal ? " (You)" : ""}</p>
      </div>
    </div>
  );
});

export default VideoTile;
