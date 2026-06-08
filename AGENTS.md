# AGENTS.md — Reglas operativas para Claude Code

## Verificación antes de afirmar

Antes de responder sobre el estado del proyecto, debo:
1. Hacer `glob` o `read` de las rutas relevantes
2. Verificar contra el código real, NO contra documentos de planificación

## Estado real del proyecto (actualizado cada sesión)

### App catálogo (Vite + React)
- Catálogo con rubros + sub-filtros + productos ✅
- Carrito (localStorage) ✅
- Checkout + pedido a Supabase ✅
- Pantalla de éxito ✅
- PWA: manifest.json + sw.js + install banner ✅
- URL: https://directimport-app.onrender.com
- Hosting: Render (Static Site)

### Admin panel (Next.js)
- Login con Supabase Auth ✅
- Dashboard con contador ✅
- ABM de productos (listar, crear, editar) ✅
- ABM de rubros ✅
- ABM de proveedores ✅
- Pedidos (listar, filtrar por estado, cambiar estado) ✅
- URL: https://quantumhive-sergiopalomba05-jpgs-projects.vercel.app
- Hosting: Vercel

### Build status
- App catálogo: build y deploy OK (Render)
- Admin: build y deploy OK (Vercel)
