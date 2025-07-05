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

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd smarcretary
   ```

2. **Setup Backend**

   ```bash
   cd backend/smartcretary
   pip install -e .
   ```

3. **Setup Frontend**

   ```bash
   cd ../../frontend
   npm install
   ```

4. **Generate SSL Certificates (Required for Network Access)**

   ```bash
   cd backend/smartcretary
   # Generate self-signed certificates for HTTPS/WSS
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
   
   # For network access from other devices, also generate with your IP
   # Replace YOUR_IP with your actual IP address
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
     -subj "/CN=YOUR_IP" -addext "subjectAltName=DNS:localhost,IP:YOUR_IP,IP:127.0.0.1"
   ```

5. **Configure for Network Access**

   ```bash
   # Run from project root to auto-configure network settings
   ./setup-network.sh
   
   # Or manually update frontend/.env.local with your network IP:
   # For HTTP (local):
   # NEXT_PUBLIC_WS_URL=ws://localhost:8080
   # NEXT_PUBLIC_WS_URL_NETWORK=ws://YOUR_IP:8080
   # NEXT_PUBLIC_API_URL=http://localhost:8080
   # NEXT_PUBLIC_API_URL_NETWORK=http://YOUR_IP:8080
   # For HTTPS (network):
   # NEXT_PUBLIC_WS_URL=wss://YOUR_IP:8080
   # NEXT_PUBLIC_API_URL=https://YOUR_IP:8080
   ```

6. **Install Caddy (For HTTPS Frontend)**

   ```bash
   # macOS
   brew install caddy
   
   # Ubuntu/Debian
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

### Running the Application

#### Localhost Only

1. **Start Backend**

   ```bash
   cd backend/smartcretary
   python main.py
   ```

2. **Start Frontend**

   ```bash
   cd ../../frontend
   npm run dev
   ```

3. **Access**: [http://localhost:3000](http://localhost:3000)

#### Network Access (Other Devices)

1. **Start Backend (HTTPS)**

   ```bash
   cd backend/smartcretary
   python main.py
   ```

2. **Start Frontend (HTTPS via Caddy)**

   ```bash
   cd ../../frontend
   npm run dev -- -p 3001
   # In another terminal:
   caddy run
   ```

3. **Access**: https://[YOUR-IP]:3000 (accept certificate warning)

---

## 🖥️ Features

- Join/leave rooms, see yourself and selected participant's video
- Audio and video transferred peer-to-peer
- Volume control for each remote participant
- Modern, accessible UI (shadcn/ui)
- Chat and participant list

---

## 🛠 Development

### Architecture

- **Frontend**: Next.js with shadcn/ui components
- **Backend**: FastAPI with WebSocket signaling
- **WebRTC**: Peer-to-peer video/audio with STUN servers

### Key Files

- Frontend: `frontend/app/components/meeting-room.tsx`, `frontend/app/hooks/useWebRTC.ts`, `frontend/app/hooks/useSocket.ts`
- Backend: `backend/smartcretary/main.py`
- UI: shadcn/ui components in `frontend/components/ui/`

### HTTPS Certificate Setup Details

WebRTC requires HTTPS for camera/microphone access from remote devices. Here's the complete setup:

1. **Backend SSL Certificates**

   ```bash
   cd backend/smartcretary
   # Basic localhost cert
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
   
   # Network access cert (replace YOUR_IP with actual IP)
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
     -subj "/CN=YOUR_IP" -addext "subjectAltName=DNS:localhost,IP:YOUR_IP,IP:127.0.0.1"
   ```

2. **Frontend HTTPS Proxy (Caddyfile)**

   ```bash
   cd frontend
   # Create Caddyfile
   echo "localhost:3000 {
     tls internal
     reverse_proxy localhost:3001
   }" > Caddyfile
   ```

3. **Environment Configuration**

   ```bash
   # frontend/.env.local (created by setup-network.sh or manually)
   NEXT_PUBLIC_WS_URL=wss://YOUR_IP:8080/ws
   NEXT_PUBLIC_API_URL=https://YOUR_IP:8080
   ```

4. **Certificate Trust (For Development)**
   - **Chrome/Edge**: Visit https://YOUR_IP:8080 and https://YOUR_IP:3000, click "Advanced" → "Proceed to site"
   - **Safari**: Visit both URLs, click "Show Details" → "Visit Website"
   - **Firefox**: Visit both URLs, click "Advanced" → "Accept Risk"

---

## 🔧 Troubleshooting

### Common Issues

1. **Camera/Microphone Access Denied**
   - Ensure HTTPS is used for network access
   - Check browser permissions
   - Try refreshing and allowing access

2. **WebRTC Negotiation Errors**
   - Fixed with negotiation guards in `useWebRTC.ts`
   - Prevents simultaneous offer/answer creation

3. **Certificate Warnings**
   - Normal for self-signed certificates
   - Accept in browser for testing
   - Consider proper CA certificates for production

4. **Network Access Issues**
   - Check firewall: ports 3000, 8080 must be open
   - Verify IP address in configuration
   - Ensure all devices on same network

5. **Audio/Video Not Working**
   - Check browser console for errors
   - Verify media permissions granted
   - Test with simple localhost setup first

---

## 📄 License

MIT
