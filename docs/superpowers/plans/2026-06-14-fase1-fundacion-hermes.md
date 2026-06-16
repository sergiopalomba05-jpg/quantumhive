# Fase 1 — Fundación de Hermes — Plan de Implementación

> **Para workers agénticos:** SUB-SKILL REQUERIDA: usar superpowers:executing-plans
> (recomendado para esta fase, porque es setup interactivo con pasos manuales de Sergio)
> o superpowers:subagent-driven-development. Los pasos usan checkbox (`- [ ]`).

**Goal:** Dejar a Hermes corriendo nativo en la PC de Sergio, hablando por Telegram solo
con él, usando Gemini como cerebro, con el contexto de QuantumHive cargado y memoria que
persiste entre mensajes.

**Architecture:** Instalación nativa de Hermes en Windows (sin Docker, para no comer RAM).
Gemini como provider nativo (API de AI Studio, ya pago). Telegram por long-polling,
restringido a un único user ID. Identidad de la empresa en `SOUL.md`. Las keys viven solo
en el `.env` local (en `%LOCALAPPDATA%\hermes`, fuera del repo); al repo sube solo la
config sin secretos.

**Tech Stack:** Hermes Agent (NousResearch) · Google Gemini (AI Studio) · Telegram Bot
API · PowerShell (Windows).

---

## Reglas que rigen TODO este plan (de CLAUDE.md)

- **NUNCA** `--dangerously-skip-permissions`.
- **Sergio aprueba antes de instalar y antes de cada arranque/deploy.**
- **Un paso a la vez:** si un paso no quedó estable, no se avanza.
- **Keys solo en `.env` local.** Verificar que no haya secretos antes de cada commit.
- **`git push`** para cerrar la fase.
- Pasos marcados **[SERGIO]** los hace Sergio a mano; **[CLAUDE CODE]** los ejecuta el agente.

---

## Estructura de archivos (qué se crea / toca)

| Ruta | Responsabilidad | Versionado en repo |
|---|---|---|
| `%LOCALAPPDATA%\hermes\.env` | Keys reales (Gemini, Telegram) | ❌ NUNCA |
| `%LOCALAPPDATA%\hermes\config.yaml` | Config de modelo/gateway (la genera Hermes) | ❌ (sube una copia sin secretos) |
| `%LOCALAPPDATA%\hermes\SOUL.md` | Identidad/contexto de QuantumHive | ✅ copia en repo |
| `agi/hermes/SOUL.md` | Copia versionada del SOUL | ✅ |
| `agi/hermes/config.ejemplo.yaml` | Plantilla de config sin secretos | ✅ |
| `agi/hermes/.env.ejemplo` | Plantilla de keys vacías | ✅ |
| `agi/hermes/README.md` | Cómo levantar Hermes desde cero | ✅ |
| `.gitignore` | Asegurar que `.env` nunca suba | ✅ |

---

### Task 1: Crear el bot de Telegram y obtener credenciales [SERGIO]

**Files:** ninguno (acción manual en Telegram).

- [ ] **Step 1: Crear el bot**

En Telegram, abrir **@BotFather** → `/newbot` → elegir nombre (ej: "Hermes QuantumHive")
→ elegir username único terminado en `bot` (ej: `quantumhive_sergio_bot`). BotFather
devuelve un **token** con forma `123456789:ABCdef...`. Guardalo.

- [ ] **Step 2: Obtener tu user ID numérico**

En Telegram, abrir **@userinfobot** y mandarle cualquier mensaje. Te responde tu **user ID**
(un número, ej: `123456789`). Guardalo. (NO es el username, es el número.)

- [ ] **Step 3: Verificación**

Tenés anotados los dos valores: `TELEGRAM_BOT_TOKEN` y tu `user_id`. Sin esto no se sigue.

---

### Task 2: Instalar Hermes nativo en Windows [SERGIO ejecuta, CLAUDE CODE guía]

**Files:** crea `%LOCALAPPDATA%\hermes\` (lo hace el instalador).

- [ ] **Step 1: Aprobar la instalación**

Sergio confirma que se puede correr el instalador oficial (verificado en sesión previa:
repo real, doc oficial). Disco libre actual: ~27 GB (sobra; Hermes necesita 2-4 GB).

- [ ] **Step 2: Correr el instalador en PowerShell**

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

Instala uv, Python 3.11, Node, PortableGit, ffmpeg, ripgrep en `%LOCALAPPDATA%\hermes\`.
Si lanza el wizard `hermes setup`, se puede saltear por ahora (lo configuramos en Task 3-4).

- [ ] **Step 3: Abrir una terminal NUEVA (el PATH se recarga)**

Cerrar y reabrir PowerShell para que tome `hermes` en el PATH.

- [ ] **Step 4: Verificación**

```powershell
hermes --version
hermes doctor
```

Esperado: `hermes --version` imprime una versión; `hermes doctor` no reporta errores
bloqueantes. Confirmar que existe la carpeta `%LOCALAPPDATA%\hermes`.

---

### Task 3: Configurar Gemini como cerebro [SERGIO + CLAUDE CODE]

**Files:**
- Modify: `%LOCALAPPDATA%\hermes\.env` (agregar key)
- Modify: `%LOCALAPPDATA%\hermes\config.yaml` (lo escribe `hermes model`)

- [ ] **Step 1: Cargar la API key de Gemini en el `.env`** [SERGIO]

Abrir `%LOCALAPPDATA%\hermes\.env` y agregar la key de AI Studio (la que ya tiene saldo):

```bash
GOOGLE_API_KEY=la_key_real_de_ai_studio
```

(No se commitea nunca. Vive solo acá.)

- [ ] **Step 2: Elegir Gemini como provider**

```powershell
hermes model
```

Elegir **"More providers..." → "Google AI Studio"** → seleccionar modelo
**`gemini-flash-latest`** (rápido y barato; ideal para el goteo de videos y consultas).

- [ ] **Step 3: Verificar que la config quedó en Gemini**

Abrir `%LOCALAPPDATA%\hermes\config.yaml` y confirmar:

```yaml
model:
  default: gemini-flash-latest
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

- [ ] **Step 4: Verificación — Gemini responde**

```powershell
hermes chat
```

Escribir: `decime "hola" en una palabra`. Esperado: responde (vía Gemini). Salir del chat.
Si falla por quota/billing, revisar que el proyecto de Google Cloud tenga facturación
activa (Hermes recomienda billing para uso de agente).

---

### Task 4: Conectar Telegram restringido SOLO a Sergio [SERGIO + CLAUDE CODE]

**Files:**
- Modify: `%LOCALAPPDATA%\hermes\.env` (token + allowlist)

- [ ] **Step 1: Configurar Telegram con el wizard**

```powershell
hermes gateway setup
```

Elegir **Telegram**, pegar el `TELEGRAM_BOT_TOKEN` (Task 1) y, cuando pida usuarios
permitidos, ingresar **tu user ID** (Task 1). Esto escribe en el `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_ALLOWED_USERS=tu_user_id
```

> `TELEGRAM_ALLOWED_USERS` es el control de seguridad clave: el bot **solo** atiende a
> los IDs de esa lista. Con tu ID solo, responde únicamente a vos.

- [ ] **Step 2: Levantar el gateway**

```powershell
hermes gateway
```

Esperado: en segundos imprime que el bot está online (long-polling).

- [ ] **Step 3: Verificación — responde solo a vos**

Desde tu Telegram, mandarle un mensaje al bot (ej: `hola`). Esperado: responde.
(Opcional, si tenés otra cuenta a mano: mandarle desde esa otra cuenta → **no** responde.)

- [ ] **Step 4: Dejar el gateway corriendo**

Mantener `hermes gateway` abierto (o configurarlo para arrancar al login con
`hermes gateway install` más adelante; eso es opcional, no en esta fase).

---

### Task 5: Cargar el contexto de QuantumHive (SOUL.md) [CLAUDE CODE]

**Files:**
- Create: `%LOCALAPPDATA%\hermes\SOUL.md`

- [ ] **Step 1: Escribir el SOUL.md**

Crear `%LOCALAPPDATA%\hermes\SOUL.md` con este contenido exacto:

```markdown
# SOUL — Asistente de QuantumHive

Sos el asistente personal de Sergio Palomba, CEO de QuantumHive (Olivos, Argentina).
Hablás en español rioplatense, conciso y directo. Respondés solo a Sergio.

## Qué es QuantumHive
El motor/infraestructura detrás de los negocios de Sergio. Foco actual: @directimport420
(B2B mayorista). Otros frentes: agencia de servicios IA (cartas QR, apps, webs) y soporte
al trading manual de US30. El trading es SIEMPRE manual — sin bots.

## Tu trabajo principal
Mantener vivo el catálogo de herramientas de IA de la empresa. Sergio te manda videos
cortos (reels) de herramientas; vos las identificás, las categorizás y las guardás en el
catálogo. Cuando te pregunta qué herramientas usar para una tarea, le respondés con el
catálogo; si falta algo, buscás en la web. (El catálogo aún no está conectado — eso es la
Fase 2; por ahora respondés con tu conocimiento y la web.)

## Reglas
- Antes de reemplazar o borrar algo del catálogo, SIEMPRE preguntá y esperá confirmación.
- Nunca inventes herramientas ni URLs: si no estás seguro, verificá o decílo.
- Concisión en el chat; el razonamiento podés hacerlo completo.
```

- [ ] **Step 2: Recargar el agente**

Reiniciar el gateway (Ctrl+C en la ventana de `hermes gateway`, y volver a
`hermes gateway`) para que tome el nuevo `SOUL.md`.

- [ ] **Step 3: Verificación — conoce QuantumHive**

Por Telegram, preguntar: `¿qué es QuantumHive y cuál es tu trabajo?`. Esperado: responde
describiendo QuantumHive y su rol de mantener el catálogo, en español, conciso.

---

### Task 6: Verificar memoria entre mensajes [SERGIO]

**Files:** ninguno (usa la memoria propia de Hermes en `memories/`).

- [ ] **Step 1: Darle un dato**

Por Telegram: `Para que lo recuerdes: opero US30 manual en la apertura de Nueva York.`

- [ ] **Step 2: Preguntar en un mensaje posterior**

Mandar otro mensaje aparte: `¿Qué opero y cómo?`. Esperado: responde que operás US30
manual en la apertura de NY (recordó entre mensajes).

- [ ] **Step 3: Verificación de persistencia (opcional)**

`/new` para nueva conversación y volver a preguntar; si Hermes lo guardó en memoria
persistente, lo recuerda. (Si no, alcanza con la memoria de sesión para la Fase 1.)

---

### Task 7: Versionar la config SIN keys y pushear [CLAUDE CODE]

**Files:**
- Create: `agi/hermes/SOUL.md` (copia del de Task 5)
- Create: `agi/hermes/config.ejemplo.yaml`
- Create: `agi/hermes/.env.ejemplo`
- Create: `agi/hermes/README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Copiar el SOUL.md al repo**

Copiar el contenido exacto del `SOUL.md` de Task 5 a `agi/hermes/SOUL.md`.

- [ ] **Step 2: Crear `agi/hermes/config.ejemplo.yaml`**

```yaml
# Plantilla de config de Hermes (sin secretos). La real vive en %LOCALAPPDATA%\hermes\config.yaml
model:
  default: gemini-flash-latest
  provider: gemini
  base_url: https://generativelanguage.googleapis.com/v1beta
```

- [ ] **Step 3: Crear `agi/hermes/.env.ejemplo`**

```bash
# Copiar a %LOCALAPPDATA%\hermes\.env y completar. NUNCA commitear el .env real.
GOOGLE_API_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_ALLOWED_USERS=
```

- [ ] **Step 4: Crear `agi/hermes/README.md`**

Documentar en 10-15 líneas: cómo instalar Hermes (Task 2), dónde van las keys (`.env`
local, no repo), cómo elegir Gemini (Task 3), cómo conectar Telegram restringido (Task 4),
y cómo arrancar (`hermes gateway`). Referir a este plan para el detalle.

- [ ] **Step 5: Asegurar `.gitignore`**

Confirmar que `.gitignore` incluye `.env` (y `*.env` por las dudas). Si no, agregarlo.

- [ ] **Step 6: Verificar que NO hay secretos por subir**

```powershell
git status
git diff --cached
```

Revisar a ojo que ningún archivo staged contenga keys reales. Si hay, frenar y avisar.

- [ ] **Step 7: Commit + push**

```powershell
git add agi/hermes/ .gitignore
git commit -m "feat(agi): Hermes Fase 1 — config versionada sin secretos"
git push
```

- [ ] **Step 8: Verificación final de la fase**

Checklist: (1) `hermes gateway` corriendo; (2) le hablás por Telegram y responde solo a
vos; (3) sabe qué es QuantumHive; (4) recuerda entre mensajes; (5) la config está en
GitHub sin keys. Si los 5 dan ✅, Fase 1 cerrada.

---

## Self-Review (cobertura del spec)

- Hermes local nativo → Tasks 2. ✅
- Gemini de cerebro (pago) → Task 3. ✅
- Telegram solo a Sergio → Task 4 (`TELEGRAM_ALLOWED_USERS`). ✅
- Contexto de QuantumHive → Task 5 (`SOUL.md`). ✅
- Memoria entre sesiones → Task 6. ✅
- Keys solo en `.env`, config versionada sin secretos, push → Task 7. ✅
- (Catálogo, ingesta de video, consultas, dashboard, video-objetivo → **Fases 2+**, planes
  aparte. Fuera de alcance de este plan a propósito.)

---

## Próximos planes (roadmap, NO en esta fase)

- **Fase 2 — Catálogo:** schema en Supabase + importar los ~113 actuales + skill
  `catalogador` (reel → Gemini → dedup/propuesta → guardar) + consultas con fallback web.
- **Fase 3 — Video-objetivo:** "mandá un video de lo que querés lograr → plan con tus
  herramientas".
- **Fase 2.5 — Dashboard** (Cowork): HTML solo-lectura sobre Supabase.
- **Graphify** (paralelo): capa de contexto de Claude Code.
