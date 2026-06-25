"""
Motor de Voz de QuantumHive — TTS propio MULTI-VOZ (clonación) en GPU serverless (Modal).

QUÉ ES
  Un servicio CENTRAL que aloja muchas voces clonadas y las sirve a TODAS las cartas y bots
  (demos, clientes, distintos rubros). Una sola GPU con scale-to-zero atiende todas las voces:
  el modelo se carga una vez y cada pedido trae su `voice_id`. Sumar una voz nueva = registrar
  su audio de referencia (NO otra GPU). El costo se reparte entre todos los clientes.

MODELO
  Chatterbox Multilingual (Resemble AI) — licencia MIT (uso COMERCIAL permitido), clonación
  zero-shot, soporta español. El acento (rioplatense) sale del AUDIO DE REFERENCIA de cada voz,
  no del modelo.

ENDPOINTS (HTTP, todos requieren el campo `token`)
  POST /clone   {token, voice_id, audio_b64}        → guarda el audio de referencia de esa voz
  POST /tts     {token, texto, voice_id, idioma?}   → MP3 hablado con esa voz
  GET  /health                                       → estado

DEPLOY (ver README.md)
  pip install modal && modal setup
  modal secret create qh-motor-voz-token MOTOR_VOZ_TOKEN=<un-token-tuyo-largo>
  modal deploy motor_voz.py
  → Modal te da las URLs públicas de cada endpoint.

NOTA: el repo es público → NUNCA hardcodear el token acá. Va como Secret de Modal (env).
"""
import base64
import os
import subprocess
import tempfile

import modal

app = modal.App("quantumhive-motor-voz")

# --- Imagen del contenedor: Chatterbox (MIT) + audio + web ---
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("chatterbox-tts", "fastapi[standard]", "soundfile", "numpy")
)

# --- Volúmenes persistentes ---
# qh-voces: audios de referencia de cada voz (multi-voz). qh-hf-cache: caché del modelo (HuggingFace),
# para que el cold start no re-descargue los pesos cada vez.
voces_vol = modal.Volume.from_name("qh-voces", create_if_missing=True)
hf_vol = modal.Volume.from_name("qh-hf-cache", create_if_missing=True)
VOCES_DIR = "/voces"
HF_DIR = "/root/.cache/huggingface"


def _check_token(req_token) -> bool:
    """El token va en cada request y se compara contra el Secret de Modal (anti-abuso del endpoint)."""
    expected = os.environ.get("MOTOR_VOZ_TOKEN", "")
    return bool(expected) and req_token == expected


def _ref_path(voice_id) -> str:
    """Ruta del audio de referencia de una voz. Sanitiza el id (evita path traversal)."""
    safe = "".join(c for c in (voice_id or "") if c.isalnum() or c in "-_")
    return os.path.join(VOCES_DIR, f"{safe}.wav") if safe else ""


@app.cls(
    gpu="T4",                      # 16 GB: alcanza para Chatterbox. Subir a "L4"/"A10G" si va lento.
    image=image,
    volumes={VOCES_DIR: voces_vol, HF_DIR: hf_vol},
    secrets=[modal.Secret.from_name("qh-motor-voz-token")],
    scaledown_window=300,          # baja a CERO tras 5 min sin uso → no paga idle
    timeout=120,
)
class MotorVoz:
    @modal.enter()
    def load(self):
        # Se ejecuta UNA vez por contenedor (en el cold start): carga el modelo a la GPU.
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        self.model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
        os.makedirs(VOCES_DIR, exist_ok=True)

    @modal.fastapi_endpoint(method="POST")
    def clone(self, data: dict):
        """Registra/actualiza el audio de referencia de una voz. Lo normaliza a WAV mono 24 kHz."""
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
        voces_vol.commit()         # persistir para que otras réplicas la vean
        return {"ok": True, "voice_id": voice_id}

    @modal.fastapi_endpoint(method="POST")
    def tts(self, data: dict):
        """Genera el audio (MP3) de `texto` con la voz `voice_id` ya registrada."""
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
            wav = wav.unsqueeze(0)              # [samples] → [1, samples] para torchaudio

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as wf:
            wavpath = wf.name
        mp3path = wavpath[:-4] + ".mp3"
        try:
            ta.save(wavpath, wav, self.model.sr)
            subprocess.run(["ffmpeg", "-y", "-i", wavpath, "-b:a", "128k", mp3path],
                           check=True, capture_output=True)
            with open(mp3path, "rb") as mf:
                mp3 = mf.read()
        finally:
            for p in (wavpath, mp3path):
                if os.path.exists(p):
                    os.unlink(p)
        return Response(content=mp3, media_type="audio/mpeg")

    @modal.fastapi_endpoint(method="GET")
    def health(self):
        return {"ok": True, "modelo": "chatterbox-multilingual", "voces_dir": VOCES_DIR}
