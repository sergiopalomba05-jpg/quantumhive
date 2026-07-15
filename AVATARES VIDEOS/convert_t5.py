import torch
import safetensors.torch
import os

print("Loading fp8 model...", flush=True)
sd = safetensors.torch.load_file(r"D:\ComfyUI-Models\text_encoders\umt5-xxl-enc-fp8_e4m3fn.safetensors")
print(f"Loaded {len(sd)} tensors", flush=True)

print("Converting to bf16...", flush=True)
sd2 = {}
for k, v in sd.items():
    sd2[k] = v.to(torch.bfloat16)

print("Saving...", flush=True)
safetensors.torch.save_file(sd2, r"D:\ComfyUI-Models\text_encoders\umt5-xxl-enc-bf16-converted.safetensors")
sz = os.path.getsize(r"D:\ComfyUI-Models\text_encoders\umt5-xxl-enc-bf16-converted.safetensors")
print(f"Done! Size: {sz / 1e9:.1f} GB", flush=True)
