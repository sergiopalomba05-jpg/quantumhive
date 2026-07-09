# FASE 7: Videos por Plato ⭐ (El Paso Clave)

**Objetivo:** Para CADA plato de la carta, generar un video del avatar hablando de ese plato.

---

## Flujo

```
Para cada plato de la carta:
    │
    ├── 1. Generar texto descriptivo del plato
    │      (nombre + descripción + precio)
    │
    ├── 2. Generar audio con F5-TTS
    │      (voz del avatar leyendo el texto)
    │
    ├── 3. Generar video con LivePortrait
    │      (foto del avatar + audio → labios sincronizados)
    │
    ├── 4. Combinar audio + video
    │      (WebM con alpha + audio)
    │
    └── 5. Cachear en Supabase Storage
           (acceso rápido, costo $0 por reproducción)
```

---

## Ejemplo

**Plato:** Empanadas de carne ($3,500)

**Paso 1 - Texto:**
```
"¡Las empanadas de carne son increíbles! Hechas con carne cortada 
a cuchillo, cebolla y especias secretas. ¡Una de las más pedidas! 
Tres unidades por三千五百 pesos."
```

**Paso 2 - Audio:** F5-TTS genera MP3/WAV con la voz del avatar

**Paso 3 - Video:** LivePortrait toma la foto del avatar y sincroniza labios con el audio

**Paso 4 - Resultado:** Video WebM de 5-10 segundos, sin fondo, con audio

**Paso 5 - Cache:** Se guarda en `videos/{restaurant_id}/{item_id}.webm`

---

## Generación del Texto por Plato

```python
def generate_dish_script(item: dict, avatar_name: str, restaurant_name: str) -> str:
    """Generar el script que el avatar dirá sobre el plato"""
    
    templates = [
        "¡El {name} es increíble! {description}. ¡Una de las más pedidas en {restaurant}!",
        "Si te gusta el {name}, ¡tenés que probarlo! {description}. Solo {price} pesos.",
        "El {name} de {restaurant} es especial. {description}. ¡No te lo pierdas!",
    ]
    
    template = random.choice(templates)
    
    return template.format(
        name=item["name"],
        description=item.get("description", "Preparado con ingredientes frescos"),
        price=item["price"],
        restaurant=restaurant_name,
        avatar=avatar_name
    )
```

---

## Generación de Audio (F5-TTS)

```python
def generate_audio(text: str, voice_id: str) -> bytes:
    """Generar audio con voz clonada"""
    ref_audio_path = f"voices/{voice_id}_ref.wav"
    
    # Streaming para latency mínima
    audio_chunks = tts_model.infer_stream(
        gen_text=text,
        ref_audio=ref_audio_path,
    )
    
    # Combinar chunks en audio completo
    audio_data = b"".join(audio_chunks)
    return audio_data
```

---

## Generación de Video (LivePortrait)

```python
def generate_video(avatar_image: bytes, audio_data: bytes) -> bytes:
    """Generar video del avatar hablando"""
    
    # LivePortrait toma:
    # - Foto fija del avatar (sin fondo)
    # - Audio PCM del plato
    # - Genera frames sincronizando labios
    
    # Opción 1: LivePortrait local (requiere GPU)
    # Opción 2: API externa (Replicate, fal.ai)
    # Opción 3: SadTalker / Wav2Lip (alternativas)
    
    video_frames = liveportrait.render(
        source_image=avatar_image,
        driven_audio=audio_data,
        enhancer="gfpgan"  # Mejorar rostro
    )
    
    return encode_webm(video_frames, audio_data)
```

---

## Batch Processing (Paralelo)

Para no tardar eternamente, procesar de a varios platos en paralelo:

```python
import asyncio

async def process_all_dishes(restaurant_id: str, dishes: list, avatar, voice):
    """Procesar todos los platos en paralelo"""
    
    semaphore = asyncio.Semaphore(5)  # Máximo 5 a la vez
    
    async def process_one(dish):
        async with semaphore:
            # 1. Generar texto
            script = generate_dish_script(dish, avatar["name"], restaurant_id)
            
            # 2. Generar audio
            audio = await generate_audio_async(script, voice["voice_id"])
            
            # 3. Generar video
            video = await generate_video_async(avatar["image_url"], audio)
            
            # 4. Guardar en cache
            video_url = await upload_to_supabase(video, restaurant_id, dish["id"])
            
            return {"dish_id": dish["id"], "video_url": video_url}
    
    # Ejecutar todos en paralelo (con límite)
    tasks = [process_one(dish) for dish in dishes]
    results = await asyncio.gather(*tasks)
    
    return results
```

---

## Tiempos Estimados (por plato)

| Paso | Tiempo (GPU L4) | Tiempo (CPU) |
|------|-----------------|--------------|
| Generar texto | < 1ms | < 1ms |
| F5-TTS (audio) | ~1-2 seg | ~10-20 seg |
| LivePortrait (video) | ~3-5 seg | ~60-120 seg |
| Combinar + comprimir | ~1 seg | ~5 seg |
| **Total por plato** | **~5-8 seg** | **~75-150 seg** |

**Para 30 platos en GPU:** ~2.5-4 minutos
**Para 30 platos en CPU:** ~35-75 minutos

---

## Cache de Videos

Los videos se guardan en Supabase Storage y se sirven desde CDN:

```
videos/
├── {restaurant_id}/
│   ├── {item_id}_video.webm     # Video sin fondo con audio
│   ├── {item_id}_audio.wav      # Solo audio (fallback)
│   └── {item_id}_thumb.jpg      # Thumbnail del video
```

**Costo de almacenamiento:** ~4MB por video × 30 platos = ~120MB por restaurante
**Costo de bandwidth:** $0 (Supabase free tier: 1GB/mes)

---

## Integración con la PWA

Cuando el usuario toca un chip de un plato:

```typescript
// En App.tsx
const handleDishChipClick = (dishId: string) => {
    // 1. Buscar video del plato en cache
    const videoUrl = getVideoUrl(dishId);
    
    // 2. Reproducir video del avatar hablando del plato
    setPlayingVideo(videoUrl);
    
    // 3. Scroll al plato en la carta
    scrollToDish(dishId);
    
    // 4. Highlight del plato
    setHighlightedDish(dishId);
};
```

---

## Bloqueos Actuales

1. **F5-TTS** → No instalado en VM
2. **LivePortrait** → No instalado en VM
3. **VM GPU sin SSH** → Solo RDP
4. **Alternativa CPU** → Funciona pero es lento
5. **Costo:** $0 (GPU propia)
