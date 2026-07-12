# Fase 2 — Ingesta de Videos al Catálogo — Plan de Implementación

> **Para workers agénticos:** Este plan detalla cómo configurar y operar el skill
> `catalogador` de Hermes para ingerir reels/videos de herramientas de IA al catálogo
> de QuantumHive en Supabase.

**Goal:** Que Hermes pueda recibir un reel/video de una herramienta de IA, analizarlo
con Gemini, deduplicar contra el catálogo existente, y guardarlo en Supabase con toda
la metadata necesaria.

**Archivos existentes (ya construidos):**
- `agi/hermes/skills/catalogador/SKILL.md` — instrucciones del skill
- `agi/hermes/skills/catalogador/scripts/catalogo.py` — CRUD del catálogo (Supabase)
- `agi/hermes/skills/catalogador/scripts/analizar_video.py` — análisis de video con Gemini
- `agi/hermes/catalogo/*.sql` — schema + seeds de Supabase

---

## Mapa de archivos y su estado

| Archivo | Estado | Qué hace |
|---|---|---|
| `skills/catalogador/SKILL.md` | ✅ OK | Instrucciones del skill para Hermes |
| `scripts/catalogo.py` | ⚠️ FALTAN SUBCOMANDOS | CRUD: taxonomia, buscar, guardar, mapear, estado, enriquecer, contenido |
| `scripts/analizar_video.py` | ✅ OK | Analiza video con Gemini vía Vertex AI |
| `catalogo/001_schema.sql` | ✅ OK | Tabla `herramientas` |
| `catalogo/004_taxonomia.sql` | ✅ OK | Tablas `divisiones`, `subdivisiones`, `herramienta_subdivision` |
| `catalogo/005_contenido.sql` | ✅ OK | Tabla `contenido_herramienta` + `marca` |
| `catalogo/seed_herramientas.sql` | ✅ OK | 97 herramientas importadas |
| `.env.ejemplo` | ✅ OK | Template de variables |

---

## Pre-requisitos (lo que falta configurar en la PC de Sergio)

### Task 1: Configurar el `.env` de Hermes con las credenciales [SERGIO]

**Archivo:** `%LOCALAPPDATA%\hermes\.env`

Las siguientes variables DEBEN estar presentes para que los scripts funcionen:

```bash
# ── Supabase (catálogo) ──
SUPABASE_URL=https://gbngjsulhqcwgkqoxozy.supabase.co
SUPABASE_ANON_KEY=<la anon key del panel de Supabase>
SUPABASE_SERVICE_ROLE_KEY=<la service_role key del panel de Supabase>

# ── Vertex AI (análisis de video) ──
VERTEX_PROJECT_ID=project-aa5fb956-b08a-4e13-869
VERTEX_LOCATION=us-central1
```

**Cómo obtener las keys de Supabase:**
1. Ir a https://supabase.com/dashboard → proyecto `quantumhive-hermes`
2. Settings → API → copiar `anon` `public` y `service_role` `secret`
3. Pegar en `%LOCALAPPDATA%\hermes\.env`

**Verificación:**
```powershell
# En la terminal de Sergio (NO desde Claude Code):
cd %LOCALAPPDATA%\hermes\hermes-agent
.venv\Scripts\python.exe -c "import os; print('SUPABASE_URL:', os.environ.get('SUPABASE_URL','FALTA'))"
```

### Task 2: Verificar que `gcloud` funciona para Vertex AI [SERGIO]

Los scripts de análisis de video usan Vertex AI con ADC (Application Default Credentials).
En la VM de GCP esto es automático. En la PC local de Sergio:

```powershell
# Verificar que gcloud está autenticado:
gcloud auth application-default login
gcloud auth application-default print-access-token
```

Si esto devuelve un token, `analizar_video.py` puede usar Gemini para ver/escuchar videos.

**Fallback:** Si Vertex AI no funciona en local, se puede usar la API key de AI Studio:
```bash
GOOGLE_API_KEY=<key_de_ai_studio>
```
Y modificar `analizar_video.py` para usar `genai.Client()` sin `vertexai=True`.

---

## Flujo operativo de ingesta (qué hace Hermes paso a paso)

### Flujo completo cuando Sergio manda un video

```
Sergio manda video al bot de Telegram
  ↓
Hermes recibe el archivo
  ↓
Hermes dispara el skill catalogador
  ↓
1. Analizar el video
   → python scripts/analizar_video.py <ruta_video>
   → Gemini devuelve JSON: { nombre, repo_url, para_que, categoria, estado, tags }
   ↓
2. Verificar taxonomía válida
   → python scripts/catalogo.py taxonomia
   → Gemini mapea la categoría del JSON a una subdivisión existente
   ↓
3. Deduplicar
   → python scripts/catalogo.py buscar --nombre "<nombre>" --repo-url "<url>"
   ↓
   ¿Existe?
   ├── NO → Guardar (paso 4)
   └── SÍ → Mostrar a Sergio, preguntar: ¿reemplazo / alternativa / descarto?
            → Esperar confirmación → aplicar cambio de estado si corresponde
   ↓
4. Guardar
   → python scripts/catalogo.py guardar --json '{...}'
   ↓
5. Enriquecer (didáctico)
   → python scripts/catalogo.py enriquecer --id <uuid> --detalle "..."
   → python scripts/catalogo.py contenido --herramienta-id <uuid> --guion "..." --visual "..." --formato "..."
   ↓
6. Confirmar a Sergio
   → "✅ Agregué <nombre> en <división> / <subdivisión>"
```

---

### Task 3: Probar el flujo end-to-end con un video real [SERGIO + HERMES]

1. Sergio manda un reel corto de una herramienta de IA por Telegram
2. Hermes debe:
   a. Recibir el archivo
   b. Correr `python scripts/analizar_video.py <ruta_del_video>`
   c. Parsear el JSON de respuesta
   d. Correr `python scripts/catalogo.py taxonomia` para ver divisiones válidas
   e. Mapear la categoría del JSON a una subdivisión
   f. Correr `python scripts/catalogo.py buscar --nombre "<nombre>"`
   g. Si no existe, correr `python scripts/catalogo.py guardar --json '{...}'`
   h. Correr `python scripts/catalogo.py enriquecer` y `contenido`
   i. Confirmar a Sergio

**Si Hermes no sabe cómo hacer esto:** necesitamos que lea su `SKILL.md` y lo siga.
El skill ya tiene el procedimiento documentado. El problema puede ser que:
- No tiene las variables de entorno (Task 1)
- No tiene acceso a los scripts desde donde corre
- No tiene permisos para escribir archivos temporales (para guardar el video)

---

## Solución al problema de "Hermes no sabe qué hacer"

### Opción A: Copiar los skills al directorio de skills de Hermes

Hermes busca sus skills en `%LOCALAPPDATA%\hermes\hermes-agent\skills\` o en la
carpetade skills del proyecto. Si no los encuentra, no los ejecuta.

**Acción:** Copiar (o symlink) la carpeta `agi/hermes/skills/catalogador/` al
directorio de skills de Hermes.

```powershell
# Copiar el skill catalogador al directorio de skills de Hermes
xcopy /E /I "C:\Users\sergio\Desktop\boveda-obsidian\agi\hermes\skills\catalogador" "%LOCALAPPDATA%\hermes\hermes-agent\skills\catalogador"
```

### Opción B: Instruir a Hermes manualmente

Cuando Hermes reciba un video, Sergio le dice explícitamente:
"Usá el skill catalogador: seguí el SKILL.md"

---

## Subcomandos de `catalogo.py` — referencia rápida

```bash
# Ver taxonomía válida (divisiones + subdivisiones)
python scripts/catalogo.py taxonomia

# Buscar duplicados
python scripts/catalogo.py buscar --nombre "nombre de la herramienta"
python scripts/catalogo.py buscar --nombre "X" --repo-url "https://..."

# Guardar nueva herramienta
python scripts/catalogo.py guardar --json '{"nombre":"...","repo_url":"...","para_que":"...","categoria":"...","estado":"usar","tags":["..."],"subdivisiones":["web-ui"],"fuente":"reel"}'

# Mapear herramienta a subdivisión
python scripts/catalogo.py mapear --herramienta-id <uuid> --subdivision <slug>

# Cambiar estado (reemplazo/descarte)
python scripts/catalogo.py estado --id <uuid> --estado duplicado|alternativa|descartado

# Enriquecer con descripción didáctica
python scripts/catalogo.py enriquecer --id <uuid> --detalle "qué hace, cuándo usarla, ventajas"

# Guardar receta del contenido (guion, visual, formato)
python scripts/catalogo.py contenido --herramienta-id <uuid> --guion "..." --visual "..." --formato "..."
```

---

## Subcomandos de `consultar.py` — referencia rápida

```bash
# Ver divisiones y subdivisiones
python scripts/consultar.py divisiones

# Buscar por subdivisión
python scripts/consultar.py objetivo --subdivision <slug>

# Buscar por texto libre
python scripts/consultar.py texto --q "crear video"
```

---

## Categorías y subdivisiones válidas

### Divisiones (slugs):
- `crear-web` — Crear una web / app
- `crear-video` — Crear contenido de video
- `crear-imagen` — Crear imágenes / avatares
- `automatizar` — Automatizar procesos / WhatsApp / pagos
- `investigar` — Scraping / research / outreach
- `conocimiento` — Conocimiento / modelos / datos
- `trading` — Trading manual y soporte
- `ecommerce` — E-commerce / dropshipping B2B

### Subdivisiones (ejemplos):
- `crear-web` → `web-ui`, `componentes`, `seo`, `landings`
- `crear-video` → `edicion`, `generacion`, `animacion`, `captions`
- `crear-imagen` → `fotos`, `ilustraciones`, `avatars`, `upscale`
- `automatizar` → `whatsapp`, `pagos`, `n8n`, `chatbots`
- `investigar` → `scraping`, `outreach`, `research`

(Ver la taxonomía completa en `python scripts/catalogo.py taxonomia`)

---

## Errores comunes y cómo resolverlos

### "Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
→ El `.env` de Hermes no tiene las credenciales. Ver Task 1.

### "ERROR: falta google-genai"
→ Instalar: `pip install google-genai`

### "ERROR: falta VERTEX_PROJECT_ID"
→ El `.env` no tiene `VERTEX_PROJECT_ID`. Ver Task 1.

### Gemini no puede ver el video
→ Verificar que el video sea < 20 MB (límite del Bot API de Telegram).
→ Verificar que ADC esté configurado (`gcloud auth application-default login`).

### El skill no se activa cuando Hermes recibe un video
→ Verificar que la carpeta del skill esté en el directorio correcto de Hermes.
→ Ver Opción A arriba.

---

## Checklist de habilitación

- [ ] `%LOCALAPPDATA%\hermes\.env` tiene `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VERTEX_PROJECT_ID`, `VERTEX_LOCATION`
- [ ] `gcloud auth application-default login` funciona en la terminal de Sergio
- [ ] El skill `catalogador` está copiado al directorio de skills de Hermes
- [ ] Probá mandando un video corto por Telegram y verificá que Hermes lo procesa

---

## Próximos pasos (post-ingesta)

- **Fase 2.5:** Dashboard HTML solo-lectura sobre Supabase (para ver el catálogo en la web)
- **Fase 3:** Consulta por video-objetivo ("¿cómo construyo esto?")
- **Graphify:** Capa de contexto para Claude Code (paralelo)
