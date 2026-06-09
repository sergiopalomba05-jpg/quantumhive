import { test } from 'node:test'
import assert from 'node:assert/strict'
import { admin, anonClient } from './helpers.mjs'

const DORMIDAS = ['suscripciones', 'pagos', 'aceptaciones_legales', 'demanda_no_satisfecha', 'eventos_sistema']

test('las tablas dormidas existen y son consultables por admin', async () => {
  for (const t of DORMIDAS) {
    const { error } = await admin.from(t).select('*').limit(1)
    assert.equal(error, null, `la tabla ${t} debe existir`)
  }
})

test('el público NO puede leer pagos ni eventos del sistema', async () => {
  const anon = anonClient()
  const { data: pagos } = await anon.from('pagos').select('*')
  assert.equal((pagos || []).length, 0, 'pagos no debe ser legible por anon')
  const { data: ev } = await anon.from('eventos_sistema').select('*')
  assert.equal((ev || []).length, 0, 'eventos_sistema no debe ser legible por anon')
})
