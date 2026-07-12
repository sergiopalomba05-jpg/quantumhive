import asyncio
from typing import Dict, Optional
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections for avatar sessions."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_locks: Dict[str, asyncio.Lock] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.session_locks[session_id] = asyncio.Lock()
        print(f"[WS] Client connected: {session_id}")

    def disconnect(self, session_id: str):
        """Remove a WebSocket connection."""
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.session_locks:
            del self.session_locks[session_id]
        print(f"[WS] Client disconnected: {session_id}")

    async def send_json(self, session_id: str, data: dict):
        """Send JSON data to a specific client."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(data)

    async def send_bytes(self, session_id: str, data: bytes):
        """Send binary data to a specific client."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_bytes(data)

    async def send_text(self, session_id: str, text: str):
        """Send text to a specific client."""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_text(text)

    def is_connected(self, session_id: str) -> bool:
        """Check if a session is still connected."""
        return session_id in self.active_connections


manager = ConnectionManager()
