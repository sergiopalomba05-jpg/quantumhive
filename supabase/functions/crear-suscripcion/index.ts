// Edge Function: crear-suscripcion
// Crea un PreApproval (cobro recurrente) de Mercado Pago para el plan del revendedor.
// El revendedor logueado la llama; devuelve el init_point para autorizar el débito.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!MP_ACCESS_TOKEN) return json({ error: 'MP_ACCESS_TOKEN no configurado' }, 500)

  try {
    const { revendedor_id, plan_id, email } = await req.json()
    if (!revendedor_id || !plan_id || !email) {
      return json({ error: 'revendedor_id, plan_id y email son obligatorios' }, 400)
    }

    const { data: plan } = await admin.from('planes').select('nombre, precio').eq('id', plan_id).single()
    if (!plan) return json({ error: 'plan inexistente' }, 400)

    const preapproval = {
      reason: `Suscripción ${plan.nombre} — Directimport`,
      external_reference: `suscripcion:${revendedor_id}:${plan_id}`,
      payer_email: String(email),
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(plan.precio ?? 0),
        currency_id: 'ARS',
      },
      back_url: APP_URL,
      status: 'pending',
    }

    const r = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preapproval),
    })
    const data = await r.json()
    if (!r.ok) return json({ error: 'Mercado Pago rechazó la suscripción', detail: data }, 502)

    // Registrar la suscripción (estado trial hasta que MP confirme la autorización).
    // Una suscripción vigente por revendedor: reemplaza la anterior.
    await admin.from('suscripciones').delete().eq('revendedor_id', revendedor_id)
    await admin.from('suscripciones').insert({ revendedor_id, plan_id, estado: 'trial', monto: plan.precio })

    return json({ init_point: data.init_point, preapproval_id: data.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
