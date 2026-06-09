import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { admin, sesion, crearUsuario, anonClient } from './helpers.mjs'

const ADMIN_EMAIL = 'test-admin@directimport.test'
const REV_EMAIL = 'test-revendedor@directimport.test'
const PASS = 'Test1234!seguro'

let adminUser, revUser, sesAdmin, sesRev

before(async () => {
  adminUser = await crearUsuario(ADMIN_EMAIL, PASS)
  revUser = await crearUsuario(REV_EMAIL, PASS)

  // Sergio (admin) entra en la allow-list; el revendedor NO.
  await admin.from('admins').upsert({ user_id: adminUser.id, nombre: 'Test Admin' })
  await admin.from('admins').delete().eq('user_id', revUser.id)

  sesAdmin = await sesion(ADMIN_EMAIL, PASS)
  sesRev = await sesion(REV_EMAIL, PASS)

  // El revendedor tiene su fila (sembrada con service_role; nace pendiente).
  await admin.from('revendedores').upsert(
    { user_id: revUser.id, codigo_unico: 'TEST01', plan_id: 1, nombre_negocio: 'Tienda Test' },
    { onConflict: 'user_id' },
  )
  // Un segundo revendedor, para probar aislamiento entre tiendas.
  const otro = await crearUsuario('test-otro@directimport.test', PASS)
  await admin.from('revendedores').upsert(
    { user_id: otro.id, codigo_unico: 'OTRO01', plan_id: 1, nombre_negocio: 'Otra Tienda' },
    { onConflict: 'user_id' },
  )
})

// ── Catálogo madre ────────────────────────────────────────────────────────────

test('un revendedor NO puede insertar en el catálogo madre', async () => {
  const { error } = await sesRev.from('productos').insert({
    rubro_id: 1, nombre: 'HACK', precio_base: 1,
  })
  assert.ok(error, 'se esperaba error de RLS al insertar producto madre')
})

test('un revendedor NO puede borrar del catálogo madre', async () => {
  const { data: prod } = await admin.from('productos')
    .insert({ rubro_id: 1, nombre: 'PROD-MADRE-TEST', precio_base: 100 })
    .select().single()
  await sesRev.from('productos').delete().eq('id', prod.id) // RLS: 0 filas, sin error
  const { data: sigue } = await admin.from('productos')
    .select('id').eq('id', prod.id).maybeSingle()
  assert.ok(sigue, 'el revendedor NO debe haber podido borrar el producto madre')
  await admin.from('productos').delete().eq('id', prod.id)
})

test('un admin SÍ puede insertar en el catálogo madre', async () => {
  const { data, error } = await sesAdmin.from('productos')
    .insert({ rubro_id: 1, nombre: 'PROD-ADMIN-TEST', precio_base: 200 })
    .select().single()
  assert.equal(error, null)
  assert.ok(data?.id)
  await admin.from('productos').delete().eq('id', data.id)
})

// ── Anti-escalación de revendedor ─────────────────────────────────────────────

test('un revendedor NO puede auto-aprobarse ni subirse de plan', async () => {
  await sesRev.from('revendedores')
    .update({ estado: 'activo', plan_id: 4, score: 999 })
    .eq('user_id', revUser.id)
  const { data } = await admin.from('revendedores')
    .select('estado, plan_id, score').eq('user_id', revUser.id).single()
  assert.equal(data.estado, 'pendiente_aprobacion', 'no debe poder activarse solo')
  assert.equal(Number(data.plan_id), 1, 'no debe poder cambiar su plan')
  assert.equal(Number(data.score), 0, 'no debe poder tocar su score')
})

test('un revendedor NO ve la fila de otro revendedor', async () => {
  const { data } = await sesRev.from('revendedores').select('codigo_unico')
  const codigos = (data || []).map((r) => r.codigo_unico)
  assert.ok(!codigos.includes('OTRO01'), 'no debe ver la tienda de otro')
})

test('un revendedor SÍ puede editar lo cosmético de su tienda', async () => {
  const { error } = await sesRev.from('revendedores')
    .update({ nombre_negocio: 'Mi Tienda Editada', whatsapp: '+5491100000000' })
    .eq('user_id', revUser.id)
  assert.equal(error, null)
  const { data } = await admin.from('revendedores')
    .select('nombre_negocio').eq('user_id', revUser.id).single()
  assert.equal(data.nombre_negocio, 'Mi Tienda Editada')
})

test('un revendedor NO puede crear productos madre (revendedor_id NULL)', async () => {
  const { error } = await sesRev.from('productos')
    .insert({ rubro_id: 1, nombre: 'INTRUSO-MADRE', precio_base: 1, revendedor_id: null })
  assert.ok(error, 'un producto con revendedor_id NULL es del catálogo madre; debe rechazarse')
})

// ── Pedidos ───────────────────────────────────────────────────────────────────

test('un comprador anónimo puede crear un pedido con sus líneas', async () => {
  const buyer = anonClient()
  const { data: pedido, error } = await buyer.from('pedidos')
    .insert({ nombre: 'Comprador', whatsapp: '+5491100000001', total: 500 })
    .select().single()
  assert.equal(error, null, 'el público debe poder crear pedido')
  const { error: e2 } = await buyer.from('pedido_items').insert({
    pedido_id: pedido.id, producto_id: null, proveedor_id: null,
    nombre_snapshot: 'Item', precio_snapshot: 250, cantidad: 2, subtotal: 500,
  })
  assert.equal(e2, null, 'el público debe poder agregar líneas')
  await admin.from('pedidos').delete().eq('id', pedido.id)
})

test('un revendedor NO ve pedidos de otra tienda', async () => {
  const { data: otro } = await admin.from('revendedores').select('id').eq('codigo_unico', 'OTRO01').single()
  const { data: ped } = await admin.from('pedidos')
    .insert({ nombre: 'X', whatsapp: '+540', total: 1, revendedor_id: otro.id }).select().single()
  const { data: visibles } = await sesRev.from('pedidos').select('id').eq('id', ped.id)
  assert.equal((visibles || []).length, 0, 'no debe ver pedidos de otra tienda')
  await admin.from('pedidos').delete().eq('id', ped.id)
})
