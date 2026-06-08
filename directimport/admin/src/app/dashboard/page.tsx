import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: productos } = await supabase.from('productos').select('*', { count: 'exact', head: true })
  const { data: rubros } = await supabase.from('rubros').select('*', { count: 'exact', head: true })
  const { data: proveedores } = await supabase.from('proveedores').select('*', { count: 'exact', head: true })

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6">
          <p className="text-[#a0a0a8] text-sm">Productos</p>
          <p className="text-3xl font-bold text-white mt-1">{productos?.count ?? 0}</p>
        </div>
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6">
          <p className="text-[#a0a0a8] text-sm">Rubros</p>
          <p className="text-3xl font-bold text-white mt-1">{rubros?.count ?? 0}</p>
        </div>
        <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-6">
          <p className="text-[#a0a0a8] text-sm">Proveedores</p>
          <p className="text-3xl font-bold text-white mt-1">{proveedores?.count ?? 0}</p>
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
