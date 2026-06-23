---
name: catalogador
description: Cataloga herramientas de IA que Sergio manda por reel/video. Úsalo cuando Sergio mande un video de una herramienta (o un link) o diga "catalogá esto / agregá esta herramienta". Mirás+escuchás el video con Gemini, deduplicás y guardás en el catálogo de QuantumHive (Supabase), preguntando antes de reemplazar.
---

# Catalogador — ingesta de herramientas al catálogo de QuantumHive

## Cuándo usar
Cuando Sergio manda un reel/video de una herramienta de IA, o un link, o te dice
"agregá / catalogá esto".

## Variables de entorno (van en el `.env` de Hermes, nunca al repo)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — para escribir en el catálogo.
- `GEMINI_API_KEY` (o `GOOGLE_API_KEY`) — ya configurada; la usa el fallback de video.

## Procedimiento
1. **Analizá el video** con tu visión + audio (Gemini es multimodal nativo): sacá `nombre`,
   `repo_url` (o web oficial), `para_que` (1-2 frases), `categoria`, y a qué **subdivisión(es)
   por objetivo** pertenece. **No inventes URLs**: si no estás seguro, dejá `repo_url` vacío.
   Además, para el motor de contenido, capturá: una descripción **didáctica** (`detalle`), el
   **guion** (transcripción de lo que se dice), la **descripción visual** (qué se ve) y el
   **formato** (estructura del reel). Eso se guarda en el paso 5.
   - Si NO podés ver el adjunto directamente, corré: `python scripts/analizar_video.py <ruta_video>`
     y usá el JSON que devuelve.
2. **Mirá la taxonomía** válida (divisiones + subdivisiones):
   `python scripts/catalogo.py taxonomia`
3. **Deduplicá** antes de guardar:
   `python scripts/catalogo.py buscar --nombre "<n>" --repo-url "<u>"`
   - Si **no existe** → guardá (paso 4).
   - Si **existe parecida** → **NO guardes**. Mostrale a Sergio la que ya hay y la nueva, y
     preguntá: ¿la reemplazo / la dejo como alternativa / la descarto? **Esperá su respuesta.**
     Reemplazar = cambiar el `estado` de la vieja (`python scripts/catalogo.py estado --id <uuid>
     --estado duplicado|alternativa|descartado`), **nunca borrar**.
4. **Guardá**:
   `python scripts/catalogo.py guardar --json '{"nombre":"...","repo_url":"...","para_que":"...","categoria":"...","estado":"usar","tags":["..."],"subdivisiones":["web-ui"],"fuente":"reel"}'`
   (te devuelve el `id` de la herramienta guardada.)
5. **Enriquecé** (didáctico) y **guardá la receta del reel** (el video NO se guarda; sí lo necesario para replicarlo con la marca de Sergio):
   - `python scripts/catalogo.py enriquecer --id <uuid> --detalle "qué hace, cuándo usarla, ventajas, cómo aplicarla paso a paso"`
   - `python scripts/catalogo.py contenido --herramienta-id <uuid> --guion "transcripción de lo que se dice en el reel" --visual "qué se ve en pantalla, escenas y capturas" --formato "hook + demo + CTA, duración, estilo"`
6. **Confirmá** a Sergio, conciso: "✅ Agregué <nombre> en <división> / <subdivisión> (con receta de contenido)."

## Reglas (del CLAUDE.md)
- **Nunca** borres ni reemplaces sin confirmación de Sergio.
- No inventes herramientas ni URLs. Si dudás, verificá o decílo.
- `estado` válido: `usar` · `alternativa` · `verificar` · `descartado` · `duplicado`.
