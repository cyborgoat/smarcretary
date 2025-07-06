import React, { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crown, MessageCircle, Mic, MicOff, Send, Users, Video, VideoOff } from "lucide-react";

interface Message {
  id: string;
  user: string;
  content: string;
  timestamp: Date;
  userId: string;
}

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOn: boolean;
  stream?: MediaStream;
}

interface MeetingSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  messages: Message[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  sendMessage: () => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  hydrated: boolean;
  isConnected: boolean;
  userName: string;
  isHost: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  participants: Participant[];
  selectedParticipantId: string | null;
  setSelectedParticipantId: (id: string) => void;
  mutedParticipants: { [id: string]: boolean };
  hostName: string;
}

export default function MeetingSidebar({
  activeTab,
  setActiveTab,
  messages,
  newMessage,
  setNewMessage,
  sendMessage,
  handleKeyPress,
  hydrated,
  isConnected,
  userName,
  isHost,
  isMuted,
  isVideoOn,
  participants,
  selectedParticipantId,
  setSelectedParticipantId,
  mutedParticipants,
  hostName,
}: MeetingSidebarProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadParticipants, setUnreadParticipants] = useState(0);
  const prevMessagesCount = useRef(messages.length);
  const prevParticipantsCount = useRef(participants.length);

  // Unread message indicator
  useEffect(() => {
    if (activeTab === "chat") {
      setUnreadMessages(0);
    } else if (messages.length > prevMessagesCount.current) {
      setUnreadMessages((u) => u + (messages.length - prevMessagesCount.current));
    }
    prevMessagesCount.current = messages.length;
  }, [messages.length, activeTab]);

  // Unread participant indicator
  useEffect(() => {
    if (activeTab === "participants") {
      setUnreadParticipants(0);
    } else if (participants.length > prevParticipantsCount.current) {
      setUnreadParticipants((u) => u + (participants.length - prevParticipantsCount.current));
    }
    prevParticipantsCount.current = participants.length;
  }, [participants.length, activeTab]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Responsive sidebar: relative positioning for mobile, fixed width for desktop
  // Remove 'fixed' for mobile, use flexbox stacking
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return (
    <div
      className={
        isMobile
          ? 'w-full max-w-full border-l-0 border-t border-stone-200/50 bg-white/80 backdrop-blur-sm flex flex-col z-40 h-[50vh] min-h-[320px] relative'
          : 'w-80 bg-white/80 backdrop-blur-sm border-l border-stone-200/50 flex flex-col'
      }
      style={isMobile ? { position: 'relative', bottom: 'unset', left: 'unset', right: 'unset' } : {}}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="flex w-full min-w-0 px-2 py-1 gap-2 bg-stone-100 relative">
          <TabsTrigger value="chat" className="flex-1 min-w-0 flex items-center justify-center space-x-2 text-stone-700 relative truncate">
            <MessageCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Chat</span>
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-2 inline-block w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex-1 min-w-0 flex items-center justify-center space-x-2 text-stone-700 relative truncate">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">People ({participants.length + 1})</span>
            {unreadParticipants > 0 && (
              <span className="absolute -top-1 -right-2 inline-block w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col m-2 mt-0">
          <Card className="flex-1 flex flex-col bg-white/60 border-stone-200">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-stone-200 text-stone-700">
                        {message.user
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-stone-900">{message.user}</span>
                        <span className="text-xs text-stone-500">{formatTime(message.timestamp)}</span>
                      </div>
                      <p className="text-sm text-stone-700 mt-1 break-words">{message.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-stone-200">
              <div className="flex space-x-2">
                {hydrated && (
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 bg-stone-50 border-stone-200 text-stone-900 placeholder-stone-400"
                    disabled={!isConnected}
                  />
                )}
                <Button onClick={sendMessage} size="sm" disabled={!isConnected || !newMessage.trim()} className="bg-stone-700 hover:bg-stone-800">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="flex-1 m-2 mt-0">
          <Card className="h-full bg-white/60 border-stone-200">
            <ScrollArea className="h-full p-4">
              <div className="space-y-3">
                {/* Current User */}
                <div className="flex items-center space-x-3 p-2 rounded-lg bg-stone-100">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-stone-600 text-white">
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-stone-900 truncate">{userName} (You)</span>
                      {userName === hostName && (
                        <span title="Host" className="inline-flex items-center ml-1"><Crown className="h-4 w-4 text-amber-500" /></span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      {isMuted ? (
                        <MicOff className="h-3 w-3 text-red-400" />
                      ) : (
                        <Mic className="h-3 w-3 text-green-500" />
                      )}
                      {isVideoOn ? (
                        <Video className="h-3 w-3 text-green-500" />
                      ) : (
                        <VideoOff className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Participants */}
                {participants.map((participant) => {
                  const isParticipantHost = participant.name === hostName;
                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center space-x-3 p-2 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer ${selectedParticipantId === participant.id ? 'bg-stone-200' : ''}`}
                      onClick={() => setSelectedParticipantId(participant.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-stone-200 text-stone-700">
                          {participant.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-stone-900 truncate flex items-center">
                          {participant.name}
                          {isParticipantHost && (
                            <span title="Host" className="inline-flex items-center ml-1"><Crown className="h-4 w-4 text-amber-500" /></span>
                          )}
                        </span>
                        <div className="flex items-center space-x-1 mt-1">
                          {participant.isMuted ? (
                            <MicOff className="h-3 w-3 text-red-400" />
                          ) : (
                            <Mic className="h-3 w-3 text-green-500" />
                          )}
                          {participant.isVideoOn ? (
                            <Video className="h-3 w-3 text-green-500" />
                          ) : (
                            <VideoOff className="h-3 w-3 text-red-400" />
                          )}
                        </div>
                      </div>
                      {/* Select to watch icon (not for self) */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 p-1 h-7 w-7 text-stone-500 hover:text-stone-700"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedParticipantId(participant.id);
                        }}
                        aria-label="Select to watch"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </Button>
                      {/* Mute/unmute button for remote participant - only host can control others */}
                      <Button
                        variant={mutedParticipants[participant.id] ? "destructive" : "secondary"}
                        size="icon"
                        className="ml-1 p-1 h-7 w-7"
                        onClick={e => { e.stopPropagation(); /* handleMuteParticipant(participant.id) to be passed if needed */ }}
                        aria-label={mutedParticipants[participant.id] ? "Unmute participant" : "Mute participant"}
                        disabled={!isHost}
                        title={isHost ? undefined : "Only the host can mute others"}
                      >
                        {mutedParticipants[participant.id] ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </Button>
                      {/* Video on/off button for remote participant - only host can control others */}
                      <Button
                        variant={participant.isVideoOn ? "secondary" : "destructive"}
                        size="icon"
                        className="ml-1 p-1 h-7 w-7"
                        onClick={e => { e.stopPropagation(); /* handleDisableVideo(participant.id) to be passed if needed */ }}
                        aria-label={participant.isVideoOn ? "Disable video" : "Enable video"}
                        disabled={!isHost}
                        title={isHost ? undefined : "Only the host can disable video for others"}
                      >
                        {participant.isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
