#!/bin/bash

# Smart Secretary Network Setup Script
# This script helps configure the application for network access

echo "🚀 Smart Secretary Network Setup"
echo "================================"

# Get the local IP address
LOCAL_IP=$(ifconfig | grep -E "inet.*broadcast" | grep -v "127.0.0.1" | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    echo "Please check your network connection and try again"
    exit 1
fi

echo "🔍 Detected local IP address: $LOCAL_IP"

# Update backend configuration
echo "📝 Updating backend configuration..."
cd backend/smartcretary

# Update the main.py file with the detected IP
sed -i.bak "s/\"http:\/\/10\.0\.0\.37:3000\"/\"http:\/\/$LOCAL_IP:3000\"/g" main.py
sed -i.bak "s/\"https:\/\/10\.0\.0\.37:3000\"/\"https:\/\/$LOCAL_IP:3000\"/g" main.py

# Update run.py with the detected IP
sed -i.bak "s/10\.0\.0\.37/$LOCAL_IP/g" run.py

cd ../../

echo "🔐 Generating backend SSL certificate and key..."
# Generate backend SSL certificate and key with SAN for both IP and localhost
cd backend
echo "🔐 Generating backend SSL certificate and key (with SAN for IP and localhost)..."
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=$LOCAL_IP" \
  -addext "subjectAltName=DNS:localhost,IP:$LOCAL_IP,IP:127.0.0.1"
cd ..

# Update frontend configuration
echo "📝 Updating frontend configuration..."
cd frontend

# Update .env.local with the detected IP
cat > .env.local << EOF
# WebSocket backend URL (local dev)
NEXT_PUBLIC_WS_URL=ws://localhost:8080
# For LAN/production, use your HTTPS/WSS endpoint:
# NEXT_PUBLIC_WS_URL=wss://$LOCAL_IP:8080

# API URL (local dev)
NEXT_PUBLIC_API_URL=http://localhost:8080
# For LAN/production, use:
# NEXT_PUBLIC_API_URL=https://$LOCAL_IP:8080
EOF

# Generate Caddyfile for HTTPS reverse proxy
cat > Caddyfile << EOF
https://$LOCAL_IP:3000 {
  tls internal
  reverse_proxy localhost:3001
}
EOF

cd ..

echo "✅ Configuration updated successfully!"
echo ""
echo "🌐 Your application will be accessible at:"
echo "   - Local: http://localhost:3000"
echo "   - Network: http://$LOCAL_IP:3000"
echo "   - HTTPS (for camera): https://localhost:3000"
echo ""
echo "🔧 To start the application:"
echo "   1. Backend: cd backend/smartcretary && python run.py"
echo "   2. Frontend: cd frontend && npm run dev"
echo "   3. For HTTPS (camera access): cd frontend && npm run dev:https"
echo "   4. Start Caddy: cd frontend && caddy run --config Caddyfile"
echo ""
echo "📱 Other devices can access the app using:"
echo "   - http://$LOCAL_IP:3000 (HTTP - limited camera access)"
echo "   - https://$LOCAL_IP:3000 (HTTPS - full camera access)"
echo ""
echo "⚠️  Note: For camera/microphone access from other devices,"
echo "   you'll need to use HTTPS. The browser will show a security"
echo "   warning for self-signed certificates - click 'Advanced' and"
echo "   'Proceed to $LOCAL_IP (unsafe)' to continue."
echo ""
echo "🎉 Setup complete! Happy video conferencing!"