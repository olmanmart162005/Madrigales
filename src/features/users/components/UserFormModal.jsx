import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, User, Mail, Lock, Phone, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { createSystemUser } from '@/lib/users'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const userCreateSchema = z.object({
  full_name: z.string().min(2, 'El nombre completo es requerido'),
  email: z.string().email('Ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['administrador', 'cajero']).default('cajero'),
})

const userEditSchema = z.object({
  full_name: z.string().min(2, 'El nombre completo es requerido'),
  phone: z.string().optional(),
  role: z.enum(['administrador', 'cajero']),
  is_active: z.boolean().default(true),
})

export default function UserFormModal({ isOpen, onClose, userToEdit, onSuccess }) {
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!userToEdit

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEditing ? userEditSchema : userCreateSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'cajero',
      is_active: true,
    },
  })

  useEffect(() => {
    if (userToEdit) {
      reset({
        full_name: userToEdit.full_name || '',
        phone: userToEdit.phone || '',
        role: userToEdit.role === 'administrador' ? 'administrador' : 'cajero',
        is_active: userToEdit.is_active ?? true,
      })
    } else {
      reset({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        role: 'cajero',
        is_active: true,
      })
    }
  }, [userToEdit, reset, isOpen])

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)

      if (isEditing) {
        // En edición, actualizar perfil en Supabase
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: values.full_name.trim(),
            phone: values.phone?.trim() || null,
            role: values.role,
            is_active: values.is_active,
          })
          .eq('id', userToEdit.id)

        if (error) throw error

        await logActivity({
          action: `Actualizó el perfil del usuario "${values.full_name}" (Rol: ${values.role})`,
          entityType: 'user',
          entityId: userToEdit.id,
          entityName: values.full_name,
        })

        toast.success('Usuario actualizado correctamente')
      } else {
        // Crear usuario mediante función segura de servidor
        await createSystemUser({
          email: values.email,
          password: values.password,
          full_name: values.full_name,
          phone: values.phone,
          role: values.role,
        })

        toast.success('Usuario creado exitosamente')
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving user:', err)
      toast.error('Error al guardar usuario: ' + (err.message || 'Verifica los datos'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        {/* Nombre completo */}
        <div>
          <label className="label">Nombre Completo *</label>
          <div className="relative">
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              {...register('full_name')}
              type="text"
              placeholder="Ej. Juan Pérez"
              className="input pl-9"
            />
          </div>
          {errors.full_name && <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>}
        </div>

        {/* Email y Contraseña (solo al crear) */}
        {!isEditing && (
          <>
            <div>
              <label className="label">Correo Electrónico *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="usuario@madrigales.com"
                  className="input pl-9"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Contraseña Temporal *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  className="input pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>
          </>
        )}

        {/* Teléfono */}
        <div>
          <label className="label">Teléfono / WhatsApp</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              {...register('phone')}
              type="text"
              placeholder="+504 9999-9999"
              className="input pl-9"
            />
          </div>
        </div>

        {/* Rol */}
        <div>
          <label className="label">Rol del Sistema *</label>
          <div className="relative">
            <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select {...register('role')} className="input pl-9">
              <option value="cajero">Cajero (Atención de pedidos y facturación)</option>
              <option value="administrador">Administrador (Gestión de usuarios y sistema)</option>
            </select>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Los nuevos usuarios se crean con permisos estándar de acuerdo a su rol.
          </p>
        </div>

        {/* Estado (solo al editar) */}
        {isEditing && (
          <div className="flex items-center gap-2 pt-2">
            <input
              {...register('is_active')}
              id="user_active"
              type="checkbox"
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer"
            />
            <label htmlFor="user_active" className="text-xs font-semibold text-gray-700 cursor-pointer">
              Usuario Activo (permitir inicio de sesión en el sistema)
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary text-xs">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary text-xs">
            {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
