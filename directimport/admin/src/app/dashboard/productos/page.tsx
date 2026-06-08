'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type ProductoRow = {
  id: number; nombre: string; precio_base: number; estado_stock: boolean
  metricas: { nombre: string; valor: number }[]
  rubro: { nombre: string }[] | null
  proveedor: { nombre: string }[] | null
}

export default function ProductosPage() {
  const supabase = createClient()
  const [productos, setProductos] = useState<ProductoRow[]>([])

  const cargar = async () => {
    const { data } = await supabase
      .from('productos')
      .select('id, nombre, precio_base, estado_stock, metricas, rubro:rubros(nombre), proveedor:proveedores(nombre)')
      .order('created_at', { ascending: false })
    setProductos(data ?? [])
  }

  useEffect(() => { cargar() }, [])

  const borrar = async (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    await supabase.from('productos').delete().eq('id', id)
    cargar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Productos</h1>
        <Link
          href="/dashboard/productos/nuevo"
          className="bg-[#d4a843] text-black px-4 py-2 rounded font-semibold hover:brightness-110 transition-all"
        >
          + Nuevo producto
        </Link>
      </div>

      <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2d33]">
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Rubro</th>
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Precio base</th>
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Métricas</th>
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Stock</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-[#2a2d33] hover:bg-[#2a2d33]/50">
                <td className="px-4 py-3 text-white">{p.nombre}</td>
                <td className="px-4 py-3 text-[#a0a0a8]">{p.rubro?.[0]?.nombre}</td>
                <td className="px-4 py-3 text-[#d4a843] font-mono">${Number(p.precio_base).toFixed(2)}</td>
                <td className="px-4 py-3">
                  {p.metricas?.length > 0 ? (
                    <div className="flex gap-2">
                      {p.metricas.map((m, i) => (
                        <span key={i} className="text-xs text-[#a0a0a8] bg-[#0a0a0a] px-2 py-0.5 rounded">
                          {m.nombre}: {m.valor}%
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[#4a4a50] text-sm">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${p.estado_stock ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {p.estado_stock ? 'Disponible' : 'Sin stock'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/productos/${p.id}`} className="text-[#d4a843] text-sm hover:underline">
                      Editar
                    </Link>
                    <button onClick={() => borrar(p.id, p.nombre)} className="text-red-400 text-sm hover:text-red-300">
                      Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#a0a0a8]">
                  No hay productos todavía. ¡Creá el primero!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
