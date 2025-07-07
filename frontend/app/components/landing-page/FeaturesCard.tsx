import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, MessageCircle, Shield } from "lucide-react";

const FeaturesCard: React.FC = () => {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Features</CardTitle>
        <CardDescription className="text-gray-400">Everything you need for productive meetings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 text-white">
          <Video className="h-5 w-5 text-blue-400" />
          <span>HD Video & Audio</span>
        </div>
        <div className="flex items-center space-x-3 text-white">
          <MessageCircle className="h-5 w-5 text-green-400" />
          <span>Real-time Chat</span>
        </div>
        <div className="flex items-center space-x-3 text-white">
          <Users className="h-5 w-5 text-purple-400" />
          <span>Multiple Participants</span>
        </div>
        <div className="flex items-center space-x-3 text-white">
          <Shield className="h-5 w-5 text-red-400" />
          <span>Secure & Private</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturesCard;