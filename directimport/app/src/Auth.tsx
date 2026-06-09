import { useState } from 'react'
import { supabase } from './lib/supabase'

type Props = {
  onLogin: () => void
}

export default function Auth({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      if (modo === 'registro') {
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) { setError(signUpErr.message); return }
        if (!data.user) { setError('Error al crear usuario'); return }

        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase()
        const { error: revErr } = await supabase.from('revendedores').insert({
          user_id: data.user.id,
          codigo_unico: codigo,
          plan_id: 1,
          nombre_negocio: nombre || 'Mi negocio',
          whatsapp,
        })
        if (revErr) { setError('Error: ' + revErr.message); return }
        setError('Solicitud enviada. Confirmá tu email; tu cuenta queda pendiente de aprobación y te avisamos cuando puedas empezar a vender.')
        setModo('login')
      } else {
        const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
        if (authErr) { setError('Email o contraseña incorrectos'); return }
        onLogin()
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="logo" style={{ textAlign: 'center', marginBottom: 8 }}>Directimport</h1>
        <p className="auth-sub">{modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta de revendedor'}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
          />
          <input
            type="password" placeholder="Contraseña" value={password}
            onChange={e => setPassword(e.target.value)} required
          />
          {modo === 'registro' && (
            <>
              <input
                type="text" placeholder="Nombre de tu negocio" value={nombre}
                onChange={e => setNombre(e.target.value)} required
              />
              <input
                type="tel" placeholder="WhatsApp" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </>
          )}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary auth-btn" disabled={cargando}>
            {cargando ? 'Espera...' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-toggle">
          {modo === 'login' ? (
            <>¿No tenés cuenta? <button onClick={() => setModo('registro')}>Registrate</button></>
          ) : (
            <>¿Ya tenés cuenta? <button onClick={() => setModo('login')}>Ingresá</button></>
          )}
        </p>
      </div>
    </div>
  )
}
