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

// COMPONENTE: Carrusel de imágenes optimizado para fotos largas
const DetailCarousel = ({ images }: { images: string[], id: number }) => {
  const [current, setCurrent] = useState(0)
  
  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full min-h-[450px] md:min-h-[600px] flex items-center justify-center bg-gray-50/80 group">
      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={current}
            src={images[current]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-full max-h-full object-contain p-2" 
          />
        </AnimatePresence>

        {/* Botones de Navegación con mejor visibilidad */}
        {images.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (prev - 1 + images.length) % images.length) }}
              className="absolute left-4 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg active:scale-90 hover:bg-white transition-all border border-gray-100"
            >
              <svg width="20" height="20" fill="none" stroke="black" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrent((prev) => (prev + 1) % images.length) }}
              className="absolute right-4 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg active:scale-90 hover:bg-white transition-all border border-gray-100"
            >
              <svg width="20" height="20" fill="none" stroke="black" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M8.25 4.5l7.5 7.5-7.5 7.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dots indicadores */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-black' : 'w-1.5 bg-black/20'}`} />
          ))}
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

  // Obtener productos desde Supabase
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

  // Lógica de finalización de compra
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
      
      setOrderSuccess({ id: numeroGestion, phone: telefonoCliente });
      setCartItems([]); setNombreCliente(''); setTelefonoCliente(''); setIsCartOpen(false);
      fetchProductos();
    } catch (err) { console.error(err); } finally { setIsProcessing(false); }
  };

  const totalCart = useMemo(() => cartItems.reduce((acc, item) => acc + (item.precio * item.cantidad), 0), [cartItems]);
  const totalArticulos = useMemo(() => cartItems.reduce((acc, item) => acc + item.cantidad, 0), [cartItems]);

  if (loading) return <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center font-serif tracking-[0.3em] uppercase italic text-gray-400">Aura Élégance...</div>

  return (
    <main className="min-h-screen bg-[#fdfaf5] text-black overflow-x-hidden">
      {/* NAVEGACIÓN */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-8 bg-white/40 backdrop-blur-md sticky top-0 z-[60]">
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

      {/* GRID PRODUCTOS */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
        {productos.map((item) => (
          <motion.div key={item.id} layoutId={`product-${item.id}`} onClick={() => setSelectedProduct(item)} 
            className="bg-white/60 p-4 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all cursor-pointer border border-white/20 group">
            <div className="aspect-[2/3] md:aspect-[3/4] overflow-hidden rounded-[2rem] bg-gray-100 mb-6 relative">
              <motion.img 
                layoutId={`img-${item.id}`} 
                src={item.imagenes[0]} 
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
              />
            </div>
            <div className="text-center space-y-1 pb-4">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">{item.categoria}</p>
              <h2 className="font-serif text-lg md:text-2xl">{item.nombre}</h2>
              <p className="text-base md:text-lg font-light text-gray-500 italic">Q{item.precio.toFixed(2)}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* MODAL DETALLE PRODUCTO */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProduct(null)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div 
              layoutId={`product-${selectedProduct.id}`} 
              className="bg-white w-full max-w-6xl rounded-t-[3rem] md:rounded-[3.5rem] overflow-hidden relative z-10 flex flex-col md:flex-row shadow-2xl h-[92vh] md:h-auto md:max-h-[85vh]"
            >
              <div className="w-full md:w-3/5 h-1/2 md:h-full bg-gray-50">
                <DetailCarousel images={selectedProduct.imagenes} id={selectedProduct.id} />
              </div>

              <div className="w-full md:w-2/5 p-8 md:p-14 flex flex-col relative overflow-y-auto bg-white">
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="absolute top-4 right-4 text-black bg-gray-100 p-3 rounded-full z-[110] hover:bg-gray-200 transition-colors"
                >
                  ✕
                </button>
                
                <div className="mb-8 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">{selectedProduct.categoria}</p>
                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full tracking-tighter ${selectedProduct.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {selectedProduct.stock} DISPONIBLES
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif mb-4 leading-tight">{selectedProduct.nombre}</h2>
                  <p className="text-2xl font-light italic text-gray-600">Q{selectedProduct.precio.toFixed(2)}</p>
                </div>

                <div className="flex-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Descripción del diseño</h3>
                  <p className="text-gray-500 text-sm leading-relaxed italic mb-8 border-l-2 border-gray-100 pl-6 whitespace-pre-line">
                    {selectedProduct.descripcion || "Diseño exclusivo de la colección Aura Élégance."}
                  </p>
                </div>

                <button onClick={() => addToCart(selectedProduct)} className="w-full bg-black text-white py-6 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-6">
                  Añadir a mi selección
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CARRITO LATERAL */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[110]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-md bg-[#fdfaf5] z-[120] shadow-2xl flex flex-col p-6 md:p-10">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-lg font-serif uppercase tracking-[0.2em] italic">Mi Selección</h2>
                <button onClick={() => setIsCartOpen(false)} className="bg-white p-3 rounded-full shadow-sm">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-5 items-center bg-white p-4 rounded-[2rem] shadow-sm border border-gray-50">
                    <img src={item.imagenes[0]} className="w-16 h-20 object-cover rounded-2xl" />
                    <div className="flex-1">
                      <h3 className="text-sm font-serif">{item.nombre}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Q{item.precio} • Cant: {item.cantidad}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="bg-gray-50 p-2 rounded-full text-red-300">✕</button>
                  </div>
                ))}
                {cartItems.length > 0 && (
                  <div className="space-y-4 pt-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Finalizar Pedido</p>
                    <input type="text" placeholder="Nombre completo" className="w-full p-5 bg-white rounded-[1.5rem] text-sm shadow-sm outline-none" value={nombreCliente} onChange={(e)=>setNombreCliente(e.target.value)} />
                    <input type="tel" placeholder="Número de WhatsApp" className="w-full p-5 bg-white rounded-[1.5rem] text-sm shadow-sm outline-none" value={telefonoCliente} onChange={(e)=>setTelefonoCliente(e.target.value)} />
                  </div>
                )}
              </div>
              {cartItems.length > 0 && (
                <div className="pt-8 space-y-6 border-t border-gray-100">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Inversión Total</span>
                    <span className="text-3xl font-serif italic">Q{totalCart.toFixed(2)}</span>
                  </div>
                  <button onClick={finalizarCompra} disabled={isProcessing} className="w-full bg-black text-white py-6 rounded-full font-bold uppercase text-[10px] tracking-[0.3em] shadow-2xl active:scale-95 disabled:bg-gray-300">
                    {isProcessing ? 'VALIDANDO...' : 'CONFIRMAR COMPRA'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL ÉXITO */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white max-w-sm w-full rounded-[3.5rem] p-12 text-center relative z-10 shadow-2xl">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h2 className="text-3xl font-serif mb-3 italic">¡Gracias!</h2>
              <p className="text-[10px] text-gray-400 mb-8 tracking-[0.2em] uppercase font-bold">Orden: {orderSuccess.id}</p>
              <p className="text-sm text-gray-500 italic leading-relaxed mb-10">Tu selección ha sido reservada. Recibirás un mensaje en WhatsApp para coordinar la entrega.</p>
              <button onClick={() => setOrderSuccess(null)} className="w-full bg-black text-white py-5 rounded-full text-[10px] font-bold tracking-widest uppercase">Cerrar</button>
            </motion.div>
          </div>
          
        )}
      </AnimatePresence>
    </main>
  )
}