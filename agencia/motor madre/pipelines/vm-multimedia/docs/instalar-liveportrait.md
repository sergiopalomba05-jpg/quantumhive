# Instalar LivePortrait en VM GPU (comfyui-l4)

## Opción 1: Como custom node de ComfyUI (Recomendado)

### 1. Clonar el custom node
```powershell
cd E:\ComfyUI\custom_nodes
git clone https://github.com/KwaiVGI/LivePortrait.git
cd LivePortrait
```

### 2. Instalar dependencias
```powershell
# Activar venv de ComfyUI
E:\ComfyUI\venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Descargar modelos
```powershell
# Los modelos se descargan automáticamente
# O manualmente desde HuggingFace:
python -c "from huggingface_hub import snapshot_download; snapshot_download('KwaiVGI/LivePortrait', local_dir='E:/ComfyUI/custom_nodes/LivePortrait/pretrained_weights')"
```

### 4. Reiniciar ComfyUI
```powershell
# Cerrar y reiniciar ComfyUI
cd E:\ComfyUI
.\venv\Scripts\python.exe main.py --listen 0.0.0.0 --port 8188
```

### 5. Verificar
- Abrir ComfyUI en el navegador
- Buscar nodo "LivePortrait" en el menú
- Si aparece, está instalado correctamente

## Opción 2: Instalación directa (sin ComfyUI)

### 1. Clonar repositorio
```powershell
cd E:\
git clone https://github.com/KwaiVGI/LivePortrait.git
cd LivePortrait
```

### 2. Crear entorno virtual
```powershell
python -m venv liveportrait-env
liveportrait-env\Scripts\activate
```

### 3. Instalar dependencias
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
pip install opencv-python-headless
```

### 4. Descargar modelos
```powershell
python -c "from huggingface_hub import snapshot_download; snapshot_download('KwaiVGI/LivePortrait', local_dir='./pretrained_weights')"
```

### 5. Ejecutar inference
```powershell
python inference.py ^
    --source_image "ruta\al\avatar.webp" ^
    --driving_audio "ruta\al\audio.wav" ^
    --output "ruta\de\salida.webm" ^
    --flag_pasteback True ^
    --flag_stitching True
```

## Configurar firewall (Windows)
```powershell
New-NetFirewallRule -DisplayName "Allow LivePortrait 8189" -Direction Inbound -LocalPort 8189 -Protocol TCP -Action Allow
```

## Troubleshooting

### Error CUDA out of memory
- LivePortrait necesita ~4GB de VRAM
- Cerrar otros procesos de GPU
- Reducir resolución de entrada

### Error de modelo no encontrado
```powershell
# Verificar que los modelos estén en:
dir E:\ComfyUI\custom_nodes\LivePortrait\pretrained_weights
# Debe contener:
#   - appearance_feature_extractor.pth
#   - motion_extractor.pth
#   - warping_module.pth
#   - spade_decoder.pth
#   - stitching_reconstructor.pth
```

### Video sin labios sincronizados
- Verificar que el audio sea claro
- Verificar que la imagen del avatar sea frontal
- Aumentar `flag_stitching` a True

### Error de OpenCV
```powershell
pip uninstall opencv-python
pip install opencv-python-headless
```
