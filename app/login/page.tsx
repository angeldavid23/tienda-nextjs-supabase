'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Las credenciales no coinciden con nuestros registros.")
      setLoading(false)
    } else {
      router.push('/admin')
    }
  }

  return (
    <main className="min-h-screen bg-[#fdfaf5] text-black flex flex-col items-center justify-center p-6 font-sans">
      {/* Título Estilo Aura */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <h1 className="text-3xl font-serif tracking-[0.3em] uppercase italic">AURA ÉLÉGANCE</h1>
        <p className="text-[10px] text-gray-400 tracking-[0.5em] uppercase mt-2 font-bold">Panel Administrativo</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <form 
          onSubmit={handleLogin} 
          className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-6"
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-red-400 text-[9px] uppercase tracking-widest font-bold text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 ml-4 font-bold">Acceso de Usuario</label>
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none border border-transparent focus:border-black/5 transition-all text-black"
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 ml-4 font-bold">Clave de Seguridad</label>
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full p-4 bg-gray-50 rounded-2xl text-sm outline-none border border-transparent focus:border-black/5 transition-all text-black"
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-gray-800 transition-all shadow-lg active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {loading ? 'Verificando...' : 'Acceder al Sistema'}
          </button>
        </form>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 text-[9px] text-gray-300 uppercase tracking-widest italic"
        >
          Exclusivo para uso interno
        </motion.p>
      </motion.div>
    </main>
  )
}