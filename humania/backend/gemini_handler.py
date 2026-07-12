import asyncio
from typing import AsyncGenerator, Optional
from google import genai
from google.genai import types
from config import get_settings

settings = get_settings()


class GeminiLiveHandler:
    """Handles Gemini Live API connection for voice conversations."""

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
        self.audio_queue: asyncio.Queue = asyncio.Queue()

    async def connect(self):
        """Establish connection with Gemini Live API."""
        print(f"[Gemini] Connecting to model: {settings.gemini_model}")
        self.session = await self.client.aio.live.connect(
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
                    parts=[types.Part(text=self.system_prompt)]
                ),
                output_audio_transcription=types.OutputAudioTranscriptionConfig(),
            ),
            callbacks={
                "onopen": lambda: print("[Gemini] Connection opened"),
                "onmessage": self._on_message,
                "onerror": lambda e: print(f"[Gemini] Error: {e}"),
                "onclose": lambda e: print(f"[Gemini] Connection closed: {e}"),
            },
        )
        print("[Gemini] Connected successfully")

    def _on_message(self, message):
        """Handle incoming messages from Gemini."""
        parts = message.serverContent?.modelTurn?.parts or []
        for part in parts:
            if part.inlineData?.data:
                self.audio_queue.put_nowait({
                    "type": "audio",
                    "data": part.inlineData.data
                })
            if part.text:
                self.audio_queue.put_nowait({
                    "type": "text",
                    "data": part.text
                })

        if message.serverContent?.turnComplete:
            self.audio_queue.put_nowait({"type": "turn_complete"})

    async def send_audio(self, audio_data: str):
        """Send audio data to Gemini."""
        if self.session:
            await self.session.send_realtime_input(
                audio=types.Blob(
                    mime_type="audio/pcm;rate=16000",
                    data=audio_data
                )
            )

    async def send_text(self, text: str):
        """Send text to Gemini."""
        if self.session:
            await self.session.send_realtime_input(text=text)

    async def receive_messages(self) -> AsyncGenerator[dict, None]:
        """Receive messages from Gemini as a stream."""
        while True:
            try:
                message = await asyncio.wait_for(
                    self.audio_queue.get(),
                    timeout=30.0
                )
                yield message
                if message.get("type") == "turn_complete":
                    break
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"[Gemini] Error receiving: {e}")
                break

    async def close(self):
        """Close the Gemini connection."""
        if self.session:
            await self.session.close()
            self.session = None
            print("[Gemini] Connection closed")
