import tkinter as tk
from tkinter import scrolledtext
import speech_recognition as sr
import threading
import queue
import requests
import json

class SpeechToTextApp:
    """
    A simple GUI application for real-time speech-to-text transcription
    with summarization via a local Ollama service.
    """
    def __init__(self, root):
        self.root = root
        self.root.title("Python Voice Transcriber & Summarizer")
        self.root.geometry("700x600")

        # --- Ollama Configuration ---
        self.ollama_url = "http://10.0.0.19:11434/api/generate"
        self.ollama_model = "llama3.2:latest"

        # --- State Variables ---
        self.is_listening = False
        self.recognizer = None
        self.microphone = None
        self.stop_listening = None

        # --- UI Elements ---
        self.status_label = tk.Label(root, text="Initializing...", font=("Helvetica", 12), wraplength=650)
        self.status_label.pack(pady=5)

        tk.Label(root, text="Live Transcription:", font=("Helvetica", 10, "bold")).pack(pady=(10,0))
        self.transcription_text = scrolledtext.ScrolledText(root, font=("Helvetica", 14), wrap=tk.WORD, state=tk.DISABLED, height=10)
        self.transcription_text.pack(pady=5, padx=10, expand=True, fill=tk.BOTH)

        self.toggle_button = tk.Button(root, text="Start Listening", command=self.toggle_listening, font=("Helvetica", 12, "bold"), width=20)
        self.toggle_button.pack(pady=5)

        tk.Label(root, text="Summary:", font=("Helvetica", 10, "bold")).pack(pady=(10,0))
        self.summary_text = scrolledtext.ScrolledText(root, font=("Helvetica", 12, "italic"), wrap=tk.WORD, state=tk.DISABLED, height=5)
        self.summary_text.pack(pady=5, padx=10, expand=True, fill=tk.BOTH)
        
        # --- Queues for Thread-Safe GUI Updates ---
        self.transcription_queue = queue.Queue()
        self.summary_queue = queue.Queue()
        
        # --- Initialization ---
        self.root.after(100, self.initialize_speech_components)
        self.root.after(200, self.process_queues)

    def initialize_speech_components(self):
        """Initializes the speech recognizer and microphone."""
        try:
            self.recognizer = sr.Recognizer()
            self.recognizer.pause_threshold = 0.5
            self.recognizer.dynamic_energy_threshold = True
            self.microphone = sr.Microphone()
            with self.microphone as source: pass
            self.update_status("Click 'Start Listening' to begin.", "black")
            self.toggle_button.config(state=tk.NORMAL)
        except Exception as e:
            error_msg = f"Error: Could not find a microphone. Please ensure it's connected and PyAudio is installed.\nDetails: {e}"
            self.update_status(error_msg, "red")
            self.toggle_button.config(state=tk.DISABLED)

    def toggle_listening(self):
        """Handles the start/stop button clicks."""
        if self.is_listening:
            self.stop_background_listening()
        else:
            self.start_background_listening()

    def start_background_listening(self):
        """Starts listening for speech in a separate thread."""
        self.is_listening = True
        self.toggle_button.config(text="Stop Listening")
        # Clear previous text
        self.clear_text_widget(self.transcription_text)
        self.clear_text_widget(self.summary_text)
        threading.Thread(target=self._listen_in_background, daemon=True).start()

    def _listen_in_background(self):
        """Core listening logic that runs in a background thread."""
        if not self.recognizer or not self.microphone:
            self.update_status("Recognizer not initialized.", "red")
            self.root.after(0, self.stop_background_listening)
            return
        self.update_status("Listening...", "green")
        self.stop_listening = self.recognizer.listen_in_background(self.microphone, self.recognition_callback, phrase_time_limit=10)

    def recognition_callback(self, recognizer, audio):
        """Called by the background listener when speech is detected."""
        try:
            text = recognizer.recognize_google(audio)
            self.transcription_queue.put(f"{text} ")
        except sr.UnknownValueError:
            pass
        except sr.RequestError as e:
            self.transcription_queue.put(f"API Error: {e}\n")

    def stop_background_listening(self):
        """Stops the background listening process and triggers summarization."""
        if self.stop_listening:
            self.stop_listening(wait_for_stop=False)
            self.stop_listening = None
        self.is_listening = False
        self.toggle_button.config(text="Start Listening")
        self.update_status("Listener stopped. Checking for text to summarize...", "black")

        # Get transcribed text and request summary
        full_text = self.transcription_text.get("1.0", tk.END).strip()
        if full_text:
            self.update_status(f"Sending {len(full_text.split())} words for summarization...", "blue")
            threading.Thread(target=self.summarize_text, args=(full_text,), daemon=True).start()
        else:
            self.update_status("No text to summarize.", "black")

    def summarize_text(self, text_to_summarize):
        """Sends text to Ollama and puts the summary in a queue."""
        try:
            prompt = f"Please provide a concise summary of the following text:\n\n{text_to_summarize}"
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False # We want the full response at once
            }
            response = requests.post(self.ollama_url, json=payload, timeout=60)
            response.raise_for_status() # Raise an exception for bad status codes
            
            # The response from stream=False is a single JSON object
            response_data = response.json()
            summary = response_data.get("response", "No summary content received.")
            self.summary_queue.put(summary.strip())

        except requests.exceptions.RequestException as e:
            error_message = f"Ollama connection error: {e}"
            self.summary_queue.put(error_message)
        except Exception as e:
            error_message = f"An unexpected error occurred during summarization: {e}"
            self.summary_queue.put(error_message)

    def process_queues(self):
        """Periodically checks both queues to update the GUI."""
        # Process transcription queue
        while not self.transcription_queue.empty():
            text_to_add = self.transcription_queue.get()
            self.update_text_widget(self.transcription_text, text_to_add)
        
        # Process summary queue
        while not self.summary_queue.empty():
            summary_to_add = self.summary_queue.get()
            self.clear_text_widget(self.summary_text)
            self.update_text_widget(self.summary_text, summary_to_add)
            self.update_status("Summary received.", "green")

        self.root.after(100, self.process_queues)

    def update_text_widget(self, text_widget, content):
        """Helper to append text to a ScrolledText widget."""
        text_widget.config(state=tk.NORMAL)
        text_widget.insert(tk.END, content)
        text_widget.see(tk.END)
        text_widget.config(state=tk.DISABLED)

    def clear_text_widget(self, text_widget):
        """Helper to clear a ScrolledText widget."""
        text_widget.config(state=tk.NORMAL)
        text_widget.delete("1.0", tk.END)
        text_widget.config(state=tk.DISABLED)

    def update_status(self, message, color="black"):
        """Thread-safe method to update the status label."""
        self.root.after(0, lambda: self.status_label.config(text=message, fg=color))

if __name__ == "__main__":
    root = tk.Tk()
    app = SpeechToTextApp(root)
    root.mainloop()
