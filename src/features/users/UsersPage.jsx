import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Shield, User, Power, Edit2, Trash2, Crown, KeyRound, Clock, UserCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { deleteSystemUser } from '@/lib/users'
import { RoleBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import UserFormModal from './components/UserFormModal'
import ResetPasswordModal from './components/ResetPasswordModal'
import { formatDate, getInitials } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { user: currentAuthUser, isOwner, isAdmin } = useAuthStore()
  const userIsOwner = isOwner()
  const userIsAdmin = isAdmin()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      let rawList = data || []

      // Mapear el nombre del creador (created_by)
      const profileMap = new Map(rawList.map((p) => [p.id, p.full_name]))

      let userList = rawList.map((u) => ({
        ...u,
        creator_name: u.created_by ? profileMap.get(u.created_by) || 'Administrador' : null,
      }))

      // DEFENSA EN PROFUNDIDAD:
      // Si el usuario actual NO es el owner, nos aseguramos de que el owner no aparezca en la lista
      if (!userIsOwner) {
        userList = userList.filter((u) => u.is_owner !== true)
      }

      setUsers(userList)
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Error al cargar la lista de usuarios')
    } finally {
      setLoading(false)
    }
  }, [userIsOwner])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Activar / Desactivar usuario
  const handleToggleStatus = async (user) => {
    if (user.is_owner) {
      toast.error('El Propietario del Sistema no puede ser desactivado.')
      return
    }

    if (user.id === currentAuthUser?.id) {
      toast.error('No puedes desactivar tu propia cuenta en uso.')
      return
    }

    try {
      const newStatus = !user.is_active
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', user.id)

      if (error) throw error

      await logActivity({
        action: newStatus
          ? `Activó la cuenta del usuario "${user.full_name}"`
          : `Desactivó la cuenta del usuario "${user.full_name}"`,
        entityType: 'user',
        entityId: user.id,
        entityName: user.full_name,
      })

      toast.success(newStatus ? `Usuario "${user.full_name}" activado` : `Usuario "${user.full_name}" desactivado`)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar estado: ' + err.message)
    }
  }

  // Eliminar usuario
  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return
    try {
      setIsDeleting(true)
      await deleteSystemUser(deleteCandidate.id, deleteCandidate.full_name)
      toast.success(`Usuario "${deleteCandidate.full_name}" eliminado correctamente`)
      setDeleteCandidate(null)
      fetchUsers()
    } catch (err) {
      console.error('Error deleting user:', err)
      toast.error('Error al eliminar usuario: ' + (err.message || 'Verifica los permisos'))
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtrado
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      search === '' ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.includes(search)

    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Administración de Usuarios
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Control de cuentas, roles de acceso, contraseñas y trazabilidad de creación
          </p>
        </div>

        {userIsAdmin && (
          <button
            onClick={() => {
              setEditingUser(null)
              setIsFormOpen(true)
            }}
            className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="card p-4 bg-white border border-purple-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, @usuario o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input text-xs"
            >
              <option value="all">Todos los roles</option>
              <option value="administrador">Administradores</option>
              <option value="cajero">Cajeros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="card bg-white border border-purple-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/60 border-b border-purple-100 text-gray-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Usuario</th>
                <th className="px-4 py-3.5">Rol</th>
                <th className="px-4 py-3.5">Creado Por</th>
                <th className="px-4 py-3.5">Fecha Registro</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <TableSkeleton rows={4} columns={6} />
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentAuthUser?.id
                  return (
                    <tr key={u.id} className="hover:bg-purple-50/20 transition-colors">
                      {/* Avatar y Nombre */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center text-white text-xs font-bold shadow-xs overflow-hidden border border-white">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(u.full_name)
                              )}
                            </div>
                            {u.is_owner && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center shadow-xs">
                                <Crown className="w-2 h-2 text-amber-900 fill-amber-900" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{u.full_name}</span>
                              {isCurrent && (
                                <span className="text-[9px] font-extrabold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded">
                                  Tú
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-purple-600 font-semibold block">
                              @{u.username || u.full_name.toLowerCase().replace(/\s+/g, '')}
                            </span>
                            {u.phone && <span className="text-[10px] text-gray-400 block">{u.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <RoleBadge role={u.role} isOwner={u.is_owner} />
                      </td>

                      {/* Creado Por */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {u.is_owner ? (
                          <span className="text-gray-400 italic text-[11px]">Sistema</span>
                        ) : u.creator_name ? (
                          <span className="inline-flex items-center gap-1 text-gray-800 font-semibold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                            {u.creator_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Administrador</span>
                        )}
                      </td>

                      {/* Fecha de Registro */}
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap text-[11px]">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        {u.is_owner ? (
                          <span className="text-[10px] font-bold text-amber-600 italic">
                            Protegido
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {/* Restablecer Contraseña */}
                            {(userIsOwner || userIsAdmin) && (
                              <button
                                onClick={() => setResetUser(u)}
                                title="Restablecer contraseña"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                            )}

                            {/* Editar */}
                            <button
                              onClick={() => {
                                setEditingUser(u)
                                setIsFormOpen(true)
                              }}
                              title="Editar usuario"
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Activar / Desactivar */}
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isCurrent}
                              title={u.is_active ? 'Desactivar cuenta' : 'Activar cuenta'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.is_active
                                  ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              <Power className="w-4 h-4" />
                            </button>

                            {/* Eliminar */}
                            <button
                              onClick={() => setDeleteCandidate(u)}
                              disabled={isCurrent}
                              title="Eliminar usuario permanentemente"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <EmptyState
                      icon={User}
                      title="No se encontraron usuarios"
                      description="No hay registros que coincidan con la búsqueda."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {isFormOpen && (
        <UserFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          userToEdit={editingUser}
          onSuccess={fetchUsers}
        />
      )}

      {/* Modal Restablecer Contraseña */}
      {resetUser && (
        <ResetPasswordModal
          isOpen={!!resetUser}
          onClose={() => setResetUser(null)}
          targetUser={resetUser}
          onSuccess={fetchUsers}
        />
      )}

      {/* Confirmar Eliminación */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar permanentemente la cuenta de "${deleteCandidate?.full_name}"? Esta acción removerá sus credenciales de acceso.`}
        confirmText="Eliminar Cuenta"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
