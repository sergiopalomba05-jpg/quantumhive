from PIL import Image
import os

frames_dir = r'C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\frames'
output = r'C:\Users\sergio\Desktop\boveda obsidian\AVATARES VIDEOS\bienvenido-sin-fondo.webp'

# Load all nobg frames
frames = sorted([f for f in os.listdir(frames_dir) if f.startswith('nobg_') and f.endswith('.png')])
print(f'Loading {len(frames)} frames...')

images = []
for f in frames:
    img = Image.open(os.path.join(frames_dir, f))
    images.append(img)

print(f'Saving WebP with alpha ({len(images)} frames)...')
images[0].save(
    output,
    save_all=True,
    append_images=images[1:],
    duration=33,
    loop=0,
    alpha_quality=100,
    method=6
)

size_mb = os.path.getsize(output) / (1024*1024)
print(f'Done: {output} ({size_mb:.2f} MB)')

# Copy to PWA
import shutil
pwa_output = r'C:\Users\sergio\Desktop\boveda obsidian\directimport-app\public\avatar-bienvenido.webp'
shutil.copy2(output, pwa_output)
print(f'Copied to PWA: {pwa_output}')
