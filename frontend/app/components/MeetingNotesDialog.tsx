import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Bot, FileText } from "lucide-react";

interface MeetingNotesDialogProps {
  notesOpen: boolean;
  userNotes: string;
  setUserNotes: (notes: string) => void;
  setNotesOpen: (open: boolean) => void;
  meetingNotes: string[];
}

const MeetingNotesDialog: React.FC<MeetingNotesDialogProps> = ({
  notesOpen,
  userNotes,
  setUserNotes,
  setNotesOpen,
  meetingNotes,
}) => {
  const [summaryUserNotes, setSummaryUserNotes] = useState<string>("");
  const [summaryMeetingNotes, setSummaryMeetingNotes] = useState<string>("");
  const [loadingUserNotes, setLoadingUserNotes] = useState(false);
  const [loadingMeetingNotes, setLoadingMeetingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to call backend summarize endpoint
  const summarize = async (text: string, setSummary: (s: string) => void, setLoading: (b: boolean) => void) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voice/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to summarize");
      }
      const data = await resp.json();
      setSummary(data.summary || "No summary returned.");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // Prompt for LLM to extract tasks at the end of summary
  const getTaskPrompt = (text: string) =>
    `Summarize the following meeting notes. At the end, if there are any tasks or action items mentioned, list them as bullet points and assign to the relevant person if possible.\n\n${text}`;

  const saveNotes = async () => {
    try {
      const notesToSave = {
        userNotes,
        meetingNotes: meetingNotes.join('\n'),
      };
      // Replace with actual save logic (e.g., API call)
      console.log("Saving notes:", notesToSave);
      alert("Notes saved successfully!");
    } catch (error) {
      console.error("Failed to save notes:", error);
      alert("Failed to save notes. Please try again.");
    }
  };

  if (!notesOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="h-full w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl border-0">
          <CardHeader className="relative border-b bg-gradient-to-r from-slate-50 to-stone-50 rounded-t-lg">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-8 w-8"
              onClick={() => setNotesOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <CardTitle className="text-center flex items-center justify-center gap-2 text-xl">
              <Bot className="h-5 w-5 text-blue-600" />
              Meeting Intelligence
            </CardTitle>
            
            <div className="flex justify-center gap-3 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingUserNotes || !userNotes.trim()}
                onClick={() => summarize(getTaskPrompt(userNotes), setSummaryUserNotes, setLoadingUserNotes)}
                className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              >
                <FileText className="h-4 w-4 mr-2" />
                {loadingUserNotes ? "Analyzing..." : "Summarize My Notes"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMeetingNotes || meetingNotes.length === 0}
                onClick={() => summarize(getTaskPrompt(meetingNotes.join('\n')), setSummaryMeetingNotes, setLoadingMeetingNotes)}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Bot className="h-4 w-4 mr-2" />
                {loadingMeetingNotes ? "Analyzing..." : "Summarize Transcription"}
              </Button>
            </div>
            
            {error && (
              <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mt-2">
                {error}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col md:flex-row min-h-0">
            {/* Left: User Notes */}
            <div className="flex-1 flex flex-col p-6 border-b md:border-b-0 md:border-r border-border">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-800">Your Notes</h3>
              </div>
              
              <textarea
                className="flex-1 w-full border border-input rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none bg-background"
                placeholder="Type your meeting notes here..."
                value={userNotes}
                onChange={e => setUserNotes(e.target.value)}
              />
              
              {summaryUserNotes && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 mb-2">Summary & Tasks</h4>
                  <div className="text-sm text-emerald-700 whitespace-pre-line max-h-32 overflow-auto">
                    {summaryUserNotes}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right: Voice Transcription */}
            <div className="flex-1 flex flex-col p-6">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-800">Voice Transcription</h3>
              </div>
              
              <textarea
                className="flex-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-muted/50 resize-none focus:outline-none"
                value={meetingNotes.join('\n')}
                placeholder="Voice transcription will appear here..."
                readOnly
              />
              
              {summaryMeetingNotes && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Summary & Tasks</h4>
                  <div className="text-sm text-blue-700 whitespace-pre-line max-h-32 overflow-auto">
                    {summaryMeetingNotes}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <div className="flex justify-end p-6 border-t border-border">
            <Button onClick={saveNotes} size="sm">
              Save Notes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MeetingNotesDialog;
