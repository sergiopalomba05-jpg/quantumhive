# Edge Functions — Pagos Mercado Pago (Etapa 4)

Tres funciones que cablean el cobro con la **API oficial de Mercado Pago**. El
`access_token` vive como **secreto de la función**, nunca en el front ni en el repo.

## Funciones
- **crear-preferencia-pedido** — el comprador paga un pedido (Checkout Pro). Devuelve `init_point` (URL de pago).
- **webhook-mp** — recibe las notificaciones de MP (pago y suscripción), **valida la firma** (HMAC-SHA256) y actualiza la base con `service_role`.
- **crear-suscripcion** — el revendedor paga su plan (PreApproval / cobro recurrente).

## Secretos (NO van al repo — se cargan con `supabase secrets`)
| Variable | Para qué |
|----------|----------|
| `MP_ACCESS_TOKEN` | Token de MP (sandbox: `TEST-...`). Firma las llamadas a MP. |
| `MP_WEBHOOK_SECRET` | Clave de firma del webhook (panel MP → Webhooks). Valida que la notif viene de MP. |
| `APP_URL` | URL de la app para las `back_urls` (ej. `https://directimport.vercel.app`). |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase solo.

## Cargar secretos y deployar
```bash
# 1. Cargar secretos sandbox en el proyecto linkeado
supabase secrets set MP_ACCESS_TOKEN="TEST-xxxx" MP_WEBHOOK_SECRET="xxxx" APP_URL="https://tu-app"

# 2. Deployar las tres funciones
supabase functions deploy crear-preferencia-pedido
supabase functions deploy webhook-mp
supabase functions deploy crear-suscripcion
```

## Configurar el webhook en MP
Panel de MP → tu aplicación → **Webhooks**, apuntar a:
```
https://<PROJECT_REF>.supabase.co/functions/v1/webhook-mp
```
y copiar la **clave secreta** que te da MP a `MP_WEBHOOK_SECRET`.

## Flujo del pago de un pedido
1. La app crea el pedido (RPC `crear_pedido`) → obtiene `pedido_id`.
2. La app invoca `crear-preferencia-pedido` con los items → recibe `init_point` → redirige a MP.
3. El comprador paga en MP.
4. MP llama a `webhook-mp` → valida la firma → consulta el pago real → marca `pedidos.estado_pago = 'pagado'` y registra un evento.

> **Sandbox:** mientras pruebes, usá `sandbox_init_point` (también lo devuelve la función) y las **cuentas de prueba** de MP. Pasás a producción cambiando `MP_ACCESS_TOKEN` por el de producción.
