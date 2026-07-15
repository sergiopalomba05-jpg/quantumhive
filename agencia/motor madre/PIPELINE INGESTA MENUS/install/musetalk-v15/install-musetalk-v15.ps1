param(
  [string]$RuntimeRoot = "D:\ai-runtime\musetalk-v15",
  [string]$MuseTalkCommit = "0a89dec45a0192b824e3cf4daf96c239440c5ed8"
)

$ErrorActionPreference = "Stop"

$repoDir = Join-Path $RuntimeRoot "MuseTalk"
$venvPython = Join-Path $RuntimeRoot ".venv\Scripts\python.exe"
$huggingFaceCli = Join-Path $RuntimeRoot ".venv\Scripts\huggingface-cli.exe"

New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $RuntimeRoot "tmp") -Force | Out-Null

$env:UV_PYTHON_INSTALL_DIR = Join-Path $RuntimeRoot "uv-python"
$env:UV_CACHE_DIR = Join-Path $RuntimeRoot "uv-cache"
$env:PIP_CACHE_DIR = Join-Path $RuntimeRoot "pip-cache"
$env:HF_HOME = Join-Path $RuntimeRoot "hf-home"
$env:HUGGINGFACE_HUB_CACHE = Join-Path $RuntimeRoot "hf-cache"
$env:XDG_CACHE_HOME = Join-Path $RuntimeRoot "xdg-cache"
$env:TORCH_HOME = Join-Path $RuntimeRoot "torch-cache"
$env:TEMP = Join-Path $RuntimeRoot "tmp"
$env:TMP = Join-Path $RuntimeRoot "tmp"

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
  throw "uv is required. Install uv first, then rerun this script."
}

uv python install 3.10
uv venv (Join-Path $RuntimeRoot ".venv") --python 3.10 --python-preference only-managed

if (-not (Test-Path -LiteralPath $repoDir)) {
  git clone https://github.com/TMElyralab/MuseTalk.git $repoDir
}

git -C $repoDir fetch origin
git -C $repoDir checkout $MuseTalkCommit

& $venvPython -m ensurepip --upgrade
& $venvPython -m pip install --upgrade pip setuptools wheel
& $venvPython -m pip install torch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 --index-url https://download.pytorch.org/whl/cu118
& $venvPython -m pip install -r (Join-Path $repoDir "requirements.txt")

& $venvPython -m pip install --no-cache-dir -U openmim
& (Join-Path $RuntimeRoot ".venv\Scripts\mim.exe") install mmengine
& (Join-Path $RuntimeRoot ".venv\Scripts\mim.exe") install "mmcv==2.0.1"
& (Join-Path $RuntimeRoot ".venv\Scripts\mim.exe") install "mmdet==3.1.0"

# chumpy fails in isolated build on this Windows setup; install it first without build isolation.
& $venvPython -m pip install chumpy==0.70 --no-build-isolation
& (Join-Path $RuntimeRoot ".venv\Scripts\mim.exe") install "mmpose==1.1.0"

# download_weights.bat upgrades huggingface_hub to >=1.x, which breaks transformers 4.39.2.
# Keep the compatible stack and download weights manually.
& $venvPython -m pip install "huggingface_hub==0.30.2" "typer==0.12.5" "rich==13.4.2"
& $venvPython -m pip check

& $huggingFaceCli download TMElyralab/MuseTalk --include "musetalkV15/*" --local-dir (Join-Path $repoDir "models") --cache-dir (Join-Path $RuntimeRoot "hf-cache") --max-workers 1
& $huggingFaceCli download stabilityai/sd-vae-ft-mse --include "config.json" "diffusion_pytorch_model.bin" --local-dir (Join-Path $repoDir "models\sd-vae") --cache-dir (Join-Path $RuntimeRoot "hf-cache") --max-workers 1
& $huggingFaceCli download openai/whisper-tiny --include "config.json" "pytorch_model.bin" "preprocessor_config.json" --local-dir (Join-Path $repoDir "models\whisper") --cache-dir (Join-Path $RuntimeRoot "hf-cache") --max-workers 1
& $huggingFaceCli download yzd-v/DWPose --include "dw-ll_ucoco_384.pth" --local-dir (Join-Path $repoDir "models\dwpose") --cache-dir (Join-Path $RuntimeRoot "hf-cache") --max-workers 1
& $huggingFaceCli download ByteDance/LatentSync --include "latentsync_syncnet.pt" --local-dir (Join-Path $repoDir "models\syncnet") --cache-dir (Join-Path $RuntimeRoot "hf-cache") --max-workers 1
& $huggingFaceCli download ManyOtherFunctions/face-parse-bisent --include "79999_iter.pth" "resnet18-5c106cde.pth" --local-dir (Join-Path $repoDir "models\face-parse-bisent") --cache-dir (Join-Path $RuntimeRoot "hf-cache") --max-workers 1

& $venvPython -c "import torch, cv2, mmcv, mmengine, mmdet, mmpose, imageio_ffmpeg; print('musetalk_runtime_ok'); print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none'); print(imageio_ffmpeg.get_ffmpeg_exe())"
