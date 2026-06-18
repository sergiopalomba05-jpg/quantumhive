# Diseño — Bot de Telegram "Cata" · Demo Atención al Cliente (Cata Home)

> Fecha: 2026-06-18 · Producto: `agencia/productos/bot-telegram` · Cliente: `agencia/clientes/cata-home`
> Fase: **Demo del Módulo 1** (Agente humanizado) del ecosistema QuantumHive × Cata Home.

---

## 1. Contexto y objetivo

Cata Home es una marca argentina de deco y hogar que vende por Instagram (@catahome.ar) y Tienda Nube (catahome.com.ar). La propuesta comercial de QuantumHive es un ecosistema de 4 módulos sobre "un mismo cerebro". **Este spec cubre solo el demo del Módulo 1**: el agente conversacional humanizado, corriendo en **Telegram** como entorno de prueba.

**Objetivo del demo:** que se sienta como una persona del equipo de Cata Home atendiendo —cálida, en voseo, que recomienda, evacúa dudas y deriva a humano cuando hace falta— para que el cliente (Alan) apruebe y se pase luego a WhatsApp oficial vía API de Meta.

**Criterio de éxito:** el cliente conversa con el bot, lo siente humano y útil, cubre los 10 intents del brief, responde por voz si le mandan un audio, y nunca inventa precios ni hace nada de lo prohibido.

## 2. Alcance

**Dentro del demo:**
- Agente conversacional con la persona de Cata Home (texto).
- Respuestas en **streaming** (se escriben en vivo) + indicador "escribiendo…".
- **Voz:** si el cliente manda un audio, se transcribe y se responde con nota de voz.
- Base de conocimiento: catálogo (semilla), FAQ, promos, datos del negocio.
- Memoria por usuario (historial de conversación).
- Los 10 intents del brief (§7).
- Escalamiento a humano (WhatsApp + email + horario).

**Fuera del demo (es el ecosistema completo, post-aprobación):**
- Base de datos vectorial / RAG.
- Recupero de carritos abandonados (Módulo 2).
- Automatización de comentarios de Instagram (Módulo 3).
- Métricas semanales (Módulo 4).
- Catálogo en vivo vía API de Tienda Nube (se deja la arquitectura lista, no la integración).
- Clonación de voz (Paula/Cata) y voz premium (ElevenLabs).
- WhatsApp oficial (API de Meta).

## 3. Stack

| Pieza | Elección | Por qué |
|---|---|---|
| Lenguaje | Python 3.11+ | Todo el repo QuantumHive es Python. |
| Bot | `python-telegram-bot` v20+ (async, polling) | Librería más madura; polling alcanza para el demo. |
| Cerebro | **Gemini API** (`gemini-2.5-flash` o superior) | Una sola key del cliente; rápido; buen castellano. |
| STT (audio→texto) | **Gemini** (multimodal, audio in) | Misma key, sin costo extra. |
| TTS (texto→voz) | **Gemini TTS** (`gemini-2.5-flash-preview-tts`) | Misma key, free tier, voz natural. Detrás de `TTSProvider`. |
| Catálogo | `CatalogProvider` → impl. archivo (demo) | Interfaz lista para enchufar Tienda Nube después. |
| Memoria | SQLite local detrás de `MemoryStore` | Simple para demo; swappable a Supabase. |
| Hosting | Local (dev) → Render (demo 24/7) | Infra ya elegida en CLAUDE.md. |

> Toda la "voz" y la "fuente de catálogo" están detrás de interfaces: cambiar de Gemini TTS a ElevenLabs, o de archivo a Tienda Nube, es cambiar una implementación sin tocar el resto.

## 4. Arquitectura

```
                 ┌──────────────────────────────────────────────┐
 Telegram  ───▶  │  bot/  (python-telegram-bot)                  │
 (texto/audio)   │  - handlers de mensaje (texto, voz)           │
                 │  - streaming via editMessageText (throttled)  │
                 │  - chat actions: "escribiendo…/grabando…"      │
                 └───────────────┬──────────────────────────────┘
                                 ▼
                 ┌──────────────────────────────────────────────┐
                 │  agent/  (orquestador)                        │
                 │  - arma prompt: persona + KB + memoria         │
                 │  - llama a Gemini (stream) con tool calling     │
                 │  - decide voz vs texto (espeja la modalidad)   │
                 └───┬───────────────┬───────────────┬───────────┘
                     ▼               ▼               ▼
            ┌────────────┐   ┌──────────────┐  ┌───────────────┐
            │ knowledge/ │   │ CatalogProv. │  │ MemoryStore   │
            │ persona,   │   │ (demo: JSON) │  │ (SQLite)      │
            │ FAQ, promos│   │ buscar_prod. │  │ por chat_id   │
            └────────────┘   └──────────────┘  └───────────────┘
                     ▲               ▲
              ┌──────┴───────┐ ┌─────┴────────────┐
              │ STT (Gemini) │ │ TTSProvider      │
              │ audio→texto  │ │ (Gemini TTS)     │
              └──────────────┘ └──────────────────┘
```

**Interfaces clave (contratos estables):**
- `CatalogProvider.buscar(query) -> list[Producto]` y `.por_categoria(cat) -> list[Producto]`. Demo: lee JSON. Futuro: Tienda Nube API.
- `TTSProvider.sintetizar(texto, voz) -> bytes` (OGG/Opus para Telegram). Demo: Gemini TTS. Futuro: ElevenLabs.
- `MemoryStore.cargar(chat_id) / .guardar(chat_id, turno)`. Demo: SQLite.

**`Producto` (campos):** nombre, descripción, categoría, material, medidas, capacidad, cuidados, precio_lista, precio_oferta, precio_transferencia (−20%), valor_cuota (lista/3), stock (bool/"SIN STOCK"), relacionados[].

## 5. Base de conocimiento

Archivos de datos versionados bajo `agencia/clientes/cata-home/datos/` (texto/JSON, fáciles de editar para Alan):

- `negocio.md` — identidad, lema "Cada mesa, un encuentro", IG, web, WhatsApp, email, CUIT, linktree.
- `promos.md` — 20% transferencia, 3 cuotas, umbrales de envío gratis, Next Day, Oportunidades.
- `envios.md` — OCA, costos por CP, tiempos (1-2 días despacho + ~2/3 días), reintentos, retiro.
- `pagos.md` — Mercado Pago, cuotas, transferencia, IVA incluido.
- `politicas.md` — cambios/devoluciones (7 días), dañados (fotos + N° orden), cancelación.
- `catalogo.json` — **semilla** con 4-5 productos del brief (Mug Inger, Bowl Túnez, Jarra Suiza, set vajilla, canasto). Alan lo reemplaza/completa.
- `escalamiento.md` — WhatsApp +54 9 11 3026 8179, email catahome.ar@gmail.com, **horario de atención (lo completa Sergio)**.

La persona + reglas + promos + estructura de categorías van **siempre en el system prompt**. Los datos de producto puntuales se traen por la **tool `buscar_producto`** (para no inventar precios).

## 6. Diseño del agente

**System prompt (el "alma de Cata"):**
- Identidad: "Cata", del equipo de Cata Home. Primera persona. **Nunca** dice que es IA ni nombra modelos/proveedores.
- Tono: cálido, cercano, voseo argentino prolijo. Emojis con mesura (🏠✨🛋️).
- Few-shots del brief (§8) para calibrar tono.
- Reglas de comportamiento (§7 brief), duras:
  - No inventar precios ni stock → si no hay dato, "te lo confirmo" + derivar.
  - No prometer plazos fijos → "días hábiles aproximados, sujeto a OCA y CP".
  - Nunca pedir datos de tarjeta.
  - Temas sensibles (reclamo, dañado, cancelación) → derivar a humano con los datos que el cliente debe tener (N° orden, fotos).
  - Cerrar siempre ofreciendo ayuda adicional.
  - Usar la memoria para no repreguntar.

**Tool calling:** `buscar_producto(query|categoria)` → devuelve fichas con precio_lista, precio_transferencia, valor_cuota, material, stock. El agente la llama cuando el cliente pregunta precio/stock puntual o pide recomendación.

## 7. Intents (los 10 del brief)

Todos resueltos por el mismo agente (no ramas rígidas): bienvenida · asesoramiento + cross-sell · precio/stock puntual · envíos · pagos y promos · seguimiento de pedido (deriva) · cambios/devoluciones/roto (deriva) · recupero de venta (recuerda promos) · escalamiento a humano · fallback (repregunta + ofrece derivar).

## 8. Voz (STT + TTS)

- **Entrada:** si el mensaje es nota de voz → descargar OGG → Gemini transcribe → sigue el flujo normal de texto.
- **Salida (espeja la modalidad):** si el cliente **mandó audio**, se responde con **nota de voz** (TTS). Si escribió, se responde en **texto**. (Configurable: forzar siempre texto, o ofrecer voz.)
- TTS de Gemini devuelve PCM/WAV → convertir a **OGG/Opus** (ffmpeg/pydub) para nota de voz nativa de Telegram.
- **Primer paso del build:** smoke test de Gemini TTS con la key real. Si la calidad/cuota no convence → fallback ElevenLabs free (cambio de impl. en `TTSProvider`).

## 9. Streaming de respuestas

- El bot responde **automáticamente a cada mensaje entrante** (sin humano en el medio).
- Para texto: enviar mensaje placeholder → consumir el stream de Gemini → `editMessageText` a intervalos (**throttle ~1 edición/seg**) para mostrar la respuesta escribiéndose, respetando los rate limits de Telegram. Edición final con el texto completo.
- Mientras genera: `sendChatAction("typing")`. Para voz: `record_voice`/`upload_voice`.
- Manejo de errores: si Gemini falla/timeout → mensaje cálido de reintento, sin exponer detalles técnicos.

## 10. Memoria / persistencia

- `MemoryStore` con SQLite (`cata.db`): por `chat_id`, guarda turnos (rol, texto, timestamp) con ventana móvil (últimos N turnos al prompt).
- Demo: SQLite local. Render tiene disco efímero → si se quiere persistencia entre redeploys, apuntar `MemoryStore` a Supabase (mismo contrato). Opcional, no bloqueante para el demo.

## 11. Hosting / deploy

- **Dev:** local con polling (`python -m bot`).
- **Demo 24/7:** Render (worker con polling). Variables de entorno en el panel de Render (no `.env`).
- Nada pesado en local (regla CLAUDE.md §8): el LLM/TTS corren por API cloud.

## 12. Estructura en el repo

```
agencia/
├── productos/
│   └── bot-telegram/            ← el PRODUCTO (motor reusable)
│       ├── bot/                 ← handlers PTB, streaming, voz
│       ├── agent/               ← orquestador, prompt, tool calling
│       ├── providers/           ← CatalogProvider, TTSProvider, MemoryStore (interfaces + impl)
│       ├── knowledge/           ← loader de la base de conocimiento
│       ├── requirements.txt
│       ├── .env.ejemplo         ← claves vacías (esto SÍ va al repo)
│       └── README.md
└── clientes/
    └── cata-home/
        ├── perfil.md            ← config del cliente (persona, flags voz)
        ├── datos/               ← negocio.md, promos.md, envios.md, pagos.md, politicas.md, catalogo.json, escalamiento.md
        └── .env                 ← TELEGRAM_TOKEN, GEMINI_API_KEY (GITIGNORADO, nunca al repo)
```

## 13. Configuración / secrets

- `.env` **local/gitignoreado**: `TELEGRAM_TOKEN`, `GEMINI_API_KEY`.
- Al repo solo `.env.ejemplo` con claves vacías.
- Verificar antes de cada commit que no haya keys hardcodeadas (regla §4 CLAUDE.md — repo público).
- La key de Gemini que se pegó en el chat conviene **regenerarla** cuando el demo esté andando.

## 14. Inputs pendientes (de Sergio / Alan)

| Input | De quién | Cuándo |
|---|---|---|
| `TELEGRAM_TOKEN` (@BotFather) | Sergio | antes de correr |
| `GEMINI_API_KEY` (en `.env`) | Sergio | ya entregada (regenerar luego) |
| Horario de atención humana | Sergio/Alan | antes del go-live del demo |
| Catálogo real / export Tienda Nube | Alan | después (semilla mientras tanto) |
| Confirmar WhatsApp oficial | Alan | usa +54 9 11 3026 8179 del brief |

## 15. Criterios de aceptación del demo

1. El bot responde en Telegram, en voseo cálido, sintiéndose humano (pasa los few-shots del brief).
2. Las respuestas se ven escribiéndose (streaming) con indicador "escribiendo…".
3. Si le mandás un audio, transcribe y responde con nota de voz natural.
4. Cubre los 10 intents; deriva a humano en reclamos/dañados/cancelación con los datos requeridos.
5. Nunca inventa precios/stock; usa la semilla del catálogo vía `buscar_producto`.
6. Recuerda lo dicho dentro de la conversación (memoria).
7. No expone que es IA ni nombres de modelos; no pide datos de tarjeta.
8. Cero keys en el repo.
