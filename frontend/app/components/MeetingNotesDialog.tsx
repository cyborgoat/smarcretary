"use client"

import * as React from "react"
import { useState } from "react"
import { Bot, FileText, NotebookPen, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"


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
  const [tab, setTab] = useState("personal")
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
    <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Meeting Notes</DialogTitle>
        <DialogDescription className="sr-only">
          View and manage your personal and meeting notes.
        </DialogDescription>
        <div className="flex flex-col md:flex-row h-[480px]">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-48 bg-muted/50 border-r border-border flex flex-row md:flex-col py-4">
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="flex md:flex-col w-full h-full bg-muted/50">
                <TabsTrigger value="personal" className="flex-1 flex items-center gap-2 px-4 py-3 md:py-2 md:px-2 text-base md:text-sm">
                  <NotebookPen className="h-5 w-5" />
                  <span className="hidden md:inline">Personal Notes</span>
                </TabsTrigger>
                <TabsTrigger value="meeting" className="flex-1 flex items-center gap-2 px-4 py-3 md:py-2 md:px-2 text-base md:text-sm">
                  <Users className="h-5 w-5" />
                  <span className="hidden md:inline">Meeting Notes</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
              <TabsContent value="personal" className="flex-1 flex flex-col p-6">
                <div className="flex items-center gap-2 mb-3">
                  <NotebookPen className="h-5 w-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Your Notes</h3>
                </div>
                <textarea
                  className="flex-1 w-full border border-input rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none bg-background"
                  placeholder="Type your meeting notes here..."
                  value={userNotes}
                  onChange={e => setUserNotes(e.target.value)}
                />
                <div className="flex gap-2 mt-4">
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
                  <Button onClick={saveNotes} size="sm" className="ml-auto">Save Notes</Button>
                </div>
                {summaryUserNotes && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h4 className="font-semibold text-emerald-800 mb-2">Summary & Tasks</h4>
                    <div className="text-sm text-emerald-700 whitespace-pre-line max-h-32 overflow-auto">
                      {summaryUserNotes}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="meeting" className="flex-1 flex flex-col p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Meeting Notes</h3>
                </div>
                <textarea
                  className="flex-1 w-full border border-input rounded-md px-3 py-2 text-sm bg-muted/50 resize-none focus:outline-none"
                  value={meetingNotes.join('\n')}
                  placeholder="Voice transcription will appear here..."
                  readOnly
                />
                <div className="flex gap-2 mt-4">
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
                {summaryMeetingNotes && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Summary & Tasks</h4>
                    <div className="text-sm text-blue-700 whitespace-pre-line max-h-32 overflow-auto">
                      {summaryMeetingNotes}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            {error && (
              <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mt-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingNotesDialog;
