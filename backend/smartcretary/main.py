import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional, Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Smart Secretary WebRTC Backend", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://10.0.0.37:3000",  # Local network IP
        "https://localhost:3000",  # HTTPS support
        "https://127.0.0.1:3000",
        "https://10.0.0.37:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Participant(BaseModel):
    id: str
    name: str
    
    class Config:
        arbitrary_types_allowed = True


class Room(BaseModel):
    id: str
    participants: Dict[str, Participant] = {}
    
    class Config:
        arbitrary_types_allowed = True


# Global room storage
rooms: Dict[str, Room] = {}


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_rooms: Dict[str, str] = {}  # user_id -> room_id

    async def connect(self, websocket: WebSocket, user_id: str):
        try:
            await websocket.accept()
            self.active_connections[user_id] = websocket
            logger.info(f"User {user_id} connected successfully")
        except Exception as e:
            logger.error(f"Failed to accept WebSocket connection for {user_id}: {e}", exc_info=True)
            raise

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_rooms:
            room_id = self.user_rooms[user_id]
            del self.user_rooms[user_id]
            # Remove user from room
            if room_id in rooms and user_id in rooms[room_id].participants:
                del rooms[room_id].participants[user_id]
                # Notify other participants
                asyncio.create_task(self.notify_participant_left(room_id, user_id))
        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            try:
                websocket = self.active_connections[user_id]
                if websocket.client_state.name == "CONNECTED":
                    await websocket.send_text(json.dumps(message))
                else:
                    logger.warning(f"WebSocket for {user_id} is not connected, removing from active connections")
                    self.disconnect(user_id)
            except Exception as e:
                logger.error(f"Error sending message to {user_id}: {e}, removing from active connections", exc_info=True)
                self.disconnect(user_id)

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: Optional[str] = None):
        if room_id in rooms:
            for participant_id, participant in rooms[room_id].participants.items():
                if participant_id != exclude_user:
                    await self.send_personal_message(message, participant_id)

    async def notify_participant_joined(self, room_id: str, user_id: str, user_name: str):
        message = {
            "type": "participantJoined",
            "senderId": user_id,
            "senderName": user_name,
            "roomId": room_id
        }
        await self.broadcast_to_room(message, room_id, exclude_user=user_id)

    async def notify_participant_left(self, room_id: str, user_id: str):
        message = {
            "type": "participantLeft",
            "senderId": user_id,
            "roomId": room_id
        }
        await self.broadcast_to_room(message, room_id, exclude_user=user_id)


manager = ConnectionManager()


@app.get("/")
async def root():
    return {"message": "Smart Secretary WebRTC Backend"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.websocket("/ws/{room_id}/{user_name}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_name: str):
    user_id = str(uuid.uuid4())
    
    try:
        # Add connection delay to prevent race conditions
        await asyncio.sleep(0.1)
        await manager.connect(websocket, user_id)
        
        # Create room if it doesn't exist
        if room_id not in rooms:
            rooms[room_id] = Room(id=room_id)
            logger.info(f"Created new room: {room_id}")
        
        # Add participant to room
        participant = Participant(id=user_id, name=user_name)
        rooms[room_id].participants[user_id] = participant
        manager.user_rooms[user_id] = room_id
        
        logger.info(f"User {user_name} ({user_id}) joined room {room_id}")
        
        # Notify other participants
        await manager.notify_participant_joined(room_id, user_id, user_name)
        
        # Send current participants to new user
        current_participants = []
        for pid, p in rooms[room_id].participants.items():
            if pid != user_id:
                current_participants.append({
                    "type": "participantJoined",
                    "senderId": pid,
                    "senderName": p.name,
                    "roomId": room_id
                })
        
        for participant_info in current_participants:
            await manager.send_personal_message(participant_info, user_id)
        
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                logger.info(f"Received message from {user_name}: {message.get('type', 'unknown')}")
                
                # Handle different message types
                if message.get("type") == "join":
                    # Already handled above
                    continue
                elif message.get("type") == "chatMessage":
                    # Broadcast chat message to all participants in room
                    chat_message = {
                        **message,
                        "id": str(uuid.uuid4()),
                        "userId": user_id,
                        "user": user_name,
                        "timestamp": message.get("timestamp")
                    }
                    await manager.broadcast_to_room(chat_message, room_id)
                elif message.get("type") in ["offer", "answer", "candidate"]:
                    # WebRTC signaling messages
                    target_id = message.get("targetId")
                    if target_id:
                        signaling_message = {
                            **message,
                            "senderId": user_id,
                            "senderName": user_name,
                            "roomId": room_id
                        }
                        await manager.send_personal_message(signaling_message, target_id)
                elif message.get("type") in ["toggleMute", "toggleVideo"]:
                    # Broadcast state changes to all participants
                    state_message = {
                        **message,
                        "senderId": user_id,
                        "senderName": user_name,
                        "roomId": room_id
                    }
                    await manager.broadcast_to_room(state_message, room_id, exclude_user=user_id)
                else:
                    logger.warning(f"Unknown message type: {message.get('type')}")
                    
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error handling message from {user_name}: {e}")
                break
    
    except Exception as e:
        logger.error(f"WebSocket error for {user_name}: {e}")
    finally:
        manager.disconnect(user_id)
        logger.info(f"User {user_name} ({user_id}) left room {room_id}")


@app.get("/rooms")
async def get_rooms():
    """Get list of active rooms"""
    room_list = []
    for room_id, room in rooms.items():
        room_list.append({
            "id": room_id,
            "participants": len(room.participants),
            "participant_names": [p.name for p in room.participants.values()]
        })
    return {"rooms": room_list}


@app.get("/rooms/{room_id}")
async def get_room(room_id: str):
    """Get room details"""
    if room_id not in rooms:
        return {"error": "Room not found"}, 404
    
    room = rooms[room_id]
    return {
        "id": room_id,
        "participants": [
            {"id": p.id, "name": p.name} for p in room.participants.values()
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 