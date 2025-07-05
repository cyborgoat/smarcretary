import os
import queue
import tempfile
import threading
import tkinter as tk
from tkinter import scrolledtext

import numpy as np
import requests
import sounddevice as sd
import whisper
from scipy.io.wavfile import write


class SpeechToTextApp:
    """
    A simple GUI application for chunk-based speech-to-text transcription
    with summarization via a local Ollama service, using OpenAI Whisper.
    """

    def __init__(self, root):
        self.root = root
        self.root.title("Python Voice Transcriber & Summarizer (Whisper)")
        self.root.geometry("700x600")

        # --- Ollama Configuration ---
        self.ollama_url = "http://10.0.0.19:11434/api/generate"
        self.ollama_model = "llama3.2:latest"

        # --- Whisper Model ---
        self.whisper_model = whisper.load_model("base")

        # --- State Variables ---
        self.is_listening = False
        self.recording_thread = None
        self.audio_data = []
        self.fs = 16000  # Sample rate
        self.temp_wav_path = None
        self.stop_recording_flag = threading.Event()

        # --- UI Elements ---
        self.status_label = tk.Label(
            root, text="Initializing...", font=("Helvetica", 12), wraplength=650
        )
        self.status_label.pack(pady=5)

        tk.Label(root, text="Live Transcription:", font=("Helvetica", 10, "bold")).pack(
            pady=(10, 0)
        )
        self.transcription_text = scrolledtext.ScrolledText(
            root, font=("Helvetica", 14), wrap=tk.WORD, state=tk.DISABLED, height=10
        )
        self.transcription_text.pack(pady=5, padx=10, expand=True, fill=tk.BOTH)

        self.toggle_button = tk.Button(
            root,
            text="Start Listening",
            command=self.toggle_listening,
            font=("Helvetica", 12, "bold"),
            width=20,
        )
        self.toggle_button.pack(pady=5)

        tk.Label(root, text="Summary:", font=("Helvetica", 10, "bold")).pack(
            pady=(10, 0)
        )
        self.summary_text = scrolledtext.ScrolledText(
            root,
            font=("Helvetica", 12, "italic"),
            wrap=tk.WORD,
            state=tk.DISABLED,
            height=5,
        )
        self.summary_text.pack(pady=5, padx=10, expand=True, fill=tk.BOTH)

        # --- Queues for Thread-Safe GUI Updates ---
        self.transcription_queue = queue.Queue()
        self.summary_queue = queue.Queue()

        # --- Initialization ---
        self.root.after(100, self.initialize_components)
        self.root.after(200, self.process_queues)

    def initialize_components(self):
        self.update_status("Click 'Start Listening' to begin.", "black")
        self.toggle_button.config(state=tk.NORMAL)

    def toggle_listening(self):
        if self.is_listening:
            self.stop_recording()
        else:
            self.start_recording()

    def start_recording(self):
        self.is_listening = True
        self.toggle_button.config(text="Stop Listening")
        self.clear_text_widget(self.transcription_text)
        self.clear_text_widget(self.summary_text)
        self.audio_data = []
        self.stop_recording_flag.clear()
        self.update_status("Recording... Press 'Stop Listening' to finish.", "green")
        self.recording_thread = threading.Thread(target=self._record_audio, daemon=True)
        self.recording_thread.start()

    def _record_audio(self):
        def callback(indata, frames, time, status):
            if status:
                print(status)
            self.audio_data.append(indata.copy())
            if self.stop_recording_flag.is_set():
                raise sd.CallbackStop()
        try:
            with sd.InputStream(samplerate=self.fs, channels=1, dtype='int16', callback=callback):
                while not self.stop_recording_flag.is_set():
                    sd.sleep(100)
        except Exception as e:
            self.update_status(f"Recording error: {e}", "red")
            self.is_listening = False
            self.toggle_button.config(text="Start Listening")

    def stop_recording(self):
        self.stop_recording_flag.set()
        if self.recording_thread:
            self.recording_thread.join()
        self.is_listening = False
        self.toggle_button.config(text="Start Listening")
        self.update_status("Recording stopped. Transcribing...", "blue")
        # Save audio to temp WAV file
        if self.audio_data:
            audio_np = np.concatenate(self.audio_data, axis=0)
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmpfile:
                write(tmpfile.name, self.fs, audio_np)
                self.temp_wav_path = tmpfile.name
            threading.Thread(
                target=self.transcribe_audio,
                args=(self.temp_wav_path,),
                daemon=True,
            ).start()
        else:
            self.update_status("No audio recorded.", "black")

    def transcribe_audio(self, wav_path):
        try:
            result = self.whisper_model.transcribe(wav_path)
            text = result.get("text", "")
            self.transcription_queue.put(f"{text}\n")
            # Optionally, delete the temp file
            os.remove(wav_path)
        except Exception as e:
            self.transcription_queue.put(f"Transcription error: {e}\n")

    def summarize_text(self, text_to_summarize):
        try:
            prompt = (
                f"Please provide a concise summary of the following text:\n\n{text_to_summarize}"
            )
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,  # We want the full response at once
            }
            response = requests.post(self.ollama_url, json=payload, timeout=60)
            response.raise_for_status()  # Raise an exception for bad status codes
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
        while not self.transcription_queue.empty():
            text_to_add = self.transcription_queue.get()
            self.update_text_widget(self.transcription_text, text_to_add)
            # After transcription, trigger summarization
            full_text = self.transcription_text.get("1.0", tk.END).strip()
            if full_text:
                self.update_status(
                    f"Sending {len(full_text.split())} words for summarization...", "blue"
                )
                threading.Thread(
                    target=self.summarize_text, args=(full_text,), daemon=True
                ).start()
        while not self.summary_queue.empty():
            summary_to_add = self.summary_queue.get()
            self.clear_text_widget(self.summary_text)
            self.update_text_widget(self.summary_text, summary_to_add)
            self.update_status("Summary received.", "green")
        self.root.after(100, self.process_queues)

    def update_text_widget(self, text_widget, content):
        text_widget.config(state=tk.NORMAL)
        text_widget.insert(tk.END, content)
        text_widget.see(tk.END)
        text_widget.config(state=tk.DISABLED)

    def clear_text_widget(self, text_widget):
        text_widget.config(state=tk.NORMAL)
        text_widget.delete("1.0", tk.END)
        text_widget.config(state=tk.DISABLED)

    def update_status(self, message, color="black"):
        self.root.after(0, lambda: self.status_label.config(text=message, fg=color))


if __name__ == "__main__":
    root = tk.Tk()
    app = SpeechToTextApp(root)
    root.mainloop()
