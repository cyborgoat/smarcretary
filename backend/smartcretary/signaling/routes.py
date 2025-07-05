import uuid
import asyncio
import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from .manager import ConnectionManager

logger = logging.getLogger(__name__)

class Participant(BaseModel):
    id: str
    name: str
    class Config:
        arbitrary_types_allowed = True

class Room(BaseModel):
    id: str
    participants: dict = {}
    class Config:
        arbitrary_types_allowed = True

rooms = {}
manager = ConnectionManager(rooms)
router = APIRouter()

@router.websocket("/ws/{room_id}/{user_name}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_name: str):
    user_id = str(uuid.uuid4())
    try:
        await asyncio.sleep(0.1)
        await manager.connect(websocket, user_id)
        if room_id not in rooms:
            rooms[room_id] = Room(id=room_id)
            logger.info(f"Created new room: {room_id}")
        participant = Participant(id=user_id, name=user_name)
        rooms[room_id].participants[user_id] = participant
        manager.user_rooms[user_id] = room_id
        logger.info(f"User {user_name} ({user_id}) joined room {room_id}")
        await manager.notify_participant_joined(room_id, user_id, user_name)
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
                data = await websocket.receive_text()
                message = json.loads(data)
                logger.info(f"Received message from {user_name}: {message.get('type', 'unknown')}")
                if message.get("type") == "join":
                    continue
                elif message.get("type") == "chatMessage":
                    chat_message = {
                        **message,
                        "id": str(uuid.uuid4()),
                        "userId": user_id,
                        "user": user_name,
                        "timestamp": message.get("timestamp")
                    }
                    await manager.broadcast_to_room(chat_message, room_id)
                elif message.get("type") in ["offer", "answer", "candidate"]:
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

@router.get("/rooms")
async def get_rooms():
    room_list = []
    for room_id, room in rooms.items():
        room_list.append({
            "id": room_id,
            "participants": len(room.participants),
            "participant_names": [p.name for p in room.participants.values()]
        })
    return {"rooms": room_list}

@router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    if room_id not in rooms:
        return {"error": "Room not found"}, 404
    room = rooms[room_id]
    return {
        "id": room_id,
        "participants": [
            {"id": p.id, "name": p.name} for p in room.participants.values()
        ]
    }
