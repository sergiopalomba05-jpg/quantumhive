# Carta Kansas — Navegación, "Detener", acciones rápidas, pedido y feedback

**Fecha:** 2026-06-18
**Producto:** Carta Viva (demo "Kansas" / instancia `la-escaloneta`)
**Archivo único:** `agencia/clientes/kansas/app.py` (FastAPI + HTML/JS embebido)
**Space:** `quantumhive-qrcarta.hf.space` (HuggingFace, Docker, puerto 7860)

---

## 1. Contexto

La demo es una carta digital de una sola pantalla con una "mesera virtual" que
habla. Todo vive en `app.py`: backend FastAPI (`/`, `/menu.json`, `/chat`,
`/chat/stream`, `/tts`, `/stt`) + frontend HTML/JS embebido + `menu.json`
embebido. Voz por **ElevenLabs** (`/tts`), chat y transcripción por **Gemini**.

**Problema raíz que motiva esto:** el frontend **no maneja el botón "atrás"** del
navegador (no hay nada de History API). Cualquier "atrás" —en el chat o en el
menú— saca al comensal del HTML. Además, falta cerrar el circuito del comensal:
hoy la mesera **aconseja** pero no hay forma de **pedir** ni de **valorar** la
atención.

## 2. Objetivo

Completar el recorrido del comensal sin romper lo existente:

1. Navegación "atrás" por capas (no expulsar).
2. Cartel de confirmación al salir.
3. Poder **detener** la voz mientras la mesera habla.
4. Botones de acción rápida flanqueando el orbe.
5. **Pedido**: carrito + checkout que entrega el pedido al local (vía `wa.me`) y/o
   lo muestra en pantalla al mozo.
6. **Encuesta de estrellas** post-pedido, guardada en **Supabase**.

## 3. Alcance

**SÍ:**
- Cambios en el HTML/JS embebido de `app.py`.
- Un endpoint nuevo `POST /feedback` en `app.py` que inserta en Supabase (REST,
  vía `httpx` que ya está en `requirements.txt`).
- Una migración nueva para la tabla `feedback` en el proyecto `supabase/` ya
  existente.

**NO (fuera de alcance):**
- No se toca el backend de `/chat`, `/tts`, `/stt` ni ElevenLabs/Gemini.
- No se crea backend para "despachar el pedido solo" (el pedido viaja por `wa.me`;
  el camino sin salida de la app queda para cuando un cliente compre).
- No se persisten los pedidos en base (solo el feedback). Los pedidos van por
  WhatsApp.
- No se toca el problema de créditos de ElevenLabs (es aparte).

---

## 4. Diseño por componente

### 4.1 Navegación "atrás" por capas (History API)

Hoy no hay nada; el navegador interpreta "atrás" como "abandonar la página".

**Modelo de capas** (de base hacia arriba):

- `home` — base: carta arriba del todo, primera pestaña activa.
- `section` — una pestaña/sección distinta de la primera está seleccionada.
- overlays apilables: `chat`, `order` (pantalla de pedido), `card` (cartel al
  mozo), `rating` (encuesta).

**Mecánica:**

- Al entrar a la app (después del splash) se hace un `history.pushState` centinela,
  así el primer "atrás" no abandona la página.
- Se mantiene una pila JS `state.navStack = []` que refleja las capas abiertas.
  Cada "abrir" (chat / order / card / rating, o seleccionar una pestaña no-home)
  hace `navStack.push(layer)` + `history.pushState`.
- `window.addEventListener('popstate', ...)`:
  - Si hay capas en `navStack` → cierra la **capa de arriba** (chat/order/card/
    rating) o, si era `section`, vuelve a `home` (scroll arriba + primera pestaña
    activa). **No** abandona la página.
  - Si `navStack` está vacío (estamos en `home` y el "atrás" consumió el
    centinela) → dispara el **modal de salida** (4.2) y vuelve a empujar el
    centinela para no quedar "fuera".

**Toca:** zona de `renderCarta()` (los `tab.onclick`, ~líneas 2218-2223),
`openHistory()`/`closeHistory()` (~2320-2333), y un bloque nuevo de gestión de
navegación cerca del `state` inicial (~2036).

### 4.2 Modal de salida

Cartel a pantalla completa: *"¿Seguro que querés salir de la mesera virtual?"* con
**[Salir]** / **[Quedarme]**.

- **Quedarme** → cierra el modal, re-empuja el centinela, no pasa nada.
- **Salir** → `history.go(-1)` (o `-2`) para abandonar de verdad la página.

Reutiliza estilos del splash/banner existentes (negro `#0E0A07`, dorado `--gold`,
acento `--accent`). HTML nuevo junto al `#toast` (~2030).

### 4.3 Botón "Detener" mientras habla

Hoy, cuando la mesera habla (`setSolState('speaking')`), el orbe muestra
"Hablando" y solo se la puede cortar grabando encima.

**Cambio:**
- En estado `speaking`, el label del orbe pasa a **"Detener"** (en `setSolState`,
  ~2052-2067: el mapa `labels` para `speaking` → `'Detener'`).
- Un **tap** (no hold) sobre el orbe en estado `speaking` llama a
  `stopCurrentAudio()` (ya existe, ~2570) + `setSolState('idle')` y resetea
  `state.cancelToken`. Se agrega un handler de `click` que, según el estado,
  decide: `speaking` → detener; otro → comportamiento actual.
- El handler de hold (grabar) debe ignorar el gesto cuando el estado es
  `speaking` para no mezclar "detener" con "grabar".

### 4.4 Botones de acción rápida (flanqueando el orbe)

Cuatro chips alrededor del orbe flotante (`#orbFloat`, ~2022):

- 🔥 ¿Cuál es la especialidad de la casa?
- 🍢 ¿Qué tenés para picar?
- 🍷 Recomendame un vino
- 🍰 ¿Qué postre me recomendás?

**Layout:** 2 a la izquierda / 2 a la derecha del orbe en pantallas anchas; en
celular angosto, fila/cluster compacto encima del orbe (responsive). Al tocar uno
→ `converse(texto, /*withVoice=*/true)` (respuesta hablada) y abre el chat para ver
el texto. Se ocultan/atenúan mientras `state.isStreaming` o `speaking`.

### 4.5 Pedido + cierre del circuito (Approach C)

Hoy no existe concepto de pedido. Se agrega:

**Estado:** `state.cart = []` (ítems `{id, name, price, qty}`), `state.table =
''` (número de mesa), número de WhatsApp del local en `localStorage` (config de
demo).

**Mesa:** chip **"Mesa: ___"** en la topbar; el comensal tipea su número (lo lee
impreso arriba del QR). Requerido antes de realizar el pedido.

**Agregar al carrito:** cada `.dish` (en `renderCarta`, ~2239-2278) suma un botón
**"+"**; si el ítem ya está, muestra cantidad. Items sin precio (`a confirmar`) se
pueden sumar pero no entran al total.

**Barra flotante:** cuando el carrito tiene ítems aparece **"Ver pedido (N) ·
$total"** (encima del orbe). Abre la pantalla de pedido (capa `order`).

**Pantalla de pedido (overlay):**
- Lista de ítems con cantidades **+/−** y quitar.
- **Total estimado** (suma de precios conocidos; los "a confirmar" se listan
  aparte).
- Campo **Mesa** (prellenado del chip).
- Campo **"WhatsApp del local"** para tipear el número a mano (demo); se guarda en
  `localStorage` para no retipear. Cuando un cliente compre, se reemplaza por una
  constante/env y el campo se oculta.
- Botones:
  - **"Realizar pedido"** — sin mencionar WhatsApp. Valida mesa + número →
    construye el mensaje → abre `https://wa.me/<num>?text=<encoded>` → muestra
    cartel **dentro de la app** *"¡Listo! La mesera ya tomó tu pedido 🎉"* → encadena
    la encuesta (4.6).
    - *Realidad asumida:* en celular WhatsApp se abre un instante para enviar (es
      el método sin backend ni costo). Aceptado para la demo.
  - **"Mostrar al mozo"** — abre cartel a pantalla completa (capa `card`) con
    mesa + ítems + total, grande y legible, botón **"Listo, pedido tomado"** que
    cierra el cartel y encadena la encuesta (4.6).

Ambos caminos ("Realizar pedido" y "Mostrar al mozo" → "Listo") cuentan como
**completar el pedido** y disparan la encuesta una sola vez.

**Formato del mensaje WhatsApp:**
```
*Pedido — Mesa 5*
• 2× Rabas
• 1× Bife de chorizo
Total estimado: $XX.XXX
```

### 4.6 Encuesta de estrellas + Supabase

Al completar el pedido (4.5, por cualquiera de los dos caminos) aparece la capa
`rating`:

- **⭐⭐⭐⭐⭐ "¿Cómo te atendió la mesera?"** (1–5, requerido).
- Textarea opcional: quejas / comentarios.
- Botón **"Enviar"** → `POST /feedback` → muestra *"¡Gracias! 🙏"* y cierra.

**Backend nuevo `POST /feedback` (en `app.py`):**
- Body: `{ stars:int(1..5), comment:str|null, table:str|null,
  restaurant_id:str, order_items:list|null }`.
- Inserta en Supabase por REST con `httpx`:
  `POST {SUPABASE_URL}/rest/v1/feedback`
  headers: `apikey`, `Authorization: Bearer <service key>`,
  `Content-Type: application/json`, `Prefer: return=minimal`.
- Env vars nuevas (se setean en el Space, **no** en el repo): `SUPABASE_URL`,
  `SUPABASE_SERVICE_KEY`.
- **Tolerante a falla:** si las env vars no están o Supabase responde error, el
  endpoint devuelve `{ok:false, stored:false}` y el frontend **igual agradece**
  (nunca bloquea al comensal). Con las keys puestas, guarda de verdad.

**Migración Supabase (`supabase/migrations/`):** tabla `feedback`:
```sql
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  restaurant_id text not null default 'la-escaloneta',
  table_number text,
  stars int not null check (stars between 1 and 5),
  comment text,
  order_items jsonb
);
```
RLS: insert vía service key (server-side), sin acceso anónimo de lectura.

---

## 5. Mapa de impacto en `app.py`

| Zona (aprox.) | Cambio |
|---|---|
| `state` (~2036) | `cart`, `table`, `navStack` |
| `setSolState` (~2052) | label `speaking` → "Detener" |
| HTML topbar (~1976) | chip "Mesa: ___" |
| HTML cerca de `#orbFloat`/`#toast` (~2022-2030) | chips de acción rápida, barra "Ver pedido", overlays `order`/`card`/`rating`, modal de salida |
| `renderCarta` (~2182-2311) | botón "+" por plato; `tab.onclick` empuja capa `section` |
| `openHistory/closeHistory` (~2320-2333) | integran `navStack` |
| Orbe handlers (~2582-2618) | tap en `speaking` = detener; ignora hold en `speaking` |
| Bloque nuevo | gestión de navegación (popstate + centinela), lógica de carrito, checkout, WhatsApp, encuesta |
| Backend (~después de `/stt`) | endpoint `POST /feedback` + config `SUPABASE_*` |

---

## 6. Fases de implementación (un paso a la vez)

1. **Navegación "atrás" por capas + modal de salida.** (Base; lo demás se cuelga
   de la pila.)
2. **Botón "Detener".**
3. **Botones de acción rápida.**
4. **Pedido**: carrito + chip de mesa + pantalla de pedido + "Realizar pedido"
   (`wa.me`) + "Mostrar al mozo" + cartel de confirmación.
5. **Encuesta de estrellas** + endpoint `/feedback` + migración Supabase + env
   vars en el Space.

Cada fase se prueba estable antes de la siguiente. `git push` al cerrar.

## 7. Criterios de aceptación

- [ ] "Atrás" con chat abierto → cierra el chat (no sale del HTML).
- [ ] "Atrás" en una sección → vuelve arriba (principal).
- [ ] "Atrás" en la principal → aparece el modal de salida; "Quedarme" no sale.
- [ ] Mientras la mesera habla, el orbe dice "Detener" y un tap corta la voz.
- [ ] Los 4 chips flanquean el orbe y disparan respuesta hablada.
- [ ] Se pueden sumar platos; "Ver pedido (N)" abre el pedido con total.
- [ ] "Realizar pedido" (con mesa + número) abre WhatsApp con el pedido y muestra
      el cartel de confirmación dentro de la app.
- [ ] "Mostrar al mozo" muestra el pedido a pantalla completa.
- [ ] La encuesta envía a `/feedback` y la fila aparece en la tabla `feedback` de
      Supabase; si falta config, igual agradece sin romper.

## 8. Consideraciones

- **Repo público (regla #4):** `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` solo como
  env vars del Space + `.env` local; al repo va `.env.ejemplo` vacío. Nada de keys
  hardcodeadas.
- **HuggingFace ↔ Supabase:** independientes; el Space le pega a Supabase por
  HTTPS. No hay conflicto.
- **`wa.me`:** abre WhatsApp un instante en el cliente (método sin backend). El
  número es manual en la demo, fijo en config cuando haya cliente.
- **Riesgo de regresión:** todo es aditivo sobre `app.py`; no se modifica la
  lógica de `/chat`, `/tts`, `/stt`.
