import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  throw new Error('Faltan SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY')
}

// Cliente con service_role: bypassa RLS, para sembrar y verificar.
export const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export function anonClient() {
  return createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Crea (o recupera) un usuario de auth con email confirmado.
export async function crearUsuario(email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (data?.user) return data.user
  if (error && !String(error.message).toLowerCase().includes('already')) throw error
  const { data: list } = await admin.auth.admin.listUsers()
  return list.users.find((u) => u.email === email)
}

// Abre una sesión real (JWT de usuario) con la anon key.
export async function sesion(email, password) {
  const c = anonClient()
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
  return c
}
