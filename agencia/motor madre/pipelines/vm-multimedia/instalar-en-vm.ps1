# ============================================
# INSTALADOR AUTOCONTENIDO - PIPELINE VM MULTIMEDIA
# Copiar y pegar este bloque COMPLETO en PowerShell de la VM (por RDP)
# ============================================

$ErrorActionPreference = "Continue"
$BASE = "C:\Users\sergio\pipeline-vm-multimedia"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " INSTALADOR PIPELINE VM MULTIMEDIA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 1. Crear estructura
Write-Host "`n[1/5] Creando carpetas..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$BASE\scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "$BASE\config" -Force | Out-Null
New-Item -ItemType Directory -Path "$BASE\output\audio" -Force | Out-Null
New-Item -ItemType Directory -Path "$BASE\output\video" -Force | Out-Null
New-Item -ItemType Directory -Path "$BASE\docs" -Force | Out-Null
Write-Host " OK" -ForegroundColor Green

# 2. Crear requirements.txt
Write-Host "[2/5] Creando requirements.txt..." -ForegroundColor Yellow
@"
f5-tts>=1.0.0
torch>=2.0.0
torchaudio>=2.0.0
soundfile>=0.12.0
numpy>=1.24.0
requests>=2.31.0
supabase>=2.0.0
Pillow>=10.0.0
tqdm>=4.65.0
pydub>=0.25.1
"@ | Out-File -FilePath "$BASE\scripts\requirements.txt" -Encoding ASCII
Write-Host " OK" -ForegroundColor Green

# 3. Crear voice_clone.py
Write-Host "[3/5] Creando voice_clone.py..." -ForegroundColor Yellow
@"
import os, requests, soundfile as sf, numpy as np
from pathlib import Path

def clone_voice(text, reference_audio, voice_description, output_path, f5tts_url="http://localhost:8080"):
    if not os.path.exists(reference_audio):
        raise FileNotFoundError(f"Audio de referencia no encontrado: {reference_audio}")
    url = f"{f5tts_url}/clone-voice"
    with open(reference_audio, 'rb') as f:
        files = {'reference_audio': (os.path.basename(reference_audio), f, 'audio/wav')}
        data = {'text': text, 'description': voice_description}
        response = requests.post(url, files=files, data=data, timeout=120)
        response.raise_for_status()
    with open(output_path, 'wb') as f:
        f.write(response.content)
    return output_path
"@ | Out-File -FilePath "$BASE\scripts\voice_clone.py" -Encoding UTF8
Write-Host " OK" -ForegroundColor Green

# 4. Crear video_generate.py
Write-Host "[4/5] Creando video_generate.py..." -ForegroundColor Yellow
@"
import os, json, time, uuid, requests
from pathlib import Path

def generate_video(source_image, driving_audio, output_path, width=720, height=405, fps=30, comfyui_url="http://localhost:8188"):
    workflow = {
        "1": {"class_type": "LoadImage", "inputs": {"image": source_image, "upload": "image"}},
        "2": {"class_type": "LivePortraitPipeline", "inputs": {"source_image": ["1", 0], "driving_audio": driving_audio, "width": width, "height": height, "fps": fps, "flag_pasteback": True, "flag_stitching": True}},
        "3": {"class_type": "SaveVideo", "inputs": {"images": ["2", 0], "filename_prefix": "avatar_video", "fps": fps, "format": "webm"}}
    }
    client_id = str(uuid.uuid4())
    resp = requests.post(f"{comfyui_url}/prompt", json={"prompt": workflow, "client_id": client_id}, timeout=30)
    resp.raise_for_status()
    prompt_id = resp.json().get('prompt_id')
    start = time.time()
    while time.time() - start < 600:
        try:
            hist = requests.get(f"{comfyui_url}/history/{prompt_id}", timeout=10).json()
            if prompt_id in hist and hist[prompt_id].get('status', {}).get('completed', False):
                outputs = hist[prompt_id].get('outputs', {})
                for nid, out in outputs.items():
                    if 'images' in out:
                        for img in out['images']:
                            dl = requests.get(f"{comfyui_url}/view?filename={img['filename']}&subfolder={img.get('subfolder','')}&type={img.get('type','output')}", timeout=30)
                            if dl.status_code == 200:
                                with open(output_path, 'wb') as f: f.write(dl.content)
                                return output_path
        except: pass
        time.sleep(2)
    return None
"@ | Out-File -FilePath "$BASE\scripts\video_generate.py" -Encoding UTF8
Write-Host " OK" -ForegroundColor Green

# 5. Crear generate_dish_video.py (orquestador)
Write-Host "[5/5] Creando generate_dish_video.py..." -ForegroundColor Yellow
@"
import os, sys, json, time, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_clone import clone_voice
from video_generate import generate_video

def run(config_path):
    with open(config_path, 'r', encoding='utf-8') as f: config = json.load(f)
    out = Path(config['output_dir'])
    (out/'audio').mkdir(parents=True, exist_ok=True)
    (out/'video').mkdir(parents=True, exist_ok=True)
    print(f"Restaurante: {config['restaurant_name']}")
    print(f"Platos: {len(config['dishes'])}")
    results = {}
    for dish in config['dishes']:
        print(f"\n--- {dish['name']} ---")
        text = f"Hola! Soy Sol. Te recomiendo el {dish['name']}. {dish['description']} No te lo pierdas!"
        audio = out/'audio'/f"{dish['id']}.wav"
        try:
            clone_voice(text, config['voice_reference'], config['voice_description'], str(audio), config['f5tts_url'])
            print(f"  Audio OK: {audio}")
        except Exception as e:
            print(f"  Audio ERROR: {e}"); continue
        video = out/'video'/f"{dish['id']}.webm"
        try:
            generate_video(config['avatar_image'], str(audio), str(video), config['video_config']['width'], config['video_config']['height'], config['video_config']['fps'], config['comfyui_url'])
            print(f"  Video OK: {video}")
            results[dish['id']] = str(video)
        except Exception as e:
            print(f"  Video ERROR: {e}")
    with open(out/'video'/'results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\n=== COMPLETADO: {len(results)}/{len(config['dishes'])} videos ===")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    run(parser.parse_args().config)
"@ | Out-File -FilePath "$BASE\scripts\generate_dish_video.py" -Encoding UTF8
Write-Host " OK" -ForegroundColor Green

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host " INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "`nCarpeta: $BASE"
Write-Host "`nSiguientes pasos:"
Write-Host "  1. Editar config\pipeline_config.json con tus datos"
Write-Host "  2. pip install -r scripts\requirements.txt"
Write-Host "  3. python scripts\generate_dish_video.py --config config\pipeline_config.json"
