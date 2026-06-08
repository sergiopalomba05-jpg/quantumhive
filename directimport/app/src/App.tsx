import { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Rubro = { id: number; nombre: string }
type SubFiltro = { id: number; rubro_id: number; parent_id: number | null; nombre: string }
type Producto = {
  id: number; nombre: string; precio_base: number
  metricas: { nombre: string; valor: number }[]
  estado_stock: boolean; fotos: string[]; descripcion: string
  rubro_id: number; sub_filtro_id: number | null
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
  const [vista, setVista] = useState<'catalogo' | 'carrito' | 'checkout'>('catalogo')
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [exito, setExito] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const installPromptRef = useRef<any>(null)

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
  }, [])

  useEffect(() => {
    if (!rubroActivo) return
    supabase.from('sub_filtros').select('*').eq('rubro_id', rubroActivo).eq('activo', true).order('orden').then(({ data }) => {
      setTodosSf(data ?? [])
    })
  }, [rubroActivo])

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

  const productosFiltrados = rubroActivo
    ? productos.filter((p) => p.rubro_id === rubroActivo)
        .filter((p) => !idsFiltro || (p.sub_filtro_id && idsFiltro.includes(p.sub_filtro_id)))
    : []

  const totalItems = cart.reduce((sum, i) => sum + i.cantidad, 0)
  const totalPrecio = cart.reduce((sum, i) => sum + i.cantidad * Number(i.producto.precio_base), 0)

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
    const { error } = await supabase.from('pedidos').insert({
      nombre: nombre.trim(),
      whatsapp: whatsapp.trim(),
      direccion: direccion.trim() || null,
      notas: notas.trim() || null,
      items: cart.map((i) => ({
        id: i.producto.id,
        nombre: i.producto.nombre,
        cantidad: i.cantidad,
        precio: i.producto.precio_base,
      })),
      total: totalPrecio,
    })
    setEnviando(false)
    if (!error) {
      setExito(true)
      setCart([])
    }
  }

  if (exito) {
    return (
      <div className="app">
        <div className="exito-screen">
          <div className="exito-icon">✓</div>
          <h2>Pedido enviado</h2>
          <p>Te vamos a contactar pronto por WhatsApp para coordinar el pago y la entrega.</p>
          <button className="btn-primary" onClick={() => { setExito(false); setVista('catalogo'); setNombre(''); setWhatsapp(''); setDireccion(''); setNotas('') }}>
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
                  <p className="cart-item-precio">${Number(item.producto.precio_base).toLocaleString('es-AR')}</p>
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
        <h1 className="logo">Directimport</h1>
        <button className="cart-icon" onClick={() => setVista('carrito')}>
          🛒
          {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
        </button>
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
                <p className="producto-precio">${Number(p.precio_base).toLocaleString('es-AR')}</p>
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
              <button className="btn-add-cart" onClick={() => agregarAlCarrito(p)}>
                Agregar
              </button>
            </div>
          ))}
          {productosFiltrados.length === 0 && (
            <p className="empty">No hay productos en esta categoría</p>
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active">Catálogo</button>
        <button className="nav-item">Ofertas</button>
        <button className="nav-item">Mis pedidos</button>
        <button className="nav-item" onClick={() => setVista('carrito')}>
          Carrito ({totalItems})
        </button>
      </nav>
    </div>
  )
}

export default App
