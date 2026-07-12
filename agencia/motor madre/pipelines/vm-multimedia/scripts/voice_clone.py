"""
Módulo de Clonación de Voz con F5-TTS
======================================
Genera audio a partir de texto usando una voz de referencia.

Requiere:
- F5-TTS corriendo en localhost:8080 (FastAPI)
- Archivo de audio de referencia (5-15 segundos de la voz del avatar)

Endpoints esperados del servicio F5-TTS:
  POST /clone-voice
    - text: str (texto a sintetizar)
    - reference_audio: bytes (audio de referencia)
    - Returns: audio WAV
"""

import os
import io
import requests
import soundfile as sf
import numpy as np
from pathlib import Path
from typing import Optional


def clone_voice(
    text: str,
    reference_audio: str,
    voice_description: str,
    output_path: str,
    f5tts_url: str = "http://localhost:8080"
) -> Optional[str]:
    """
    Clona una voz y genera audio para el texto dado.

    Args:
        text: Texto que el avatar va a decir
        reference_audio: Ruta al archivo de audio de referencia
        voice_description: Descripción de la voz (para logging)
        output_path: Ruta donde guardar el audio generado
        f5tts_url: URL del servicio F5-TTS

    Returns:
        Ruta del archivo de audio generado o None si falla
    """
    # Verificar que el audio de referencia existe
    if not os.path.exists(reference_audio):
        raise FileNotFoundError(f"Audio de referencia no encontrado: {reference_audio}")

    # Preparar request
    url = f"{f5tts_url}/clone-voice"

    with open(reference_audio, 'rb') as f:
        files = {
            'reference_audio': (os.path.basename(reference_audio), f, 'audio/wav')
        }
        data = {
            'text': text,
            'description': voice_description
        }

        try:
            response = requests.post(url, files=files, data=data, timeout=120)
            response.raise_for_status()
        except requests.exceptions.ConnectionError:
            raise ConnectionError(f"No se pudo conectar a F5-TTS en {f5tts_url}")
        except requests.exceptions.Timeout:
            raise TimeoutError("F5-TTS tardó demasiado en responder")
        except requests.exceptions.HTTPError as e:
            raise RuntimeError(f"F5-TTS retornó error: {e}")

    # Guardar audio
    audio_data = response.content
    with open(output_path, 'wb') as f:
        f.write(audio_data)

    return output_path


def clone_voice_local(
    text: str,
    reference_audio: str,
    output_path: str,
    model_path: str = "E:\\ComfyUI\\models\\f5-tts"
) -> Optional[str]:
    """
    Clonación de voz local (sin API).
    Usa F5-TTS directamente con PyTorch.

    Args:
        text: Texto a sintetizar
        reference_audio: Ruta al audio de referencia
        output_path: Ruta de salida
        model_path: Ruta a los modelos F5-TTS

    Returns:
        Ruta del audio generado o None
    """
    try:
        import torch
        from f5_tts.infer import F5TTS

        # Cargar modelo
        f5tts = F5TTS(
            ckpt_path=os.path.join(model_path, "model.pt"),
            config_path=os.path.join(model_path, "config.yaml")
        )

        # Inferencia
        wav, sr, _ = f5tts.infer(
            ref_file=reference_audio,
            ref_text="",
            gen_text=text,
        )

        # Guardar
        sf.write(output_path, wav, sr)
        return output_path

    except ImportError:
        raise ImportError("F5-TTS no instalado. Ejecutar: pip install f5-tts")
    except Exception as e:
        raise RuntimeError(f"Error en clonación local: {e}")


def get_audio_duration(audio_path: str) -> float:
    """Retorna la duración del audio en segundos."""
    info = sf.info(audio_path)
    return info.duration


def normalize_audio(input_path: str, output_path: str, target_db: float = -20.0) -> str:
    """Normaliza el volumen del audio."""
    data, samplerate = sf.read(input_path)

    # Calcular RMS actual
    rms = np.sqrt(np.mean(data**2))
    current_db = 20 * np.log10(rms + 1e-10)

    # Calcular ganancia
    gain_db = target_db - current_db
    gain = 10 ** (gain_db / 20)

    # Aplicar ganancia
    normalized = data * gain

    # Clip para evitar distorsión
    normalized = np.clip(normalized, -1.0, 1.0)

    sf.write(output_path, normalized, samplerate)
    return output_path
