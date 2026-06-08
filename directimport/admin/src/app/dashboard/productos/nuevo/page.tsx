'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NuevoProductoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [rubros, setRubros] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [subFiltros, setSubFiltros] = useState<any[]>([])
  const [rubroSeleccionado, setRubroSeleccionado] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_base: '',
    rubro_id: '',
    proveedor_id: '',
    sub_filtro_id: '',
    metrica_valor: 50,
    estado_stock: true,
  })

  useEffect(() => {
    supabase.from('rubros').select('*').order('nombre').then(({ data }) => setRubros(data ?? []))
    supabase.from('proveedores').select('*').order('nombre').then(({ data }) => setProveedores(data ?? []))
  }, [])

  useEffect(() => {
    if (formData.rubro_id) {
      supabase.from('sub_filtros').select('*').eq('rubro_id', formData.rubro_id).order('nombre').then(({ data }) => setSubFiltros(data ?? []))
    } else {
      setSubFiltros([])
    }
  }, [formData.rubro_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('productos').insert({
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      precio_base: parseFloat(formData.precio_base),
      rubro_id: parseInt(formData.rubro_id),
      proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id) : null,
      metrica_valor: formData.metrica_valor,
      estado_stock: formData.estado_stock,
    })

    if (error) {
      alert('Error al crear: ' + error.message)
      return
    }
    router.push('/dashboard/productos')
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Nuevo Producto</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm text-[#a0a0a8] mb-1">Nombre</label>
          <input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required />
        </div>

        <div>
          <label className="block text-sm text-[#a0a0a8] mb-1">Descripción</label>
          <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none rows-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#a0a0a8] mb-1">Rubro</label>
            <select value={formData.rubro_id} onChange={(e) => { setFormData({ ...formData, rubro_id: e.target.value }); setRubroSeleccionado(e.target.value) }} className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required>
              <option value="">Seleccionar...</option>
              {rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#a0a0a8] mb-1">Sub-filtro</label>
            <select value={formData.sub_filtro_id} onChange={(e) => setFormData({ ...formData, sub_filtro_id: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none">
              <option value="">Sin sub-filtro</option>
              {subFiltros.map((sf) => <option key={sf.id} value={sf.id}>{sf.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#a0a0a8] mb-1">Precio base ($)</label>
            <input type="number" step="0.01" value={formData.precio_base} onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required />
          </div>

          <div>
            <label className="block text-sm text-[#a0a0a8] mb-1">Proveedor</label>
            <select value={formData.proveedor_id} onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })} className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none">
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#a0a0a8] mb-1">Métrica: {formData.metrica_valor}%</label>
          <input type="range" min="0" max="100" value={formData.metrica_valor} onChange={(e) => setFormData({ ...formData, metrica_valor: parseInt(e.target.value) })} className="w-full accent-[#d4a843]" />
        </div>

        <label className="flex items-center gap-2 text-white">
          <input type="checkbox" checked={formData.estado_stock} onChange={(e) => setFormData({ ...formData, estado_stock: e.target.checked })} className="accent-[#d4a843]" />
          Producto disponible (en stock)
        </label>

        <button type="submit" className="bg-[#d4a843] text-black px-6 py-2 rounded font-semibold hover:brightness-110 transition-all">
          Guardar producto
        </button>
      </form>
    </div>
  )
}
