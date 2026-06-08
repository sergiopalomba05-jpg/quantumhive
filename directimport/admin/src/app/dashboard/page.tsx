'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const supabase = createClient()
  const [counts, setCounts] = useState({ productos: 0, rubros: 0, proveedores: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('*', { count: 'exact', head: true }).then(({ count }) => count ?? 0),
      supabase.from('rubros').select('*', { count: 'exact', head: true }).then(({ count }) => count ?? 0),
      supabase.from('proveedores').select('*', { count: 'exact', head: true }).then(({ count }) => count ?? 0),
    ]).then(([productos, rubros, proveedores]) => setCounts({ productos, rubros, proveedores }))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6">
          <p className="text-[#a0a0a8] text-sm">Productos</p>
          <p className="text-3xl font-bold text-white mt-1">{counts.productos}</p>
        </div>
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6">
          <p className="text-[#a0a0a8] text-sm">Rubros</p>
          <p className="text-3xl font-bold text-white mt-1">{counts.rubros}</p>
        </div>
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6">
          <p className="text-[#a0a0a8] text-sm">Proveedores</p>
          <p className="text-3xl font-bold text-white mt-1">{counts.proveedores}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/dashboard/productos"
          className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6 hover:border-[#d4a843]/50 transition-colors"
        >
          <h3 className="text-white font-semibold">Gestionar Productos</h3>
          <p className="text-[#a0a0a8] text-sm mt-1">Agregar, editar y administrar el catálogo</p>
        </Link>
        <Link
          href="/dashboard/rubros"
          className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6 hover:border-[#d4a843]/50 transition-colors"
        >
          <h3 className="text-white font-semibold">Gestionar Rubros</h3>
          <p className="text-[#a0a0a8] text-sm mt-1">Categorías, sub-filtros y atributos</p>
        </Link>
      </div>
    </div>
  )
}
