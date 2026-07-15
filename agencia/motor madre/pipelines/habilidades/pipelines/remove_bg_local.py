import os
import sys
import subprocess
import rembg
from PIL import Image
from pathlib import Path
import io

# Config
VIDEO_PATH = r"C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\bienbenido a la escaloneta.mp4"
FRAMES_DIR = r"C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\frames"
OUTPUT_WEBP = r"C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\bienvenido-sin-fondo.webp"
FFMPEG = r"C:\Users\sergio\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.1-full_build\bin\ffmpeg.exe"

# Create frames dir
os.makedirs(FRAMES_DIR, exist_ok=True)

print("[1/4] Extracting frames from video...")
subprocess.run([FFMPEG, "-i", VIDEO_PATH, "-vf", "fps=30", os.path.join(FRAMES_DIR, "frame_%04d.png"), "-y"], 
               capture_output=True, check=True)

frames = sorted([f for f in os.listdir(FRAMES_DIR) if f.startswith("frame_") and f.endswith(".png")])
print(f"  Extracted {len(frames)} frames")

print("[2/4] Removing background from frames...")
session = rembg.new_session()
processed = 0
total = len(frames)

for frame_name in frames:
    processed += 1
    frame_path = os.path.join(FRAMES_DIR, frame_name)
    output_path = os.path.join(FRAMES_DIR, f"nobg_{frame_name}")
    
    if os.path.exists(output_path):
        continue
    
    img = Image.open(frame_path)
    result = rembg.remove(img, session=session, alpha_matting=True, alpha_matting_foreground_threshold=240)
    result.save(output_path, "PNG")
    
    if processed % 10 == 0 or processed == total:
        print(f"  Processed {processed}/{total} ({processed*100//total}%)")

print("[3/4] Creating WebP with alpha...")
nobg_frames = sorted([f for f in os.listdir(FRAMES_DIR) if f.startswith("nobg_") and f.endswith(".png")])
temp_dir = os.path.join(FRAMES_DIR, "temp_webp")
os.makedirs(temp_dir, exist_ok=True)

# Copy nobg frames with sequential naming for ffmpeg
for i, f in enumerate(nobg_frames):
    src = os.path.join(FRAMES_DIR, f)
    dst = os.path.join(temp_dir, f"frame_{i:04d}.png")
    Image.open(src).save(dst, "PNG")

subprocess.run([FFMPEG, "-framerate", "30", "-i", os.path.join(temp_dir, "frame_%04d.png"), 
                "-vcodec", "libwebp", "-lossless", "0", "-qscale", "80", "-loop", "0", 
                "-alpha_quality", "100", "-pix_fmt", "rgba", OUTPUT_WEBP, "-y"],
               capture_output=True, check=True)

size_mb = os.path.getsize(OUTPUT_WEBP) / (1024*1024)
print(f"  WebP created: {OUTPUT_WEBP} ({size_mb:.2f} MB)")

# Copy to PWA
PWA_PUBLIC = r"C:\Users\sergio\Desktop\boveda obsidian\directimport-app\public"
pwa_output = os.path.join(PWA_PUBLIC, "avatar-bienvenido.webp")
import shutil
shutil.copy2(OUTPUT_WEBP, pwa_output)
print(f"[4/4] Copied to PWA: {pwa_output}")

# Cleanup temp
import shutil
shutil.rmtree(temp_dir, ignore_errors=True)

print("\nDONE!")
