import asyncio
import base64
from typing import AsyncGenerator
from google import genai
from google.genai import types
from config import get_settings

settings = get_settings()


class GeminiLiveHandler:
    """Handles Gemini Live API connection for voice conversations.

    Uses the async context manager pattern (google-genai SDK v2.11+).
    No callbacks — uses session.receive() async iterator instead.
    """

    def __init__(self, system_prompt: str = ""):
        self.client = genai.Client(
            vertexai=True,
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
        self.system_prompt = system_prompt or (
            "Sos un companion virtual amigable. "
            "Tu nombre es Ami. "
            "Conversás en español rioplatense natural y cercano. "
            "Escuchás al usuario, le das consejos, "
            "charlás de lo que quiera, y lo acompañás. "
            "Sos cálido, auténtico, y tenés personalidad propia. "
            "Nunca decís que sos una IA o un bot. "
            "Sos breve y natural, como un buen amigo."
        )
        self.session = None
        self._session_context = None
        self.audio_queue: asyncio.Queue = asyncio.Queue()
        self.connected = False

    async def connect(self):
        """Establish connection with Gemini Live API using context manager."""
        print(f"[Gemini] Connecting to model: {settings.gemini_model}")

        self._session_context = self.client.aio.live.connect(
            model=settings.gemini_model,
            config=types.LiveConnectConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name="Aoede"
                        )
                    )
                ),
                system_instruction=types.Content(
                    parts=[types.Part.from_text(text=self.system_prompt)]
                ),
                output_audio_transcription=types.AudioTranscriptionConfig(),
            ),
        )

        self.session = await self._session_context.__aenter__()
        self.connected = True
        print("[Gemini] Connected successfully")

    async def send_audio(self, audio_data: str):
        """Send audio data to Gemini. Decodes base64 to raw bytes."""
        if self.session:
            raw_bytes = base64.b64decode(audio_data)
            await self.session.send_realtime_input(
                audio=types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=raw_bytes
                )
            )

    async def send_text(self, text: str):
        """Send text to Gemini."""
        if self.session:
            await self.session.send_client_content(
                turns=[types.Content(
                    parts=[types.Part.from_text(text=text)]
                )]
            )

    async def receive_messages(self) -> AsyncGenerator[dict, None]:
        """Receive messages from Gemini using session.receive() iterator."""
        if not self.session:
            return

        try:
            async for response in self.session.receive():
                server_content = response.server_content
                if server_content is None:
                    continue

                model_turn = server_content.model_turn
                if model_turn is not None:
                    for part in model_turn.parts:
                        if part.inline_data is not None:
                            audio_b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                            yield {"type": "audio", "data": audio_b64}
                        elif part.text is not None:
                            yield {"type": "text", "data": part.text}

                if server_content.turn_complete:
                    yield {"type": "turn_complete"}
                    break

        except Exception as e:
            print(f"[Gemini] Error receiving: {e}")

    async def close(self):
        """Close the Gemini connection."""
        if self._session_context:
            try:
                await self._session_context.__aexit__(None, None, None)
            except Exception:
                pass
            self._session_context = None
        self.session = None
        self.connected = False
        print("[Gemini] Connection closed")
