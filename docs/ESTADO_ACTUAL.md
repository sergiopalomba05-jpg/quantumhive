# ESTADO ACTUAL — Directimport (handoff para nueva sesión)

> Última actualización: 2026-06-10. Pegá este archivo o pedile a Claude que lo lea al arrancar.
> Rama de trabajo: `claude/thirsty-goldstine-7dfc88` (todo también mergeado a `main`).

---

## ✅ HECHO Y VERIFICADO

### Plan de reconciliación de la base (COMPLETO)
- **F1 — Cimiento de datos + seguridad:** baseline reproducible en `supabase/migrations/20260609130*`.
  - Tablas: catálogo madre, revendedores (con onboarding/jerarquía/score), pedidos + `pedido_items` (con `proveedor_id`), suscripciones, pagos, legal/demanda/eventos.
  - **Seguridad cerrada:** allow-list `admins` + función `es_admin()`. Todas las policies admin reescritas (antes cualquier logueado era admin). Trigger anti-escalación del revendedor.
  - **Aplicado a PRODUCCIÓN** (proyecto `lavactsmvtnzhmjkrqfs`) con OK de Sergio. Sergio sembrado en `admins` con sus 2 cuentas (`sergiopalomba05@gmail.com` + `traderboss420@gmail.com`). Datos de prueba borrados (base nueva y lisa).
  - Verificado: **12/12 tests** del harness (`directimport/db/`, `npm test`) contra Supabase real.
- **F2 — Alta con filtro:** revendedor nace `pendiente_aprobacion`; cola de aprobación en el admin (`/dashboard/revendedores`); gating en la app (no-activo no ve su tienda); quitado el signup admin abierto; copy de "pendiente".
- **F3 — Fixes app:** bug de hooks en `App.tsx` arreglado; RPC `crear_pedido` (pedido+líneas con `proveedor_id`, el anónimo crea sin leer pedidos); etiqueta de plan `Premium`→`Pro Plus`. **F3.3 (productos propios del revendedor) DESCARTADO** por el brief §2 (el revendedor no agrega productos, solo fija precios); el campo `productos.revendedor_id` queda dormido en la DB.

### Plan de construcción
- **Etapas 0-3 (rebanada fina):** catálogo + 2 niveles, login, tienda del revendedor + link `?r=CODIGO`, pedido + carrito. Ya estaban; reforzadas.
- **Etapa 4 — Pagos MP: ESTRUCTURA COMPLETA construida (falta solo deploy con keys).**
  - Backend (Supabase Edge Functions, `supabase/functions/`): `crear-preferencia-pedido` (Checkout Pro), `webhook-mp` (valida firma HMAC, actualiza DB), `crear-suscripcion` (PreApproval recurrente).
  - Front: botón "Pagar con Mercado Pago" en el éxito del pedido + pantalla `Planes.tsx` (suscripción, desde el perfil).
  - Builds verdes (app Vite + admin Next.js compilan).
  - Decidido (regla #6/#9): integración **a mano con la API oficial de MP** (no PagoKit ni el plugin oficial). El `access_token` vive como secreto de la función, nunca en el repo.

---

## ⏳ LO QUE FALTA

### Etapa 4 — terminar pagos (BLOQUEADO esperando credenciales MP sandbox)
Sergio está creando una cuenta MP **nueva del negocio** (email aparte, mismo DNI permitido) y sacando las credenciales de prueba (`TEST-...`).
Cuando estén, en `directimport/db/.env` (gitignored) van: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`. Después:
```bash
supabase secrets set MP_ACCESS_TOKEN="TEST-..." MP_WEBHOOK_SECRET="..." APP_URL="https://<app>"
supabase functions deploy crear-preferencia-pedido webhook-mp crear-suscripcion
# Panel MP → Webhooks → https://lavactsmvtnzhmjkrqfs.supabase.co/functions/v1/webhook-mp
# Probar con las cuentas de prueba de MP
```

### Etapas siguientes del plan de construcción (no empezadas)
- **Etapa 5** — Personalización tienda (colores/logo) + white-label Pro Plus + Agente de Stock.
- **Etapa 6** — Timón (chat IA: texto/audio/foto + memoria + flujo "no lo tengo"). Necesita API key Claude/Gemini.
- **Etapa 7** — Legal (Agente Legal: T&C/privacidad/devoluciones + clickwrap antes de pagar).
- **Etapa 8** — Capa visual / 3D (R3F+Drei en el hero, paleta negro+dorado, panales).
- **Etapa 9** — Hardening + prueba interna (checklist §10 del brief).
- **Etapa 10** — Publicación PWA → Android → iOS (Codemagic) + pagos reales.

---

## DATOS ÚTILES
- **Supabase prod:** `lavactsmvtnzhmjkrqfs` · **staging desechable:** `mscdwqzdnmvxczfucnvn` (linkeado).
- **Harness de tests:** `cd directimport/db && npm test` (usa `directimport/db/.env`, gitignored).
- **Apps:** `directimport/app` (Vite/PWA, comprador+revendedor) · `directimport/admin` (Next.js, panel Sergio). `node_modules` ya instalados; `npm run build` para verificar.
- **Token Management API de MP/Supabase:** está en el Credential Manager de Windows (`Supabase CLI:supabase`), se lee con PowerShell P/Invoke si hace falta tocar prod por API.
- **Docs clave:** `directimport/brief_directimport.md` (el QUÉ) + `directimport/plan_construccion_directimport.md` (el ORDEN, 10 etapas) + `CLAUDE.md` (constitución). **Leerlos enteros antes de tocar nada.**
- **Reglas duras:** prod no se toca sin OK; nunca `--dangerously-skip-permissions`; `git push` cierra cada tarea; keys solo en `.env` local.
