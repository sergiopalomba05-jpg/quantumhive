# Pipeline de ingesta y creacion de avatares

Estado: validado en modo prueba reducido.

## Objetivo

Convertir una imagen fija de avatar + audio de voz + prompt de escena en frames generados con InfiniteTalk dentro de ComfyUI.

## Pipeline paso a paso

1. `LoadImage`
   - Entrada: imagen del avatar.
   - Ejemplo validado: `avatar_test.png`.

2. `LoadAudio`
   - Entrada: audio corto con la frase del avatar.
   - Ejemplo validado: `test_audio.mp3`.

3. `Wav2VecModelLoader`
   - Modelo: `wav2vec2-chinese-base_fp16.safetensors`.
   - Precision validada: `fp32`.
   - Nota: `fp16` falla en `MultiTalkWav2VecEmbeds` con `expected scalar type Float but found Half`.

4. `MultiTalkWav2VecEmbeds`
   - Convierte audio a embeddings temporales para sincronizacion boca/audio.
   - En prueba validada: `num_frames = 17`.

5. `LoadWanVideoT5TextEncoder`
   - Modelo: `umt5-xxl-enc-fp8_e4m3fn.safetensors`.
   - Precision validada: `bf16`.
   - Nota: este nodo no acepta `fp16`; solo `fp32` o `bf16`.

6. `WanVideoTextEncode`
   - Convierte prompt positivo/negativo a embeddings de texto.
   - Validado en CPU para reducir VRAM.

7. `LoadWanVideoClipTextEncoder`
   - Modelo: `clip_vision_h.safetensors`.
   - Precision validada: `fp16`.

8. `WanVideoClipVisionEncode`
   - Convierte la imagen del avatar a embeddings visuales.
   - Se parcheo para mantener CLIP en CPU y mover solo embeddings finales a CUDA.

9. `MultiTalkModelLoader`
   - Adapter: `Wan2_1-InfiniteTalk_Single_Q4_K_M.gguf`.

10. `WanVideoModelLoader`
    - Base: `wan2.1-i2v-14b-480p-Q4_K_M.gguf`.
    - Precision validada para prueba: `fp16`.
    - Attention: `sdpa`.

11. `WanVideoImageToVideoMultiTalk`
    - Une imagen, VAE, embeddings CLIP y modo `infinitetalk`.
    - Resolucion validada de prueba: `384x224`.
    - Frames validados de prueba: `17`.

12. `WanVideoSampler`
    - Genera latents de video.
    - Steps validados de prueba: `5`.
    - En calidad mayor subir steps/resolucion de a poco.

13. `WanVideoDecode`
    - Decodifica latents a frames PNG.
    - VAE tiling activado.

14. `SaveImage`
    - Guarda frames en `ComfyUI/output`.

## Comando ComfyUI validado

```powershell
python main.py --listen 127.0.0.1 --port 8188 --disable-cuda-malloc --lowvram
```

Reglas importantes:

- Usar `--disable-cuda-malloc` para evitar `CUDA error: operation not supported`.
- No usar `--highvram` en L4 22GB para este pipeline.
- Empezar con prueba chica antes de subir calidad.

## Configuracion validada

- GPU: NVIDIA L4 22GB.
- PyTorch: `2.10.0+cu130`.
- ComfyUI: `0.27.0`.
- Allocator estable: `native`, via `--disable-cuda-malloc`.
- Workflow funcional reducido: `384x224`, `17` frames, `5` steps.

## Escalado recomendado

1. Base estable: `384x224`, `17` frames, `5` steps.
2. Subir steps: `10` steps manteniendo `384x224`.
3. Subir frames: `33` frames manteniendo `384x224`.
4. Subir resolucion: `512x288`, `17` frames, `10` steps.
5. Calidad objetivo: avanzar solo si el paso anterior termina sin crash.
