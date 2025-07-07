import React from "react";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";

interface PiPVideoProps {
  pipParticipant: any;
  pipIdx: number;
  mainIdx: number;
  pipRef: React.RefObject<HTMLDivElement | null>;
  pipPosition: { x: number; y: number };
  isMobile: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  setIsMainVideoLocal: (v: boolean) => void;
  setSelectedParticipantId: (id: string) => void;
}

const PiPVideo: React.FC<PiPVideoProps> = ({
  pipParticipant,
  pipIdx,
  mainIdx,
  pipRef,
  pipPosition,
  isMobile,
  handleMouseDown,
  setIsMainVideoLocal,
  setSelectedParticipantId,
}) => {
  if (!pipParticipant || pipIdx === -1 || pipIdx === mainIdx) return null;
  return (
    <div
      className="absolute cursor-move bg-white/90 backdrop-blur-sm rounded-xl border-2 border-stone-300 shadow-lg z-20"
      ref={pipRef as React.RefObject<HTMLDivElement>}
      style={{
        left: pipPosition.x,
        top: pipPosition.y,
        width: isMobile ? 100 : 200,
        height: isMobile ? 75 : 150,
      }}
      onMouseDown={handleMouseDown}
      onClick={() => {
        setIsMainVideoLocal(pipParticipant.isLocal);
        if (!pipParticipant.isLocal) setSelectedParticipantId(pipParticipant.id);
      }}
    >
      <VideoThumbnail
        stream={pipParticipant.stream ?? undefined}
        name={pipParticipant.name}
        isMuted={pipParticipant.isMuted}
        isVideoOn={pipParticipant.isVideoOn}
        isLocal={pipParticipant.isLocal}
        selected={false}
        style={{ width: isMobile ? 100 : 200, height: isMobile ? 75 : 150 }}
      />
    </div>
  );
};

export default PiPVideo;
