# BRF_PIPELINE_AVATARES_PERSISTENTES

## Regla principal

La app frontend actual no se toca para este trabajo. La app ya esta bien. Este pipeline vive aparte y produce assets finales para que despues el admin/carta los asocie a platos y chips.

## Objetivo

Construir un pipeline simple y escalable para que el duenio de un restaurante cargue su carta y el sistema genere un video final por plato y por conector, con el avatar persistente hablando y con la voz integrada dentro del mismo archivo de video.

El resultado final por item debe ser un archivo reproducible directo por navegador:

- Formato final principal: `webm`.
- Video: VP9 con canal alfa real.
- Audio: Opus integrado en el mismo archivo.
- Fondo: transparente.
- Identidad: mismo avatar persistente por restaurante/avatar.
- Naming: deterministico.
- Cache: si el video ya existe para ese avatar/version/texto, no se vuelve a generar.

## Lo que no es este pipeline

- No es una modificacion del frontend actual.
- No es voz en vivo.
- No es TTS separado reproducido por la app.
- No es WebP animado, porque WebP no soporta audio.
- No es render bajo demanda del cliente final.
- No es generar un clip si falta mientras el usuario navega; para publicar una carta, todos los videos requeridos deben existir antes.

## Principio de producto

Para una carta publicada no existe el estado `pending` en produccion. Antes de publicar, el sistema debe validar que cada plato y cada conector obligatorio tenga su video final generado, guardado e indexado.

## Entradas

1. Carta del restaurante.
   - Texto pegado.
   - Imagen/PDF de carta.
   - JSON ya estructurado.

2. Perfil de restaurante.
   - `restaurant_id`.
   - Nombre.
   - Categorias/rubros.
   - Idioma.

3. Perfil de avatar.
   - `avatar_id`.
   - `avatar_version`.
   - Imagen o video base del avatar.
   - Estilo visual.
   - Voz integrada mediante el generador elegido.

4. Plantillas de texto.
   - Frase por plato.
   - Conectores: bienvenida, entradas, principales, bebidas, postres, cierre, sugerencias.

## Salidas

1. `menu.normalized.json`.
2. `jobs.jsonl` con los trabajos de video a generar.
3. Videos finales:
   - `output/videos/{avatar_id}/{avatar_version}/{item_id}.webm`
4. Indice final:
   - `output/index/avatar_video_index.json`
5. Reporte de validacion:
   - `output/reports/validation.json`

## Arquitectura definitiva

### Nodo 1 - Ingesta de carta

Responsabilidad: convertir la carta cruda en JSON limpio.

Entrada:

- Texto, imagen, PDF o JSON.

Salida:

```json
{
  "restaurant_id": "la-escaloneta",
  "sections": [
    {
      "id": "entradas",
      "name": "Entradas",
      "items": [
        {
          "id": "dip-de-espinaca-y-queso",
          "name": "Dip de Espinaca y Queso",
          "description": "Dip de espinaca con salsa blanca y queso...",
          "price": 27300,
          "kind": "dish"
        }
      ]
    }
  ]
}
```

Reglas:

- Extraer solo datos de carta.
- No generar videos.
- No tocar frontend.
- No inventar precios.
- Si el precio no existe, `price: null`.
- Si no hay descripcion, `description: ""`.

### Nodo 2 - Normalizacion e IDs deterministas

Responsabilidad: estabilizar nombres, IDs y deduplicacion.

Salida por item:

```json
{
  "item_id": "dish_dip-de-espinaca-y-queso",
  "source_name": "Dip de Espinaca y Queso",
  "normalized_name": "dip de espinaca y queso",
  "section_id": "entradas",
  "kind": "dish"
}
```

Reglas:

- El mismo plato con el mismo nombre normalizado debe producir el mismo ID dentro de una carta.
- El cache global se calcula con `avatar_id`, `avatar_version`, `voice_style`, `normalized_text` y `render_profile`.
- No mezclar platos con conectores.

### Nodo 3 - Generacion de guiones

Responsabilidad: producir el texto que dira el avatar para cada plato/conector.

Salida:

```json
{
  "item_id": "dish_dip-de-espinaca-y-queso",
  "script": "Este dip de espinaca y queso es ideal para arrancar compartiendo. Viene cremoso, sabroso y con tortilla chips para ir picando mientras miras la carta."
}
```

Reglas:

- Frases cortas: objetivo 6 a 12 segundos.
- Una idea por video.
- Evitar listas largas de ingredientes.
- No decir que es IA.
- No inventar informacion que no este en la carta.

### Nodo 4 - Lookup de cache

Responsabilidad: decidir si hay que renderizar o reutilizar.

Cache key:

```txt
sha256(avatar_id | avatar_version | voice_style | render_profile | language | normalized_script)
```

Si existe:

- Devuelve ruta del WebM final.
- Salta generacion.

Si no existe:

- Crea job de render.

### Nodo 5 - Generacion del video hablado

Responsabilidad: crear el master donde el avatar habla con voz integrada.

Opciones a evaluar, en orden:

1. `Open Generative AI / MuAPI Lip Sync Studio` como reemplazo operativo de Google Vids.
   - Modelos candidatos: `ltx-2.3-lipsync`, `latent-sync`, `wan2.2-speech-to-video`, `infinitetalk-image-to-video`.
   - Ventaja: API programable y flujo parecido a Google Vids.
   - Desventaja: no es totalmente local si depende de MuAPI.

2. Pipeline local con ComfyUI.
   - Candidatos: LatentSync, MuseTalk, Wav2Lip, LivePortrait, InfiniteTalk.
   - Ventaja: control local.
   - Desventaja: setup mas delicado y validacion por modelo.

Regla clave:

- El master ya debe tener voz integrada. No se acepta que la app reproduzca audio aparte.

### Nodo 6 - Transparencia y empaquetado final

Responsabilidad: convertir el master a formato web final.

Salida obligatoria:

```txt
WebM VP9 + alpha + Opus audio
```

Comando base de empaquetado, si ya existen frames PNG RGBA y audio o master con audio:

```powershell
ffmpeg -framerate 30 -i frames\frame_%04d.png -i master_con_voz.mp4 -map 0:v:0 -map 1:a:0 -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 32 -c:a libopus -b:a 96k -shortest output.webm
```

Reglas:

- No convertir a WebP para produccion con voz, porque WebP pierde audio.
- El alpha debe validarse en el archivo final.
- El audio debe validarse en el archivo final.

### Nodo 7 - Almacenamiento e indice

Responsabilidad: guardar assets e indexarlos.

Estructura local:

```txt
output/
  videos/
    {avatar_id}/
      {avatar_version}/
        {item_id}.webm
  masters/
    {avatar_id}/
      {avatar_version}/
        {item_id}.mp4
  index/
    avatar_video_index.json
  reports/
    validation.json
```

Indice:

```json
{
  "restaurant_id": "la-escaloneta",
  "avatar_id": "sol",
  "avatar_version": "v1",
  "items": [
    {
      "item_id": "dish_dip-de-espinaca-y-queso",
      "name": "Dip de Espinaca y Queso",
      "kind": "dish",
      "video_url": "videos/sol/v1/dish_dip-de-espinaca-y-queso.webm",
      "cache_key": "...",
      "duration_seconds": 8.4,
      "has_alpha": true,
      "has_audio": true
    }
  ]
}
```

### Nodo 8 - Validacion y publicacion

Responsabilidad: bloquear publicacion si falta algo.

Checks obligatorios:

- Cada plato requerido tiene video.
- Cada conector requerido tiene video.
- Cada video tiene audio.
- Cada video tiene alpha.
- Cada video abre en navegador.
- Duracion razonable.
- Peso razonable.

La carta solo queda lista para frontend cuando `validation.status = "ok"`.

## Conectores obligatorios

Minimo:

- `connector_welcome`.
- `connector_entradas`.
- `connector_principales`.
- `connector_bebidas`.
- `connector_postres`.
- `connector_add_to_order`.
- `connector_more_options`.
- `connector_checkout`.

Los conectores son videos igual que los platos, con la misma identidad de avatar.

## Criterio de exito

Dada una carta con 100 platos y 8 conectores:

- El sistema normaliza 108 items.
- Busca cache por cada item.
- Genera solo los faltantes.
- Produce 108 WebM finales con VP9 alpha + Opus.
- Genera un indice final.
- Bloquea publicacion si falta video, audio o alpha en cualquier item.

## Primer MVP real

No hacer todo de golpe.

MVP 1:

1. Nodo 1: ingesta desde texto/JSON a `menu.normalized.json`.
2. Nodo 2: IDs deterministas.
3. Nodo 3: scripts cortos.
4. Crear `jobs.jsonl`.
5. Probar 1 solo video con Sol usando el generador elegido.
6. Convertir ese video a WebM VP9 alpha + Opus.
7. Validar `has_audio = true` y `has_alpha = true`.

Recién cuando 1 plato funciona perfecto se escala a todos.

## Prohibiciones para implementacion

- No tocar `motor-avatares-run`.
- No tocar el frontend actual.
- No agregar fallback `pending` al frontend.
- No separar audio y video en runtime.
- No usar WebP como salida final con voz.
- No instalar SaaS/servicios externos sin decision explicita.
- No borrar archivos viejos.
