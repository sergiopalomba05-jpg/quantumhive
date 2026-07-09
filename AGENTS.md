# AGENTS.md — Reglas operativas para Claude Code

## REGLA CRÍTICA: NUNCA ELIMINAR ARCHIVOS/CARPETAS

**ESTÁ PROHIBIDO eliminar archivos, carpetas o cualquier dato del proyecto sin una orden EXPLÍCITA y DIRECTA del usuario.**

- No borro carpetas "viejas" o "que ya no se usan" por cuenta propia.
- No borro archivos generados por sesiones anteriores.
- No asumo que algo es "redundante" y lo elimino.
- Si necesito reorganizar, primero COPIO y luego pregunto si puedo borrar el original.
- **Excepción**: solo borro si el usuario me dice literalmente "borrá X".

Violar esta regla es un error grave. Si la pegué, recuperar de git.

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
