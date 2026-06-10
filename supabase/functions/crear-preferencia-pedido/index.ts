// Edge Function: crear-preferencia-pedido
// Crea una preferencia de Checkout Pro de Mercado Pago para que el comprador
// pague un pedido. El access_token vive como secreto de la function (nunca en el front).
// La app la llama con supabase.functions.invoke('crear-preferencia-pedido', { body: {...} }).
import { corsHeaders, json } from '../_shared/cors.ts'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!MP_ACCESS_TOKEN) return json({ error: 'MP_ACCESS_TOKEN no configurado' }, 500)

  try {
    const { pedido_id, items, nombre, email } = await req.json()
    if (!pedido_id || !Array.isArray(items) || items.length === 0) {
      return json({ error: 'pedido_id e items son obligatorios' }, 400)
    }

    const preference = {
      items: items.map((it: Record<string, unknown>) => ({
        title: String(it.nombre ?? 'Producto'),
        quantity: Math.max(1, Number(it.cantidad ?? 1)),
        unit_price: Number(it.precio ?? 0),
        currency_id: 'ARS',
      })),
      ...(email ? { payer: { name: String(nombre ?? ''), email: String(email) } } : {}),
      // external_reference vincula el pago con el pedido en el webhook.
      external_reference: `pedido:${pedido_id}`,
      notification_url: `${SUPABASE_URL}/functions/v1/webhook-mp`,
      back_urls: {
        success: `${APP_URL}?pago=exito`,
        failure: `${APP_URL}?pago=error`,
        pending: `${APP_URL}?pago=pendiente`,
      },
      auto_return: 'approved',
    }

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preference),
    })
    const data = await r.json()
    if (!r.ok) return json({ error: 'Mercado Pago rechazó la preferencia', detail: data }, 502)

    return json({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, preference_id: data.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
