---
proyecto: QuantumHive
tipo: spec-diseno
fecha: 2026-06-14
estado: borrador-para-revision
tags: [quantumhive/agi, quantumhive/catalogo, hermes, gemini, supabase]
---

# Spec — Asistente de Catálogo Vivo de QuantumHive

> Asistente personal en Telegram que aprende de la empresa. Le mandás un video
> corto de una herramienta → lo *ve* con Gemini → lo cataloga solo en una base de
> datos → y cuando le preguntás "¿qué tengo para hacer una app?", responde sabiendo
> el contexto de QuantumHive y el catálogo entero.

---

## 1. Objetivo

Reemplazar el flujo manual actual (IG → WhatsApp → descargar → Gemini en AI Studio →
copiar a Claude → armar el `.md` a mano) por un agente que:

1. Recibe un **reel corto** por Telegram (solo de Sergio).
2. Lo analiza con **Gemini** (ve y escucha): identifica qué herramienta es, para qué
   sirve, su repo/URL y a qué categoría pertenece.
3. Lo **ubica solo** en el catálogo (una base de datos), en su sección.
4. Si ya existe una herramienta igual o parecida, **propone reemplazo** si la nueva es
   mejor (nunca borra solo).
5. Cuando Sergio pregunta ("¿qué herramientas tengo para una página 3D / una app /
   agentes autónomos?"), responde usando el **catálogo + el contexto de QuantumHive**.
6. **Aprende y recuerda** entre sesiones (memoria propia de Hermes).

**Criterio de éxito (v1):** Sergio manda un reel desde el celu, el agente lo cataloga
en Supabase en su sección y se lo confirma; y al preguntarle por una tarea, lista las
herramientas correctas del catálogo.

---

## 2. Fuera de alcance (no-goals)

- **No** scrapea Instagram. Sergio baja el reel y le manda el **archivo** al bot
  (esto elimina la parte frágil del flujo viejo).
- **No** procesa videos largos. Para eso está la skill `claude-video` (uso aparte,
  con Claude Code). Este sistema come **reels cortos**.
- **No** tiene PWA ni interfaz visual en v1. Todo por Telegram. (La base en Supabase
  deja la puerta abierta a una PWA futura sin rehacer nada.)
- **No** corre en la nube en v1. Corre local en la PC de Sergio (gratis). El upgrade
  a VPS 24/7 es trivial y está documentado abajo.
- **No** usa Graphify como cerebro del catálogo. Graphify es una pista **separada**,
  para el contexto de Claude Code (ver §9).

---

## 3. Arquitectura

| Componente | Responsabilidad | Dónde corre |
|---|---|---|
| **Hermes Agent** | El cuerpo: gateway de Telegram, memoria adaptativa, corre el skill catalogador | Instalación **nativa Windows** en la PC (sin Docker, para no comer RAM) |
| **Gemini (API AI Studio, pago)** | El cerebro: ve/escucha el reel y razona las respuestas | Provider nativo dentro de Hermes (`provider: gemini`) |
| **Supabase (Postgres)** | Fuente de verdad del catálogo: tabla consultable, deduplicable | Nube, tier gratis |
| **Skill `catalogador`** | Pegamento: recibe video → llama a Gemini → deduplica vs Supabase → propone/guarda | Skill custom dentro de Hermes |

**Principio de aislamiento:** cada pieza tiene un solo trabajo y un borde claro.
El skill no sabe de Telegram (Hermes le pasa el archivo); Supabase no sabe de Gemini;
Gemini no escribe en la base (devuelve datos estructurados, el skill decide).

---

## 4. Modelo de datos (Supabase)

Tabla principal `herramientas`:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid (pk) | |
| `nombre` | text | Nombre de la herramienta |
| `repo_url` | text | Repo/URL oficial (clave para deduplicar) |
| `para_que` | text | Para qué sirve (1-3 frases) |
| `categoria` | text | Sección del catálogo (lista controlada, ver abajo) |
| `estado` | text | `usar` · `alternativa` · `verificar` · `descartado` · `duplicado` |
| `calidad` | int (1-5) | Score para la lógica de "reemplazá si es mejor" |
| `tags` | text[] | Etiquetas para el match de consultas (ej: `["3d","web","gratis"]`) |
| `fuente` | text | Referencia del reel/origen |
| `notas` | text | Observaciones libres |
| `fase` | text | F0–F4 (opcional, según el plan de QuantumHive) |
| `creado_en` | timestamptz | |
| `actualizado_en` | timestamptz | |

**Categorías iniciales** (heredadas del catálogo actual `04 - Catalogo Completo de
Recursos.md`, ampliables):
Cimientos/FreeEngine · Orquestación de agentes · Automatización/WhatsApp/pagos ·
E-commerce B2B · Video · Imagen/avatares/voz · Web/UI/app · Scraping/research/outreach ·
Conocimiento y modelos · Trading.

**Índices:** sobre `categoria`, `tags` (GIN), y full-text en `para_que`/`nombre` para
las consultas.

---

## 5. Flujos

### 5.1 Ingesta de un reel

```
Sergio manda el video al bot de Telegram
  → Hermes recibe el archivo y dispara el skill catalogador
    → el skill le da el video a Gemini (ver §8, mecanismo a confirmar)
      → Gemini devuelve { nombre, repo_url, para_que, categoria, calidad, tags }
        → el skill busca en Supabase por nombre/repo_url normalizados
          → si NO existe: inserta la fila → responde "✅ Agregué <nombre> en <categoria>"
          → si EXISTE parecida: compara calidad → responde
             "Ya tenés <X> en <categoria>. La nueva <Y> parece mejor por <motivo>.
              ¿La reemplazo / la dejo como alternativa / la descarto?"
            → Sergio confirma con un botón → el skill aplica el cambio
```

### 5.2 Deduplicación y reemplazo (curator)

- **Match:** por `repo_url` normalizado; si no hay, por `nombre` aproximado + `categoria`.
- **"Reemplazá si es mejor":** el skill **propone**, Sergio **confirma**. Nunca borra
  solo (regla CLAUDE.md: el curator marca y avisa, no borra).
- **Reemplazo = cambio de estado, no delete físico:** la vieja pasa a `duplicado` o
  `alternativa`/`descartado`. Así nada se pierde (regla #9: el catálogo es biblioteca).

### 5.3 Consulta

```
"¿Qué herramientas tengo para una página 3D?"
  → el skill filtra Supabase por tags/categoria/full-text
    → carga el contexto de QuantumHive (CLAUDE.md + bóveda) ya en la memoria de Hermes
      → Gemini arma la respuesta: lista las herramientas relevantes con su estado y para qué
```

### 5.4 Importación inicial (one-time)

Parsear las tablas markdown de `04 - Catalogo Completo de Recursos.md` (~113 recursos)
y cargarlas como filas en Supabase, mapeando los estados (✅/🔵/⚠️/❌/🔁) a la columna
`estado`. Paso único, idempotente (no duplica si se re-corre).

---

## 6. Decisiones técnicas y justificación

- **Hermes (no un bot propio):** trae de fábrica Telegram + memoria adaptativa + skills +
  multi-modelo. El "asistente personal con memoria" es su razón de ser. Construir eso
  desde cero sería enorme.
- **Instalación nativa, no Docker:** la PC es una Mac 2015 con 8 GB RAM. Docker Desktop
  se comería la RAM. La instalación nativa de Hermes es más liviana.
- **Gemini nativo (provider `gemini`):** Hermes lo soporta con la key de AI Studio
  (`GOOGLE_API_KEY`/`GEMINI_API_KEY`), incluyendo **entradas multimodales**. Sergio ya
  cargó saldo ($10) → tier pago, que es el recomendado para uso de agente.
- **Supabase (no SQLite local, no Obsidian):** como el catálogo es la "fuente de verdad"
  consultable y Sergio quiere que no dependa de archivos planos, una DB en la nube es lo
  correcto; ya está conectada y habilita la PWA futura.
- **Telegram-only (sin PWA):** menos superficie que se rompe; cubre mandar videos,
  recibir confirmaciones y preguntar.
- **Curator propone-y-confirma:** seguridad ante borrados (reglas #4 y #9 de CLAUDE.md).

---

## 7. Restricciones y riesgos conocidos

- **Límite de 20 MB del Bot API de Telegram para descargar archivos.** Los reels cortos
  casi siempre entran. Si un video se pasa, falla la descarga. Mitigación futura:
  Local Bot API server (eleva el límite a 2 GB). No bloquea v1.
- **Mecanismo video→Gemini a confirmar al construir** (ver §8).
- **Disponibilidad:** corriendo local, el agente solo responde con la PC prendida y con
  internet. Para la ingesta no molesta (los reels se acumulan y se mandan en tanda);
  para consultar desde la calle con la PC apagada, hace falta el upgrade a VPS (§10).
- **PC justa de recursos** (8 GB RAM): mantener la instalación mínima (Telegram + Gemini,
  sin navegador ni dashboard pesado).

---

## 8. Pregunta abierta clave (resolver al construir)

**¿Cómo llega el reel a Gemini?** Dos caminos, a confirmar en la implementación:

- **(A) Nativo de Hermes:** Hermes adjunta el video del mensaje de Telegram a la llamada
  multimodal de Gemini automáticamente.
- **(B) Skill explícito:** el skill catalogador agarra el archivo y lo sube a la **Files
  API de Gemini**, luego pide el análisis. Más robusto y desacoplado; es el camino que el
  brief de Etapa 1 ya previó ("si no ingiere video nativo, resolver con un skill").

Se prueba (A) primero; si no pasa el video con fidelidad, se implementa (B).

---

## 9. Graphify (pista separada, no parte de este spec)

Graphify (ya instalado, CLI v0.8.38) se usará como **capa de contexto de Claude Code**
sobre la bóveda/repo, para que el desarrollo sea ágil sin re-leer archivos planos
(regla de economía de tokens de CLAUDE.md). Es **independiente** del catálogo: se
engancha como su propio pasito y no bloquea nada de este sistema. Pendiente menor:
registrar el skill `/graphify` en `~/.claude/skills/`.

---

## 10. Camino de upgrade (local → nube 24/7)

El día que Sergio quiera hablarle desde el celu con la PC apagada:

1. Levantar la imagen Docker oficial `nousresearch/hermes-agent` en un VPS (~$5/mes) con
   `--restart unless-stopped`.
2. Migrar el `.env` (keys) y la config; el catálogo **ya vive en Supabase** → no se
   migra nada de datos.
3. Apuntar el mismo bot de Telegram al nuevo host.

Cero rehacer de lógica. La decisión local-vs-nube es solo de despliegue, no de arquitectura.

---

## 11. Fases de construcción (resumen; el plan detallado va aparte)

1. **Fundación:** Hermes nativo en la PC + Telegram (responde solo a Sergio por `chat_id`)
   + Gemini de cerebro + memoria + contexto QuantumHive cargado.
2. **El catálogo:** schema en Supabase + importación de los ~113 actuales + skill
   catalogador (ingesta de reel → dedup/propuesta → guardar) + consultas.
3. **Graphify** (paralelo): capa de contexto de Claude Code.

> Las keys (`GEMINI_API_KEY`, `TELEGRAM_TOKEN`, `SUPABASE_*`) van solo en `.env` local
> (en `.gitignore`). Al repo solo sube `.env.ejemplo`. (Regla #4 de CLAUDE.md.)
