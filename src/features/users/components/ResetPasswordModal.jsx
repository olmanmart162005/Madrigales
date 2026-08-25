import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { resetUserPassword } from '@/lib/users'
import toast from 'react-hot-toast'

const resetSchema = z
  .object({
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export default function ResetPasswordModal({ isOpen, onClose, targetUser, onSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  if (!targetUser) return null

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)
      await resetUserPassword(targetUser.id, values.newPassword, targetUser.full_name)
      toast.success(`Contraseña de ${targetUser.full_name} actualizada correctamente`)
      reset()
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error resetting password:', err)
      toast.error('Error al restablecer contraseña: ' + (err.message || 'Intenta de nuevo'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Restablecer Contraseña — ${targetUser.full_name}`}
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p>
            Establece una nueva contraseña temporal para el usuario <strong>@{targetUser.username || targetUser.full_name}</strong>. El usuario podrá iniciar sesión de inmediato con esta clave.
          </p>
        </div>

        <div>
          <label className="label text-xs">Nueva Contraseña *</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              {...register('newPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input pl-9 pr-8 text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-[10px] text-red-500 mt-1">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label className="label text-xs">Confirmar Nueva Contraseña *</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              {...register('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input pl-9 text-xs"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-[10px] text-red-500 mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            <KeyRound className="w-4 h-4" />
            <span>{submitting ? 'Actualizando...' : 'Restablecer Clave'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
