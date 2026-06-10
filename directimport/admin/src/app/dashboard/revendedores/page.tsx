'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type Revendedor = {
  id: number
  user_id: string
  codigo_unico: string
  nombre_negocio: string | null
  whatsapp: string | null
  plan_id: number | null
  estado: string
  motivo_rechazo: string | null
  referido_por: string | null
  created_at: string
}

const estados = [
  'pendiente_aprobacion',
  'aprobado',
  'pago_pendiente',
  'activo',
  'rechazado',
  'suspendido',
] as const

const planes = ['—', 'Básico', 'Pro', 'Pro Plus', 'Ultra']

const colorEstado = (e: string) =>
  e === 'pendiente_aprobacion' ? 'bg-yellow-900/50 text-yellow-400' :
  e === 'aprobado' ? 'bg-blue-900/50 text-blue-400' :
  e === 'pago_pendiente' ? 'bg-orange-900/50 text-orange-400' :
  e === 'activo' ? 'bg-green-900/50 text-green-400' :
  e === 'rechazado' ? 'bg-red-900/50 text-red-400' :
  'bg-gray-700/50 text-gray-400'

export default function RevendedoresPage() {
  const supabase = createClient()
  const [revs, setRevs] = useState<Revendedor[]>([])
  const [filtro, setFiltro] = useState<string>('pendiente_aprobacion')
  const [adminUid, setAdminUid] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminUid(data.user?.id ?? null))
  }, [])

  const cargar = () => {
    let query = supabase.from('revendedores').select('*').order('created_at', { ascending: false })
    if (filtro !== 'todos') query = query.eq('estado', filtro)
    query.then(({ data }) => setRevs(data ?? []))
  }

  useEffect(() => { cargar() }, [filtro])

  const aprobar = async (r: Revendedor) => {
    await supabase.from('revendedores').update({
      estado: 'activo',
      aprobado_por: adminUid,
      aprobado_en: new Date().toISOString(),
      motivo_rechazo: null,
    }).eq('id', r.id)
    cargar()
  }

  const rechazar = async (r: Revendedor) => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') ?? ''
    await supabase.from('revendedores').update({
      estado: 'rechazado',
      motivo_rechazo: motivo || 'Sin especificar',
    }).eq('id', r.id)
    cargar()
  }

  const cambiarEstado = async (r: Revendedor, estado: string) => {
    await supabase.from('revendedores').update({ estado }).eq('id', r.id)
    cargar()
  }

  const formatearFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Revendedores</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['todos', ...estados].map((est) => (
          <button
            key={est}
            onClick={() => setFiltro(est)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filtro === est
                ? 'bg-[#d4a843] text-black'
                : 'bg-[#1a1d23] text-[#a0a0a8] border border-[#2a2d33] hover:text-white'
            }`}
          >
            {est === 'todos' ? 'Todos' : est.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {revs.length === 0 && (
          <p className="text-[#a0a0a8] text-center py-8">No hay revendedores en este estado</p>
        )}
        {revs.map((r) => (
          <div key={r.id} className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{r.nombre_negocio || '(sin nombre)'}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorEstado(r.estado)}`}>
                {r.estado.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-sm text-[#a0a0a8] space-y-1 mb-3">
              <p>Código: <span className="text-white font-mono">{r.codigo_unico}</span></p>
              {r.whatsapp && <p>WhatsApp: {r.whatsapp}</p>}
              <p>Plan: {planes[r.plan_id ?? 0] ?? '—'}</p>
              {r.referido_por && <p>Referido por: {r.referido_por}</p>}
              <p>Alta: {formatearFecha(r.created_at)}</p>
              {r.motivo_rechazo && <p className="text-red-400">Rechazo: {r.motivo_rechazo}</p>}
            </div>

            <div className="flex gap-2 flex-wrap">
              {(r.estado === 'pendiente_aprobacion' || r.estado === 'aprobado' || r.estado === 'pago_pendiente') && (
                <>
                  <button
                    onClick={() => aprobar(r)}
                    className="px-4 py-2 bg-[#d4a843] text-black rounded-lg text-sm font-semibold hover:bg-[#c49833]"
                  >
                    Aprobar y activar
                  </button>
                  <button
                    onClick={() => rechazar(r)}
                    className="px-4 py-2 bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm font-semibold"
                  >
                    Rechazar
                  </button>
                </>
              )}
              {r.estado === 'activo' && (
                <button
                  onClick={() => cambiarEstado(r, 'suspendido')}
                  className="px-4 py-2 bg-gray-700/50 text-gray-300 border border-gray-600 rounded-lg text-sm font-semibold"
                >
                  Suspender
                </button>
              )}
              {(r.estado === 'suspendido' || r.estado === 'rechazado') && (
                <button
                  onClick={() => aprobar(r)}
                  className="px-4 py-2 bg-green-900/50 text-green-400 border border-green-800 rounded-lg text-sm font-semibold"
                >
                  Reactivar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
