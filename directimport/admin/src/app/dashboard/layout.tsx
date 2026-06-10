'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: '📊' },
  { href: '/dashboard/productos', label: 'Productos', icon: '📦' },
  { href: '/dashboard/rubros', label: 'Rubros', icon: '📁' },
  { href: '/dashboard/proveedores', label: 'Proveedores', icon: '🏢' },
  { href: '/dashboard/revendedores', label: 'Revendedores', icon: '🛍️' },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: '📋' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <aside className="w-56 bg-[#1a1d23] border-r border-[#2a2d33] p-4 flex flex-col">
        <div className="mb-8">
          <h2 className="text-[#d4a843] font-bold text-lg">Directimport</h2>
          <p className="text-[#a0a0a8] text-xs">Panel Admin</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                  active
                    ? 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20'
                    : 'text-[#a0a0a8] hover:text-white hover:bg-[#2a2d33]'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="text-[#a0a0a8] text-sm hover:text-white transition-colors text-left px-3 py-2"
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
