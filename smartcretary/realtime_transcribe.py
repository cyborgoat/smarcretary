import argparse
import queue
import sys
import sounddevice as sd
import numpy as np
import whisper
import torch
import requests
import json
from threading import Thread
import time

# --- Application Configuration ---

# Default model size. Options: tiny, base, small, medium, large
DEFAULT_MODEL_SIZE = "base"
# Default language for transcription.
DEFAULT_LANGUAGE = "english"
# Default Ollama model for summarization.
DEFAULT_OLLAMA_MODEL = "llama3"
# The sample rate Whisper models expect.
WHISPER_SAMPLE_RATE = 16000
# The number of audio channels. Whisper expects mono.
CHANNELS = 1
# The data type for the audio samples.
DTYPE = "int16"
# How many audio frames to read at a time.
BLOCK_SIZE = 24678
# How many seconds of silence indicates the end of a phrase.
SILENCE_DURATION_S = 2
# The default energy threshold for detecting silence.
DEFAULT_SILENCE_THRESHOLD = 300

class RealtimeTranscriber:
    """
    A class to handle real-time audio recording and transcription.
    """
    def __init__(self, model_size=DEFAULT_MODEL_SIZE, language=DEFAULT_LANGUAGE, device="Sennheiser Profile, Core Audio",
                 silence_threshold=DEFAULT_SILENCE_THRESHOLD, verbose=False,
                 ollama_host=None, ollama_model=DEFAULT_OLLAMA_MODEL, playback=False):
        """
        Initializes the RealtimeTranscriber.
        """
        print("Initializing Realtime Transcriber...")
        self.model_size = model_size
        self.language = language
        self.device = device
        self.silence_threshold = silence_threshold
        self.verbose = verbose
        self.ollama_host = ollama_host
        self.ollama_model = ollama_model
        self.playback = playback

        self.audio_queue = queue.Queue()
        self.full_transcript = []
        self.model = None
        self.is_running = False
        self.processing_thread = None

        # Check for Apple Silicon (M1/M2/M3) MPS availability
        self.use_mps = torch.backends.mps.is_available()

    def _audio_callback(self, indata, frames, time, status):
        """This function is called by the sounddevice stream for each audio block."""
        if status:
            print(status, file=sys.stderr)
        self.audio_queue.put(indata.copy())

    def _calculate_rms(self, data):
        """Calculates the Root Mean Square of the audio data."""
        return np.sqrt(np.mean(data.astype(np.float64)**2))

    def _process_audio(self):
        """The main audio processing loop."""
        print("Audio processing thread started.")
        phrase_buffer = []
        silence_counter = 0
        num_silent_blocks_for_pause = int((SILENCE_DURATION_S * WHISPER_SAMPLE_RATE) / BLOCK_SIZE)

        while True:
            try:
                # Use a blocking get() to wait for audio data or a sentinel
                audio_data = self.audio_queue.get()
                if audio_data is None: # Check for the sentinel value to stop the thread
                    break

                rms = self._calculate_rms(audio_data)

                if self.verbose:
                    print(f"Current RMS: {int(rms)} \r", end="")

                is_silent = rms < self.silence_threshold

                if is_silent:
                    if len(phrase_buffer) > 0:
                        silence_counter += 1
                        if silence_counter >= num_silent_blocks_for_pause:
                            self._transcribe_phrase(phrase_buffer)
                            phrase_buffer = []
                            silence_counter = 0
                    continue

                phrase_buffer.append(audio_data)
                silence_counter = 0

            except queue.Empty:
                # This should not be reached with a blocking get(), but is safe to have.
                continue

        # After the loop, process any remaining audio in the buffer
        if len(phrase_buffer) > 0:
            self._transcribe_phrase(phrase_buffer)
        print("Audio processing thread finished.")

    def _transcribe_phrase(self, phrase_buffer):
        """Transcribe a complete phrase and optionally play it back."""
        if self.verbose:
            print("\n\nTranscribing...")

        phrase_audio_int16 = np.concatenate(phrase_buffer, axis=0)
        
        # Play back the recorded audio if the flag is set
        if self.playback:
            print("Playing back audio...")
            # sd.play is non-blocking, it will start playing and the code will continue
            sd.play(phrase_audio_int16, WHISPER_SAMPLE_RATE)

        phrase_audio_float32 = phrase_audio_int16.astype(np.float32) / 32768.0

        result = self.model.transcribe(
            phrase_audio_float32,
            language=self.language,
            fp16=self.use_mps
        )

        transcribed_text = result["text"].strip()
        if transcribed_text:
            print(">>", transcribed_text)
            self.full_transcript.append(transcribed_text)

    def summarize_transcript(self):
        """Summarizes the full transcript using the Ollama service."""
        if not self.ollama_host:
            print("\nOllama host not specified. Skipping summarization.")
            return

        if not self.full_transcript:
            print("\nNo text transcribed. Nothing to summarize.")
            return

        print("\n--- Summarizing Transcript with Ollama ---")
        full_text = " ".join(self.full_transcript)

        prompt = f"""
        Based on the following transcript, please provide a concise summary and a list of key insights or action items.
        Format the output clearly with "Summary:" and "Key Insights:" headings.

        Transcript:
        "{full_text}"
        """

        ollama_url = f"http://{self.ollama_host}:11434/api/generate"
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "stream": False
        }

        try:
            response = requests.post(ollama_url, json=payload, timeout=60)
            response.raise_for_status()

            summary_data = response.json()
            print("\n--- Ollama Insights ---")
            print(summary_data.get("response", "No response from Ollama."))
            print("-----------------------\n")

        except requests.exceptions.RequestException as e:
            print(f"\nError connecting to Ollama service at {self.ollama_host}: {e}")
        except Exception as e:
            print(f"\nAn error occurred during summarization: {e}")

    def start(self):
        """Starts the real-time transcription process."""
        print(f"Loading Whisper model: {self.model_size}...")
        # Load the model directly to CPU. The 'transcribe' method will handle GPU usage.
        self.model = whisper.load_model(self.model_size)
        print("Model loaded.")
        if self.use_mps:
            print("Apple Silicon (MPS) acceleration will be used for transcription.")

        self.is_running = True
        self.processing_thread = Thread(target=self._process_audio)
        self.processing_thread.daemon = True
        self.processing_thread.start()

        with sd.InputStream(
            samplerate=WHISPER_SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            device=self.device,
            channels=CHANNELS,
            dtype=DTYPE,
            callback=self._audio_callback
        ):
            print(f"\n--- Listening in {self.language}... Press Ctrl+C to stop. ---")
            while self.is_running:
                # Use a short sleep to prevent the main thread from consuming 100% CPU.
                time.sleep(0.1)

    def stop(self):
        """Stops the transcription process."""
        if self.is_running:
            self.is_running = False
            print("\n--- Stopping... ---")
            # Put a sentinel value in the queue to signal the processing thread to exit
            self.audio_queue.put(None)

def list_audio_devices():
    """Lists all available audio input devices."""
    print("Available audio input devices:")
    devices = sd.query_devices()
    for i, device in enumerate(devices):
        # Check if the device has input channels
        if device['max_input_channels'] > 0:
            print(f"  ID {i}: {device['name']}")

def main_cli():
    """Command-line interface to run the transcriber."""
    parser = argparse.ArgumentParser(description="Real-time speech-to-text with optional Ollama summarization.")
    parser.add_argument("--model", default=DEFAULT_MODEL_SIZE, help=f"Whisper model to use (default: {DEFAULT_MODEL_SIZE})")
    parser.add_argument("--language", default=DEFAULT_LANGUAGE, help=f"Language to transcribe (default: {DEFAULT_LANGUAGE})")
    parser.add_argument("--device", type=int, help="Input device ID to use.")
    parser.add_argument("--silence-threshold", type=int, default=DEFAULT_SILENCE_THRESHOLD, help=f"Energy threshold for detecting silence (default: {DEFAULT_SILENCE_THRESHOLD})")
    parser.add_argument('--verbose', action='store_true', help='Whether to print verbose output for debugging.')
    parser.add_argument("--ollama-host", default=None, help="Ollama service host IP address (e.g., 10.0.0.19).")
    parser.add_argument("--ollama-model", default=DEFAULT_OLLAMA_MODEL, help=f"Ollama model to use for summarization (default: {DEFAULT_OLLAMA_MODEL}).")
    parser.add_argument('--list-devices', action='store_true', help='List all available audio input devices and exit.')
    parser.add_argument('--playback', action='store_true', help='Enable audio playback of each transcribed phrase.')


    args_to_parse = sys.argv[1:]
    if args_to_parse and args_to_parse[0] == '--':
        args_to_parse = args_to_parse[1:]
    args = parser.parse_args(args_to_parse)

    if args.list_devices:
        list_audio_devices()
        return

    transcriber = RealtimeTranscriber(
        model_size=args.model,
        language=args.language,
        device=args.device,
        silence_threshold=args.silence_threshold,
        verbose=args.verbose,
        ollama_host=args.ollama_host,
        ollama_model=args.ollama_model,
        playback=args.playback
    )

    try:
        transcriber.start()
    except KeyboardInterrupt:
        transcriber.stop()
        if transcriber.processing_thread:
            print("Waiting for audio processing to finish...")
            transcriber.processing_thread.join()
        print("Processing complete.")
        if transcriber.ollama_host:
            transcriber.summarize_transcript()
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")

if __name__ == "__main__":
    main_cli()
