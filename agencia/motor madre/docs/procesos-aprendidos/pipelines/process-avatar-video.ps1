# ============================================================
# SCRIPT: Procesar video del avatar con RMBG (quitar fondo)
# EJECUTAR DESDE LA MQUINA LOCAL DESPUES DE QUE COMFYUI ESTE LISTO
# ============================================================

param(
    [string]$VideoPath = "C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\bienbenido a la escaloneta.mp4",
    [string]$OutputDir = "C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\frames",
    [string]$ComfyUIUrl = "http://34.73.247.22:8188"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PROCESANDO VIDEO CON RMBG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Verificar ffmpeg
$ffmpeg = "C:\Users\sergio\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"
if (-not (Test-Path $ffmpeg)) {
    Write-Host "[ERROR] ffmpeg no encontrado" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] ffmpeg encontrado" -ForegroundColor Green

# 2. Verificar conexion con ComfyUI
Write-Host "`n[1/5] Verificando ComfyUI..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ComfyUIUrl/system_stats" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] ComfyUI esta corriendo" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] No se puede conectar a ComfyUI en $ComfyUIUrl" -ForegroundColor Red
    Write-Host "Asegurate de que ComfyUI este corriendo con --listen 0.0.0.0" -ForegroundColor Yellow
    exit 1
}

# 3. Extraer frames del video
Write-Host "`n[2/5] Extrayendo frames del video..." -ForegroundColor Yellow
if (Test-Path $OutputDir) {
    Remove-Item "$OutputDir\*" -Force
} else {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

& $ffmpeg -i $VideoPath -vf "fps=30" "$OutputDir\frame_%04d.png" -y 2>&1 | Out-Null
$frameCount = (Get-ChildItem "$OutputDir\frame_*.png").Count
Write-Host "[OK] $frameCount frames extraidos" -ForegroundColor Green

# 4. Procesar cada frame con RMBG via ComfyUI API
Write-Host "`n[3/5] Procesando frames con RMBG..." -ForegroundColor Yellow
$processed = 0
$frames = Get-ChildItem "$OutputDir\frame_*.png" | Sort-Object Name

foreach ($frame in $frames) {
    $processed++
    $percent = [math]::Round(($processed / $frameCount) * 100)
    Write-Progress -Activity "Procesando frames" -Status "$processed/$frameCount ($percent%)" -PercentComplete $percent
    
    # Workflow simplificado para RMBG
    $workflow = @{
        "3" = @{
            "class_type" = "LoadImage"
            "inputs" = @{
                "image" = $frame.Name
                "upload" = "image"
            }
        }
        "4" = @{
            "class_type" = "RMBG"
            "inputs" = @{
                "image" = @("3", 0)
                "model" = "bria-rmbg-2.0"
            }
        }
        "5" = @{
            "class_type" = "SaveImage"
            "inputs" = @{
                "images" = @("4", 0)
                "filename_prefix" = "rmbg_$($frame.BaseName)"
            }
        }
    } | ConvertTo-Json -Depth 10

    # Subir imagen a ComfyUI
    $boundary = [System.Guid]::NewGuid().ToString()
    $body = @"
--$boundary
Content-Disposition: form-data; name="image"; filename="$($frame.Name)"
Content-Type: image/png

$([System.IO.File]::ReadAllBytes($frame.FullName) | [System.Convert]::ToBase64String)
--$boundary--
"@

    try {
        Invoke-WebRequest -Uri "$ComfyUIUrl/upload/image" -Method Post -ContentType "multipart/form-data; boundary=$boundary" -Body $body -TimeoutSec 30 | Out-Null
        
        # Ejecutar workflow
        $promptBody = @{ "prompt" = $workflow } | ConvertTo-Json -Depth 10
        $result = Invoke-WebRequest -Uri "$ComfyUIUrl/prompt" -Method Post -ContentType "application/json" -Body $promptBody -TimeoutSec 60
        
        # Esperar resultado
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "[WARN] Error procesando $($frame.Name): $_" -ForegroundColor Yellow
    }
}
Write-Progress -Activity "Procesando frames" -Completed
Write-Host "[OK] $frameCount frames procesados" -ForegroundColor Green

# 5. Recomponer en WebP animado con alpha
Write-Host "`n[4/5] Creando WebP animado con alpha..." -ForegroundColor Yellow
$outputWebP = "C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\bienvenido-sin-fondo.webp"

& $ffmpeg -framerate 30 -i "$OutputDir\rmbg_frame_%04d.png" -vcodec libwebp -lossless 0 -qscale 80 -loop 0 -alpha_quality 100 -pix_fmt rgba $outputWebP -y 2>&1 | Out-Null

if (Test-Path $outputWebP) {
    $size = [math]::Round((Get-Item $outputWebP).Length / 1MB, 2)
    Write-Host "[OK] WebP creado: $outputWebP ($size MB)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No se pudo crear el WebP" -ForegroundColor Red
    exit 1
}

# 6. Copiar a la PWA
Write-Host "`n[5/5] Copiando a la PWA..." -ForegroundColor Yellow
$pwaPublic = "C:\Users\sergio\Desktop\boveda obsidian\directimport-app\public"
Copy-Item $outputWebP "$pwaPublic\avatar-bienvenido.webp" -Force
Write-Host "[OK] Copiado a $pwaPublic\avatar-bienvenido.webp" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PROCESO COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "WebP con alpha: $outputWebP" -ForegroundColor White
Write-Host "Copiado a PWA: $pwaPublic\avatar-bienvenido.webp" -ForegroundColor White
