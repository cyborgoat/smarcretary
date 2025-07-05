"use client";

import MeetingRoom from "../components/meeting-room";
import { useSearchParams } from "next/navigation";
import { use } from "react";

export default function RoomPage({ params }: { params: Promise<{ "room-id": string }> }) {
  // Unwrap params Promise (Next.js 15+)
  const { "room-id": roomId } = use(params);
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "Guest";

  return <MeetingRoom roomId={roomId} userName={userName} onLeave={() => { window.location.href = "/"; }} />;
}
