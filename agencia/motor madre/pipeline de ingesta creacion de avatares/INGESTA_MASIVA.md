# Ingesta masiva de menus

## Problema detectado

InfiniteTalk funciona, pero no escala como generador de un video unico por cada plato.

Medicion local validada:

```text
17 frames
384x224
5 steps
Tiempo: ~160 segundos
GPU: NVIDIA L4 22GB
```

Esto es una prueba tecnica chica, no calidad final. Un clip usable puede tardar entre 6 y 30 minutos segun resolucion, frames y steps.

Conclusion: si llegan 50 cartas por dia, no podemos generar cientos o miles de videos InfiniteTalk individuales por plato en una sola L4.

## Por que tarda tanto

1. Modelo de difusion de video
   - Wan/InfiniteTalk no genera un video en una sola pasada simple.
   - Hace pasos iterativos por frame/ventana.
   - Mas frames, mas resolucion y mas steps multiplican el tiempo.

2. Modelo grande
   - Base: Wan I2V 14B GGUF.
   - Aunque este cuantizado, sigue siendo pesado para una L4.

3. Carga de modelos
   - T5, CLIP, Wav2Vec, VAE, Wan base e InfiniteTalk participan en la pipeline.
   - La carga/offload consume tiempo y memoria.

4. Ventanas temporales
   - Para audios mas largos, el sampler trabaja por ventanas.
   - Cada ventana suma tiempo.

5. L4 22GB
   - Sirve para pruebas y produccion selectiva.
   - No alcanza para render masivo de todos los platos si se exige video por item.

## Estrategia correcta

Separar el sistema en dos capas:

1. Ingesta masiva rapida
   - Leer cartas.
   - Extraer platos, precios, categorias y descripciones.
   - Normalizar datos.
   - Crear catalogo/app/admin.
   - Esto debe escalar a cientos de menus por dia.

2. Generacion audiovisual selectiva
   - InfiniteTalk solo para clips premium.
   - No para todos los platos por defecto.
   - Render bajo demanda, por prioridad o por plan contratado.

## Arquitectura propuesta

### 1. Entrada

Tipos soportados:

- PDF de carta.
- Fotos de menu.
- Excel/CSV.
- Link web.
- Texto pegado.
- Menu ya estructurado desde POS/delivery.

### 2. Extraccion

Pipeline:

```text
archivo/link
  -> OCR/parser
  -> deteccion de categorias
  -> extraccion de platos
  -> precios
  -> descripciones
  -> alergenos/opciones si existen
  -> normalizacion JSON
```

Salida canonica:

```json
{
  "restaurant": "Nombre",
  "categories": [
    {
      "name": "Tacos",
      "items": [
        {
          "name": "Tacos al pastor",
          "description": "...",
          "price": 12000,
          "currency": "ARS",
          "tags": ["recomendado"],
          "media_priority": "hero"
        }
      ]
    }
  ]
}
```

### 3. Validacion

Cada item debe tener:

- Nombre.
- Categoria.
- Precio si existe.
- Estado de confianza.
- Flag si requiere revision humana.

### 4. Generacion de copy

Para cada plato se genera texto barato y rapido:

- Titulo corto.
- Descripcion comercial.
- Frase de avatar.
- CTA.
- Tags: picante, vegetariano, popular, promo, premium.

### 5. Politica audiovisual por nivel

#### Nivel A: Masivo/default

No genera video por plato.

Genera:

- Catalogo estructurado.
- Imagen si existe.
- Texto comercial.
- Audio TTS opcional.
- Plantilla visual estatica o animada liviana.

Tiempo objetivo: minutos por carta.

#### Nivel B: Avatar base reutilizable

Genera pocos clips base:

- Saludo.
- Recomendacion generica.
- Presentacion de categoria.
- Despedida.

Luego se combinan con:

- Nombre del plato en overlay.
- Audio TTS por plato.
- Subtitulos.
- Foto del plato.

Tiempo objetivo: 5 a 10 clips por restaurante, no 1 por plato.

#### Nivel C: InfiniteTalk selectivo

Solo para:

- Platos estrella.
- Promociones.
- Combos.
- Categoria principal.
- Videos hero para redes.

Tiempo objetivo: 3 a 10 videos por restaurante.

#### Nivel D: Premium masivo

Si el cliente exige video unico por muchos platos:

- Requiere cola GPU.
- Multiples workers.
- Multiples GPUs.
- SLA mas largo.
- Costo separado.

## Sistema de colas

Todo trabajo debe ser asincronico.

Estados:

```text
uploaded
extracting
needs_review
normalized
copy_generated
audio_generated
video_queued
rendering
done
failed
```

Cada job debe ser idempotente usando hash:

```text
restaurant_id + menu_hash + avatar_id + script_hash + render_profile
```

Si ya existe el mismo resultado, se reutiliza.

## Render profiles

### test

```text
384x224
17 frames
5 steps
```

Uso: validacion tecnica.

### preview

```text
512x288
17-33 frames
8-10 steps
```

Uso: revision visual interna.

### production_light

```text
512x288
33 frames
10-15 steps
```

Uso: clips cortos para app.

### production_social

```text
640x352 o superior
49+ frames
15-25 steps
```

Uso: piezas seleccionadas.

## Throughput estimado en una L4

Una L4 sirve para:

- Ingesta: si esta separada del render, cientos de cartas por dia.
- Render InfiniteTalk: bajo volumen, clips seleccionados.

No sirve para:

- 50 cartas/dia x 50 platos x 1 video InfiniteTalk por plato.

Ejemplo:

```text
50 cartas/dia
30 platos promedio
= 1500 platos/dia
```

Si cada video tarda 10 minutos:

```text
1500 x 10 min = 15000 min = 250 horas GPU/dia
```

Se necesitarian muchas GPUs o cambiar la estrategia.

## Decision recomendada

Para escalar:

1. Ingestar todos los menus.
2. Normalizar todos los platos.
3. Generar copy/audio barato para todos.
4. Generar videos InfiniteTalk solo para 3-10 piezas por restaurante.
5. Usar templates/overlays para el resto.

## Proximo desarrollo tecnico

1. Crear schema `MenuIngestJob`.
2. Crear extractor PDF/imagen/CSV/link.
3. Crear normalizador a JSON canonico.
4. Crear generador de scripts por plato.
5. Crear cola de renders con perfiles.
6. Crear compositor rapido con clips base + overlays.
7. Dejar InfiniteTalk como worker premium/selectivo.
