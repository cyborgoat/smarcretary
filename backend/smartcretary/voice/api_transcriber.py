import os
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import whisper
import requests



# --- Ollama Configuration ---
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://10.0.0.19:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:latest")

# --- Whisper Model ---
WHISPER_MODEL = whisper.load_model("base")

class TranscribeResponse(BaseModel):
    text: str

class SummarizeRequest(BaseModel):
    text: str

class SummarizeResponse(BaseModel):
    summary: str

from fastapi import APIRouter

router = APIRouter()

@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmpfile:
        tmpfile.write(file.file.read())
        tmpfile_path = tmpfile.name
    try:
        result = WHISPER_MODEL.transcribe(tmpfile_path)
        text = result.get("text", "")
        os.remove(tmpfile_path)
        return {"text": text}
    except Exception as e:
        if os.path.exists(tmpfile_path):
            os.remove(tmpfile_path)
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/summarize", response_model=SummarizeResponse)
def summarize_text(req: SummarizeRequest):
    try:
        prompt = f"Please provide a concise summary of the following text:\n\n{req.text}"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
        }
        response = requests.post(OLLAMA_URL, json=payload, timeout=60)
        response.raise_for_status()
        response_data = response.json()
        summary = response_data.get("response", "No summary content received.")
        return {"summary": summary.strip()}
    except requests.exceptions.RequestException as e:
        return JSONResponse(status_code=500, content={"error": f"Ollama connection error: {e}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Unexpected error: {e}"})


# Optional: health check
@router.get("/health")
def health():
    return {"status": "ok"}
