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

// Optimización: Memoización del carrusel para evitar re-renders innecesarios
const DetailCarousel = ({ images }: { images: string[], id: number }) => {
  const [current, setCurrent] = useState(0)
  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center bg-gray-50">
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
            className="bg-white/90 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
            <svg width="20" height="20" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (prev + 1) % images.length) }}
            className="bg-white/90 p-2 rounded-full shadow-lg hover:scale-110 transition-transform">
            <svg width="20" height="20" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24"><path d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
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

  // Optimización: Uso de useCallback para funciones pesadas
  const fetchProductos = useCallback(async () => {
    const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: false })
    if (!error) setProductos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProductos()
  }, [fetchProductos])

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
  //APi para enviar mensaje de whatsapp
  // 1. Función de Notificación (Llama a tu API Route interna)
  const enviarNotificacionWhatsApp = async (numeroGestion: string, nombre: string, total: number, telefono: string, resumen: string) => {
    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          numeroGestion, 
          nombre, 
          total, 
          telefono, 
          resumen 
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        console.error("Error detallado de la API:", resData);
        return;
      }
      
      console.log("¡Notificaciones enviadas con éxito!", resData);
    } catch (error) {
      console.error("Error de conexión con la ruta /api/whatsapp:", error);
    }
  };

  // 2. Función de Proceso de Compra
  const finalizarCompra = async () => {
    if (cartItems.length === 0 || !nombreCliente || !telefonoCliente) return;
    setIsProcessing(true);

    const numeroGestion = `AE-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalVenta = cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const resumenPedido = cartItems.map(item => `${item.cantidad}x ${item.nombre}`).join(', ');

    try {
      // A. Guardar en Base de Datos (Supabase)
      const { error: errorCompra } = await supabase.from('compras').insert([{
        numero_gestion: numeroGestion,
        nombre_cliente: nombreCliente,
        telefono_cliente: telefonoCliente,
        nombre_producto: resumenPedido,
        total: totalVenta
      }]);
      
      if (errorCompra) throw errorCompra;

      // B. Actualizar Stock (RPC)
      for (const item of cartItems) {
        await supabase.rpc('decrement_stock', { row_id: item.id, quantity: item.cantidad });
      }

      // C. Disparar Notificaciones WhatsApp
      await enviarNotificacionWhatsApp(numeroGestion, nombreCliente, totalVenta, telefonoCliente, resumenPedido);

      // D. Feedback de Éxito al Usuario
      setOrderSuccess({ id: numeroGestion, phone: telefonoCliente });
      setCartItems([]); 
      setNombreCliente(''); 
      setTelefonoCliente(''); 
      setIsCartOpen(false);
      
      // E. Refrescar productos para ver stock actualizado
      fetchProductos();

    } catch (err) {
      console.error("Error en el flujo de compra:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Cálculos Memorizados (Performance)
  const totalCart = useMemo(() => cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0), [cartItems]);
  const totalArticulos = useMemo(() => cartItems.reduce((acc, item) => acc + item.cantidad, 0), [cartItems]);
  if (loading) return <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center font-serif tracking-widest uppercase italic">Aura Élégance...</div>

  return (
    <main className="min-h-screen bg-[#fdfaf5] text-black">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-10"></div>
        <h1 className="text-2xl font-serif tracking-[0.2em] uppercase italic">AURA ÉLÉGANCE</h1>
        <button onClick={() => setIsCartOpen(true)} className="relative p-2 group">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="black" className="w-7 h-7 group-hover:scale-110 transition-transform">
            <path d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          {totalArticulos > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-0 right-0 bg-black text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {totalArticulos}
            </motion.span>
          )}
        </button>
      </nav>

      {/* Grid Productos */}
      <section className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {productos.map((item) => (
          <motion.div key={item.id} layoutId={`product-${item.id}`} onClick={() => setSelectedProduct(item)} className="cursor-pointer group">
            <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-gray-100 mb-6 shadow-sm group-hover:shadow-xl transition-all duration-500">
              <motion.img layoutId={`img-${item.id}`} src={item.imagenes[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">{item.categoria}</p>
              <h2 className="font-serif text-xl mb-1">{item.nombre}</h2>
              <p className="text-sm font-light text-gray-600 italic">Q{item.precio.toFixed(2)}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* MODAL DE ÉXITO PERSONALIZADO (Nuevo) */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white max-w-sm w-full rounded-[2.5rem] p-10 text-center relative z-10 shadow-2xl">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 className="text-2xl font-serif mb-2 uppercase tracking-tighter">¡Pedido Exitoso!</h2>
              <p className="text-[10px] text-gray-400 mb-6 tracking-widest uppercase font-bold">Gestión: {orderSuccess.id}</p>
              <p className="text-sm text-gray-600 italic mb-8 leading-relaxed">
                Gracias por confiar en nosotros. Hemos enviado los detalles a tu WhatsApp <span className="font-bold">({orderSuccess.phone})</span>. Estaremos en contacto pronto.
              </p>
              <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-4 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors">Cerrar</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Los demás componentes (Carrito y Detalle) permanecen igual visualmente pero con lógica optimizada */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[120] shadow-2xl flex flex-col">
              <div className="p-8 border-b flex justify-between items-center">
                <h2 className="text-lg font-serif uppercase tracking-widest">Mi Selección</h2>
                <button onClick={() => setIsCartOpen(false)}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <img src={item.imagenes[0]} className="w-16 h-20 object-cover rounded-xl" />
                    <div className="flex-1">
                      <h3 className="text-sm font-serif">{item.nombre}</h3>
                      <p className="text-[10px] text-gray-400 uppercase">Q{item.precio} x {item.cantidad}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-[10px] text-red-400 font-bold uppercase">Quitar</button>
                  </div>
                ))}
                {cartItems.length > 0 && (
                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <input type="text" placeholder="Nombre Completo" className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none border border-transparent focus:border-black/10 transition-all" value={nombreCliente} onChange={(e)=>setNombreCliente(e.target.value)} />
                    <input type="tel" placeholder="WhatsApp" className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none border border-transparent focus:border-black/10 transition-all" value={telefonoCliente} onChange={(e)=>setTelefonoCliente(e.target.value)} />
                  </div>
                )}
              </div>
              {cartItems.length > 0 && (
                <div className="p-8 bg-gray-50 border-t space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xs text-gray-400 uppercase font-bold">Subtotal</span><span className="text-2xl font-serif">Q{totalCart.toFixed(2)}</span></div>
                  <button onClick={finalizarCompra} disabled={isProcessing} className="w-full bg-black text-white py-5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-gray-800 disabled:bg-gray-400 transition-all">
                    {isProcessing ? 'PROCESANDO...' : 'SOLICITAR PEDIDO'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-black/70 backdrop-blur-xl" />
            <motion.div layoutId={`product-${selectedProduct.id}`} className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden relative z-10 flex flex-col md:flex-row shadow-2xl">
              <div className="w-full md:w-1/2 h-[450px] md:h-auto border-r border-gray-50">
                <DetailCarousel images={selectedProduct.imagenes} id={selectedProduct.id} />
              </div>
              <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-8 right-8 text-gray-300 hover:text-black">✕</button>
                <div className="flex justify-between items-start mb-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em]">{selectedProduct.categoria}</p>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${selectedProduct.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {selectedProduct.stock > 0 ? `${selectedProduct.stock} DISPONIBLES` : 'SIN STOCK'}
                  </span>
                </div>
                <h2 className="text-4xl font-serif mb-4 leading-tight">{selectedProduct.nombre}</h2>
                <p className="text-2xl font-light mb-8 italic">Q{selectedProduct.precio.toFixed(2)}</p>
                <div className="border-t border-gray-100 pt-8 mb-10">
                   <p className="text-gray-500 text-sm leading-relaxed italic">{selectedProduct.descripcion || "Diseño exclusivo Aura Élégance."}</p>
                </div>
                <button 
                  onClick={() => addToCart(selectedProduct)}
                  disabled={selectedProduct.stock <= 0}
                  className="w-full bg-black text-white py-6 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-2xl active:scale-95">
                  {selectedProduct.stock > 0 ? 'Añadir a mi selección' : 'Agotado'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}