import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, ArrowRight, HelpCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Ingresa un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)

  const { signIn } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)
      await signIn(values.email, values.password)
      toast.success('¡Bienvenido a Madrigales Pastelería!')
    } catch (err) {
      console.error('Login error:', err)
      const errorMsg = err.message?.toLowerCase().includes('invalid login credentials')
        ? 'Correo o contraseña incorrectos. Verifica tus datos.'
        : err.message || 'Error al iniciar sesión'
      toast.error(errorMsg)
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Campo Correo Electrónico */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200 text-left">
              Correo Electrónico
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-pink-400 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <input
                {...register('email')}
                type="email"
                placeholder="usuario@madrigales.com"
                autoComplete="email"
                disabled={submitting}
                className="w-full pl-10 pr-4 py-3 bg-[#162032] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-[11px] text-rose-400 font-medium pl-1 text-left">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-200">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-pink-400 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                autoComplete="current-password"
                disabled={submitting}
                className="w-full pl-10 pr-11 py-3 bg-[#162032] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[11px] text-rose-400 font-medium pl-1 text-left">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Recordar sesión */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-sm bg-[#162032] border-slate-700 text-pink-600 focus:ring-pink-500/30"
              />
              <span className="text-xs text-slate-300">Mantener sesión activa</span>
            </label>
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 hover:from-pink-500 hover:to-purple-500 active:scale-[0.99] shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Modal de Recuperación */}
        {isForgotModalOpen && (
          <Modal
            isOpen={isForgotModalOpen}
            onClose={() => setIsForgotModalOpen(false)}
            title="Recuperación de Contraseña"
            size="sm"
          >
            <div className="p-6 space-y-4 text-center text-gray-800">
              <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-600 mx-auto flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-gray-900">¿Olvidaste tus credenciales?</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Por políticas de seguridad de <strong>Madrigales Pastelería</strong>, el restablecimiento de contraseñas es gestionado directamente por el <strong>Propietario o Administrador</strong> del sistema desde el módulo de usuarios.
              </p>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-full btn-primary text-xs py-2.5"
              >
                Entendido
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}
