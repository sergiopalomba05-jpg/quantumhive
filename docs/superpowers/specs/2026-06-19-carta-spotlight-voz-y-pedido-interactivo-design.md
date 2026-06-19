---
producto: Carta Viva — demo Kansas
archivo: agencia/clientes/kansas/app.py
fecha: 2026-06-19
estado: diseño aprobado (pendiente plan de implementación)
---

# Carta Viva — Spotlight por voz + pedido interactivo

## Contexto y objetivo

Hoy la mesera virtual responde con voz y la carta tiene un autoguiado que resalta
los platos que nombra. Pero el resaltado se dispara cuando llega el **texto**
(que viaja más rápido que la voz), así que enciende varios platos de golpe, se
adelanta a lo que se escucha, y se queda clavado: si nombra 3 pescados y después
sigue con los vinos, el resaltado se queda en los pescados.

Además: un banner de texto tapa la carta cuando habla; el pedido por voz no
agrega vinos (decía "listo" sin agregar); pedir una categoría ("gaseosas") no
navega la carta; y el botón "+" de cada plato no se entiende.

**Objetivo:** convertir la carta en "el escenario". Mientras la mesera habla, la
carta queda limpia y un **spotlight** se mueve **plato por plato, al ritmo de su
voz**, de punta a punta de la respuesta. Abajo, un botón **"Agregar al pedido"**
sigue al spotlight. Cuando termina, los atajos se vuelven **sus sugerencias**.

## Las 6 piezas

### 1. Spotlight sincronizado con la voz, plato por plato

**Problema actual:** el resaltado se dispara desde el texto acumulado
(`cvGuideScan` sobre `fullReply`), que llega mucho antes que el audio.

**Diseño nuevo:** el resaltado se dispara desde el **reproductor de audio**,
cronometrado contra la duración real de cada frase.

- Cuando se corta una frase para mandarla a TTS (`flushSentences`), se calcula:
  - los platos que nombra esa frase (con el matcher de tokens contiguos ya existente),
  - y la **posición en caracteres** de cada plato dentro de la frase.
- La cola de TTS deja de ser `[promesaDeAudio]` y pasa a ser
  `[{ audio: promesaDeAudio, text: frase, hits: [{ entry, pos }] }]`.
- En el reproductor, justo cuando **arranca a sonar** esa frase:
  - se obtiene `audio.duration` (tras `loadedmetadata`),
  - para cada `hit` se programa un `setTimeout(delay)` con
    `delay = (pos / frase.length) * duration`,
  - en cada disparo se apaga el plato anterior y se enciende el nuevo
    (spotlight de a uno), se scrollea a él, y se actualiza el botón "Agregar".
- Cuando termina esa frase y arranca la siguiente, su propio audio mueve el
  spotlight a SUS platos (ej: pasa de los pescados a los vinos). **Nunca se clava.**
- Al **detener** (botón stop / nuevo turno / `cancelToken`): se limpian los
  timers pendientes y el spotlight.

**Fallback sin duración** (TTS falló o `duration` no disponible): repartir los
hits con un delay fijo por plato (~1100 ms) en orden.

**Modo texto (sin voz):** no hay audio que cronometrar. Se mantiene el resaltado
a medida que llega el texto, de a uno en orden de aparición (sin encender todo junto).

### 2. Sacar el banner sobre la carta

- `updateBanner` deja de mostrar `#solBanner`. La mesera ya no pone texto encima
  de la carta. La guía visual es el spotlight.
- Lo que dice se sigue registrando en el historial de chat (abrible con el chip Sol).
- Se elimina el elemento `#solBanner`, su CSS y las funciones huérfanas
  (`showSolBanner`, `hideSolBanner`, `scheduleSolBannerHide`) — no dejar UI muerta.
- "Transcribiendo…" deja de usar banner: alcanza con el estado del orbe
  ("Pensando…"). `showBanner`/`hideBanner` quedan como no-op o se quitan.

### 3. Botón "Agregar" + sugerencias (híbrido)

**Botón de cada plato (relabel del "+"):**
- Pasa de un círculo "+" a una **pastilla "Agregar"** (texto claro, compacto para celu).
- Estado en pedido: cuando ya está en el carrito, la pastilla muestra `En pedido · N`;
  un toque suma una unidad más (igual que hoy). La gestión de cantidades (bajar/quitar)
  sigue en la pantalla de pedido.
- En vinos/espumantes: una pastilla "Agregar" por variante; el contexto de la fila
  ("Copa" / "Botella") indica qué suma.

**Botón grande del spotlight ("Agregar al pedido"):**
- Mientras el spotlight está sobre un plato (durante la voz), aparece abajo
  —donde están los 4 atajos, que ya se ocultan al hablar— un botón prominente
  **"Agregar al pedido"** con el nombre del plato encendido.
- Se actualiza solo cuando el spotlight pasa al siguiente plato.
- Tocarlo agrega ese plato. Para vinos (copa/botella), abre un mini-selector
  copa/botella (o se omite el botón grande y se usa la pastilla de la fila —
  decidir en implementación, default: omitir para vinos y usar la fila).

**Sugerencias post-respuesta (`#CHIPS#`):**
- Al terminar, los 4 atajos se reemplazan por **2-4 sugerencias que propone la
  mesera** para seguir ("¿Y para tomar?", "Un postre rico", "Algo más liviano").
- La mesera las emite con una línea técnica invisible al final de su respuesta:
  `#CHIPS# ["¿Y para tomar?","Un postre rico"]` — se stripea igual que `#PEDIDO#`
  (no se ve ni se habla, ni siquiera fragmentada en el stream).
- Tocar una sugerencia = mandarla como próximo mensaje (`converse(texto, true)`).
- Si no emite chips, vuelven los 4 atajos por defecto.

### 4. Vino por voz, con "¿copa o botella?"

- Se habilitan los vinos en el pedido por voz, con variante:
  `#PEDIDO# {"add":[{"name":"Baron B Cuvée Spéciale","variant":"botella","qty":1}], ...}`.
- Si el cliente **aclara** ("la **botella** de Baron B") → la mesera emite el
  directiva con `variant` y se agrega directo.
- Si **no aclara** ("agregá el Baron B") → la mesera **repregunta** "¿copa o
  botella?" y NO emite el directiva todavía; recién cuando el cliente contesta,
  lo agrega con la variante.
- Resolver (`cvResolveItem`): para que funcione, el índice de platos debe guardar
  también `price_copa` y `price_botella`. Dado `{name, variant}`, resuelve el vino
  y arma la línea de carrito correcta (`id` con sufijo `|copa`/`|botella`,
  nombre `"X (copa)"`, precio de la variante). Si `variant` falta en un vino, no
  agrega (la mesera debería haber repreguntado).

### 5. Navegación por categoría

- Mapa de alias categoría → sección, derivado de los nombres de sección + un
  diccionario chico de sinónimos comunes:
  - Bebidas ← bebida, gaseosa(s), refresco, agua, tomar algo sin alcohol
  - Cervezas ← cerveza(s), birra
  - Champagne & Espumantes ← champagne, champán, espumante(s)
  - Vinos Tintos/Blancos ← vino(s), tinto(s), blanco(s), malbec, cabernet…
  - Postres ← postre(s), dulce
  - Entradas ← entrada(s), para picar, picada
  - (y el resto por nombre de sección)
- Integrado al spotlight por frase: para cada frase, primero se buscan **platos**;
  si no hay ninguno pero la frase menciona una **categoría**, se scrollea a esa
  sección (y se resalta brevemente su encabezado). Así "mostrame las gaseosas"
  lleva la carta a Bebidas aunque no nombre una marca puntual.

### 6. (derivado) Relabel del botón — ver pieza 3

## Componentes y dónde viven (todo en `app.py`)

| Componente | Cambio |
|---|---|
| `renderCarta()` | índice guarda `price_copa`/`price_botella`; pastilla "Agregar" en vez de "+"; mapa de secciones para nav por categoría. |
| Cola de TTS / `converse` / reproductor | la cola lleva `{audio, text, hits}`; el spotlight se dispara desde el reproductor, cronometrado. |
| Spotlight (`cvGuideScan` → refactor) | nuevo: `cvDishesIn(text)` (devuelve hits con posición, sin mutar estado) + `cvSpotlight(entry)` (enciende uno, apaga el anterior, scrollea, actualiza botón). |
| Banner | eliminado (`#solBanner` + CSS + funciones). |
| Botón "Agregar al pedido" (spotlight) | nuevo elemento flotante abajo, visible al hablar, sigue al spotlight. |
| Chips de sugerencia | parser `#CHIPS#`, render dinámico de los 4 atajos. |
| `cvApplyOrderDirective` / `cvResolveItem` | soportan `variant` (copa/botella) para vinos. |
| `build_system_prompt()` | instrucciones de `#CHIPS#`, de vinos con variante, y de repreguntar copa/botella. |

## Directivas técnicas (invisibles, se stripean del texto hablado/visible)

- `#PEDIDO# {"add":[{"name","variant?","qty"}],"remove":[...],"clear":bool}`
  (extiende la actual con `variant` opcional para vinos).
- `#CHIPS# ["texto1","texto2",...]` (2-4 sugerencias de seguimiento).
- El stripeo debe soportar ambos centinelas y prefijos parciales en el stream SSE.

## Casos borde

- Frase sin platos ni categoría → el spotlight no cambia (no parpadea).
- Plato nombrado dos veces → se resalta una sola vez.
- Nombre corto contenido en uno largo ("Pollo BBQ" ⊂ "Pizzeta de Pollo BBQ") →
  se mantiene la supresión actual.
- Stop a mitad de la respuesta → limpia timers + spotlight + botón Agregar.
- Vino sin variante en el directiva → no se agrega (la mesera repregunta).
- TTS sin duración → fallback de delay fijo por plato.

## Verificación (navegador real, como siempre)

- Spotlight: simular reproducción de frases con varios platos y confirmar que se
  encienden de a uno, en orden, y que avanza de los pescados a los vinos.
- Botón "Agregar" (pastilla) suma bien; estado "en pedido" correcto.
- `#CHIPS#` se stripea (no se ve/habla ni fragmentado) y reemplaza los atajos.
- `#PEDIDO#` con `variant` agrega la copa/botella correcta.
- Nav por categoría: "gaseosas" lleva a Bebidas.
- Banner eliminado: no aparece texto sobre la carta al hablar.

## Fuera de alcance (YAGNI)

- Timestamps por palabra del TTS (usamos posición proporcional, suficiente).
- Selector copa/botella en el botón grande del spotlight (default: vinos se
  agregan desde la pastilla de la fila).
- Persistir sugerencias entre sesiones.
