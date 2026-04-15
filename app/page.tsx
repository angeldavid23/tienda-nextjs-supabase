'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Definimos qué datos tiene un producto
interface Producto {
  id: number
  nombre: string
  precio: number
  categoria: string
  imagen_url: string
}

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
      
      if (error) console.log('Error cargando productos:', error)
      else setProductos(data || [])
      setLoading(false)
    }

    fetchProductos()
  }, [])

  if (loading) return <p className="text-center p-10">Cargando catálogo...</p>

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-black mb-2">Mi Tienda Online</h1>
        <p className="text-gray-600">Nueva Colección 2026</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {productos.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
            <div className="h-64 overflow-hidden">
              <img 
                src={item.imagen_url} 
                alt={item.nombre} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4 text-black">
              <span className="text-xs font-bold text-blue-600 uppercase">{item.categoria}</span>
              <h2 className="text-xl font-semibold mt-1">{item.nombre}</h2>
              <p className="text-2xl font-bold mt-2 text-green-700">Q{item.precio}</p>
              <button className="w-full mt-4 bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-800">
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}