import asyncio
import os
from google import genai
from google.genai import types

async def test_live():
    # Solo probar que la sintaxis existe y no tira error de atributo
    client = genai.Client()
    print("Client created")
    # Configurar
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(parts=[types.Part.from_text(text="Eres un asistente")])
    )
    print("Config created", config)
    print("LiveServerContent structure ok")

if __name__ == "__main__":
    asyncio.run(test_live())
