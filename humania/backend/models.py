from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SessionStart(BaseModel):
    user_id: Optional[str] = None
    avatar_id: str = "default"


class AudioChunk(BaseModel):
    data: str  # base64 encoded
    timestamp: float


class AvatarFrame(BaseModel):
    image_data: str  # base64 encoded JPEG
    timestamp: float
    audio_chunk_id: str


class ChatMessage(BaseModel):
    role: str  # "user" or "companion"
    text: str
    timestamp: Optional[datetime] = None


class SessionEnd(BaseModel):
    session_id: str
    duration_seconds: int
    summary: Optional[str] = None


class CompanionConfig(BaseModel):
    name: str = "Ami"
    personality: str = "Amigable, cercano, natural. Como un buen amigo."
    language: str = "español rioplatense"
    greeting: str = "¡Hola! Soy tu companion. Puedo charlar de lo que quieras, darte consejos, o simplemente acompañarte. ¿Qué tal si empezamos con algo que te pinte?"
