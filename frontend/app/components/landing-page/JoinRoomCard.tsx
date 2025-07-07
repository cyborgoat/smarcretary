import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface JoinRoomCardProps {
  roomId: string;
  setRoomId: (value: string) => void;
  userName: string;
  setUserName: (value: string) => void;
  isLoading: boolean;
  handleJoinRoom: () => void;
  generateRoomId: () => void;
}

const JoinRoomCard: React.FC<JoinRoomCardProps> = ({
  roomId,
  setRoomId,
  userName,
  setUserName,
  isLoading,
  handleJoinRoom,
  generateRoomId,
}) => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Join a Meeting</CardTitle>
        <CardDescription className="text-gray-400">Enter a room ID to join an existing meeting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userName" className="text-white">
            Your Name
          </Label>
          <Input
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roomId" className="text-white">
            Room ID
          </Label>
          <div className="flex space-x-2">
            <Input
              id="roomId"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Enter room ID"
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            />
            <Button
              onClick={generateRoomId}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              Generate
            </Button>
          </div>
        </div>
        <Button
          onClick={handleJoinRoom}
          disabled={!roomId.trim() || !userName.trim() || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Joining..." : "Join Meeting"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default JoinRoomCard;