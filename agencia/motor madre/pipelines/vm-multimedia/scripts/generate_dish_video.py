"""
Pipeline de Creación de Videos de Avatar Cache para Platos
==========================================================
Orquesta todo el proceso:
1. Toma nombres de platos + imagen avatar + voz de referencia
2. Genera audio por plato con F5-TTS (clonación de voz)
3. Genera video por plato con LivePortrait (lip-sync)
4. Cachea videos en Supabase Storage
5. Retorna URLs de los videos

Ejecutar en VM con GPU (comfyui-l4):
  python generate_dish_video.py --config config/pipeline_config.json
"""

import os
import sys
import json
import time
import shutil
import argparse
import subprocess
from pathlib import Path
from typing import Optional

# Agregar scripts al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from voice_clone import clone_voice
from video_generate import generate_video
from upload_supabase import upload_video, get_video_url


def load_config(config_path: str) -> dict:
    """Carga la configuración del pipeline."""
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def ensure_directories(config: dict):
    """Crea directorios de salida si no existen."""
    output_dir = Path(config['output_dir'])
    audio_dir = output_dir / 'audio'
    video_dir = output_dir / 'video'
    audio_dir.mkdir(parents=True, exist_ok=True)
    video_dir.mkdir(parents=True, exist_ok=True)
    return audio_dir, video_dir


def check_services(config: dict) -> bool:
    """Verifica que F5-TTS y ComfyUI estén corriendo."""
    import requests

    services_ok = True

    # Check F5-TTS
    try:
        resp = requests.get(f"{config['f5tts_url']}/health", timeout=5)
        if resp.status_code == 200:
            print("[OK] F5-TTS está corriendo")
        else:
            print(f"[WARN] F5-TTS respondió con status {resp.status_code}")
            services_ok = False
    except Exception as e:
        print(f"[ERROR] F5-TTS no disponible: {e}")
        services_ok = False

    # Check ComfyUI
    try:
        resp = requests.get(f"{config['comfyui_url']}/system_stats", timeout=5)
        if resp.status_code == 200:
            print("[OK] ComfyUI está corriendo")
        else:
            print(f"[WARN] ComfyUI respondió con status {resp.status_code}")
            services_ok = False
    except Exception as e:
        print(f"[ERROR] ComfyUI no disponible: {e}")
        services_ok = False

    return services_ok


def generate_audio_for_dish(
    dish: dict,
    voice_reference: str,
    voice_description: str,
    audio_dir: Path,
    config: dict
) -> Optional[Path]:
    """Genera audio para un plato usando F5-TTS."""
    dish_id = dish['id']
    dish_name = dish['name']
    dish_desc = dish['description']

    # Texto que el avatar va a decir
    text = f"Hola! Soy Sol, tu asistente virtual. Te recomiendo el {dish_name}. {dish_desc} ¡No te lo pierdas!"

    output_path = audio_dir / f"{dish_id}.wav"

    print(f"  [AUDIO] Generando voz para: {dish_name}...")

    try:
        result = clone_voice(
            text=text,
            reference_audio=voice_reference,
            voice_description=voice_description,
            output_path=str(output_path),
            f5tts_url=config['f5tts_url']
        )
        if result:
            print(f"  [OK] Audio generado: {output_path}")
            return output_path
        else:
            print(f"  [ERROR] No se pudo generar audio para {dish_name}")
            return None
    except Exception as e:
        print(f"  [ERROR] Excepción generando audio: {e}")
        return None


def generate_video_for_dish(
    dish: dict,
    audio_path: Path,
    avatar_image: str,
    video_dir: Path,
    config: dict
) -> Optional[Path]:
    """Genera video para un plato usando LivePortrait."""
    dish_id = dish['id']
    output_path = video_dir / f"{dish_id}.webm"

    print(f"  [VIDEO] Generando video para: {dish['name']}...")

    try:
        result = generate_video(
            source_image=avatar_image,
            driving_audio=str(audio_path),
            output_path=str(output_path),
            width=config['video_config']['width'],
            height=config['video_config']['height'],
            fps=config['video_config']['fps'],
            comfyui_url=config['comfyui_url']
        )
        if result:
            print(f"  [OK] Video generado: {output_path}")
            return output_path
        else:
            print(f"  [ERROR] No se pudo generar video para {dish['name']}")
            return None
    except Exception as e:
        print(f"  [ERROR] Excepción generando video: {e}")
        return None


def upload_to_supabase(
    video_path: Path,
    dish_id: str,
    restaurant_name: str,
    config: dict
) -> Optional[str]:
    """Sube video a Supabase Storage y retorna la URL pública."""
    print(f"  [UPLOAD] Subiendo {dish_id} a Supabase...")

    try:
        public_url = upload_video(
            local_path=str(video_path),
            dish_id=dish_id,
            restaurant_name=restaurant_name,
            supabase_url=config['supabase_url'],
            supabase_key=config['supabase_key'],
            bucket=config['supabase_bucket']
        )
        if public_url:
            print(f"  [OK] URL: {public_url}")
            return public_url
        else:
            print(f"  [ERROR] No se pudo subir {dish_id}")
            return None
    except Exception as e:
        print(f"  [ERROR] Excepción subiendo: {e}")
        return None


def run_pipeline(config_path: str):
    """Ejecuta el pipeline completo."""
    print("=" * 60)
    print("PIPELINE DE CREACIÓN DE VIDEOS DE AVATAR CACHE")
    print("=" * 60)

    # 1. Cargar configuración
    print("\n[1/6] Cargando configuración...")
    config = load_config(config_path)
    restaurant_name = config['restaurant_name']
    dishes = config['dishes']
    print(f"  Restaurante: {restaurant_name}")
    print(f"  Platos: {len(dishes)}")

    # 2. Crear directorios
    print("\n[2/6] Preparando directorios...")
    audio_dir, video_dir = ensure_directories(config)
    print(f"  Audio: {audio_dir}")
    print(f"  Video: {video_dir}")

    # 3. Verificar servicios
    print("\n[3/6] Verificando servicios...")
    if not check_services(config):
        print("\n[ABORT] Servicios no disponibles. Verificar que F5-TTS y ComfyUI estén corriendo.")
        return

    # 4. Generar audio por plato
    print(f"\n[4/6] Generando audios ({len(dishes)} platos)...")
    audio_results = {}
    for i, dish in enumerate(dishes, 1):
        print(f"\n  --- Plato {i}/{len(dishes)}: {dish['name']} ---")
        audio_path = generate_audio_for_dish(
            dish=dish,
            voice_reference=config['voice_reference'],
            voice_description=config['voice_description'],
            audio_dir=audio_dir,
            config=config
        )
        if audio_path:
            audio_results[dish['id']] = audio_path

    print(f"\n  Audios generados: {len(audio_results)}/{len(dishes)}")

    # 5. Generar video por plato
    print(f"\n[5/6] Generando videos ({len(audio_results)} platos)...")
    video_results = {}
    for dish_id, audio_path in audio_results.items():
        dish = next((d for d in dishes if d['id'] == dish_id), None)
        if not dish:
            continue

        print(f"\n  --- {dish['name']} ---")
        video_path = generate_video_for_dish(
            dish=dish,
            audio_path=audio_path,
            avatar_image=config['avatar_image'],
            video_dir=video_dir,
            config=config
        )
        if video_path:
            video_results[dish_id] = video_path

    print(f"\n  Videos generados: {len(video_results)}/{len(audio_results)}")

    # 6. Subir a Supabase
    print(f"\n[6/6] Subiendo videos a Supabase...")
    uploaded_urls = {}
    for dish_id, video_path in video_results.items():
        url = upload_to_supabase(
            video_path=video_path,
            dish_id=dish_id,
            restaurant_name=restaurant_name,
            config=config
        )
        if url:
            uploaded_urls[dish_id] = url

    # Resumen final
    print("\n" + "=" * 60)
    print("RESUMEN DEL PIPELINE")
    print("=" * 60)
    print(f"  Restaurante: {restaurant_name}")
    print(f"  Platos totales: {len(dishes)}")
    print(f"  Audios generados: {len(audio_results)}")
    print(f"  Videos generados: {len(video_results)}")
    print(f"  Videos subidos: {len(uploaded_urls)}")

    # Guardar resultados
    results_path = video_dir / 'results.json'
    with open(results_path, 'w', encoding='utf-8') as f:
        json.dump({
            'restaurant': restaurant_name,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'dishes_total': len(dishes),
            'audio_generated': len(audio_results),
            'video_generated': len(video_results),
            'uploaded': len(uploaded_urls),
            'urls': uploaded_urls
        }, f, indent=2, ensure_ascii=False)

    print(f"\n  Resultados guardados en: {results_path}")
    print("=" * 60)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pipeline de videos de avatar cache')
    parser.add_argument('--config', required=True, help='Ruta al archivo de configuración JSON')
    args = parser.parse_args()

    run_pipeline(args.config)
