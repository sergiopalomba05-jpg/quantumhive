# Instalar F5-TTS en VM GPU (comfyui-l4)

## Requisitos
- Python 3.10+
- NVIDIA GPU con CUDA (L4 tiene 24GB)
- 20GB de disco libre

## Instalación

### 1. Crear entorno virtual
```powershell
cd E:\ComfyUI
python -m venv f5tts-env
f5tts-env\Scripts\activate
```

### 2. Instalar PyTorch con CUDA
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### 3. Instalar F5-TTS
```powershell
pip install f5-tts
```

### 4. Descargar modelos
```powershell
# Crear directorio de modelos
mkdir E:\ComfyUI\models\f5-tts

# Los modelos se descargan automáticamente al primer uso
# O descargar manualmente desde HuggingFace:
pip install huggingface_hub
python -c "from huggingface_hub import snapshot_download; snapshot_download('SWivid/F5-TTS', local_dir='E:/ComfyUI/models/f5-tts')"
```

### 5. Iniciar servicio API
```powershell
# Crear script de inicio
@"
from f5_tts.api import app
import uvicorn
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
"@ | Out-File -FilePath E:\ComfyUI\f5tts-server.py

# Ejecutar
python E:\ComfyUI\f5tts-server.py
```

### 6. Verificar
```powershell
curl http://localhost:8080/health
# Debe retornar: {"status": "ok"}
```

## Configurar firewall (Windows)
```powershell
New-NetFirewallRule -DisplayName "Allow F5-TTS 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

## Troubleshooting

### Error CUDA out of memory
- Cerrar otros programas que usen GPU
- Reducir batch size
- Usar `--device cpu` como fallback

### Error de importación
```powershell
pip install --upgrade f5-tts
pip install --upgrade torch torchaudio
```

### El servicio no inicia
- Verificar que el puerto 8080 no esté en uso: `netstat -an | findstr 8080`
- Revisar logs
