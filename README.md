# Smart Secretary - WebRTC Video Conferencing

A real-time video conferencing application built with Next.js frontend and FastAPI backend, featuring WebRTC peer-to-peer connections and WebSocket signaling.

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
   cd frontend
   npm install
   ```

4. **Configure for Network Access (Optional)**
   ```bash
   # Run from project root
   ./setup-network.sh
   ```

### Running the Application

#### Option 1: Local Development (Localhost Only)

1. **Start Backend**
   ```bash
   cd backend/smartcretary
   python run.py
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access the application**
   - Open http://localhost:3000

#### Option 2: Network Access (Other Devices)

1. **Start Backend**
   ```bash
   cd backend/smartcretary
   python run.py
   ```

2. **Start Frontend with HTTPS (for camera access)**
   ```bash
   cd frontend
   npm run dev:https
   ```

3. **Access the application**
   - Local: https://localhost:3000
   - Network: https://[YOUR-IP]:3000 (e.g., https://10.0.0.37:3000)

## 🔧 Troubleshooting

### WebSocket Connection Issues

**Problem**: "WebSocket connection failed" or "WebSocket is closed before connection is established"

**Solutions**:
1. Ensure backend server is running on port 8080
2. Check if port 8080 is available: `lsof -i :8080`
3. Verify WebSocket URL in browser console
4. Try refreshing the page
5. Check firewall settings

### Camera/Microphone Access Issues

**Problem**: "Failed to access camera/microphone. Please check permissions."

**Solutions**:
1. **For localhost**: Grant camera/microphone permissions in browser
2. **For network access**: Use HTTPS (required by browsers for security)
   ```bash
   cd frontend
   npm run dev:https
   ```
3. **Accept self-signed certificate**: Click "Advanced" → "Proceed to [IP] (unsafe)"
4. **Check device availability**: Ensure camera/microphone aren't used by other apps

### Network Access Issues

**Problem**: Other devices can't join the meeting

**Solutions**:
1. **Run network setup script**:
   ```bash
   ./setup-network.sh
   ```

2. **Manual configuration**:
   - Update `frontend/.env.local` with your IP address
   - Update backend CORS settings in `main.py`

3. **Check network connectivity**:
   ```bash
   # Test from another device
   curl http://[YOUR-IP]:8080/health
   ```

4. **Firewall configuration**:
   - Ensure ports 3000 and 8080 are open
   - Check router/firewall settings

### Common Issues

#### Backend Won't Start
```bash
# Check Python version
python --version

# Install dependencies
cd backend/smartcretary
pip install -e .

# Check for port conflicts
lsof -i :8080
```

#### Frontend Won't Start
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
```

#### HTTPS Certificate Warnings
- This is normal for self-signed certificates
- Click "Advanced" → "Proceed to [domain] (unsafe)"
- Required for camera/microphone access from network devices

## 🌐 Network Configuration

### Automatic Setup
```bash
./setup-network.sh
```

### Manual Setup

1. **Find your IP address**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **Update frontend environment**:
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8080
   NEXT_PUBLIC_WEBSOCKET_URL_NETWORK=ws://[YOUR-IP]:8080
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_API_URL_NETWORK=http://[YOUR-IP]:8080
   ```

3. **Update backend CORS settings**:
   ```python
   # backend/smartcretary/main.py
   allow_origins=[
       "http://localhost:3000",
       "https://localhost:3000",
       "http://[YOUR-IP]:3000",
       "https://[YOUR-IP]:3000",
   ]
   ```

## 🔐 Security Notes

- **HTTPS Required**: Camera/microphone access requires HTTPS for network connections
- **Self-signed Certificates**: Development uses self-signed certificates
- **Local Network Only**: Current configuration is for local network access only
- **No Authentication**: This is a development setup without user authentication

## 📱 Usage

1. **Create/Join Room**:
   - Enter room ID and your name
   - Click "Join Room"

2. **Share Room**:
   - Click "Share Room" to copy meeting link
   - Send link to other participants

3. **Controls**:
   - Mute/unmute microphone
   - Turn camera on/off
   - Send chat messages
   - View participants

## 🛠 Development

### Architecture
- **Frontend**: Next.js 15 with TypeScript
- **Backend**: FastAPI with WebSocket support
- **WebRTC**: Peer-to-peer connections for video/audio
- **Signaling**: WebSocket for connection establishment

### Key Files
- `frontend/app/hooks/useWebRTC.ts` - WebRTC implementation
- `frontend/app/hooks/useSocket.ts` - WebSocket client
- `backend/smartcretary/main.py` - FastAPI server
- `frontend/app/components/meeting-room.tsx` - Main UI component

### Adding Features
1. Fork the repository
2. Create feature branch
3. Implement changes
4. Test locally and on network
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For issues and questions:
1. Check this README's troubleshooting section
2. Look at browser console for error messages
3. Check backend logs for WebSocket issues
4. Create an issue with detailed error information 