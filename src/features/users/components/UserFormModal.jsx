import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, User, Mail, Lock, Phone, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { createSystemUser } from '@/lib/users'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const userCreateSchema = z
  .object({
    full_name: z.string().min(2, 'El nombre completo es requerido'),
    username: z
      .string()
      .min(3, 'El usuario debe tener al menos 3 caracteres')
      .regex(/^[a-zA-Z0-9_.-]+$/, 'Solo letras, números, puntos o guiones (sin espacios)'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirma la contraseña'),
    phone: z.string().optional(),
    role: z.enum(['administrador', 'cajero']).default('cajero'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

const userEditSchema = z.object({
  full_name: z.string().min(2, 'El nombre completo es requerido'),
  username: z.string().min(3, 'El usuario debe tener al menos 3 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['administrador', 'cajero']),
  is_active: z.boolean().default(true),
})

export default function UserFormModal({ isOpen, onClose, userToEdit, onSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const isEditing = !!userToEdit

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEditing ? userEditSchema : userCreateSchema),
    defaultValues: {
      full_name: '',
      username: '',
      password: '',
      confirmPassword: '',
      phone: '',
      role: 'cajero',
      is_active: true,
    },
  })

  const usernameValue = watch('username')
  const cleanUsername = (usernameValue || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').trim()

  const handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '')
    setValue('username', val, { shouldValidate: true })
    setErrorMessage(null)
  }

  useEffect(() => {
    setErrorMessage(null)
    if (userToEdit) {
      reset({
        full_name: userToEdit.full_name || '',
        username: userToEdit.username || userToEdit.full_name?.toLowerCase().replace(/\s+/g, '') || '',
        phone: userToEdit.phone || '',
        role: userToEdit.role === 'administrador' ? 'administrador' : 'cajero',
        is_active: userToEdit.is_active ?? true,
      })
    } else {
      reset({
        full_name: '',
        username: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'cajero',
        is_active: true,
      })
    }
  }, [userToEdit, reset, isOpen])

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)
      setErrorMessage(null)

      if (isEditing) {
        // En edición, actualizar perfil en Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: values.full_name.trim(),
            username: values.username.trim().toLowerCase(),
            phone: values.phone?.trim() || null,
            role: values.role,
            is_active: values.is_active,
          })
          .eq('id', userToEdit.id)

        if (error) throw error

        await logActivity({
          action: `Actualizó al usuario "${values.full_name}" (@${values.username}) (Rol: ${values.role})`,
          entityType: 'user',
          entityId: userToEdit.id,
          entityName: values.full_name,
        })

        toast.success('Usuario actualizado correctamente')
      } else {
        // Crear usuario mediante backend seguro (Supabase Auth Admin)
        const result = await createSystemUser({
          full_name: values.full_name,
          username: values.username,
          password: values.password,
          phone: values.phone,
          role: values.role,
        })

        toast.success(`Usuario @${values.username} creado exitosamente. Ya puede iniciar sesión.`)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving user:', err)
      const msg = err.message || 'Error al procesar la solicitud'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Nombre Completo */}
        <div>
          <label className="label text-xs font-bold text-gray-700">Nombre Completo *</label>
          <div className="relative">
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              {...register('full_name')}
              type="text"
              placeholder="Ej. Suri Castellón"
              className="input pl-9 text-xs"
            />
          </div>
          {errors.full_name && (
            <p className="text-[11px] text-red-500 mt-1">{errors.full_name.message}</p>
          )}
        </div>

        {/* Nombre de Usuario */}
        <div>
          <label className="label text-xs font-bold text-gray-700">
            Nombre de Usuario para Iniciar Sesión * <span className="text-purple-600 font-normal">(sin espacios ni @)</span>
          </label>
          <div className="relative">
            <span className="text-purple-600 font-black absolute left-3 top-1/2 -translate-y-1/2 text-xs">@</span>
            <input
              {...register('username')}
              onChange={handleUsernameChange}
              type="text"
              placeholder="suricastellon"
              className="input pl-8 text-xs"
            />
          </div>
          {errors.username && (
            <p className="text-[11px] text-red-500 mt-1">{errors.username.message}</p>
          )}
          {!isEditing && cleanUsername && (
            <p className="text-[10px] text-purple-700 mt-1 font-semibold flex items-center gap-1">
              <Mail className="w-3 h-3 inline" /> Email de autenticación: <code className="bg-purple-50 px-1 py-0.5 rounded text-purple-900">{cleanUsername}@madrigales.com</code>
            </p>
          )}
        </div>

        {/* Contraseña Inicial (Solo en creación) */}
        {!isEditing && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs font-bold text-gray-700">Contraseña Inicial *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pl-9 pr-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="label text-xs font-bold text-gray-700">Confirmar Contraseña *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pl-9 pr-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Teléfono y Rol */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-bold text-gray-700">Teléfono (Opcional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                {...register('phone')}
                type="tel"
                placeholder="+504 9999-9999"
                className="input pl-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="label text-xs font-bold text-gray-700">Rol del Usuario *</label>
            <div className="relative">
              <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select {...register('role')} className="input pl-9 text-xs">
                <option value="cajero">Cajero</option>
                <option value="administrador">Administrador</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estado Activo / Inactivo (En edición) */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              type="checkbox"
              id="is_active"
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
            />
            <label htmlFor="is_active" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Cuenta Activa (Permite iniciar sesión en el sistema)
            </label>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
