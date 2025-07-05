import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Smart Secretary WebRTC Backend", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://10.0.0.38:3000",
        "https://10.0.0.38:3000",
        "http://[YOUR-IP]:3000",
        "https://[YOUR-IP]:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebRTC Signaling & Room Management ---
from smartcretary.signaling.routes import router as signaling_router
app.include_router(signaling_router)

# --- Vision AI Endpoints (future) ---
# from smartcretary.vision.object_detection import router as vision_router
# app.include_router(vision_router)

# --- Voice/Transcription AI Endpoints (future) ---
# from smartcretary.voice.transcriber import router as voice_router
# app.include_router(voice_router)

@app.get("/")
async def root():
    return {"message": "Smart Secretary WebRTC Backend"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,
        ssl_keyfile="key.pem",
        ssl_certfile="cert.pem"
    )