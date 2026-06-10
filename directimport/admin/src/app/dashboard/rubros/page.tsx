'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

type SubFiltro = {
  id: number; rubro_id: number; nombre: string; parent_id: number | null
  children: SubFiltro[]
}

export default function RubrosPage() {
  const supabase = createClient()
  const [rubros, setRubros] = useState<any[]>([])
  const [nombre, setNombre] = useState('')

  const cargarRubros = async () => {
    const { data: rubrosData } = await supabase.from('rubros').select('*').order('orden')
    const { data: subFiltrosData } = await supabase.from('sub_filtros').select('*').order('orden')

    const map = new Map<number, SubFiltro>()
    const todos = (subFiltrosData ?? []).map((sf) => ({ ...sf, children: [] as SubFiltro[] }))
    todos.forEach((sf) => map.set(sf.id, sf))

    const raices: SubFiltro[] = []
    todos.forEach((sf) => {
      if (sf.parent_id && map.has(sf.parent_id)) {
        map.get(sf.parent_id)!.children.push(sf)
      } else {
        raices.push(sf)
      }
    })

    const arbol = (rubrosData ?? []).map((r) => ({
      ...r,
      children: raices.filter((sf) => sf.parent_id == null && sf.rubro_id === r.id),
    }))

    setRubros(arbol)
  }

  useEffect(() => { cargarRubros() }, [])

  const agregarRubro = async () => {
    if (!nombre.trim()) return
    await supabase.from('rubros').insert({ nombre: nombre.trim() })
    setNombre('')
    cargarRubros()
  }

  const borrarRubro = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar rubro "${nombre}"? Se borrarán todos sus sub-filtros.`)) return
    await supabase.from('rubros').delete().eq('id', id)
    cargarRubros()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Rubros y sub-filtros</h1>

      <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4 mb-6">
        <h3 className="text-white font-semibold mb-3">Nuevo rubro</h3>
        <div className="flex gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del rubro" className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" />
          <button onClick={agregarRubro} className="bg-[#d4a843] text-black px-4 py-2 rounded font-semibold hover:brightness-110">Agregar</button>
        </div>
      </div>

      <div className="space-y-2">
        {rubros.map((r) => (
          <NodoRubro key={r.id} rubro={r} nivel={0} onRefresh={cargarRubros} />
        ))}
      </div>
    </div>
  )
}

function NodoRubro({ rubro, nivel, onRefresh }: { rubro: any; nivel: number; onRefresh: () => void }) {
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [metricaNombre, setMetricaNombre] = useState<string>(rubro.metrica_nombre ?? '')

  const guardarMetrica = async () => {
    await supabase.from('rubros').update({ metrica_nombre: metricaNombre.trim() || null }).eq('id', rubro.id)
    onRefresh()
  }

  const agregarHijo = async () => {
    if (!nuevoNombre.trim()) return
    await supabase.from('sub_filtros').insert({
      rubro_id: rubro.rubro_id ?? rubro.id,
      nombre: nuevoNombre.trim(),
      parent_id: nivel === 0 ? null : rubro.id,
    })
    setNuevoNombre('')
    onRefresh()
  }

  const borrarNodo = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    await supabase.from('sub_filtros').delete().eq('id', id)
    onRefresh()
  }

  const esRubro = nivel === 0
  const hijos = rubro.children ?? []

  return (
    <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-[#2a2d33]/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ paddingLeft: `${16 + nivel * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {hijos.length > 0 && (
            <span className="text-[#a0a0a8] text-xs">{expanded ? '▼' : '▶'}</span>
          )}
          <span className={`font-medium ${esRubro ? 'text-white' : 'text-[#a0a0a8]'}`}>{rubro.nombre}</span>
        </div>
        <div className="flex items-center gap-2">
          {!esRubro && (
            <span className="text-xs text-[#4a4a50]">ID: {rubro.id}</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); borrarNodo(rubro.id, rubro.nombre) }}
            className="text-red-400 text-sm hover:text-red-300"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#2a2d33] px-4 py-3">
          {esRubro && (
            <div className="mb-4 pb-4 border-b border-[#2a2d33]">
              <label className="block text-xs text-[#a0a0a8] mb-1">
                Métrica del rubro (ej: Comodidad, Potencia, Durabilidad)
              </label>
              <div className="flex gap-2">
                <input
                  value={metricaNombre}
                  onChange={(e) => setMetricaNombre(e.target.value)}
                  placeholder="Nombre de la métrica..."
                  className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-2 py-1.5 text-white text-sm focus:border-[#d4a843] focus:outline-none"
                />
                <button
                  onClick={guardarMetrica}
                  className="bg-[#d4a843] text-black px-3 py-1.5 rounded text-sm font-semibold hover:brightness-110"
                >
                  Guardar
                </button>
              </div>
              {rubro.metrica_nombre && (
                <p className="text-xs text-[#d4a843] mt-1">Actual: {rubro.metrica_nombre}</p>
              )}
            </div>
          )}
          <div className="flex gap-2 mb-3">
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder={`Sub-filtro dentro de "${rubro.nombre}"`}
              className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-2 py-1.5 text-white text-sm focus:border-[#d4a843] focus:outline-none"
            />
            <button
              onClick={agregarHijo}
              className="bg-[#2a2d33] text-white px-3 py-1.5 rounded text-sm hover:bg-[#3a3d43]"
            >
              Agregar
            </button>
          </div>

          {hijos.length > 0 && (
            <div className="space-y-1">
              {hijos.map((hijo: any) => (
                <NodoRubro key={hijo.id} rubro={hijo} nivel={nivel + 1} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
