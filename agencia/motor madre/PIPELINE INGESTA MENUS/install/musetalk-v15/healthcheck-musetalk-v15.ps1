param(
  [string]$RuntimeRoot = "D:\ai-runtime\musetalk-v15"
)

$ErrorActionPreference = "Stop"

$repoDir = Join-Path $RuntimeRoot "MuseTalk"
$venvPython = Join-Path $RuntimeRoot ".venv\Scripts\python.exe"

$env:TORCH_HOME = Join-Path $RuntimeRoot "torch-cache"
$env:HF_HOME = Join-Path $RuntimeRoot "hf-home"
$env:HUGGINGFACE_HUB_CACHE = Join-Path $RuntimeRoot "hf-cache"
$env:XDG_CACHE_HOME = Join-Path $RuntimeRoot "xdg-cache"
$env:TEMP = Join-Path $RuntimeRoot "tmp"
$env:TMP = Join-Path $RuntimeRoot "tmp"

if (-not (Test-Path -LiteralPath $venvPython)) {
  throw "Missing MuseTalk venv python: $venvPython"
}

$required = @(
  "models\musetalkV15\unet.pth",
  "models\musetalkV15\musetalk.json",
  "models\sd-vae\config.json",
  "models\sd-vae\diffusion_pytorch_model.bin",
  "models\whisper\config.json",
  "models\whisper\pytorch_model.bin",
  "models\whisper\preprocessor_config.json",
  "models\dwpose\dw-ll_ucoco_384.pth",
  "models\syncnet\latentsync_syncnet.pt",
  "models\face-parse-bisent\79999_iter.pth",
  "models\face-parse-bisent\resnet18-5c106cde.pth"
)

foreach ($relative in $required) {
  $path = Join-Path $repoDir $relative
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing checkpoint: $path"
  }
  $item = Get-Item -LiteralPath $path
  "OK`t$relative`t$($item.Length)"
}

& $venvPython -m pip check
& $venvPython -c "import torch, cv2, mmcv, mmengine, mmdet, mmpose, diffusers, transformers, librosa, imageio_ffmpeg; print('imports_ok'); print('torch=' + torch.__version__); print('cuda=' + str(torch.cuda.is_available())); print('gpu=' + (torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none')); print('ffmpeg=' + imageio_ffmpeg.get_ffmpeg_exe())"
