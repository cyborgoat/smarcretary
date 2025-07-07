import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share, Settings, Bot } from "lucide-react";

interface MeetingHeaderProps {
  roomId: string;
  isConnected: boolean;
  isConnecting: boolean;
  showNetworkInfo: boolean;
  setShowNetworkInfo: (value: boolean) => void;
  copyRoomId: () => void;
  setNotesOpen: (open: boolean) => void;
}

const MeetingHeader: React.FC<MeetingHeaderProps> = ({
  roomId,
  isConnected,
  isConnecting,
  showNetworkInfo,
  setShowNetworkInfo,
  copyRoomId,
  setNotesOpen,
}) => {
  return (
    <div className="flex-shrink-0 bg-white/95 backdrop-blur-lg border-b border-stone-200/60 px-2 py-1 flex items-center justify-between shadow z-20 relative h-14">
      {/* Left: Room info, status, and network */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-bold text-stone-700 tracking-widest uppercase bg-stone-100 rounded px-2 py-0.5 shadow-sm border border-stone-200/70">
          {roomId}
        </span>
        <Badge
          variant="secondary"
          className={`text-white text-[10px] px-2 py-0.5 rounded-full shadow ${
            isConnected ? "bg-emerald-600" : "bg-amber-600"
          }`}
        >
          {isConnected ? "Connected" : "Connecting..."}
        </Badge>
        {isConnecting && (
          <Badge
            variant="secondary"
            className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow"
          >
            Init
          </Badge>
        )}
        <button
          className={`ml-1 w-2.5 h-2.5 rounded-full border border-stone-300 ${
            isConnected ? "bg-emerald-400" : "bg-amber-400"
          } flex items-center justify-center relative transition-colors`}
          title="Network info"
          onClick={() => setShowNetworkInfo(!showNetworkInfo)}
          aria-label="Show network info"
        >
          <span className="sr-only">Network info</span>
        </button>
        {showNetworkInfo && (
          <div className="absolute top-12 left-0 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-xs z-50 shadow-lg min-w-[180px]">
            <strong>Network:</strong> <br />
            <code className="bg-stone-900 px-1 rounded text-xs">
              {window.location.origin.replace("localhost", "10.0.0.37")}
              ?room={roomId}&name=YourName
            </code>
            <br />
            <small>HTTPS required for camera/mic</small>
          </div>
        )}
      </div>
      {/* Center: AI Assistant Icon - lucide-react icon, minimal, glassy, with label below */}
      <div className="flex-1 flex flex-col items-center justify-center select-none relative">
        <button
          className="relative flex flex-col items-center group focus:outline-none"
          onClick={() => setNotesOpen(true)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-label="Open meeting notes dialog"
        >
          <div className="relative flex items-center justify-center">
            <div className="rounded-full bg-gradient-to-br from-emerald-400/90 to-blue-500/90 shadow-lg border border-white/80 p-1 flex items-center justify-center" style={{ width: 22, height: 22 }}>
              <Bot className="w-4 h-4 text-white drop-shadow" />
            </div>
          </div>
          <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-xs rounded px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Meeting Notes</span>
        </button>
      </div>
      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-stone-600 hover:text-stone-900 hover:bg-stone-100 px-2 py-1 rounded-lg"
          onClick={copyRoomId}
        >
          <Share className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-stone-600 hover:text-stone-900 hover:bg-stone-100 px-2 py-1 rounded-lg"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MeetingHeader;