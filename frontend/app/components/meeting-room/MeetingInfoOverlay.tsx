import React from "react";

interface MeetingInfoOverlayProps {
  participantCount: number;
  currentTime: string;
}

const MeetingInfoOverlay: React.FC<MeetingInfoOverlayProps> = ({ participantCount, currentTime }) => (
  <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 z-20">
    <p className="text-white text-xs">
      {participantCount} participants • {currentTime}
    </p>
  </div>
);

export default MeetingInfoOverlay;
