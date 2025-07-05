# Smart Secretary - WebRTC Video Conferencing

A modern, real-time video conferencing application built with Next.js (frontend) and FastAPI (backend), featuring:

- WebRTC peer-to-peer video/audio
- WebSocket signaling
- Secure HTTPS/WSS for network access
- Modern UI with shadcn/ui components

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8.1 or higher
- Node.js 18 or higher
- npm or yarn
- (Recommended) Caddy for HTTPS frontend proxy: `brew install caddy`

### 1. Clone the repository

```bash
git clone <repository-url>
cd smarcretary
```

### 2. Setup Backend

```bash
cd backend/smartcretary
pip install -e .
```

### 3. Setup Frontend

```bash
cd ../../frontend
npm install
```

### 4. Configure Network & SSL (Recommended)

Run the setup script to auto-configure your local IP, generate SSL certs, and create a Caddyfile:

```bash
cd ..
./setup-network.sh
```

- This will generate valid self-signed certs for your IP, update env files, and create a Caddyfile for HTTPS frontend.
- If you want to do it manually, see below.

### 5. Start the Application

#### Backend (HTTPS)

```bash
cd backend/smartcretary
python main.py
# or
smartcretary/.venv/bin/uvicorn smartcretary.main:app --host 0.0.0.0 --port 8080 --ssl-certfile=cert.pem --ssl-keyfile=key.pem
```

#### Frontend (HTTPS via Caddy)

```bash
cd ../../frontend
PORT=3001 npm run dev
# In another terminal:
caddy run
```

#### Access:

- Local: https://localhost:3000
- Network: https://YOUR_IP:3000 (accept certificate warning)

---

## 🛠️ Development & Troubleshooting

- All configuration is handled by `setup-network.sh`.
- For camera/mic on remote devices, always use HTTPS/WSS and accept the cert in your browser.
- If you see WebSocket or certificate errors, ensure your cert was generated with the correct IP and is trusted in your OS/browser.
- See backend and frontend README files for more details.

---

## 📄 License

MIT
