import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Ingresa tu usuario o correo electrónico'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { signIn } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)
      await signIn(values.identifier, values.password)
      toast.success('¡Bienvenido a Madrigales Pastelería!')
    } catch (err) {
      console.error('Login error:', err)
      if (err.message?.includes('desactivada')) {
        toast.error('Tu cuenta se encuentra desactivada. Contacta al administrador.')
      } else {
        toast.error('Usuario o contraseña incorrectos.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full lg:w-1/2 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-[#0D1420] text-white">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Encabezado con Logo Grande Luminoso */}
        <div className="space-y-3 text-center">
          {/* Logo Oficial Grande y Nítido */}
          <div className="flex justify-center">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-3 border border-purple-100 shadow-2xl flex items-center justify-center overflow-hidden">
              <img
                src="/icons/pwa-512x512.png"
                alt="Madrigales Pastelería"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Madrigales
            </h2>
            <p className="text-xs font-bold text-fuchsia-400 uppercase tracking-[0.25em] mt-1">
              PASTELERÍA &middot; INICIAR SESIÓN
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Usuario o Correo */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Usuario o Correo Electrónico
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                {...register('identifier')}
                type="text"
                autoComplete="username"
                placeholder="Ej. suri, yimi o correo..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
            {errors.identifier && (
              <p className="text-xs text-rose-400 mt-1">{errors.identifier.message}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Botón de Entrada */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-purple-700 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span>Acceder al Sistema</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-slate-500">
            Madrigales Pastelería &copy; 2026 &middot; Sistema de Gestión y POS
          </p>
        </div>
      </div>
    </div>
  )
}
