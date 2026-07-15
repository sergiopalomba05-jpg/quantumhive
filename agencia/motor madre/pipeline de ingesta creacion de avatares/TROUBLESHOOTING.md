# Troubleshooting

## Error: CUDA error: operation not supported

Sintoma:

```text
CUDA error: operation not supported
```

Diagnostico confirmado:

- El error aparecia al mover tensores/modelos a CUDA.
- Con `CUDA_LAUNCH_BLOCKING=1` se aislo en `WanVideoVAELoader` y antes parecia CLIP por reporte asincronico.
- El origen practico fue el allocator `cudaMallocAsync` en esta combinacion de ComfyUI/PyTorch/CUDA.

Fix validado:

```powershell
python main.py --listen 127.0.0.1 --port 8188 --disable-cuda-malloc --lowvram
```

Resultado esperado en `system_stats`:

```text
cuda:0 NVIDIA L4 : native
```

No debe decir:

```text
cudaMallocAsync
```

## Error: CUDA out of memory

Causa comun:

- Usar `--highvram` con Wan 14B GGUF en L4 22GB.
- Resolucion/frames/steps demasiado altos.

Fix:

- Quitar `--highvram`.
- Usar `--lowvram` para prueba estable.
- Reducir resolucion, frames y steps.

## Error: shape invalid

Ejemplo:

```text
shape '[12, 880, 5120]' is invalid
```

Causa:

- Resolucion incompatible con grilla latent de Wan.

Fix:

- Usar resoluciones con multiplos seguros.
- Probadas: `384x224`, `512x288`, `640x352`.

## Error: expected scalar type Float but found Half

Nodo:

```text
MultiTalkWav2VecEmbeds
```

Causa:

- Wav2Vec en `fp16`.

Fix:

- Mantener `Wav2VecModelLoader.base_precision = fp32`.

## Error de validacion: T5 fp16 no aceptado

Mensaje:

```text
precision: 'fp16' not in ['fp32', 'bf16']
```

Fix:

- Mantener `LoadWanVideoT5TextEncoder.precision = bf16`.
