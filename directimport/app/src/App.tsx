import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import MiTienda from './MiTienda'
import Planes from './Planes'
import './App.css'

type Rubro = { id: number; nombre: string }
type SubFiltro = { id: number; rubro_id: number; parent_id: number | null; nombre: string }
type Producto = {
  id: number; nombre: string; precio_base: number
  metricas: { nombre: string; valor: number }[]
  estado_stock: boolean; fotos: string[]; descripcion: string
  rubro_id: number; sub_filtro_id: number | null
  video: string | null; descripcion_detallada: string | null
}
type Revendedor = {
  id: number; user_id: string; codigo_unico: string; nombre_negocio: string
  plan_id: number; logo_url: string | null; colores: any; whatsapp: string | null
  estado: string
}
type CartItem = { producto: Producto; cantidad: number }

const CART_KEY = 'directimport_cart'

function cargarCarrito(): CartItem[] {
  try {
    const data = localStorage.getItem(CART_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

function App() {
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [todosSf, setTodosSf] = useState<SubFiltro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [rubroActivo, setRubroActivo] = useState<number | null>(null)
  const [ruta, setRuta] = useState<{ id: number | null; nombre: string }[]>([])
  const [cart, setCart] = useState<CartItem[]>(cargarCarrito)
  type Vista = 'catalogo' | 'carrito' | 'checkout' | 'auth' | 'mitienda' | 'pedidos' | 'perfil' | 'planes'
  const [vista, setVista] = useState<Vista>('catalogo')
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [exitoRef, setExitoRef] = useState('')
  const [showInstall, setShowInstall] = useState(false)
  const installPromptRef = useRef<any>(null)
  const [session, setSession] = useState<any>(null)
  const [revendedor, setRevendedor] = useState<Revendedor | null>(null)
  const [linkRev, setLinkRev] = useState<Revendedor | null>(null)
  const [preciosLink, setPreciosLink] = useState<Record<number, { precio_unitario: number; precio_pack_6: number | null }>>({})
  const [misPedidos, setMisPedidos] = useState<any[]>([])
  const [productoDetalle, setProductoDetalle] = useState<Producto | null>(null)
  const [fotoActual, setFotoActual] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const [pedidoExpandido, setPedidoExpandido] = useState<number | null>(null)
  const [pedidoExitoId, setPedidoExitoId] = useState<number | null>(null)
  const [itemsExito, setItemsExito] = useState<{ nombre: string; cantidad: number; precio: number }[]>([])
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      installPromptRef.current = e
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setShowInstall(false)
    }
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!installPromptRef.current) return
    installPromptRef.current.prompt()
    const { outcome } = await installPromptRef.current.userChoice
    if (outcome === 'accepted') setShowInstall(false)
    installPromptRef.current = null
  }

  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cart)) }, [cart])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const codigo = params.get('r')

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })

    if (codigo) {
      supabase.from('revendedores').select('*').eq('codigo_unico', codigo.toUpperCase()).single().then(({ data: r }) => {
        if (r) {
          setLinkRev(r)
          supabase.from('productos_revendedor').select('*').eq('revendedor_id', r.id).then(({ data: pre }) => {
            const pm: Record<number, { precio_unitario: number; precio_pack_6: number | null }> = {}
            ;(pre ?? []).forEach((p: any) => { pm[p.producto_id] = { precio_unitario: p.precio_unitario, precio_pack_6: p.precio_pack_6 } })
            setPreciosLink(pm)
          })
          if (r.colores) {
            const c = typeof r.colores === 'string' ? JSON.parse(r.colores) : r.colores
            if (c.primario) document.documentElement.style.setProperty('--color-accent', c.primario)
            if (c.fondo) document.documentElement.style.setProperty('--color-bg', c.fondo)
            if (c.texto) document.documentElement.style.setProperty('--color-text', c.texto)
          }
        }
      })
    }

    Promise.all([
      supabase.from('rubros').select('*').eq('activo', true).order('orden'),
      supabase.from('productos').select('*').eq('activo', true).eq('estado_stock', true),
    ]).then(([{ data: r }, { data: p }]) => {
      setRubros(r ?? [])
      setProductos(p ?? [])
      if (r && r.length > 0) {
        setRubroActivo(r[0].id)
        setRuta([{ id: r[0].id, nombre: r[0].nombre }])
      }
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) {
      supabase.from('revendedores').select('*').eq('user_id', session.user.id).single().then(({ data: r }) => {
        setRevendedor(r)
      })
    } else {
      setRevendedor(null)
    }
  }, [session])

  const precioProducto = (p: Producto) => preciosLink[p.id] !== undefined ? preciosLink[p.id].precio_unitario : p.precio_base

  useEffect(() => {
    if (!rubroActivo) return
    supabase.from('sub_filtros').select('*').eq('rubro_id', rubroActivo).eq('activo', true).order('orden').then(({ data }) => {
      setTodosSf(data ?? [])
    })
  }, [rubroActivo])

  useEffect(() => {
    if (vista === 'pedidos' && revendedor && revendedor.plan_id >= 2) {
      supabase.from('pedidos').select('*').eq('revendedor_id', revendedor.id).order('created_at', { ascending: false }).then(({ data }) => setMisPedidos(data ?? []))
    }
  }, [vista, revendedor])

  const hijosDe = (parentId: number | null) =>
    todosSf.filter((sf) => sf.parent_id == parentId)

  const ultimoNivel = ruta.length > 0 ? ruta[ruta.length - 1] : null
  const esNodoRaiz = ruta.length === 1
  const opciones = esNodoRaiz
    ? hijosDe(null)
    : ultimoNivel ? hijosDe(ultimoNivel.id) : []

  const obtenerIdsHijos = (id: number): number[] => {
    const hijos = todosSf.filter((sf) => sf.parent_id === id)
    return [id, ...hijos.flatMap((h) => obtenerIdsHijos(h.id))]
  }

  const seleccionar = (id: number | null, nombre: string) => {
    const nuevoIdx = ruta.findIndex((r) => r.id === id)
    if (nuevoIdx >= 0) {
      setRuta(ruta.slice(0, nuevoIdx + 1))
    } else {
      setRuta([...ruta, { id, nombre }])
    }
  }

  const navegarRubro = (id: number) => {
    setRubroActivo(id)
    setRuta([{ id, nombre: rubros.find((r) => r.id === id)?.nombre ?? '' }])
  }

  const subFiltroFiltro = ruta.length > 1 ? ruta[ruta.length - 1].id : null
  const idsFiltro = subFiltroFiltro ? obtenerIdsHijos(subFiltroFiltro) : null

  const linkProdIds = linkRev ? Object.keys(preciosLink).map(Number) : null

  const productosFiltrados = rubroActivo
    ? productos.filter((p) => p.rubro_id === rubroActivo)
        .filter((p) => !idsFiltro || (p.sub_filtro_id && idsFiltro.includes(p.sub_filtro_id)))
        .filter((p) => !linkProdIds || linkProdIds.includes(p.id))
    : []

  const totalItems = cart.reduce((sum, i) => sum + i.cantidad, 0)
  const totalPrecio = cart.reduce((sum, i) => sum + i.cantidad * Number(precioProducto(i.producto)), 0)

  const agregarAlCarrito = (producto: Producto) => {
    setCart((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id)
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { producto, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.producto.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i
      ).filter((i) => i.cantidad > 0)
    )
  }

  const eliminarDelCarrito = (id: number) => {
    setCart((prev) => prev.filter((i) => i.producto.id !== id))
  }

  const enviarPedido = async () => {
    if (!nombre.trim() || !whatsapp.trim()) return
    setEnviando(true)
    // RPC crear_pedido: crea el pedido + sus líneas (pedido_items con proveedor_id)
    // de forma atómica y devuelve el id, sin exponer la lectura de pedidos al anónimo.
    const { data, error } = await supabase.rpc('crear_pedido', {
      p_nombre: nombre.trim(),
      p_whatsapp: whatsapp.trim(),
      p_total: totalPrecio,
      p_items: cart.map((i) => ({
        id: i.producto.id,
        nombre: i.producto.nombre,
        cantidad: i.cantidad,
        precio: precioProducto(i.producto),
      })),
      p_revendedor_id: linkRev ? linkRev.id : null,
      p_direccion: direccion.trim() || null,
      p_notas: notas.trim() || null,
    })
    setEnviando(false)
    if (!error) {
      setExito(true)
      setExitoRef('#' + (data ? String(data) : Date.now().toString(36).slice(-4).toUpperCase()))
      setPedidoExitoId(data ?? null)
      setItemsExito(cart.map((i) => ({ nombre: i.producto.nombre, cantidad: i.cantidad, precio: Number(precioProducto(i.producto)) })))
      setCart([])
    }
  }

  const pagarConMP = async () => {
    if (!pedidoExitoId) return
    setPagando(true)
    const { data } = await supabase.functions.invoke('crear-preferencia-pedido', {
      body: { pedido_id: pedidoExitoId, items: itemsExito, nombre },
    })
    setPagando(false)
    const url = (data as any)?.init_point || (data as any)?.sandbox_init_point
    if (url) window.location.href = url
    else alert('No se pudo iniciar el pago online. Coordinamos por WhatsApp y te ayudamos.')
  }

  if (vista === 'auth') {
    return <Auth onLogin={() => setVista('catalogo')} />
  }

  if (vista === 'mitienda' && session?.user) {
    return <MiTienda userId={session.user.id} onBack={() => setVista('catalogo')} />
  }

  if (vista === 'planes' && session?.user) {
    return <Planes revendedorId={revendedor?.id ?? null} email={session.user.email ?? ''} planActual={revendedor?.plan_id ?? null} onBack={() => setVista('perfil')} />
  }

  const coloresEstado: Record<string, string> = {
    pendiente: '#d4a843', confirmado: '#4a9eff', enviado: '#a855f7', entregado: '#4caf50', cancelado: '#ef4444',
  }

  if (vista === 'pedidos') {
    const tieneTienda = revendedor && revendedor.plan_id >= 2
    return (
      <div className="app">
        <div className="header-between">
          <button className="btn-back" onClick={() => setVista('catalogo')}>← Volver</button>
          <h1 className="logo">Mis Pedidos</h1>
          <button className="btn-sm" onClick={() => {
            if (revendedor) supabase.from('pedidos').select('*').eq('revendedor_id', revendedor.id).order('created_at', { ascending: false }).then(({ data }) => setMisPedidos(data ?? []))
          }}>↻</button>
        </div>
        {tieneTienda && misPedidos.length > 0 ? (
          <div style={{ padding: 16 }}>
            {misPedidos.map(p => {
              const expandido = pedidoExpandido === p.id
              return (
                <div key={p.id} className="pedido-card" onClick={() => setPedidoExpandido(expandido ? null : p.id)}>
                  <div className="pedido-card-header">
                    <div className="pedido-card-left">
                      <span className="pedido-fecha">{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
                      <span className="pedido-cliente">{p.nombre}</span>
                    </div>
                    <span className="pedido-estado" style={{ background: coloresEstado[p.estado] || '#888', color: '#000' }}>{p.estado}</span>
                  </div>
                  <div className="pedido-card-body">
                    <span>{p.items?.length || 0} items</span>
                    <span className="pedido-total">${Number(p.total).toLocaleString('es-AR')}</span>
                  </div>
                  {expandido && (
                    <div className="pedido-card-detalle">
                      <div className="pedido-detalle-row"><span>WhatsApp:</span><a href={`https://wa.me/${p.whatsapp}`} className="link">{p.whatsapp}</a></div>
                      {p.direccion && <div className="pedido-detalle-row"><span>Direccion:</span><span>{p.direccion}</span></div>}
                      {p.notas && <div className="pedido-detalle-row"><span>Notas:</span><span>{p.notas}</span></div>}
                      <div className="pedido-items-list">
                        {(p.items || []).map((item: any, i: number) => (
                          <div key={i} className="pedido-item-row">
                            <span className="pedido-item-nombre">{item.nombre}</span>
                            <span className="pedido-item-cant">x{item.cantidad}</span>
                            <span className="pedido-item-precio">${Number(item.precio * item.cantidad).toLocaleString('es-AR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pedido-card-expand">{expandido ? '▲ menos' : '▼ ver detalle'}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            <p>{tieneTienda ? 'Todavia no recibiste pedidos.' : 'Proximamente vas a poder ver tus pedidos aca.'}</p>
            <p style={{ marginTop: 8, fontSize: 13 }}>Comparti tu link con tus clientes para empezar a vender.</p>
          </div>
        )}
      </div>
    )
  }

  if (vista === 'perfil' && session?.user) {
    return (
      <div className="app">
        <div className="header-between">
          <button className="btn-back" onClick={() => setVista('catalogo')}>← Volver</button>
          <h1 className="logo">Perfil</h1>
          <div />
        </div>
        <div className="perfil-screen">
          {revendedor && (
            <>
              {revendedor.estado !== 'activo' && (
                <p style={{ background: '#2a2410', border: '1px solid #d4a843', borderRadius: 8, padding: 10, color: '#d4a843', fontSize: 13 }}>
                  {revendedor.estado === 'pendiente_aprobacion' && '⏳ Tu cuenta está pendiente de aprobación. Te avisamos cuando puedas empezar a vender.'}
                  {revendedor.estado === 'pago_pendiente' && '💳 Tu cuenta fue aprobada. Falta confirmar el pago para activarla.'}
                  {revendedor.estado === 'rechazado' && '❌ Tu solicitud fue rechazada. Escribinos para más información.'}
                  {revendedor.estado === 'suspendido' && '⏸️ Tu cuenta está suspendida. Reactivá tu suscripción para recuperar tu tienda.'}
                  {revendedor.estado === 'aprobado' && '✅ Tu cuenta fue aprobada. En breve se activa tu tienda.'}
                </p>
              )}
              <p><strong>Negocio:</strong> {revendedor.nombre_negocio}</p>
              <p><strong>Codigo:</strong> {revendedor.codigo_unico}</p>
              <p><strong>Plan:</strong> {['Básico', 'Pro', 'Pro Plus', 'Ultra'][(revendedor.plan_id || 1) - 1]}</p>
              <p style={{ fontSize: 12, color: '#888', marginTop: -4 }}>
                {revendedor.plan_id === 1 && 'Compra mayorista sin tienda propia'}
                {revendedor.plan_id === 2 && 'Fija tus precios + link de tienda'}
                {revendedor.plan_id >= 3 && 'Tienda personalizada con colores y marca'}
              </p>
              <p><strong>Email:</strong> {session.user.email}</p>
              {revendedor.whatsapp && <p><strong>WhatsApp:</strong> {revendedor.whatsapp}</p>}
            </>
          )}
          {!revendedor && <p>Email: {session.user.email}</p>}
          {revendedor && (
            <button className="btn-primary btn-full" style={{ marginTop: 20 }} onClick={() => setVista('planes')}>
              Ver planes y suscripción
            </button>
          )}
          <button className="btn-primary btn-full" style={{ marginTop: 12 }} onClick={async () => { await supabase.auth.signOut(); setRevendedor(null); setVista('catalogo') }}>
            Cerrar sesion
          </button>
        </div>
      </div>
    )
  }

  if (exito) {
    return (
      <div className="app">
        <div className="exito-screen">
          <div className="exito-icon">✓</div>
          <h2>Pedido enviado</h2>
          <p>Pedido {exitoRef} registrado. Pagá ahora online o coordinamos por WhatsApp el pago y la entrega.</p>
          {pedidoExitoId && (
            <button className="btn-primary btn-full" disabled={pagando} onClick={pagarConMP} style={{ marginBottom: 10 }}>
              {pagando ? 'Abriendo pago...' : '💳 Pagar con Mercado Pago'}
            </button>
          )}
          <button className="btn-primary" onClick={() => { setExito(false); setExitoRef(''); setPedidoExitoId(null); setVista('catalogo'); setNombre(''); setWhatsapp(''); setDireccion(''); setNotas('') }}>
            Seguir comprando
          </button>
        </div>
      </div>
    )
  }

  if (vista === 'carrito') {
    return (
      <div className="app">
        {showInstall && (
          <div className="install-banner">
            <span>Instalá Directimport en tu celular para acceso rapido</span>
            <button className="install-btn" onClick={handleInstall}>Instalar</button>
            <button className="install-close" onClick={() => setShowInstall(false)}>✕</button>
          </div>
        )}
        <div className="header-between">
          <button className="btn-back" onClick={() => setVista('catalogo')}>← Volver</button>
          <h1 className="logo">Carrito</h1>
          <div />
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>El carrito está vacío</p>
            <button className="btn-primary" onClick={() => setVista('catalogo')}>Ir al catálogo</button>
          </div>
        ) : (
          <div className="cart-list">
            {cart.map((item) => (
              <div key={item.producto.id} className="cart-item">
                <div className="cart-item-img">
                  {item.producto.fotos?.[0] ? (
                    <img src={item.producto.fotos[0]} alt={item.producto.nombre} />
                  ) : (
                    <div className="producto-placeholder">📦</div>
                  )}
                </div>
                <div className="cart-item-info">
                  <h4>{item.producto.nombre}</h4>
                  <p className="cart-item-precio">${Number(precioProducto(item.producto)).toLocaleString('es-AR')}</p>
                </div>
                <div className="cart-item-cantidad">
                  <button onClick={() => cambiarCantidad(item.producto.id, -1)}>-</button>
                  <span>{item.cantidad}</span>
                  <button onClick={() => cambiarCantidad(item.producto.id, 1)}>+</button>
                </div>
                <button className="cart-item-remove" onClick={() => eliminarDelCarrito(item.producto.id)}>✕</button>
              </div>
            ))}

            <div className="cart-total">
              <span>Total</span>
              <span className="cart-total-price">${totalPrecio.toLocaleString('es-AR')}</span>
            </div>

            <button className="btn-primary btn-full" onClick={() => setVista('checkout')}>
              Finalizar pedido
            </button>
          </div>
        )}
      </div>
    )
  }

  if (vista === 'checkout') {
    return (
      <div className="app">
        {showInstall && (
          <div className="install-banner">
            <span>Instalá Directimport en tu celular para acceso rapido</span>
            <button className="install-btn" onClick={handleInstall}>Instalar</button>
            <button className="install-close" onClick={() => setShowInstall(false)}>✕</button>
          </div>
        )}
        <div className="header-between">
          <button className="btn-back" onClick={() => setVista('carrito')}>← Volver</button>
          <h1 className="logo">Checkout</h1>
          <div />
        </div>

        <form className="checkout-form" onSubmit={(e) => { e.preventDefault(); enviarPedido() }}>
          <label>
            Nombre *
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
          </label>
          <label>
            WhatsApp *
            <input required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+54 11 1234 5678" />
          </label>
          <label>
            Dirección
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, altura, localidad" />
          </label>
          <label>
            Notas
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Alguna nota para el pedido" rows={3} />
          </label>

          <div className="checkout-resumen">
            <p>Items: {totalItems}</p>
            <p className="checkout-total">Total: ${totalPrecio.toLocaleString('es-AR')}</p>
          </div>

          <button className="btn-primary btn-full" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Confirmar pedido'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="app">
      {showInstall && (
        <div className="install-banner">
          <span>Instalá Directimport en tu celular para acceso rapido</span>
          <button className="install-btn" onClick={handleInstall}>Instalar</button>
          <button className="install-close" onClick={() => setShowInstall(false)}>✕</button>
        </div>
      )}
      <div className="header-between">
        <div className="logo-area">
          {linkRev?.logo_url && (
            <img src={linkRev.logo_url} alt={linkRev.nombre_negocio} className="header-logo" />
          )}
          <h1 className="logo">{linkRev?.nombre_negocio || 'Directimport'}</h1>
        </div>
        <div className="header-right">
          {session ? (
            <button className="btn-user" onClick={() => setVista('perfil')}>
              {revendedor?.nombre_negocio?.substring(0, 2).toUpperCase() || '👤'}
            </button>
          ) : linkRev ? null : (
            <button className="btn-user" onClick={() => setVista('auth')}>Ingresar</button>
          )}
          <button className="cart-icon" onClick={() => setVista('carrito')}>
            🛒
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </button>
        </div>
      </div>

      <section className="rubros-nav">
        {rubros.map((r) => (
          <button
            key={r.id}
            onClick={() => navegarRubro(r.id)}
            className={`rubro-btn ${rubroActivo === r.id ? 'active' : ''}`}
          >
            {r.nombre}
          </button>
        ))}
      </section>

      {ruta.length > 1 && (
        <section className="breadcrumb">
          {ruta.map((n, i) => (
            <span key={i}>
              {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
              <button className="breadcrumb-link" onClick={() => seleccionar(n.id, n.nombre)}>
                {n.nombre}
              </button>
            </span>
          ))}
        </section>
      )}

      {opciones.length > 0 && (
        <section className="subfiltros-nav">
          {ruta.length > 1 && (
            <button
              onClick={() => seleccionar(ruta[ruta.length - 2].id, ruta[ruta.length - 2].nombre)}
              className="subfiltro-btn"
            >
              ← Volver
            </button>
          )}
          {opciones.map((sf) => (
            <button
              key={sf.id}
              onClick={() => seleccionar(sf.id, sf.nombre)}
              className={`subfiltro-btn ${ruta[ruta.length - 1]?.id === sf.id ? 'active' : ''}`}
            >
              {sf.nombre}
            </button>
          ))}
        </section>
      )}

      <main className="catalogo">
        <div className="productos-grid">
          {productosFiltrados.map((p) => (
            <div key={p.id} className="producto-card">
              <div className="producto-img">
                {p.fotos && p.fotos.length > 0 ? (
                  <img src={p.fotos[0]} alt={p.nombre} />
                ) : (
                  <div className="producto-placeholder">📦</div>
                )}
              </div>
              <div className="producto-info">
                <h3 className="producto-nombre">{p.nombre}</h3>
                <p className="producto-precio">${Number(precioProducto(p)).toLocaleString('es-AR')}</p>
                {p.descripcion && <p className="producto-desc">{p.descripcion}</p>}
                {p.metricas && p.metricas.length > 0 && (
                  <div className="producto-metricas">
                    {p.metricas.map((m, i) => (
                      <div key={i} className="metrica-row">
                        <span className="metrica-label">{m.nombre}</span>
                        <div className="metrica-bar-bg small">
                          <div className="metrica-bar" style={{ width: `${m.valor}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="producto-actions">
                <button className="btn-detail" onClick={() => { setProductoDetalle(p); setFotoActual(0) }}>
                  Ver detalle
                </button>
                <button className="btn-add-cart" onClick={() => agregarAlCarrito(p)}>
                  Agregar
                </button>
              </div>
            </div>
          ))}
          {productosFiltrados.length === 0 && (
            <p className="empty">No hay productos en esta categoría</p>
          )}
        </div>
      </main>

      {productoDetalle && (
        <div className="detalle-overlay" onClick={() => setProductoDetalle(null)}>
          <div className="detalle-modal" onClick={e => e.stopPropagation()}>
            <button className="detalle-close" onClick={() => setProductoDetalle(null)}>✕</button>

            <div className="detalle-carrusel"
              onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
              onTouchEnd={e => {
                const diff = touchStartX - e.changedTouches[0].clientX
                const fotos = productoDetalle.fotos || []
                if (Math.abs(diff) > 50) {
                  if (diff > 0 && fotoActual < fotos.length - 1) setFotoActual(fotoActual + 1)
                  else if (diff < 0 && fotoActual > 0) setFotoActual(fotoActual - 1)
                }
              }}>
              {(productoDetalle.fotos || []).length > 0 ? (
                <>
                  <img src={productoDetalle.fotos[fotoActual]} alt={productoDetalle.nombre} className="detalle-img" />
                  {(productoDetalle.fotos || []).length > 1 && (
                    <>
                      {fotoActual > 0 && <button className="carrusel-arrow left" onClick={() => setFotoActual(fotoActual - 1)}>◀</button>}
                      {fotoActual < (productoDetalle.fotos || []).length - 1 && <button className="carrusel-arrow right" onClick={() => setFotoActual(fotoActual + 1)}>▶</button>}
                      <div className="carrusel-dots">
                        {productoDetalle.fotos.map((_, i) => (
                          <span key={i} className={`dot ${i === fotoActual ? 'active' : ''}`} onClick={() => setFotoActual(i)} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="producto-placeholder" style={{ fontSize: 80, padding: 60, textAlign: 'center' }}>📦</div>
              )}
            </div>

            {productoDetalle.video && (
              <div className="detalle-video">
                <video src={productoDetalle.video} controls className="detalle-video-player" />
              </div>
            )}

            <div className="detalle-body">
              <h2 className="detalle-nombre">{productoDetalle.nombre}</h2>
              <p className="detalle-precio">${Number(precioProducto(productoDetalle)).toLocaleString('es-AR')}</p>

              {productoDetalle.descripcion && <p className="detalle-desc">{productoDetalle.descripcion}</p>}
              {productoDetalle.descripcion_detallada && <p className="detalle-desc-detallada">{productoDetalle.descripcion_detallada}</p>}

              {productoDetalle.metricas && productoDetalle.metricas.length > 0 && (
                <div className="detalle-metricas">
                  {productoDetalle.metricas.map((m, i) => (
                    <div key={i} className="metrica-row">
                      <span className="metrica-label">{m.nombre}</span>
                      <div className="metrica-bar-bg">
                        <div className="metrica-bar" style={{ width: `${m.valor}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-primary btn-full" onClick={() => { agregarAlCarrito(productoDetalle); setProductoDetalle(null) }}>
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        <button className="nav-item active" onClick={() => setVista('catalogo')}>Catalogo</button>
        {session && revendedor && revendedor.estado === 'activo' && (
          <button className="nav-item" onClick={() => setVista('mitienda')}>Mi Tienda</button>
        )}
        <button className="nav-item" onClick={() => setVista('pedidos')}>Mis pedidos</button>
        {session ? (
          <button className="nav-item" onClick={async () => { await supabase.auth.signOut(); setRevendedor(null); setVista('catalogo') }}>Salir</button>
        ) : linkRev ? null : (
          <button className="nav-item" onClick={() => setVista('auth')}>Ingresar</button>
        )}
      </nav>
      {linkRev && linkRev.plan_id < 3 && (
        <div className="powered-by">Powered by Directimport</div>
      )}
    </div>
  )
}

export default App
