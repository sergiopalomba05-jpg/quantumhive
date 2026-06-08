'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Metrica = { nombre: string; valor: number }
type NodoNivel = { id: number | null; nombre: string; nivel: number }

type Props = {
  modo: 'crear' | 'editar'
  productoId?: string
}

export default function ProductoForm({ modo, productoId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [rubros, setRubros] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [cargando, setCargando] = useState(modo === 'editar')
  const [formData, setFormData] = useState({
    nombre: '', descripcion: '', precio_base: '',
    rubro_id: '', proveedor_id: '', sub_filtro_id: '', estado_stock: true,
  })
  const [metricas, setMetricas] = useState<Metrica[]>([])
  const [niveles, setNiveles] = useState<NodoNivel[]>([{ id: null, nombre: '', nivel: 0 }])
  const [opcionesNivel, setOpcionesNivel] = useState<any[][]>([])

  useEffect(() => {
    supabase.from('rubros').select('*').order('nombre').then(({ data }) => setRubros(data ?? []))
    supabase.from('proveedores').select('*').order('nombre').then(({ data }) => setProveedores(data ?? []))
    if (modo === 'editar' && productoId) {
      Promise.all([
        supabase.from('productos').select('*').eq('id', productoId).single(),
        supabase.from('sub_filtros').select('*').order('orden'),
      ]).then(([{ data: prod }, { data: todosSf }]) => {
        if (prod) {
          setFormData({
            nombre: prod.nombre, descripcion: prod.descripcion ?? '',
            precio_base: String(prod.precio_base), rubro_id: String(prod.rubro_id),
            proveedor_id: prod.proveedor_id ? String(prod.proveedor_id) : '',
            sub_filtro_id: prod.sub_filtro_id ? String(prod.sub_filtro_id) : '',
            estado_stock: prod.estado_stock,
          })
          setMetricas(prod.metricas ?? [])

          if (prod.sub_filtro_id && todosSf) {
            const sfMap = new Map(todosSf.map((sf: any) => [sf.id, sf]))
            const ruta: any[] = []
            let actual = sfMap.get(prod.sub_filtro_id)
            while (actual) { ruta.unshift(actual); actual = actual.parent_id ? sfMap.get(actual.parent_id) : null }

            const nivelesRuta: NodoNivel[] = [{ id: prod.rubro_id, nombre: '', nivel: 0 }]
            const opcionesRuta: any[][] = []
            opcionesRuta[0] = (todosSf ?? []).filter((sf: any) => sf.rubro_id === prod.rubro_id && sf.parent_id == null)
            ruta.forEach((sf, i) => {
              nivelesRuta[i + 1] = { id: sf.id, nombre: sf.nombre, nivel: i + 1 }
              const hijos = (todosSf ?? []).filter((s: any) => s.parent_id === sf.id)
              if (hijos.length > 0) opcionesRuta[i + 1] = hijos
            })
            setNiveles(nivelesRuta)
            setOpcionesNivel(opcionesRuta)
          }
        }
        setCargando(false)
      })
    }
  }, [])

  const handleRubroChange = (rubroId: string) => {
    setFormData({ ...formData, rubro_id: rubroId, sub_filtro_id: '' })
    setNiveles([{ id: parseInt(rubroId), nombre: rubros.find((r) => String(r.id) === rubroId)?.nombre ?? '', nivel: 0 }])
    setOpcionesNivel([])
    if (rubroId) {
      supabase.from('sub_filtros').select('*').eq('rubro_id', rubroId).is('parent_id', null).order('orden').then(({ data }) => {
        setOpcionesNivel([data ?? []])
      })
    }
  }

  const seleccionarNivel = (nivelIdx: number, subFiltroId: string) => {
    const nuevos = [...niveles.slice(0, nivelIdx + 1)]
    const sf = opcionesNivel[nivelIdx]?.find((o) => String(o.id) === subFiltroId)
    nuevos[nivelIdx] = { id: sf?.id ?? null, nombre: sf?.nombre ?? '', nivel: nivelIdx + 1 }
    setNiveles(nuevos)
    setFormData({ ...formData, sub_filtro_id: subFiltroId })
    setOpcionesNivel(opcionesNivel.slice(0, nivelIdx + 1))
    if (sf) {
      supabase.from('sub_filtros').select('*').eq('parent_id', sf.id).order('orden').then(({ data }) => {
        if (data && data.length > 0) {
          setOpcionesNivel((prev) => { const c = [...prev]; c[nivelIdx + 1] = data; return c })
          setNiveles((prev) => { const c = [...prev]; c[nivelIdx + 1] = { id: null, nombre: '', nivel: nivelIdx + 2 }; return c })
          setFormData((prev) => ({ ...prev, sub_filtro_id: '' }))
        }
      })
    }
  }

  const sinSubFiltro = () => {
    setFormData({ ...formData, sub_filtro_id: '' })
    setNiveles([niveles[0]])
    setOpcionesNivel([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      nombre: formData.nombre, descripcion: formData.descripcion,
      precio_base: parseFloat(formData.precio_base), rubro_id: parseInt(formData.rubro_id),
      sub_filtro_id: formData.sub_filtro_id ? parseInt(formData.sub_filtro_id) : null,
      proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id) : null,
      metricas: metricas.filter((m) => m.nombre.trim()), estado_stock: formData.estado_stock,
    }
    const { error } = modo === 'editar' && productoId
      ? await supabase.from('productos').update(payload).eq('id', productoId)
      : await supabase.from('productos').insert(payload)

    if (error) { alert('Error: ' + error.message); return }
    router.push('/dashboard/productos')
    router.refresh()
  }

  const agregarMetrica = () => setMetricas([...metricas, { nombre: '', valor: 50 }])
  const actualizarMetrica = (i: number, campo: 'nombre' | 'valor', val: string | number) => {
    const c = [...metricas]; c[i] = { ...c[i], [campo]: val }; setMetricas(c)
  }
  const quitarMetrica = (i: number) => setMetricas(metricas.filter((_, idx) => idx !== i))

  if (cargando) return <p className="text-[#a0a0a8]">Cargando...</p>

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <label className="block text-sm text-[#a0a0a8] mb-1">Nombre</label>
        <input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required />
      </div>

      <div>
        <label className="block text-sm text-[#a0a0a8] mb-1">Descripción</label>
        <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none rows-3" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-[#a0a0a8] mb-1">Precio base ($)</label>
          <input type="number" step="0.01" value={formData.precio_base}
            onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required />
        </div>
        <div>
          <label className="block text-sm text-[#a0a0a8] mb-1">Proveedor</label>
          <select value={formData.proveedor_id} onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none">
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-[#a0a0a8] mb-1">Rubro</label>
        <select value={formData.rubro_id} onChange={(e) => handleRubroChange(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required>
          <option value="">Seleccionar...</option>
          {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
      </div>

      {formData.rubro_id && (
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-[#a0a0a8] font-medium">Categoría (sub-filtros)</label>
            <button type="button" onClick={sinSubFiltro} className="text-xs text-[#a0a0a8] hover:text-white">Sin categoría</button>
          </div>
          {niveles.map((n, i) => {
            const opts = opcionesNivel[i]
            if (!opts || opts.length === 0) return null
            return (
              <div key={i} className="mb-2 last:mb-0">
                <select value={n.id ? String(n.id) : ''} onChange={(e) => seleccionarNivel(i, e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white text-sm focus:border-[#d4a843] focus:outline-none">
                  <option value="">Seleccionar {n.nombre || `nivel ${i + 1}`}...</option>
                  {opts.map((sf) => <option key={sf.id} value={sf.id}>{sf.nombre}</option>)}
                </select>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-1 mt-2">
            {niveles.filter((n) => n.id).map((n, i) => (
              <span key={i} className="text-xs text-[#d4a843] bg-[#d4a84320] px-2 py-0.5 rounded">
                {i > 0 && ' > '}{n.nombre}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-[#a0a0a8] font-medium">Métricas del producto</label>
          <button type="button" onClick={agregarMetrica}
            className="text-xs bg-[#d4a843] text-black px-3 py-1 rounded font-semibold hover:brightness-110">+ Agregar métrica</button>
        </div>
        {metricas.length === 0 && <p className="text-[#a0a0a8] text-sm">Sin métricas.</p>}
        {metricas.map((m, i) => (
          <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
            <input value={m.nombre} onChange={(e) => actualizarMetrica(i, 'nombre', e.target.value)} placeholder="Ej: Resistencia"
              className="w-40 bg-[#0a0a0a] border border-[#2a2d33] rounded px-2 py-1.5 text-white text-sm focus:border-[#d4a843] focus:outline-none" />
            <input type="range" min="0" max="100" value={m.valor}
              onChange={(e) => actualizarMetrica(i, 'valor', parseInt(e.target.value))} className="flex-1 accent-[#d4a843]" />
            <span className="text-white text-sm w-10 text-right">{m.valor}%</span>
            <button type="button" onClick={() => quitarMetrica(i)} className="text-red-400 text-sm hover:text-red-300">✕</button>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-white">
        <input type="checkbox" checked={formData.estado_stock}
          onChange={(e) => setFormData({ ...formData, estado_stock: e.target.checked })} className="accent-[#d4a843]" />
        Producto disponible (en stock)
      </label>

      <button type="submit"
        className="bg-[#d4a843] text-black px-6 py-2 rounded font-semibold hover:brightness-110 transition-all">
        {modo === 'editar' ? 'Guardar cambios' : 'Guardar producto'}
      </button>
    </form>
  )
}
