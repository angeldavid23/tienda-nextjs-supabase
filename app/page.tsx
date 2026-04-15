'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// 1. Definición de la Interface
interface Producto {
  id: number
  nombre: string
  precio: number
  categoria: string
  imagenes: string[]
}

// 2. Componente de la Tarjeta (Definido fuera del componente principal)
function ProductCard({ item }: { item: Producto }) {
  const [currentImg, setCurrentImg] = useState(0)

  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImg((prev) => (prev + 1) % item.imagenes.length)
  }

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImg((prev) => (prev - 1 + item.imagenes.length) % item.imagenes.length)
  }

  return (
    <div className="group cursor-pointer">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-6">
        <img 
          src={item.imagenes && item.imagenes.length > 0 ? item.imagenes[currentImg] : '/placeholder.jpg'} 
          alt={item.nombre} 
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
        />

        {item.imagenes && item.imagenes.length > 1 && (
          <>
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button onClick={prevImg} className="bg-white/80 hover:bg-white p-1.5 rounded-full text-black shadow-md z-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button onClick={nextImg} className="bg-white/80 hover:bg-white p-1.5 rounded-full text-black shadow-md z-10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {item.imagenes.map((_, idx) => (
                <div key={idx} className={`h-1 rounded-full transition-all ${idx === currentImg ? 'w-4 bg-white' : 'w-1 bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-1">{item.categoria}</p>
        <h2 className="text-lg font-serif mb-2 group-hover:text-gray-600 transition-colors">{item.nombre}</h2>
        <p className="text-sm font-light tracking-widest text-gray-800">Q{item.precio.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  )
}

// 3. EXPORTACIÓN POR DEFECTO (Esto es lo que Next.js busca)
export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const productosRef = useRef<HTMLDivElement>(null)

  const scrollToProducts = () => {
    productosRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: false })
      if (error) console.log(error)
      else setProductos(data || [])
      setLoading(false)
    }
    fetchProductos()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fdfaf5] italic font-serif">Cargando...</div>

  return (
    <main className="min-h-screen bg-[#fdfaf5] text-[#1a1a1a]">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-serif tracking-[0.2em] uppercase font-light mx-auto">AURA ÉLÉGANCE</h1>
      </nav>

      {/* Hero */}
      <section className="relative h-[80vh] w-full bg-[#0a1128] flex items-center justify-center text-white text-center">
        <div>
          <h2 className="text-6xl font-serif mb-6">ELEGANCIA<br/>SIN ESFUERZO</h2>
          <button onClick={scrollToProducts} className="border border-white px-10 py-4 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all">
            Comprar Ahora
          </button>
        </div>
      </section>

      {/* Productos */}
      <section ref={productosRef} className="max-w-7xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {productos.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  )
}