# FASE 6: Crear Voz (Clonación)

**Objetivo:** Registrar la voz del avatar con 5-15 segundos de audio de referencia.

---

## Flujo

```
Audio de referencia (grabar o subir)
    │
    ▼
F5-TTS (VM GPU comfyui-l4)
    │
    ▼
Voz registrada con voice_id
    │
    ▼
Guardado en Supabase Storage + tabla voices
```

---

## Opciones de Voz

### Opción A: Grabar audio (micrófono)
- Botón "Grabar" en el admin panel
- Grabar 5-15 segundos
- Transcript automático (para referencia)
- Se guarda como `voices/{voice_id}_ref.wav`

### Opción B: Subir archivo de audio
- Upload de WAV, MP3 o OGG
- Mismas condiciones: 5-15 segundos, limpio

### Opción C: Voz preset
- Voces pre-clonadas en la VM
- Primeras voces: "Sol Femenina", "Sol Masculina"
- Cada una tiene un `voice_id` y audio de referencia

---

## Calidad del Audio de Referencia

**Requisitos:**
- Duración: 5-15 segundos
- Formato: WAV (preferido), MP3, OGG
- Calidad: sin ruido de fondo
- Sin música de fondo
- Voz clara y natural
- **NO WhatsApp** (comprime y baja calidad)

**Buenos ejemplos:**
- "Hola, soy Sol, tu mesera de La Escaloneta. ¿Qué vas a pedir hoy?"
- "Bienvenido a La Escaloneta, tenemos una carta especial para vos."

**Malos ejemplos:**
- Audio con ruido de calle
- Audio con música de fondo
- Audio de 2 segundos (muy corto)
- Audio de WhatsApp (muy comprimido)

---

## F5-TTS en VM GPU

### Instalación (pendiente)

```bash
# En la VM comfyui-l4 (34.73.247.22)
pip install f5-tts
# O con conda:
conda install -c conda-forge f5-tts
```

### Uso

```python
from f5_tts.api import F5TTS
import torch

# Inicializar modelo
device = "cuda" if torch.cuda.is_available() else "cpu"
tts_model = F5TTS(model_type="F5-TTS", device=device)

# Clonar voz y generar audio
def generate_voice(text: str, ref_audio_path: str) -> bytes:
    """Generar audio con voz clonada"""
    audio = tts_model.infer(
        gen_text=text,
        ref_audio=ref_audio_path,
        ref_text="",  # Texto del audio de referencia (opcional)
    )
    return audio

# Streaming (para tiempo real)
def generate_voice_stream(text: str, ref_audio_path: str):
    """Generar audio en streaming"""
    chunks = tts_model.infer_stream(
        gen_text=text,
        ref_audio=ref_audio_path,
    )
    for chunk in chunks:
        yield chunk
```

---

## VRAM Requerida

| Modelo | VRAM | Notas |
|--------|------|-------|
| F5-TTS | ~2-4 GB | En L4 (24GB) sobra |
| XTTS v2 | ~2-4 GB | Alternativa |

**En L4 (24GB):** Caben F5-TTS + LivePortrait + ComfyUI en paralelo.

---

## Almacenamiento

```
voices/
├── {restaurant_id}/
│   ├── {voice_id}_ref.wav      # Audio de referencia
│   └── {voice_id}_ref.json     # Metadata (duración, texto, etc.)
```

---

## API Endpoint

```python
# POST /api/clone-voice
# Input: audio file + voice_id
# Output: confirmación de clonación

@app.post("/api/clone-voice")
async def clone_voice(
    voice_id: str,
    audio_file: UploadFile,
    ref_text: str = ""
):
    # 1. Guardar audio de referencia
    # 2. Validar duración (5-15 seg)
    # 3. Registrar en F5-TTS (guardar en cache)
    # 4. Guardar en Supabase
    return {"status": "ok", "voice_id": voice_id}
```

---

## Bloqueos Actuales

1. **F5-TTS no instalado** → Hay que instalar en VM GPU
2. **VM GPU sin acceso SSH** → Solo RDP
3. **Alternativa:** Instalar F5-TTS localmente (CPU, más lento)
4. **Costo:** $0 (GPU propia)
