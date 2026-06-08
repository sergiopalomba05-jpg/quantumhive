'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function RubrosPage() {
  const supabase = createClient()
  const [rubros, setRubros] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [metrica, setMetrica] = useState('Calidad')
  const [subFiltroNombre, setSubFiltroNombre] = useState('')
  const [rubroActivo, setRubroActivo] = useState<number | null>(null)

  const cargarRubros = async () => {
    const { data } = await supabase.from('rubros').select('*, sub_filtros(*)').order('orden')
    setRubros(data ?? [])
  }

  useEffect(() => { cargarRubros() }, [])

  const agregarRubro = async () => {
    if (!nombre.trim()) return
    await supabase.from('rubros').insert({ nombre: nombre.trim(), metrica_configurable: metrica })
    setNombre('')
    setMetrica('Calidad')
    cargarRubros()
  }

  const agregarSubFiltro = async (rubroId: number) => {
    if (!subFiltroNombre.trim()) return
    await supabase.from('sub_filtros').insert({ rubro_id: rubroId, nombre: subFiltroNombre.trim() })
    setSubFiltroNombre('')
    cargarRubros()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Rubros y sub-filtros</h1>

      <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4 mb-6">
        <h3 className="text-white font-semibold mb-3">Nuevo rubro</h3>
        <div className="flex gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del rubro" className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" />
          <select value={metrica} onChange={(e) => setMetrica(e.target.value)} className="bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none">
            <option>Calidad</option>
            <option>Comodidad</option>
            <option>Rendimiento</option>
            <option>Potencia</option>
            <option>Durabilidad</option>
          </select>
          <button onClick={agregarRubro} className="bg-[#d4a843] text-black px-4 py-2 rounded font-semibold hover:brightness-110">Agregar</button>
        </div>
      </div>

      <div className="space-y-3">
        {rubros.map((r) => (
          <div key={r.id} className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg">
            <button
              onClick={() => setRubroActivo(rubroActivo === r.id ? null : r.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-white hover:bg-[#2a2d33]/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">{r.nombre}</span>
                <span className="text-xs text-[#a0a0a8] bg-[#0a0a0a] px-2 py-0.5 rounded">Métrica: {r.metrica_configurable}</span>
              </div>
              <span className="text-[#a0a0a8]">{rubroActivo === r.id ? '▲' : '▼'}</span>
            </button>

            {rubroActivo === r.id && (
              <div className="px-4 pb-3 border-t border-[#2a2d33] pt-3">
                <div className="flex gap-2 mb-3">
                  <input value={subFiltroNombre} onChange={(e) => setSubFiltroNombre(e.target.value)} placeholder="Nuevo sub-filtro" className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none text-sm" />
                  <button onClick={() => agregarSubFiltro(r.id)} className="bg-[#2a2d33] text-white px-3 py-2 rounded text-sm hover:bg-[#3a3d43]">Agregar</button>
                </div>

                {r.sub_filtros?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {r.sub_filtros.map((sf: any) => (
                      <span key={sf.id} className="bg-[#0a0a0a] text-[#a0a0a8] px-2 py-1 rounded text-sm border border-[#2a2d33]">
                        {sf.nombre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
