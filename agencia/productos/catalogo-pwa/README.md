# Catálogo de IA — PWA (QuantumHive)

PWA visual del catálogo de herramientas de IA, organizada **por objetivo** (qué usar para crear
cada cosa) + vista del **stack definitivo**. Lee Supabase (`quantumhive-hermes`) en **solo lectura**
con la key publishable; a medida que Hermes acomoda el catálogo, la PWA lo refleja al refrescar.

## Archivos
- `index.html` — la app (HTML + CSS + JS vanilla, sin build).
- `config.js` — **local, NO sube al repo** (está en `.gitignore`). Tiene `SUPABASE_URL` + la key
  publishable (solo lectura). Copiá `config.example.js` → `config.js` y completá la key.
- `manifest.webmanifest`, `sw.js`, `icon.svg` — para que sea **instalable** (PWA offline-shell).

## Probar local
Servir la carpeta (el service worker necesita http, no `file://`):
```bash
cd agencia/productos/catalogo-pwa
python -m http.server 8080
# abrir http://localhost:8080
```

## Publicar en HuggingFace Space (provisorio, hasta el dominio de QuantumHive)
1. Crear un **Static Space** en HuggingFace.
2. Subir `index.html`, `config.js`, `manifest.webmanifest`, `sw.js`, `icon.svg`.
   (Incluí `config.js` aunque esté gitignoreado: lo necesita el Space para conectarse.)
3. Listo: el Space sirve `index.html` y la PWA queda pública.

## Arquitectura
Esta PWA es **modular**: pensada para integrarse después como **sección** de la página principal
de QuantumHive (junto a carta QR, directimport, trading, servicios PyMEs, agencia). Supabase es la
única fuente de verdad; la PWA no guarda datos propios.

> La key publishable es pública por diseño y solo lee (RLS). La `service_role` jamás va acá.
