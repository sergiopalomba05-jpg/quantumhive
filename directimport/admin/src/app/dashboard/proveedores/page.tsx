'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function ProveedoresPage() {
  const supabase = createClient()
  const [proveedores, setProveedores] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')

  const cargar = async () => {
    const { data } = await supabase.from('proveedores').select('*').order('nombre')
    setProveedores(data ?? [])
  }

  useEffect(() => { cargar() }, [])

  const agregar = async () => {
    if (!nombre.trim()) return
    await supabase.from('proveedores').insert({ nombre: nombre.trim(), contacto: contacto.trim() })
    setNombre('')
    setContacto('')
    cargar()
  }

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar proveedor?')) return
    await supabase.from('proveedores').delete().eq('id', id)
    cargar()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Proveedores</h1>

      <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg p-4 mb-6">
        <div className="flex gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del proveedor" className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" />
          <input value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Contacto (opcional)" className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-3 py-2 text-white focus:border-[#d4a843] focus:outline-none" />
          <button onClick={agregar} className="bg-[#d4a843] text-black px-4 py-2 rounded font-semibold hover:brightness-110">Agregar</button>
        </div>
      </div>

      <div className="bg-[#1a1d23] border border-[#2a2d33] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a2d33]">
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-[#a0a0a8] text-sm font-medium">Contacto</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p.id} className="border-b border-[#2a2d33] hover:bg-[#2a2d33]/50">
                <td className="px-4 py-3 text-white">{p.nombre}</td>
                <td className="px-4 py-3 text-[#a0a0a8]">{p.contacto || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => eliminar(p.id)} className="text-red-400 text-sm hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
