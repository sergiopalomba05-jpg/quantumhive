# AGENTS.md — Motor de Voz

## Identidad

Motor de voz para los bots de clientes de QuantumHive. Convierte texto a voz (TTS) y voz a texto (STT) para que los bots puedan hablar y escuchar.

## Objetivo

Proveer una capa de voz reutilizable para todos los bots de clientes. Cuando un cliente quiere que su bot hable, este módulo se conecta y maneja la comunicación de audio.

## Stack

| Capa | Herramienta | Por qué |
|------|-------------|---------|
| STT (Speech-to-Text) | **faster-whisper** | Local, gratis, sin key, multi-idioma. |
| TTS (Text-to-Speech) | **Edge TTS** | Gratis, voces de alta calidad, múltiples voces. |
| TTS Premium (futuro) | **Chatterbox** (Resemble AI) | Open-source, clonación de voz de marca. Necesita GPU. |

## Flujo de Ejecución

```
1. Usuario envía audio al bot
2. STT (faster-whisper) convierte audio → texto
3. Bot procesa el texto (Gemini/Vertex AI)
4. Bot genera respuesta en texto
5. TTS (Edge TTS) convierte texto → audio
6. Bot envía audio de vuelta al usuario
```

## Uso

```bash
cd agencia/core/voz
pip install -r requirements.txt  # (futuro)
python motor_voz.py
```

## Configuración

### STT (Speech-to-Text)

```bash
# Instalar faster-whisper
pip install faster-whisper

# Ejemplo de uso
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("audio.mp3")
```

### TTS (Text-to-Speech)

```bash
# Instalar edge-tts
pip install edge-tts

# Ejemplo de uso
import edge_tts
import asyncio

async def text_to_speech(text, output_file):
    communicate = edge_tts.Communicate(text, "es-AR-ElenaNeural")
    await communicate.save(output_file)

asyncio.run(text_to_speech("Hola, soy tu bot", "output.mp3"))
```

## Voces Disponibles (Edge TTS)

| Voz | Idioma | Género |
|-----|--------|--------|
| `es-AR-ElenaNeural` | Español (Argentina) | Femenina |
| `es-AR-TomasNeural` | Español (Argentina) | Masculina |
| `es-MX-DaliaNeural` | Español (México) | Femenina |
| `es-ES-ElviraNeural` | Español (España) | Femenina |
| `en-US-JennyNeural` | Inglés (US) | Femenina |
| `en-US-GuyNeural` | Inglés (US) | Masculina |

## Reglas

1. **No usar voces premium** sin confirmación de Sergio (costos).
2. **Respetar los límites de rate** de Edge TTS (no abusar).
3. **Probar con audio real** antes de integrar a un bot de cliente.
4. **Documentar qué voces funcionan mejor** para cada tipo de cliente.

## Pendientes

- [ ] Definir qué voces usar por defecto para clientes argentinos
- [ ] Implementar cache de audio generado (no regenerar lo mismo)
- [ ] Soporte para voces custom (clonación de voz con Chatterbox)
- [ ] Integración con Vertex AI Live para voz en tiempo real
