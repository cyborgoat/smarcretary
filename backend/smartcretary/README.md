# Smart Secretary Backend

This is the backend for the Smart Secretary WebRTC Video Conferencing application.
It is built with FastAPI and provides WebSocket signaling and REST APIs for real-time video meetings.

## Features

- WebSocket signaling for WebRTC peer-to-peer connections
- Room and participant management
- REST API for room listing and health checks
- CORS support for local and network access
- HTTPS support with self-signed certificates for secure camera/mic access

## Requirements

- Python 3.8.1 or higher
- pip

## Setup

1. **Install dependencies**

   ```bash
   pip install -e .
   ```

2. **Generate self-signed SSL certificates** (if not already present):

   ```bash
   # Use setup-network.sh from the project root for best results
   # Or manually:
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
     -subj "/CN=YOUR_IP" -addext "subjectAltName=IP:YOUR_IP"
   ```

3. **Run the backend server (HTTPS)**

   ```bash
   python main.py
   # or
   smartcretary/.venv/bin/uvicorn smartcretary.main:app --host 0.0.0.0 --port 8080 --ssl-certfile=cert.pem --ssl-keyfile=key.pem
   ```

   The server will be available at `https://YOUR_IP:8080`.

## Endpoints

- `GET /` — Welcome message
- `GET /health` — Health check
- `GET /rooms` — List active rooms
- `GET /rooms/{room_id}` — Get room details
- `WS /ws/{room_id}/{user_name}` — WebSocket signaling endpoint

## Network Access

- Accept the self-signed certificate in your browser for HTTPS/WSS to work.
- Ensure ports 8080 (backend) and 3000 (frontend) are open on your firewall.

## Development

- Main code: `main.py`
- For troubleshooting, see the main project README.

## License

MIT
