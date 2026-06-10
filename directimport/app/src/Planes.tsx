import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Plan = {
  id: number
  nombre: string
  precio: number
  permiso_editar_precios: boolean
  permiso_personalizar: boolean
  permiso_white_label: boolean
  permiso_ultra: boolean
}

function beneficios(p: Plan): string[] {
  const b = ['Compra mayorista del catálogo']
  if (p.permiso_editar_precios) b.push('Fijás tus propios precios')
  if (p.permiso_personalizar) b.push('Tu tienda con link + colores y logo')
  if (p.permiso_white_label) b.push('Sin marca Directimport (white-label)')
  if (p.permiso_ultra) b.push('Distribuidor con red propia')
  return b
}

export default function Planes({ revendedorId, email, planActual, onBack }: {
  revendedorId: number | null
  email: string
  planActual: number | null
  onBack: () => void
}) {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [cargando, setCargando] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.from('planes').select('*').eq('activo', true).order('precio').then(({ data }) => setPlanes(data ?? []))
  }, [])

  const suscribirse = async (planId: number) => {
    if (!revendedorId) { setMsg('Necesitás tu cuenta de revendedor para suscribirte.'); return }
    setCargando(planId)
    const { data } = await supabase.functions.invoke('crear-suscripcion', {
      body: { revendedor_id: revendedorId, plan_id: planId, email },
    })
    setCargando(null)
    const url = (data as any)?.init_point
    if (url) window.location.href = url
    else setMsg('No se pudo iniciar la suscripción ahora. Probá de nuevo en un rato.')
  }

  return (
    <div className="app">
      <div className="header-between">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <h1 className="logo">Planes</h1>
        <div />
      </div>
      {msg && <div className="toast">{msg}</div>}
      <div style={{ padding: 16, display: 'grid', gap: 14 }}>
        {planes.map((p) => (
          <div key={p.id} style={{ background: '#1a1a1a', border: p.id === planActual ? '2px solid #d4a843' : '1px solid #2a2a2a', borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ color: '#d4a843', margin: 0 }}>{p.nombre}</h3>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
                ${Number(p.precio).toLocaleString('es-AR')}<span style={{ fontSize: 12, color: '#888' }}>/mes</span>
              </span>
            </div>
            <ul style={{ color: '#ccc', fontSize: 13, margin: '12px 0', paddingLeft: 18 }}>
              {beneficios(p).map((b, i) => <li key={i} style={{ marginBottom: 4 }}>{b}</li>)}
            </ul>
            {p.id === planActual ? (
              <button className="btn-sm btn-sm-active" disabled style={{ width: '100%' }}>Tu plan actual</button>
            ) : (
              <button className="btn-primary btn-full" disabled={cargando === p.id} onClick={() => suscribirse(p.id)}>
                {cargando === p.id ? 'Abriendo...' : `Suscribirme a ${p.nombre}`}
              </button>
            )}
          </div>
        ))}
        {planes.length === 0 && <p className="empty">Cargando planes...</p>}
      </div>
    </div>
  )
}
