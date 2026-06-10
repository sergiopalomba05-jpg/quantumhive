// Edge Function: webhook-mp
// Recibe las notificaciones de Mercado Pago (pagos de pedidos y suscripciones),
// VALIDA la firma (x-signature, HMAC-SHA256), consulta el estado real en MP y
// actualiza la base con service_role. Idempotente: re-procesar la misma notif no rompe.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const body = await req.json().catch(() => ({}))
    const type = body.type ?? body.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
    const dataId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')

    // Validar firma si hay secreto configurado (recomendado en producción).
    if (MP_WEBHOOK_SECRET) {
      const ok = await firmaValida(req, MP_WEBHOOK_SECRET, dataId)
      if (!ok) return new Response('invalid signature', { status: 401 })
    }

    if (type === 'payment' && dataId) {
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      })
      const pago = await r.json()
      const ref = String(pago.external_reference ?? '')   // "pedido:123"
      const status = String(pago.status ?? '')            // approved | pending | rejected | ...
      const estadoPago = status === 'approved' ? 'pagado' : status === 'in_process' || status === 'pending' ? 'senado' : 'pendiente'

      if (ref.startsWith('pedido:')) {
        const pedidoId = Number(ref.split(':')[1])
        await admin.from('pedidos').update({ estado_pago: estadoPago }).eq('id', pedidoId)
        await admin.from('eventos_sistema').insert({
          tipo: 'pago_pedido', entidad: 'pedidos', entidad_id: pedidoId,
          payload: { payment_id: dataId, status, estado_pago: estadoPago },
        })
      }
    }

    if ((type === 'subscription_preapproval' || type === 'preapproval') && dataId) {
      const r = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      })
      const pre = await r.json()
      const ref = String(pre.external_reference ?? '')    // "suscripcion:<revId>:<planId>"
      const status = String(pre.status ?? '')             // authorized | paused | cancelled
      if (ref.startsWith('suscripcion:')) {
        const [, revId] = ref.split(':')
        const estadoSus = status === 'authorized' ? 'activa' : status === 'cancelled' ? 'cancelada' : 'vencida'
        await admin.from('suscripciones').update({ estado: estadoSus }).eq('revendedor_id', Number(revId))
        if (status === 'authorized') {
          await admin.from('revendedores').update({ estado: 'activo' }).eq('id', Number(revId))
        }
        await admin.from('eventos_sistema').insert({
          tipo: 'suscripcion_actualizada', entidad: 'revendedores', entidad_id: Number(revId),
          payload: { preapproval_id: dataId, status },
        })
      }
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    return new Response('error: ' + String(e), { status: 500 })
  }
})

// MP firma con x-signature: "ts=<timestamp>,v1=<hmac>" sobre el manifest
// `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
async function firmaValida(req: Request, secret: string, dataId: string): Promise<boolean> {
  const sig = req.headers.get('x-signature') ?? ''
  const reqId = req.headers.get('x-request-id') ?? ''
  const parts: Record<string, string> = {}
  for (const p of sig.split(',')) {
    const [k, v] = p.trim().split('=')
    if (k && v) parts[k] = v
  }
  const ts = parts.ts, v1 = parts.v1
  if (!ts || !v1) return false
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}
