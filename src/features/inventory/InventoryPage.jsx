import React, { useState } from 'react'
import {
  Plus, Search, Warehouse, ArrowDownCircle, ArrowUpCircle,
  History, Edit2, Trash2, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react'
import { useInventory, useInventoryCategories } from './hooks/useInventory'
import InventoryItemFormModal from './components/InventoryItemFormModal'
import MovementModal from './components/MovementModal'
import MovementHistoryModal from './components/MovementHistoryModal'
import { StockStatusBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import toast from 'react-hot-toast'

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [movementModal, setMovementModal] = useState({ isOpen: false, item: null, type: 'entrada' })
  const [historyModal, setHistoryModal] = useState({ isOpen: false, item: null })
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { isAdmin } = useAuthStore()
  const admin = isAdmin()

  const { items, loading, stats, refetch } = useInventory({
    search,
    status: statusFilter,
    categoryId: categoryFilter,
  })

  const { categories } = useInventoryCategories()

  const handleOpenCreate = () => {
    setEditingItem(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (item) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleOpenMovement = (item, type) => {
    setMovementModal({ isOpen: true, item, type })
  }

  const handleOpenHistory = (item) => {
    setHistoryModal({ isOpen: true, item })
  }

  const handleDeleteItem = async () => {
    if (!deleteCandidate) return

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', deleteCandidate.id)

      if (error) throw error

      await logActivity({
        action: `Eliminó la materia prima "${deleteCandidate.name}"`,
        entityType: 'inventory_item',
        entityId: deleteCandidate.id,
        entityName: deleteCandidate.name,
      })

      toast.success('Materia prima eliminada')
      setDeleteCandidate(null)
      refetch()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const statCards = [
    { label: 'Total Insumos', count: stats.total, status: 'all', bg: 'bg-purple-50 text-purple-700 border-purple-100' },
    { label: 'Disponibles', count: stats.disponible, status: 'disponible', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Existencia Baja', count: stats.bajo, status: 'bajo', bg: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Agotados', count: stats.agotado, status: 'agotado', bg: 'bg-red-50 text-red-700 border-red-100' },
  ]

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Almacén y Materias Primas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control exclusivo de inventario de insumos, harinas, lácteos y empaques
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn-primary text-sm shadow-sm self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          <span>Nueva Materia Prima</span>
        </button>
      </div>

      {/* Tarjetas de Estados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <button
            key={c.status}
            onClick={() => setStatusFilter(c.status)}
            className={`p-3.5 rounded-xl border text-left transition-all ${c.bg} ${
              statusFilter === c.status ? 'ring-2 ring-primary-500 font-semibold shadow-sm' : 'hover:opacity-90'
            }`}
          >
            <span className="text-xs block opacity-80">{c.label}</span>
            <span className="text-2xl font-black mt-1 block">{c.count}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar materia prima..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input text-xs w-full md:w-auto"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {(search || categoryFilter || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('')
                setCategoryFilter('')
                setStatusFilter('all')
              }}
              className="text-xs text-primary-600 hover:text-primary-800 font-medium whitespace-nowrap px-2"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Almacén */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Materia Prima</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5 text-center">Stock Actual</th>
                <th className="px-4 py-3.5 text-center">Mínimo</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5">Vencimiento</th>
                <th className="px-4 py-3.5 text-right">Movimientos / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <TableSkeleton rows={6} columns={7} />
              ) : items.length > 0 ? (
                items.map((item) => {
                  const isAgotado = item.stock_status === 'agotado'
                  const isBajo = item.stock_status === 'bajo'
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50/60 transition-colors ${
                        isAgotado ? 'bg-red-50/20' : isBajo ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Nombre */}
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {item.name}
                        {item.notes && (
                          <span className="text-[10px] text-gray-400 font-normal block truncate max-w-xs">
                            {item.notes}
                          </span>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3.5 text-gray-500">
                        {item.inventory_categories?.name || 'General'}
                      </td>

                      {/* Cantidad actual */}
                      <td className="px-4 py-3.5 text-center font-black text-sm text-gray-900">
                        {item.quantity} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                      </td>

                      {/* Cantidad mínima */}
                      <td className="px-4 py-3.5 text-center text-gray-500">
                        {item.min_quantity} {item.unit}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3.5">
                        <StockStatusBadge status={item.stock_status} />
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {item.expiry_date ? formatDate(item.expiry_date) : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Entrada rápida */}
                          <button
                            onClick={() => handleOpenMovement(item, 'entrada')}
                            title="Registrar entrada (+)"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                          </button>

                          {/* Salida rápida */}
                          <button
                            onClick={() => handleOpenMovement(item, 'salida')}
                            title="Registrar salida (-)"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white transition-colors"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </button>

                          {/* Historial */}
                          <button
                            onClick={() => handleOpenHistory(item)}
                            title="Ver historial de movimientos"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Editar materia prima"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Eliminar (Admin) */}
                          {admin && (
                            <button
                              onClick={() => setDeleteCandidate(item)}
                              title="Eliminar registro"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Warehouse}
                      title="No se encontraron materias primas"
                      message="Agrega insumos como harina, azúcar o empaques para controlar el almacén de Madrigales Pastelería."
                      action={{
                        label: 'Nueva Materia Prima',
                        onClick: handleOpenCreate,
                      }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Creación / Edición */}
      <InventoryItemFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        item={editingItem}
        categories={categories}
        onSuccess={refetch}
      />

      {/* Modal de Entradas / Salidas */}
      <MovementModal
        isOpen={movementModal.isOpen}
        onClose={() => setMovementModal({ isOpen: false, item: null, type: 'entrada' })}
        item={movementModal.item}
        type={movementModal.type}
        onSuccess={refetch}
      />

      {/* Modal de Historial de Movimientos */}
      <MovementHistoryModal
        isOpen={historyModal.isOpen}
        onClose={() => setHistoryModal({ isOpen: false, item: null })}
        item={historyModal.item}
      />

      {/* Diálogo de Eliminación */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={handleDeleteItem}
        title="¿Eliminar materia prima?"
        message={`¿Estás seguro de eliminar "${deleteCandidate?.name}" del almacén? Esta acción eliminará también su historial de movimientos.`}
        confirmLabel="Eliminar Insumo"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
