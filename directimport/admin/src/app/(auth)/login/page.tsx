'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // El alta de admin es manual (tabla `admins` vía service_role / SQL).
    // No hay registro abierto desde el panel: ser admin = estar en la allow-list.
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError('Email o contraseña incorrectos'); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="bg-[#1a1d23] p-8 rounded-lg border border-[#2a2d33] w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Directimport</h1>
          <p className="text-[#a0a0a8] mt-2">Panel de administración</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-[#a0a0a8] mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm text-[#a0a0a8] mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" required />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" className="w-full bg-[#d4a843] text-black font-semibold py-2 rounded hover:brightness-110 transition-all">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}
