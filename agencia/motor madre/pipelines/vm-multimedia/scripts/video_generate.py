"""
Módulo de Generación de Video con LivePortrait
===============================================
Genera video del avatar hablando sincronizado con audio.

Opción 1: Usar ComfyUI con workflow de LivePortrait (recomendado)
Opción 2: Usar LivePortrait directamente (más control)

Requiere:
- ComfyUI corriendo en localhost:8188 con LivePortrait instalado
- O LivePortrait instalado directamente
"""

import os
import json
import time
import uuid
import requests
import subprocess
from pathlib import Path
from typing import Optional


def generate_video(
    source_image: str,
    driving_audio: str,
    output_path: str,
    width: int = 720,
    height: int = 405,
    fps: int = 30,
    comfyui_url: str = "http://localhost:8188"
) -> Optional[str]:
    """
    Genera video usando ComfyUI + LivePortrait.

    Args:
        source_image: Ruta a la imagen del avatar (sin fondo)
        driving_audio: Ruta al audio del plato
        output_path: Ruta del video de salida
        width: Ancho del video
        height: Alto del video
        fps: Frames por segundo
        comfyui_url: URL de la API de ComfyUI

    Returns:
        Ruta del video generado o None si falla
    """
    # 1. Cargar workflow de LivePortrait
    workflow = _build_liveportrait_workflow(
        source_image=source_image,
        driving_audio=driving_audio,
        width=width,
        height=height,
        fps=fps
    )

    # 2. Enviar a ComfyUI
    print(f"    Enviando workflow a ComfyUI...")
    prompt_id = _queue_prompt(workflow, comfyui_url)

    if not prompt_id:
        print(f"    [ERROR] No se pudo enviar workflow a ComfyUI")
        return None

    # 3. Esperar resultado
    print(f"    Esperando renderizado (prompt: {prompt_id})...")
    result = _wait_for_completion(prompt_id, comfyui_url, timeout=600)

    if not result:
        print(f"    [ERROR] Timeout o error en ComfyUI")
        return None

    # 4. Descargar video generado
    video_path = _download_output(prompt_id, output_path, comfyui_url)

    if video_path:
        print(f"    [OK] Video guardado: {video_path}")
        return video_path

    return None


def generate_video_liveportrait_direct(
    source_image: str,
    driving_audio: str,
    output_path: str,
    liveportrait_dir: str = "E:\\ComfyUI\\custom_nodes\\ComfyUI-LivePortrait"
) -> Optional[str]:
    """
    Genera video usando LivePortrait directamente (sin ComfyUI).

    Args:
        source_image: Imagen del avatar
        driving_audio: Audio de driving
        output_path: Ruta de salida
        liveportrait_dir: Directorio de LivePortrait

    Returns:
        Ruta del video o None
    """
    inference_script = os.path.join(liveportrait_dir, "inference.py")

    cmd = [
        "python", inference_script,
        "--source_image", source_image,
        "--driving_audio", driving_audio,
        "--output", output_path,
        "--flag_pasteback", "True",
        "--flag_stitching", "True"
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=liveportrait_dir
        )

        if result.returncode == 0 and os.path.exists(output_path):
            return output_path
        else:
            print(f"    [ERROR] LivePortrait: {result.stderr[:500]}")
            return None

    except subprocess.TimeoutExpired:
        print(f"    [ERROR] LivePortrait timeout")
        return None
    except Exception as e:
        print(f"    [ERROR] Excepción: {e}")
        return None


def _build_livePortraitWorkflow(
    source_image: str,
    driving_audio: str,
    width: int,
    height: int,
    fps: int
) -> dict:
    """Construye el workflow JSON para ComfyUI LivePortrait."""
    # Workflow base para LivePortrait
    # NOTA: Los node IDs pueden variar según la versión del custom node
    workflow = {
        "1": {
            "class_type": "LoadImage",
            "inputs": {
                "image": source_image,
                "upload": "image"
            }
        },
        "2": {
            "class_type": "LivePortraitPipeline",
            "inputs": {
                "source_image": ["1", 0],
                "driving_audio": driving_audio,
                "width": width,
                "height": height,
                "fps": fps,
                "flag_pasteback": True,
                "flag_stitching": True
            }
        },
        "3": {
            "class_type": "SaveVideo",
            "inputs": {
                "images": ["2", 0],
                "filename_prefix": "avatar_video",
                "fps": fps,
                "format": "webm"
            }
        }
    }
    return workflow


def _queue_prompt(workflow: dict, comfyui_url: str) -> Optional[str]:
    """Envía un prompt a ComfyUI."""
    client_id = str(uuid.uuid4())

    payload = {
        "prompt": workflow,
        "client_id": client_id
    }

    try:
        response = requests.post(
            f"{comfyui_url}/prompt",
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return data.get('prompt_id')
    except Exception as e:
        print(f"    [ERROR] queue_prompt: {e}")
        return None


def _wait_for_completion(
    prompt_id: str,
    comfyui_url: str,
    timeout: int = 600
) -> Optional[dict]:
    """Espera a que ComfyUI termine de procesar."""
    start = time.time()

    while time.time() - start < timeout:
        try:
            response = requests.get(
                f"{comfyui_url}/history/{prompt_id}",
                timeout=10
            )
            data = response.json()

            if prompt_id in data:
                status = data[prompt_id].get('status', {})
                if status.get('completed', False):
                    return data[prompt_id]
                if status.get('status_str') == 'error':
                    print(f"    [ERROR] ComfyUI error: {status}")
                    return None

        except Exception:
            pass

        time.sleep(2)

    return None


def _download_output(
    prompt_id: str,
    output_path: str,
    comfyui_url: str
) -> Optional[str]:
    """Descarga el video generado desde ComfyUI."""
    try:
        response = requests.get(
            f"{comfyui_url}/history/{prompt_id}",
            timeout=10
        )
        data = response.json()

        if prompt_id not in data:
            return None

        outputs = data[prompt_id].get('outputs', {})

        # Buscar el nodo de salida de video
        for node_id, node_output in outputs.items():
            if 'images' in node_output:
                for img in node_output['images']:
                    filename = img.get('filename', '')
                    subfolder = img.get('subfolder', '')
                    img_type = img.get('type', 'output')

                    # Descargar
                    download_url = f"{comfyui_url}/view?filename={filename}&subfolder={subfolder}&type={img_type}"
                    img_response = requests.get(download_url, timeout=30)

                    if img_response.status_code == 200:
                        with open(output_path, 'wb') as f:
                            f.write(img_response.content)
                        return output_path

        return None

    except Exception as e:
        print(f"    [ERROR] download_output: {e}")
        return None
