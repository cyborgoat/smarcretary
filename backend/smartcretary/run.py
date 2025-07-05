#!/usr/bin/env python3
"""
Run script for Smart Secretary WebRTC Backend
"""
import uvicorn

if __name__ == "__main__":
    print("Starting Smart Secretary WebRTC Backend...")
    print("Server will be accessible at:")
    print("  - http://localhost:8080 (local)")
    print("  - http://10.0.0.37:8080 (network)")
    print("  - WebSocket: ws://localhost:8080/ws/{room_id}/{user_name}")
    print("  - Network WebSocket: ws://10.0.0.37:8080/ws/{room_id}/{user_name}")
    
    uvicorn.run(
        "main:app",  # Pass the application as an import string
        host="0.0.0.0",  # Listen on all interfaces
        port=8080,
        log_level="info",
        reload=True,  # Enable auto-reload for development
        workers=1, # Start with 1 worker, can be adjusted later
    ) 