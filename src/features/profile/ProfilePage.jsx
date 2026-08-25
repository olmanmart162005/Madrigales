import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Mail, Phone, Lock, Camera, Eye, EyeOff,
  Activity, Crown, ShieldCheck, KeyRound
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { RoleBadge } from '@/components/ui/Badge'
import { getInitials, formatDate } from '@/utils'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
})

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'La nueva contraseña debe ser diferente a la contraseña actual',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export default function ProfilePage() {
  const { user, profile, updateProfile, fetchProfile, isOwner } = useAuthStore()
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Toggles de visibilidad de contraseñas
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [userLogs, setUserLogs] = useState([])
  const owner = isOwner()

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    },
  })

  const {
    register: regPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
    setError: setPasswordError,
  } = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
      })
    }
  }, [profile, resetProfile])

  // Cargar registros de actividad propios
  useEffect(() => {
    async function loadLogs() {
      if (!user?.id) return
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(8)

      setUserLogs(data || [])
    }
    loadLogs()
  }, [user?.id])

  // Subir avatar a Storage
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 2MB')
      return
    }

    try {
      setUploadingAvatar(true)
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${user.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.warn('Storage upload error:', uploadError)
        toast.error('No se pudo subir al almacenamiento. Verifica la conexión.')
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      await updateProfile({ avatar_url: publicUrl })
      await fetchProfile(user.id)

      toast.success('Foto de perfil actualizada correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar avatar: ' + err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Guardar datos personales
  const onSaveProfile = async (values) => {
    try {
      setUpdatingProfile(true)
      await updateProfile({
        full_name: values.full_name.trim(),
        phone: values.phone?.trim() || null,
      })

      await logActivity({
        action: `Actualizó su información de perfil personal`,
        entityType: 'profile',
        entityId: user.id,
      })

      toast.success('Perfil actualizado correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar perfil: ' + err.message)
    } finally {
      setUpdatingProfile(false)
    }
  }

  // Cambiar contraseña con reautenticación segura
  const onSavePassword = async (values) => {
    try {
      setUpdatingPassword(true)

      // 1. REAUTENTICACIÓN: Verificar que la contraseña actual sea la correcta
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.currentPassword,
      })

      if (reauthError) {
        setPasswordError('currentPassword', {
          message: 'La contraseña actual ingresada es incorrecta',
        })
        return
      }

      // 2. ACTUALIZACIÓN: Cambiar la contraseña a la nueva
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.newPassword,
      })

      if (updateError) throw updateError

      // 3. AUDITORÍA: Registrar sin exponer jamás la contraseña
      await logActivity({
        action: `El usuario ${profile?.full_name || user.email} cambió la contraseña de su propia cuenta.`,
        entityType: 'auth',
        entityId: user.id,
      })

      toast.success('Tu contraseña ha sido actualizada correctamente.')
      resetPassword()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar contraseña: ' + (err.message || 'Verifica los datos'))
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Administra tu información de cuenta, foto y seguridad personal
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Tarjeta de Avatar y Rol */}
        <div className="space-y-6">
          <div className="card p-6 flex flex-col items-center text-center space-y-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden border-4 border-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(profile?.full_name || 'U')
                )}
              </div>

              {owner && (
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  <Crown className="w-4 h-4 text-amber-900 fill-amber-900" />
                </div>
              )}

              {/* Botón cambiar foto */}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-md cursor-pointer transition-all"
                title="Cambiar foto de perfil"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <h2 className="font-bold text-gray-900 text-base">{profile?.full_name || 'Usuario'}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{user?.email}</p>
            </div>

            <div className="pt-2 border-t border-gray-100 w-full flex justify-center">
              <RoleBadge role={profile?.role} isOwner={profile?.is_owner} />
            </div>

            <p className="text-[11px] text-gray-400">
              Miembro desde {formatDate(profile?.created_at || user?.created_at)}
            </p>
          </div>

          {/* Actividad reciente propia */}
          <div className="card p-5 space-y-3">
            <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Activity className="w-3.5 h-3.5 text-primary-600" />
              Mis Acciones Recientes
            </h3>
            <div className="divide-y divide-gray-50 text-xs">
              {userLogs.length > 0 ? (
                userLogs.map((log) => (
                  <div key={log.id} className="py-2">
                    <p className="text-gray-800 font-medium leading-snug">{log.action}</p>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {formatDate(log.created_at, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-[11px] py-2">Sin actividad reciente registrada.</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Formularios de Edición y Cambio de Contraseña */}
        <div className="md:col-span-2 space-y-6">
          {/* Formulario: Información Personal */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-4 h-4 text-primary-600" />
              Información Personal
            </h2>

            <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
              <div>
                <label className="label">Nombre Completo *</label>
                <input {...regProfile('full_name')} type="text" className="input text-xs" />
                {profileErrors.full_name && (
                  <p className="text-xs text-red-500 mt-1">{profileErrors.full_name.message}</p>
                )}
              </div>

              <div>
                <label className="label">Correo Electrónico (No modificable)</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="input pl-9 bg-gray-50 text-gray-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label">Teléfono de Contacto</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    {...regProfile('phone')}
                    type="text"
                    placeholder="+504 9999-9999"
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={updatingProfile} className="btn-primary text-xs">
                  {updatingProfile ? 'Guardando...' : 'Guardar Datos Personales'}
                </button>
              </div>
            </form>
          </div>

          {/* Formulario: Cambiar Contraseña con Validación de Contraseña Actual */}
          <div className="card p-6 space-y-4">
            <h2 className="font-bold text-sm text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <KeyRound className="w-4 h-4 text-primary-600" />
              Cambiar Contraseña
            </h2>

            <form onSubmit={handlePasswordSubmit(onSavePassword)} className="space-y-4">
              {/* Contraseña Actual */}
              <div>
                <label className="label">Contraseña Actual *</label>
                <div className="relative">
                  <input
                    {...regPassword('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Ingresa tu contraseña actual"
                    className="input pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="label">Nueva Contraseña *</label>
                <div className="relative">
                  <input
                    {...regPassword('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="input pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              {/* Confirmar Nueva Contraseña */}
              <div>
                <label className="label">Confirmar Nueva Contraseña *</label>
                <div className="relative">
                  <input
                    {...regPassword('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirma la nueva contraseña"
                    className="input pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="btn bg-gray-900 hover:bg-black text-white text-xs"
                >
                  {updatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
