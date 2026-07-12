@echo off
echo ============================================
echo  PIPELINE DE VIDEOS DE AVATAR CACHE
echo ============================================
echo.
echo Restaurante: %1
echo.

cd /d "%~dp0"

echo [1/3] Instalando dependencias...
pip install -r scripts\requirements.txt

echo.
echo [2/3] Verificando servicios...
echo F5-TTS: http://localhost:8080
echo ComfyUI: http://localhost:8188
echo.

echo [3/3] Ejecutando pipeline...
python scripts\generate_dish_video.py --config config\pipeline_config.json

echo.
echo ============================================
echo  PIPELINE COMPLETADO
echo ============================================
pause
