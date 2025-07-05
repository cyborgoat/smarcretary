"use client";

import MeetingRoom from "../components/meeting-room";
import { useSearchParams } from "next/navigation";
import { use } from "react";

export default function RoomPage({ params }: { params: Promise<{ "room-id": string }> }) {
  // Unwrap params Promise (Next.js 15+)
  const { "room-id": roomId } = use(params);
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "Guest";

  const handleLeave = () => {
    // Smooth transition back to home
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      <MeetingRoom 
        roomId={roomId} 
        userName={userName} 
        onLeave={handleLeave} 
      />
    </div>
  );
}
