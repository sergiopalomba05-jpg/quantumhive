'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type Pedido = {
  id: number
  nombre: string
  whatsapp: string
  direccion: string | null
  notas: string | null
  items: { id: number; nombre: string; cantidad: number; precio: number }[]
  total: number
  estado: string
  created_at: string
}

const estados = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'] as const

export default function PedidosPage() {
  const supabase = createClient()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [selected, setSelected] = useState<Pedido | null>(null)

  const cargar = () => {
    let query = supabase.from('pedidos').select('*').order('created_at', { ascending: false })
    if (filtroEstado !== 'todos') query = query.eq('estado', filtroEstado)
    query.then(({ data }) => setPedidos(data ?? []))
  }

  useEffect(() => { cargar() }, [filtroEstado])

  const cambiarEstado = async (id: number, nuevoEstado: string) => {
    await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id)
    cargar()
    if (selected?.id === id) setSelected({ ...selected, estado: nuevoEstado })
  }

  const formatearFecha = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const siguienteEstado = (actual: string) => {
    const idx = estados.indexOf(actual as any)
    return idx >= 0 && idx < estados.length - 1 ? estados[idx + 1] : null
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Pedidos</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['todos', ...estados].map((est) => (
          <button
            key={est}
            onClick={() => setFiltroEstado(est)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filtroEstado === est
                ? 'bg-[#d4a843] text-black'
                : 'bg-[#1a1d23] text-[#a0a0a8] border border-[#2a2d33] hover:text-white'
            }`}
          >
            {est === 'todos' ? 'Todos' : est.charAt(0).toUpperCase() + est.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {pedidos.length === 0 && (
          <p className="text-[#a0a0a8] text-center py-8">No hay pedidos</p>
        )}
        {pedidos.map((p) => (
          <div
            key={p.id}
            className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4 cursor-pointer hover:border-[#d4a843]/50 transition-colors"
            onClick={() => setSelected(p)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{p.nombre}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                p.estado === 'pendiente' ? 'bg-yellow-900/50 text-yellow-400' :
                p.estado === 'confirmado' ? 'bg-blue-900/50 text-blue-400' :
                p.estado === 'enviado' ? 'bg-purple-900/50 text-purple-400' :
                p.estado === 'entregado' ? 'bg-green-900/50 text-green-400' :
                'bg-red-900/50 text-red-400'
              }`}>
                {p.estado}
              </span>
            </div>
            <div className="text-sm text-[#a0a0a8] space-y-1">
              <p>WhatsApp: {p.whatsapp}</p>
              <p>Total: ${Number(p.total).toLocaleString('es-AR')}</p>
              <p>{formatearFecha(p.created_at)}</p>
              <p>{p.items.length} producto{(p.items.length !== 1) && 's'}</p>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Pedido #{selected.id}</h2>
              <button onClick={() => setSelected(null)} className="text-[#a0a0a8] text-xl">✕</button>
            </div>

            <div className="space-y-3 text-sm text-[#a0a0a8] mb-4">
              <p><span className="text-white">Cliente:</span> {selected.nombre}</p>
              <p><span className="text-white">WhatsApp:</span> {selected.whatsapp}</p>
              {selected.direccion && <p><span className="text-white">Dirección:</span> {selected.direccion}</p>}
              {selected.notas && <p><span className="text-white">Notas:</span> {selected.notas}</p>}
              <p><span className="text-white">Fecha:</span> {formatearFecha(selected.created_at)}</p>
            </div>

            <div className="border-t border-[#2a2d33] pt-4 mb-4">
              <h3 className="text-white font-semibold mb-2">Productos</h3>
              <div className="space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[#a0a0a8]">{item.nombre} × {item.cantidad}</span>
                    <span className="text-white">${(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-lg font-bold text-white mt-3 pt-3 border-t border-[#2a2d33]">
                <span>Total</span>
                <span className="text-[#d4a843]">${Number(selected.total).toLocaleString('es-AR')}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {siguienteEstado(selected.estado) && (
                <button
                  onClick={() => cambiarEstado(selected.id, siguienteEstado(selected.estado)!)}
                  className="px-4 py-2 bg-[#d4a843] text-black rounded-lg text-sm font-semibold hover:bg-[#c49833]"
                >
                  Pasar a {siguienteEstado(selected.estado)}
                </button>
              )}
              {selected.estado !== 'cancelado' && (
                <button
                  onClick={() => cambiarEstado(selected.id, 'cancelado')}
                  className="px-4 py-2 bg-red-900/50 text-red-400 border border-red-800 rounded-lg text-sm font-semibold"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
