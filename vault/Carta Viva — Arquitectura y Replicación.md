# Carta Viva — Arquitectura, Decisiones y Replicación

> Documento maestro del producto **Carta Viva** (carta QR con mesera IA por voz). Sirve para replicar
> cartas nuevas y como base de aprendizajes para futuras apps de la agencia.
> Motor de referencia: `agencia/clientes/kansas/app.py`.

---

## 1. Qué es
Carta QR para restaurantes: el cliente escanea el QR de su mesa, ve la carta y lo atiende una **mesera
virtual por voz** que recomienda, arma el pedido y lo manda al mozo. Dos planes:
- **Básico:** conversacional completo, sin memoria ni métricas. Barato de operar (caché).
- **Premium:** + memoria (reconoce al cliente que vuelve) + métricas + panel del dueño (roadmap).

## 2. Arquitectura
- **Un solo archivo** `app.py` (FastAPI + uvicorn) con TODO embebido:
  - `EMBEDDED_INDEX_HTML` → frontend (HTML+CSS+JS) embebido como string.
  - `EMBEDDED_MENU_JSON` → la carta (platos, precios, bebidas, reglas, `assistant`).
  - `CARTA_CONFIG` → bloque editable por carta (nombre, tema/colores, chips, links).
- **Deploy:** Docker en **HuggingFace Spaces** (puerto 7860). El `root()` inyecta en el HTML:
  `window.CV_CONFIG`, `CV_DEMO_MODE`, `CV_MEMORIA`, vars de tema y el nombre.
- **Backend stateless:** cada request trae su contexto (mensaje + historial + carrito + device_id). No
  hay estado de sesión en el server → **50 clientes a la vez no se cruzan** (cada celular tiene su estado).

## 3. Stack
- **Voz (TTS):** MiniMax T2A v2, modelo `speech-02-turbo`. `stream:false` (un MP3 por frase). Envs
  `MINIMAX_API_KEY` (clave `sk-cp` del plan de créditos), `MINIMAX_VOICE`, `MINIMAX_SPEED` (1.0–1.3),
  `MINIMAX_VOL` (volumen).
- **Cerebro (texto):** Gemini (`gemini-2.5-flash`, `thinkingBudget:0`) con `BRAIN_CHAIN` (fallback a
  OpenRouter ante 429/503). El menú va **entero** en el system prompt (full-context, NO RAG).
- **STT:** Gemini transcribe el audio del cliente.
- **Supabase (proyecto `carta-qr`, org "Carta QR viva"):**
  - Storage `tts-cache` → caché de voz (MP3 por hash de frase).
  - Tabla `respuestas_cache` → caché de respuestas del flujo guiado (texto).
  - Tabla `clientes` → memoria (Premium).
  - Tabla `eventos` → métricas (roadmap del tracking).
  - Todo aislado por `restaurant_id` + `device_id`. RLS ON sin policies → solo entra la `service_role`.

## 4. Config replicable (lo único que se edita por carta)
1. `CARTA_CONFIG` (nombre, `--accent`, chips, links de reseña).
2. `EMBEDDED_MENU_JSON` (platos, precios, `greeting`, reglas).
3. `assistant.personalidad` (opcional): tono por tipo de local — parrilla "casera", cervecería
   "casual/joven", sushi "sobria/elegante". Default: cálido porteño.
4. Variables de entorno (ver §9).

## 5. Flujo conversacional
- `converse()` (frontend): manda a `/chat/stream` → SSE de texto → se trocea en frases →
  cada frase va a `/tts` (voz) y se reproduce; los platos nombrados se resaltan (spotlight/auto-guiado).
- **Directivas invisibles** que emite el modelo al final de su respuesta:
  - `#PEDIDO# {add/remove/clear}` → carga/saca del carrito.
  - `#CHIPS# [...]` → botones de seguimiento.
  - `#PERFIL# {gustos}` → memoria (roadmap del guardado de gustos).
- **Chips guiados:** preguntas fijas → respuesta cacheada (texto + voz) → **$0** la 2ª vez. Solo gasta
  cuando el cliente se sale del guion (pregunta libre).
- **Agregado manual:** si el cliente agrega un plato a mano durante un flujo guiado, la mesera retoma
  con una frase fija (voz cacheada, $0) + chips del próximo paso (no se queda colgada).

## 6. Decisiones clave (y por qué)
- **Full-context, NO RAG:** una carta entra holgada en el contexto (~6k tokens). RAG (chunking/
  embeddings/retrieval/rerank) sería overkill y AGREGARÍA latencia. RAG se reserva para corpus grandes.
- **Caché híbrido = el corazón del costo:** el flujo guiado (chips) sale $0; la conversación libre gasta.
  Diferencia básico/premium = features (memoria/métricas), NO arquitectura (un solo motor).
- **`stream:false` en MiniMax:** en streaming reenviaba el audio completo al final → se duplicaba la voz.
- **Memoria por dispositivo** (id anónimo en localStorage), sin login ni teléfono. Solo Premium.
- **Caché NO se usa con perfil de memoria cargado** (respuesta personalizada no se comparte).
- **Prompt genérico:** los ejemplos del prompt usan platos genéricos; la mesera recomienda SOLO del
  menú real → no inventa platos fantasma y el prompt sirve para cualquier carta.

## 7. Aprendizajes / bugs resueltos (para no repetir)
- **Voz duplicada** → `stream:false`.
- **Voz baja/saturada** → `MINIMAX_VOL` (≈3.5); saturar empeora la dicción.
- **Pronuncia mal nombres** ("Seryo") → es el modelo de voz; baja `MINIMAX_SPEED` o cambiá `MINIMAX_VOICE`.
- **Plato fantasma** → los ejemplos del prompt tenían nombres reales viejos; pasar a genéricos + regla
  "solo lo de la carta".
- **Hablaba en portugués** → regla dura de idioma (siempre español rioplatense).
- **No se despedía por la vía del mozo** → `mozoDone` ahora llama `solFarewell` + guarda memoria.
- **Latencia ("pensando")** → `thinkingBudget:0`, achicar el prompt (descripciones cortas + menos
  ejemplos), pre-warming del saludo/chips, historial recortado (`MAX_HISTORY_TURNS`).
- **MCP de Supabase** está scopeado por organización: el conector veía una org y no la nueva. Para
  operar todas: MCP local con Personal Access Token (`claude mcp add -s user supabase …`), o la
  Management API (`POST /v1/projects/{ref}/database/query`). Nunca el PAT al repo (es público).
- **Claves:** repo público → claves SOLO en secrets del Space; rotar si se exponen.

## 8. Guía de replicación (carta nueva)
1. Copiar `agencia/clientes/<cliente>/` desde Kansas.
2. Editar `CARTA_CONFIG` + `EMBEDDED_MENU_JSON` + `assistant.personalidad`.
3. En Supabase (proyecto de cartas): bucket `tts-cache` + tablas `clientes`/`eventos`/`respuestas_cache`
   (mismo SQL; ver §10). Aislado por `RESTAURANT_ID`.
4. Setear envs (§9) como secrets del Space.
5. Deploy (Docker) → generar los 30 QR (`?mesa=N`).

## 9. Variables de entorno
`RESTAURANT_ID` · `GEMINI_API_KEY` · `GEMINI_MODEL` · `BRAIN_CHAIN` · `OPENROUTER_API_KEY` ·
`MINIMAX_API_KEY` · `MINIMAX_VOICE` · `MINIMAX_MODEL` · `MINIMAX_SPEED` · `MINIMAX_VOL` ·
`SUPABASE_URL` · `SUPABASE_SERVICE_KEY` · `TTS_CACHE` · `TTS_CACHE_BUCKET` · `RESPUESTAS_CACHE` ·
`RESPUESTAS_TABLE` · `MEMORIA` · `CLIENTES_TABLE` · `MAX_HISTORY_TURNS` · `DEMO_MODE` · `TELEGRAM_TOKEN` ·
`ORDER_CHAT_ID`. (Detalle en `agencia/clientes/kansas/.env.ejemplo`.)

## 10. SQL de infra (por proyecto Supabase)
```sql
insert into storage.buckets (id, name, public)
values ('tts-cache','tts-cache',false) on conflict (id) do nothing;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(), restaurant_id text not null, device_id text not null,
  nombre text, ultimo_pedido jsonb, gustos jsonb not null default '[]'::jsonb,
  visitas int not null default 1, ultima_visita timestamptz not null default now(),
  created_at timestamptz not null default now(), unique (restaurant_id, device_id));
alter table public.clientes enable row level security;

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(), restaurant_id text not null, device_id text,
  tipo text not null, detalle jsonb, created_at timestamptz not null default now());
create index if not exists idx_eventos_q on public.eventos (restaurant_id, tipo, created_at);
alter table public.eventos enable row level security;

create table if not exists public.respuestas_cache (
  id uuid primary key default gen_random_uuid(), restaurant_id text not null, hash text not null,
  pregunta text, respuesta jsonb not null, hits int not null default 0,
  created_at timestamptz not null default now(), unique (restaurant_id, hash));
alter table public.respuestas_cache enable row level security;
```

## 11. Roadmap
- Tracking de métricas (`POST /evento` + eventos del front) y reportes/panel para el dueño.
- Guardado de gustos (`#PERFIL#`) en la memoria.
- Context caching **explícito** de Gemini (solo con tráfico constante; tiene costo por hora).
- Base multi-inquilino a escala (miles de cartas) y pasarela de pago.

---
*Vivo: actualizar cuando se tome una decisión de arquitectura o se resuelva un bug de fondo.*
