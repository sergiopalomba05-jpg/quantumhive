import asyncio
import base64
import io
import json
import time
from typing import Optional

import cv2
import numpy as np
from av import VideoFrame
from aiortc import (
    RTCPeerConnection,
    RTCSessionDescription,
    RTCConfiguration,
    RTCIceServer,
    MediaStreamTrack,
)
from fastapi import FastAPI, WebSocket, WebSocketDisconnect


class AvatarVideoTrack(MediaStreamTrack):
    """
    Custom video track that generates avatar frames.
    """

    kind = "video"

    def __init__(self):
        super().__init__()
        self.frame_queue = asyncio.Queue(maxsize=30)
        self.is_running = True
        self.source_image = None
        self.start_time = time.time()

    async def set_source_image(self, image_data: str):
        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes))
        img_array = np.array(img)

        if img_array.shape[2] == 3:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        self.source_image = img_array

    async def add_frame(self, frame_b64: str):
        if self.frame_queue.full():
            try:
                self.frame_queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        await self.frame_queue.put(frame_b64)

    async def recv(self):
        if not self.is_running:
            raise StopAsyncIteration

        try:
            frame_b64 = await asyncio.wait_for(
                self.frame_queue.get(),
                timeout=0.1
            )

            frame_bytes = base64.b64decode(frame_b64)
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            video_frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")

            now = time.time()
            video_frame.pts = int((now - self.start_time) * 90000)
            video_frame.time_base = 1 / 90000

            return video_frame

        except asyncio.TimeoutError:
            if self.source_image is not None:
                frame_rgb = cv2.cvtColor(self.source_image, cv2.COLOR_BGR2RGB)
            else:
                frame = np.zeros((480, 640, 3), dtype=np.uint8)
                frame_rgb = frame

            video_frame = VideoFrame.from_ndarray(frame_rgb, format="rgb24")
            now = time.time()
            video_frame.pts = int((now - self.start_time) * 90000)
            video_frame.time_base = 1 / 90000
            return video_frame


from PIL import Image


class WebRTCManager:
    """
    Manages WebRTC connections for avatar streaming.
    """

    def __init__(self):
        self.connections: dict[str, RTCPeerConnection] = {}
        self.video_tracks: dict[str, AvatarVideoTrack] = {}

    async def create_peer_connection(self, session_id: str) -> RTCPeerConnection:
        config = RTCConfiguration(
            iceServers=[
                RTCIceServer(urls="stun:stun.l.google.com:19302"),
                RTCIceServer(urls="stun:stun1.l.google.com:19302"),
            ]
        )

        pc = RTCPeerConnection(configuration=config)
        self.connections[session_id] = pc

        video_track = AvatarVideoTrack()
        self.video_tracks[session_id] = video_track
        pc.addTrack(video_track)

        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            print(f"[WebRTC] Connection state: {pc.connectionState}")
            if pc.connectionState == "failed":
                await pc.close()
                self.cleanup(session_id)

        @pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            print(f"[WebRTC] ICE connection state: {pc.iceConnectionState}")

        return pc

    async def handle_offer(self, session_id: str, offer_data: dict) -> dict:
        pc = await self.create_peer_connection(session_id)

        offer = RTCSessionDescription(
            sdp=offer_data["sdp"],
            type=offer_data["type"],
        )
        await pc.setRemoteDescription(offer)

        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        await self._wait_for_ice_gathering(pc)

        return {
            "sdp": pc.localDescription.sdp,
            "type": pc.localDescription.type,
        }

    async def _wait_for_ice_gathering(self, pc: RTCPeerConnection, timeout: float = 5.0):
        start_time = time.time()
        while pc.iceGatheringState != "complete":
            if time.time() - start_time > timeout:
                print("[WebRTC] ICE gathering timeout")
                break
            await asyncio.sleep(0.1)

    async def send_frame(self, session_id: str, frame_b64: str):
        if session_id in self.video_tracks:
            await self.video_tracks[session_id].add_frame(frame_b64)

    async def set_source_image(self, session_id: str, image_data: str):
        if session_id in self.video_tracks:
            await self.video_tracks[session_id].set_source_image(image_data)

    def cleanup(self, session_id: str):
        if session_id in self.connections:
            try:
                asyncio.create_task(self.connections[session_id].close())
            except Exception:
                pass
            del self.connections[session_id]
        if session_id in self.video_tracks:
            self.video_tracks[session_id].is_running = False
            del self.video_tracks[session_id]

    async def close_all(self):
        for session_id in list(self.connections.keys()):
            self.cleanup(session_id)


webrtc_manager = WebRTCManager()
