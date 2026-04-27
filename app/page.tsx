'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Producto {
  id: number
  nombre: string
  precio: number
  categoria: string
  imagenes: string[]
  descripcion?: string
  stock: number
}

interface ItemCarrito extends Producto {
  cantidad: number
}

const DetailCarousel = ({ images }: { images: string[], id: number }) => {
  const [current, setCurrent] = useState(0)
  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px] flex items-center justify-center bg-gray-50/50">
      <motion.img
        key={current}
        src={images[current]}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <button onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (prev - 1 + images.length) % images.length) }}
            className="bg-white/90 p-3 rounded-full shadow-sm">
            <svg width="18" height="18" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (prev + 1) % images.length) }}
            className="bg-white/90 p-3 rounded-full shadow-sm">
            <svg width="18" height="18" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null)
  const [cartItems, setCartItems] = useState<ItemCarrito[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ id: string, phone: string } | null>(null)
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  const fetchProductos = useCallback(async () => {
    const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: false })
    if (!error) setProductos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProductos() }, [fetchProductos])

  const addToCart = (producto: Producto) => {
    if (producto.stock <= 0) return
    setCartItems(prev => {
      const existing = prev.find(item => item.id === producto.id)
      if (existing) {
        if (existing.cantidad >= producto.stock) return prev
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item)
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
    setSelectedProduct(null)
    setIsCartOpen(true)
  }

  const removeFromCart = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id))
  }

  const enviarNotificacionWhatsApp = async (numeroGestion: string, nombre: string, total: number, telefono: string, resumen: string) => {
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroGestion, nombre, total, telefono, resumen }),
      });
    } catch (error) { console.error(error); }
  };

  const finalizarCompra = async () => {
    if (cartItems.length === 0 || !nombreCliente || !telefonoCliente) return;
    setIsProcessing(true);
    const numeroGestion = `AE-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalVenta = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const resumenPedido = cartItems.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    try {
      const { error: errorCompra } = await supabase.from('compras').insert([{
        numero_gestion: numeroGestion,
        nombre_cliente: nombreCliente,
        telefono_cliente: telefonoCliente,
        nombre_producto: resumenPedido,
        total: totalVenta
      }]);
      if (errorCompra) throw errorCompra;
      for (const item of cartItems) {
        await supabase.rpc('decrement_stock', { row_id: item.id, quantity: item.cantidad });
      }
      await enviarNotificacionWhatsApp(numeroGestion, nombreCliente, totalVenta, telefonoCliente, resumenPedido);
      setOrderSuccess({ id: numeroGestion, phone: telefonoCliente });
      setCartItems([]); setNombreCliente(''); setTelefonoCliente(''); setIsCartOpen(false);
      fetchProductos();
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const totalCart = useMemo(() => cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0), [cartItems]);
  const totalArticulos = useMemo(() => cartItems.reduce((acc, item) => acc + item.cantidad, 0), [cartItems]);

  if (loading) return <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center font-serif tracking-[0.3em] uppercase italic text-gray-400">Aura Élégance...</div>

  return (
    <main className="min-h-screen bg-[#fdfaf5] text-black">
      {/* Header Estilizado */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-8 bg-white/40 backdrop-blur-md sticky top-0 z-50">
        <div className="w-10"></div>
        <h1 className="text-xl md:text-3xl font-serif tracking-[0.25em] uppercase italic text-center leading-none">AURA ÉLÉGANCE</h1>
        <button onClick={() => setIsCartOpen(true)} className="relative p-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="black" className="w-8 h-8">
            <path d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          {totalArticulos > 0 && (
            <span className="absolute top-0 right-0 bg-black text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{totalArticulos}</span>
          )}
        </button>
      </nav>

      {/* Grid de Productos con Estilo de Panel */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12">
        {productos.map((item) => (
          <motion.div key={item.id} layoutId={`product-${item.id}`} onClick={() => setSelectedProduct(item)} 
            className="bg-white/60 p-4 md:p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all cursor-pointer border border-white/20">
            <div className="aspect-[3/4] overflow-hidden rounded-[2rem] bg-gray-100 mb-6">
              <motion.img layoutId={`img-${item.id}`} src={item.imagenes[0]} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">{item.categoria}</p>
              <h2 className="font-serif text-base md:text-2xl">{item.nombre}</h2>
              <p className="text-sm md:text-lg font-light text-gray-500 italic">Q{item.precio.toFixed(2)}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Modal Detalle - Estilo Premium */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <motion.div layoutId={`product-${selectedProduct.id}`} className="bg-white w-full max-w-6xl rounded-t-[3rem] md:rounded-[3.5rem] overflow-hidden relative z-10 flex flex-col md:flex-row shadow-2xl max-h-[95vh] md:max-h-none overflow-y-auto">
              <div className="w-full md:w-1/2 h-[400px] md:h-auto">
                <DetailCarousel images={selectedProduct.imagenes} id={selectedProduct.id} />
              </div>
              <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center relative">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-8 right-8 text-black bg-gray-100 p-2 rounded-full">✕</button>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">{selectedProduct.categoria}</p>
                  <span className={`text-[10px] font-bold px-4 py-1.5 rounded-full ${selectedProduct.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {selectedProduct.stock} DISPONIBLES
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-serif mb-4 leading-tight">{selectedProduct.nombre}</h2>
                <p className="text-2xl md:text-3xl font-light mb-8 italic text-gray-600">Q{selectedProduct.precio.toFixed(2)}</p>
                <p className="text-gray-400 text-sm leading-relaxed italic mb-12 border-l-2 border-gray-100 pl-6">{selectedProduct.descripcion || "Diseño exclusivo de la colección Aura Élégance."}</p>
                <button onClick={() => addToCart(selectedProduct)} className="w-full bg-black text-white py-6 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                  Añadir a mi selección
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Carrito Lateral con Inputs de la Imagen */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[110]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-md bg-[#fdfaf5] z-[120] shadow-2xl flex flex-col p-6 md:p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-lg font-serif uppercase tracking-[0.2em]">Mi Carrito</h2>
                <button onClick={() => setIsCartOpen(false)} className="bg-white p-2 rounded-full shadow-sm">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center bg-white p-4 rounded-[1.5rem] shadow-sm">
                    <img src={item.imagenes[0]} className="w-16 h-20 object-cover rounded-xl" />
                    <div className="flex-1"><h3 className="text-sm font-serif">{item.nombre}</h3><p className="text-[10px] text-gray-400">Q{item.precio} x {item.cantidad}</p></div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-300 hover:text-red-500">✕</button>
                  </div>
                ))}
                {cartItems.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Datos de Entrega</p>
                    <input type="text" placeholder="Tu Nombre" className="w-full p-5 bg-white rounded-[1.5rem] text-sm shadow-sm outline-none border border-transparent focus:border-black/5 transition-all" value={nombreCliente} onChange={(e)=>setNombreCliente(e.target.value)} />
                    <input type="tel" placeholder="WhatsApp (ej: 502...)" className="w-full p-5 bg-white rounded-[1.5rem] text-sm shadow-sm outline-none border border-transparent focus:border-black/5 transition-all" value={telefonoCliente} onChange={(e)=>setTelefonoCliente(e.target.value)} />
                  </div>
                )}
              </div>
              {cartItems.length > 0 && (
                <div className="pt-8 space-y-6">
                  <div className="flex justify-between items-end"><span className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Total a Pagar</span><span className="text-3xl font-serif italic">Q{totalCart.toFixed(2)}</span></div>
                  <button onClick={finalizarCompra} disabled={isProcessing} className="w-full bg-black text-white py-6 rounded-full font-bold uppercase text-[10px] tracking-[0.2em] shadow-2xl disabled:bg-gray-300">
                    {isProcessing ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Éxito - Estilo de la Imagen 5 */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white max-w-sm w-full rounded-[3rem] p-12 text-center relative z-10 shadow-2xl">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h2 className="text-2xl font-serif mb-2 uppercase">¡Recibido!</h2>
              <p className="text-[10px] text-gray-400 mb-6 tracking-widest uppercase font-bold">Ref: {orderSuccess.id}</p>
              <p className="text-xs text-gray-500 italic leading-relaxed mb-8">Tu pedido ha sido registrado. Nos comunicaremos contigo vía WhatsApp a la brevedad.</p>
              <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-4 rounded-full text-[10px] font-bold tracking-widest uppercase">Entendido</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}