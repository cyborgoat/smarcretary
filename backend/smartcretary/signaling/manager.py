import asyncio
import json
import logging
from typing import Dict, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self, rooms):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_rooms: Dict[str, str] = {}  # user_id -> room_id
        self.rooms = rooms

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
            if room_id in self.rooms and user_id in self.rooms[room_id].participants:
                del self.rooms[room_id].participants[user_id]
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
                    logger.warning(
                        "WebSocket for %s is not connected, removing from active connections",
                        user_id,
                    )
                    self.disconnect(user_id)
            except Exception as e:
                logger.error(
                    "Error sending message to %s: %s, removing from active connections",
                    user_id,
                    e,
                    exc_info=True,
                )
                self.disconnect(user_id)

    async def broadcast_to_room(
        self, message: dict, room_id: str, exclude_user: Optional[str] = None
    ):
        if room_id in self.rooms:
            for participant_id, participant in self.rooms[room_id].participants.items():
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
