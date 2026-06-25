"""
Motor de Voz de QuantumHive — TTS propio MULTI-VOZ (clonación) en GPU serverless (Modal).

QUÉ ES
  Servicio CENTRAL que aloja muchas voces clonadas y las sirve a TODAS las cartas y bots. Una sola
  GPU con scale-to-zero atiende todas las voces: el modelo se carga una vez y cada pedido trae su
  `voice_id`. Sumar una voz = registrar su audio de referencia (NO otra GPU).

MODELO
  Chatterbox Multilingual (Resemble AI) — licencia MIT (uso COMERCIAL permitido), clonación
  zero-shot, soporta español. El acento (rioplatense) sale del AUDIO DE REFERENCIA de cada voz.

ENDPOINTS (HTTP)
  POST /clone   {token, voice_id, audio_b64}        → guarda el audio de referencia de esa voz
  POST /tts     {token, texto, voice_id, idioma?}   → MP3 hablado con esa voz
  GET  /health                                       → estado (CPU, no levanta la GPU)

OPTIMIZACIONES DE PRODUCCIÓN
  1) Pesos pre-descargados en el BUILD (no en el cold start de GPU → arranque rápido y barato).
  2) Concurrencia: 1 síntesis por GPU (@modal.concurrent) + techo de GPUs (max_containers).
  3) WAV→MP3 todo en memoria (sin tocar disco).
  4) /health en CPU aparte → un ataque/escaneo NO levanta la GPU.

DEPLOY (ver README.md): modal setup → modal deploy motor_voz.py
NOTA: repo público → el token va SOLO como Secret de Modal (env), nunca acá.
"""
import base64
import io
import os
import subprocess
import tempfile

import modal

app = modal.App("quantumhive-motor-voz")


def _descargar_modelo():
    """Corre en el BUILD de la imagen (CPU, barato): baja los pesos de Chatterbox y los deja fijos en
    la imagen, así el cold start de GPU no paga el tiempo de descarga."""
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    ChatterboxMultilingualTTS.from_pretrained(device="cpu")


# --- Imagen: Chatterbox (MIT) + audio. Los pesos quedan inyectados (run_function) → cold start veloz ---
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("chatterbox-tts", "fastapi[standard]", "soundfile", "numpy")
    .run_function(_descargar_modelo)
)

# Audios de referencia de cada voz (multi-voz). Ya NO hace falta cache de HF: el modelo va en la imagen.
voces_vol = modal.Volume.from_name("qh-voces", create_if_missing=True)
VOCES_DIR = "/voces"


def _check_token(req_token) -> bool:
    expected = os.environ.get("MOTOR_VOZ_TOKEN", "")
    return bool(expected) and req_token == expected


def _ref_path(voice_id) -> str:
    safe = "".join(c for c in (voice_id or "") if c.isalnum() or c in "-_")
    return os.path.join(VOCES_DIR, f"{safe}.wav") if safe else ""


@app.cls(
    gpu="T4",                      # 16 GB: alcanza para Chatterbox. Subir a "L4"/"A10G" si va lento.
    image=image,
    volumes={VOCES_DIR: voces_vol},
    secrets=[modal.Secret.from_name("qh-motor-voz-token")],
    scaledown_window=300,          # baja a CERO tras 5 min sin uso → no paga idle
    timeout=120,
    max_containers=10,             # techo de GPUs en paralelo (no se dispara el gasto en picos)
)
@modal.concurrent(max_inputs=1)    # 1 síntesis por GPU; si llega otra a la vez, Modal abre otra GPU (evita OOM)
class MotorVoz:
    @modal.enter()
    def load(self):
        # Una vez por contenedor. Los pesos ya están en la imagen → carga a GPU casi instantánea.
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
        os.makedirs(VOCES_DIR, exist_ok=True)

    @modal.fastapi_endpoint(method="POST")
    def clone(self, data: dict):
        """Registra/actualiza el audio de referencia de una voz (lo normaliza a WAV mono 24 kHz)."""
        from fastapi import HTTPException
        if not _check_token(data.get("token", "")):
            raise HTTPException(401, "token invalido")
        voice_id = data.get("voice_id", "")
        audio_b64 = data.get("audio_b64", "")
        path = _ref_path(voice_id)
        if not path or not audio_b64:
            raise HTTPException(400, "faltan voice_id o audio_b64")
        raw = base64.b64decode(audio_b64)
        with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as f:
            f.write(raw)
            src = f.name
        try:
            subprocess.run(["ffmpeg", "-y", "-i", src, "-ac", "1", "-ar", "24000", path],
                           check=True, capture_output=True)
        finally:
            os.unlink(src)
        voces_vol.commit()
        return {"ok": True, "voice_id": voice_id}

    @modal.fastapi_endpoint(method="POST")
    def tts(self, data: dict):
        """Genera el MP3 de `texto` con la voz `voice_id`. WAV→MP3 todo en memoria (sin tocar disco)."""
        from fastapi import HTTPException, Response
        if not _check_token(data.get("token", "")):
            raise HTTPException(401, "token invalido")
        texto = (data.get("texto") or "").strip()
        voice_id = data.get("voice_id", "")
        idioma = data.get("idioma", "es")
        if not texto:
            raise HTTPException(400, "falta texto")

        ref = _ref_path(voice_id)
        if ref and not os.path.exists(ref):
            voces_vol.reload()     # por si otra réplica la clonó recién
        kwargs = {"language_id": idioma}
        if ref and os.path.exists(ref):
            kwargs["audio_prompt_path"] = ref   # clonación con la voz registrada

        import torchaudio as ta
        wav = self.model.generate(texto, **kwargs)
        if hasattr(wav, "dim") and wav.dim() == 1:
            wav = wav.unsqueeze(0)              # [samples] → [1, samples]

        # VOLUMEN: la voz clonada salía baja (heredaba el nivel de la referencia). La subimos en 2 pasos:
        #  (1) peak-normalize del tensor → lleva el pico al máximo (garantía matemática, predecible);
        #  (2) ffmpeg: acompressor levanta el CUERPO de la voz (lo bajo) + alimiter anti-saturación →
        #      suena FUERTE y parejo en cualquier ambiente (colectivo, restaurante con ruido).
        wav = wav.cpu()
        peak = wav.abs().max()
        if peak > 0:
            wav = wav * (0.97 / peak)
        buf = io.BytesIO()
        ta.save(buf, wav, self.model.sr, format="wav")
        proc = subprocess.run(
            ["ffmpeg", "-i", "pipe:0",
             "-af", "acompressor=threshold=-20dB:ratio=4:attack=5:release=60:makeup=6,alimiter=limit=0.97",
             "-f", "mp3", "-b:a", "128k", "pipe:1"],
            input=buf.getvalue(), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        if proc.returncode != 0 or not proc.stdout:
            raise HTTPException(502, "fallo al convertir el audio a MP3")
        return Response(content=proc.stdout, media_type="audio/mpeg")


# /health en CPU (función SEPARADA, sin GPU): un escaneo/DDoS a esta URL NUNCA levanta la GPU → no
# gasta crédito. GET público para que los monitores (UptimeRobot, Modal) lo puedan chequear.
@app.function(image=modal.Image.debian_slim(python_version="3.11").pip_install("fastapi[standard]"))
@modal.fastapi_endpoint(method="GET")
def health():
    return {"ok": True, "modelo": "chatterbox-multilingual"}
