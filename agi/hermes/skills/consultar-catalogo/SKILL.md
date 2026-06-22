---
name: consultar-catalogo
description: Responde qué herramientas de IA tiene QuantumHive para una tarea u objetivo (ej. "¿qué tengo para crear una web 3D / una app / un video?"). Consulta el catálogo en Supabase por objetivo/subdivisión/texto; si no hay nada, busca en la web y propone candidatas.
---

# Consultar catálogo — qué usar para cada objetivo

## Cuándo usar
Cuando Sergio pregunta qué herramienta o skill usar para algo: "¿qué tengo para X?",
"¿con qué armo Y?", "¿qué uso para crear una web / app / video / avatar?".

## Variables de entorno (en el `.env` de Hermes)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — lectura del catálogo.

## Procedimiento
1. Identificá el **objetivo** y mapealo a una división/subdivisión:
   `python scripts/consultar.py divisiones`
2. Traé las herramientas:
   - por objetivo:  `python scripts/consultar.py objetivo --subdivision <slug>`
   - por texto:     `python scripts/consultar.py texto --q "<palabras>"`
3. Componé la respuesta con el contexto de QuantumHive (tu SOUL.md), **priorizando** las de
   estado `usar` y los ganadores del stack. Decí para qué sirve cada una, conciso.
4. **Si el catálogo no tiene** nada para esa tarea → buscá en la web (tus herramientas de
   búsqueda) y proponé 1-3 candidatas, ofreciendo sumarlas con el skill `catalogador`.

## Reglas
- No inventes herramientas: respondé con lo del catálogo o lo que verifiques en la web.
- Conciso en el chat; el razonamiento hacelo completo.
