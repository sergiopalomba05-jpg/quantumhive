# PIPELINE_DEFINITIVO_INGESTA_MENUS

## Decision

Este es el pipeline definitivo para ingestar cartas y preparar la generacion masiva de videos de avatar por plato/conector.

La solucion debe ser simple, local, escalable y separada de la app actual.

## Regla central

No se toca `motor-avatares-run` ni el frontend actual hasta que el pipeline produzca assets finales completos.

La app no debe resolver faltantes. Si una carta se publica, todos los videos requeridos ya tienen que existir.

## Restricciones duras

- Local y open source para el pipeline final.
- GPU objetivo: NVIDIA L4.
- Nada de SaaS como dependencia obligatoria.
- Nada de voz separada en frontend.
- Nada de WebP como salida final con voz.
- Nada de fallback `pending` en produccion.
- No borrar archivos existentes.

## Resultado final esperado

Por cada plato y por cada conector obligatorio debe existir un asset final:

```txt
WebM VP9 con canal alfa + audio Opus integrado
```

El video debe tener:

- Avatar persistente.
- Voz integrada en el mismo archivo.
- Fondo transparente.
- Nombre deterministico.
- Cache por avatar, version, texto y perfil de render.

## Arquitectura simple

El pipeline completo tiene 9 nodos. Cada nodo tiene una sola responsabilidad.

## Nodo 1 - Ingesta de carta

Convierte una carta cruda en JSON limpio.

Entradas aceptadas:

- Texto pegado.
- JSON.
- Imagen/PDF, mas adelante.

Salida:

```json
{
  "restaurant_id": "la-escaloneta",
  "source_type": "text",
  "sections": [
    {
      "id": "entradas",
      "name": "Entradas",
      "items": [
        {
          "name": "Dip de Espinaca y Queso",
          "description": "Dip de espinaca con salsa blanca y queso",
          "price": 27300,
          "currency": "ARS"
        }
      ]
    }
  ]
}
```

Reglas:

- Extrae solo datos de carta.
- No inventa precios.
- No inventa descripciones.
- Si no hay precio: `price: null`.
- Si no hay descripcion: `description: ""`.
- No genera videos.
- No llama al frontend.

## Nodo 2 - Normalizacion e IDs

Convierte el JSON limpio en items estables.

Salida por plato:

```json
{
  "item_id": "dish_dip-de-espinaca-y-queso",
  "kind": "dish",
  "section_id": "entradas",
  "name": "Dip de Espinaca y Queso",
  "normalized_name": "dip de espinaca y queso",
  "description": "Dip de espinaca con salsa blanca y queso",
  "price": 27300,
  "currency": "ARS"
}
```

Reglas:

- IDs deterministas.
- Mismo nombre normalizado produce el mismo ID dentro de la carta.
- Duplicados exactos se consolidan.
- Platos y conectores no se mezclan.

## Nodo 3 - Conectores obligatorios

Agrega los videos de navegacion que necesita la experiencia.

Conectores minimos:

- `connector_welcome`.
- `connector_entradas`.
- `connector_principales`.
- `connector_bebidas`.
- `connector_postres`.
- `connector_add_to_order`.
- `connector_more_options`.
- `connector_checkout`.

Cada conector se trata como un item renderizable, igual que un plato.

## Nodo 4 - Guiones cortos

Genera el texto que dira el avatar.

Reglas:

- 6 a 12 segundos por item.
- Una idea por video.
- No listar toda la receta.
- No inventar beneficios ni ingredientes.
- Tono vendedor, claro y natural.

Ejemplo:

```json
{
  "item_id": "dish_dip-de-espinaca-y-queso",
  "script": "Este dip de espinaca y queso es ideal para arrancar compartiendo. Viene cremoso, sabroso y perfecto para picar mientras miras la carta."
}
```

## Nodo 5 - Canonicalizacion y cache global

Antes de renderizar, el sistema intenta mapear cada job a un asset reutilizable.

La clave no debe depender solo del restaurante. Debe permitir reutilizar videos entre restaurantes cuando el plato/conector es el mismo.

Ejemplo:

```txt
Coca Cola
Coca-Cola
Coca Cola 500ml
```

pueden mapear a:

```txt
dish_coca-cola
```

Salida del nodo:

```txt
output/cache/cache_hits.jsonl
output/cache/render_missing_jobs.jsonl
output/index/restaurant_video_index.json
```

Reglas:

- Primero busca en cache global.
- Si existe, el restaurante apunta al video ya generado.
- Si no existe, el job queda pendiente para render.
- El render solo trabaja sobre `render_missing_jobs.jsonl`.
- Cada demo/local run puede alimentar el cache global.

Clave de asset global:

```txt
sha256(avatar_id | avatar_version | voice_id | render_profile | language | canonical_id)
```

## Nodo 6 - Cache exacto por script

Antes de renderizar se calcula una clave.

```txt
sha256(avatar_id | avatar_version | voice_id | render_profile | language | normalized_script)
```

Si existe:

- Se reutiliza el WebM final.
- No se vuelve a generar.

Si no existe:

- Se crea un job de render.

## Nodo 7 - Generacion local del master

Genera el video hablado base con avatar persistente.

Requisitos:

- Local/open source.
- Corre en L4.
- Produce un master con audio integrado.

Candidatos tecnicos a validar:

- LatentSync.
- MuseTalk.
- Wav2Lip.
- LivePortrait.
- InfiniteTalk solo si el costo/tiempo lo permite.

Nota: Open Generative AI/MuAPI puede servir como referencia, pero no es dependencia final si el requisito es local/open source.

## Nodo 8 - Postproceso WebM alfa + Opus

Convierte el master al formato web final.

Salida obligatoria:

```txt
output/videos/{restaurant_id}/{avatar_id}/{avatar_version}/{item_id}.webm
```

Comando base si ya existen frames con alfa y master con audio:

```powershell
ffmpeg -framerate 30 -i frames\frame_%04d.png -i master_con_voz.mp4 -map 0:v:0 -map 1:a:0 -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 32 -c:a libopus -b:a 96k -shortest output.webm
```

Checks:

- Tiene stream de video VP9.
- Tiene canal alfa real.
- Tiene stream de audio Opus.
- Abre en navegador.

## Nodo 9 - Indice y validacion

Genera el indice final de assets.

```json
{
  "restaurant_id": "la-escaloneta",
  "avatar_id": "sol",
  "avatar_version": "v1",
  "status": "ok",
  "items": [
    {
      "item_id": "dish_dip-de-espinaca-y-queso",
      "kind": "dish",
      "name": "Dip de Espinaca y Queso",
      "video_path": "output/videos/la-escaloneta/sol/v1/dish_dip-de-espinaca-y-queso.webm",
      "has_audio": true,
      "has_alpha": true,
      "cache_key": "..."
    }
  ]
}
```

La carta solo queda publicable si:

- Todos los platos tienen video.
- Todos los conectores obligatorios tienen video.
- Todos los videos tienen audio.
- Todos los videos tienen alfa.
- No hay jobs fallidos.

## Estructura de archivos propuesta

```txt
PIPELINE INGESTA MENUS/
  README.md
  PIPELINE_DEFINITIVO.md
  inputs/
    menus/
  output/
    normalized/
    jobs/
    cache/
    masters/
    videos/
    index/
    reports/
  src/
    ingest/
    normalize/
    scripts/
    cache/
    render/
    package/
    validate/
```

## MVP inmediato

Primero se implementa solo la parte de ingesta. Nada de render todavia.

Entregables del MVP 1:

- Lee una carta en texto o JSON.
- Produce `output/normalized/menu.normalized.json`.
- Produce `output/jobs/render_jobs.jsonl`.
- Incluye platos y conectores obligatorios.
- Calcula `item_id` y `cache_key` deterministas.
- Separa cache hits de jobs faltantes.
- No toca frontend.

## Criterio de exito del MVP 1

Dada una carta con 100 platos:

- Se generan 100 items tipo `dish`.
- Se agregan 8 conectores tipo `connector`.
- Se producen 108 jobs renderizables.
- Se produce `cache_hits.jsonl`.
- Se produce `render_missing_jobs.jsonl`.
- Se produce `restaurant_video_index.json` con links disponibles y faltantes.
- Si se corre dos veces con la misma entrada, los IDs y cache keys no cambian.

## Orden de implementacion

1. Crear CLI local para Nodo 1 y Nodo 2.
2. Agregar conectores obligatorios.
3. Generar scripts cortos deterministas o semi-deterministas.
4. Generar `render_jobs.jsonl`.
5. Ejecutar canonicalizacion + lookup de cache global.
6. Recién despues validar 1 render real de Sol sobre un job faltante.
7. Recién despues escalar a toda la carta.
