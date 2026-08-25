import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Shield, User, Power, Edit2, Trash2, Crown, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { deleteSystemUser } from '@/lib/users'
import { RoleBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import UserFormModal from './components/UserFormModal'
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
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [deleteWarningMessage, setDeleteWarningMessage] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { user: currentAuthUser, isOwner } = useAuthStore()
  const userIsOwner = isOwner()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      let userList = data || []

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
    // Protección: El owner nunca puede ser desactivado
    if (user.is_owner) {
      toast.error('El Propietario del Sistema no puede ser desactivado.')
      return
    }

    if (user.id === currentAuthUser?.id) {
      toast.error('No puedes desactivar tu propia cuenta activa en uso.')
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
          ? `Activó el acceso del usuario "${user.full_name}"`
          : `Desactivó el acceso del usuario "${user.full_name}"`,
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

  // Comprobación previa de eliminación
  const handleDeleteCheck = async (user) => {
    if (user.is_owner) {
      toast.error('El Propietario del Sistema no puede ser eliminado.')
      return
    }

    if (user.id === currentAuthUser?.id) {
      toast.error('No puedes eliminar tu propia cuenta en sesión.')
      return
    }

    try {
      // Verificar si tiene pedidos asociados
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)

      // Verificar si tiene movimientos de almacén asociados
      const { count: movementsCount } = await supabase
        .from('inventory_movements')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)

      const totalHistory = (ordersCount || 0) + (movementsCount || 0)

      if (totalHistory > 0) {
        setDeleteWarningMessage(
          `El usuario "${user.full_name}" tiene historial de actividad (${ordersCount || 0} pedidos, ${movementsCount || 0} movimientos de almacén). Para preservar la trazabilidad e integridad de los reportes, no se permite su eliminación física. La opción recomendada es DESACTIVARLO.`
        )
        setDeleteCandidate(user)
      } else {
        setDeleteWarningMessage(null)
        setDeleteCandidate(user)
      }
    } catch (err) {
      console.error('Error checking history:', err)
      setDeleteWarningMessage(null)
      setDeleteCandidate(user)
    }
  }

  // Confirmar eliminación física
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return

    try {
      setIsDeleting(true)
      await deleteSystemUser(deleteCandidate.id, deleteCandidate.full_name)

      toast.success('Usuario eliminado del sistema')
      setDeleteCandidate(null)
      fetchUsers()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar usuario: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Administración de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crea y gestiona las cuentas del personal con control de roles y accesos
          </p>
        </div>

        <button
          onClick={() => {
            setEditingUser(null)
            setIsFormOpen(true)
          }}
          className="btn-primary text-sm shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
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

      {/* Tabla de Usuarios */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Usuario</th>
                <th className="px-4 py-3.5">Teléfono</th>
                <th className="px-4 py-3.5">Rol</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Fecha Alta</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <TableSkeleton rows={4} columns={6} />
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isThisUserOwner = u.is_owner === true
                  const isCurrent = u.id === currentAuthUser?.id

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50/50 transition-colors ${
                        isThisUserOwner ? 'bg-amber-50/30 font-medium' : !u.is_active ? 'bg-gray-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* Usuario / Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(u.full_name || 'U')
                              )}
                            </div>
                            {isThisUserOwner && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full flex items-center justify-center shadow-xs">
                                <Crown className="w-2.5 h-2.5 text-amber-900 fill-amber-900" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-1.5">
                              {u.full_name}
                              {isCurrent && (
                                <span className="text-[10px] font-normal text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                  (Tú)
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-gray-400">ID: {u.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3.5 text-gray-500">{u.phone || '—'}</td>

                      {/* Rol */}
                      <td className="px-4 py-3.5">
                        <RoleBadge role={u.role} isOwner={u.is_owner} />
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`badge text-[10px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Fecha de registro */}
                      <td className="px-4 py-3.5 text-gray-400 whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        {/* Si el usuario objetivo es el Owner, solo él mismo puede editarlo */}
                        {isThisUserOwner && !userIsOwner ? (
                          <span className="text-[11px] text-gray-400 italic">Protegido</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Editar */}
                            <button
                              onClick={() => {
                                setEditingUser(u)
                                setIsFormOpen(true)
                              }}
                              title="Editar datos del usuario"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Activar / Desactivar (NUNCA al owner) */}
                            {!isThisUserOwner && !isCurrent && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                title={u.is_active ? 'Desactivar acceso' : 'Activar acceso'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.is_active
                                    ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                    : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Eliminar (NUNCA al owner ni a sí mismo) */}
                            {!isThisUserOwner && !isCurrent && (
                              <button
                                onClick={() => handleDeleteCheck(u)}
                                title="Eliminar usuario"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={User}
                      title="No se encontraron usuarios"
                      message="Crea cuentas de administrador o cajero para tu equipo de trabajo."
                      action={{
                        label: 'Crear Usuario',
                        onClick: () => {
                          setEditingUser(null)
                          setIsFormOpen(true)
                        },
                      }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Usuario (Crear / Editar) */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        userToEdit={editingUser}
        onSuccess={fetchUsers}
      />

      {/* Modal de Advertencia de Historial o Confirmación de Eliminación */}
      {deleteCandidate && (
        deleteWarningMessage ? (
          <Modal
            isOpen={true}
            onClose={() => setDeleteCandidate(null)}
            title="Acción no permitida: Usuario con historial"
            size="md"
          >
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  {deleteWarningMessage}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="btn-secondary text-xs"
                >
                  Entendido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const candidate = deleteCandidate
                    setDeleteCandidate(null)
                    handleToggleStatus(candidate)
                  }}
                  className="btn bg-amber-600 text-white hover:bg-amber-700 text-xs"
                >
                  Desactivar Usuario
                </button>
              </div>
            </div>
          </Modal>
        ) : (
          <ConfirmDialog
            isOpen={true}
            onClose={() => setDeleteCandidate(null)}
            onConfirm={handleConfirmDelete}
            title="¿Eliminar usuario?"
            message={`¿Estás seguro de eliminar permanentemente la cuenta de "${deleteCandidate?.full_name}"?`}
            confirmLabel="Eliminar Usuario"
            variant="danger"
            loading={isDeleting}
          />
        )
      )}
    </div>
  )
}
