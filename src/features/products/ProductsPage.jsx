import React, { useState } from 'react'
import { Plus, Search, Filter, Layers, Package, AlertTriangle } from 'lucide-react'
import { useProducts, useProductCategories } from './hooks/useProducts'
import ProductCard from './components/ProductCard'
import ProductFormModal from './components/ProductFormModal'
import CategoryManager from './components/CategoryManager'
import { ProductCardSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import toast from 'react-hot-toast'

export default function ProductsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'
  const [categoryFilter, setCategoryFilter] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)

  // Estados para diálogo de eliminación
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [deleteWarningMessage, setDeleteWarningMessage] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { isAdmin } = useAuthStore()
  const admin = isAdmin()

  const { products, loading, refetch } = useProducts({
    search,
    status: statusFilter,
    categoryId: categoryFilter,
  })

  const { categories, refetch: refetchCategories } = useProductCategories()

  // Manejar creación
  const handleOpenCreate = () => {
    setEditingProduct(null)
    setIsFormOpen(true)
  }

  // Manejar edición
  const handleEdit = (prod) => {
    setEditingProduct(prod)
    setIsFormOpen(true)
  }

  // Activar / Desactivar producto (Acción recomendada)
  const handleToggleStatus = async (prod) => {
    try {
      const newStatus = !prod.is_active
      const { error } = await supabase
        .from('products')
        .update({ is_active: newStatus })
        .eq('id', prod.id)

      if (error) throw error

      await logActivity({
        action: newStatus
          ? `Activó el producto "${prod.name}"`
          : `Desactivó el producto "${prod.name}"`,
        entityType: 'product',
        entityId: prod.id,
        entityName: prod.name,
      })

      toast.success(
        newStatus
          ? `Producto "${prod.name}" activado`
          : `Producto "${prod.name}" desactivado para nuevas ventas`
      )
      refetch()
    } catch (err) {
      console.error(err)
      toast.error('Error al cambiar el estado del producto')
    }
  }

  // Comprobar si el producto puede ser eliminado físicamente o sólo desactivado
  const handleDeleteCheck = async (prod) => {
    try {
      // Verificar si existe en la tabla de detalle de pedidos
      const { count, error } = await supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', prod.id)

      if (error) throw error

      if (count && count > 0) {
        // Tiene historial: NO permitir eliminación física
        setDeleteWarningMessage(
          `El producto "${prod.name}" tiene ${count} pedido(s) o venta(s) asociada(s) en su historial. Por integridad de datos y facturación histórica, no se puede eliminar físicamente. La opción recomendada es DESACTIVARLO para que no aparezca en nuevas ventas pero conserve su registro histórico.`
        )
        setDeleteCandidate(prod)
      } else {
        // No tiene historial: permitir confirmación de eliminación
        setDeleteWarningMessage(null)
        setDeleteCandidate(prod)
      }
    } catch (err) {
      console.error('Error checking order history:', err)
      toast.error('Error al verificar historial del producto')
    }
  }

  // Confirmar eliminación física
  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteCandidate.id)

      if (error) throw error

      await logActivity({
        action: `Eliminó el producto "${deleteCandidate.name}"`,
        entityType: 'product',
        entityId: deleteCandidate.id,
        entityName: deleteCandidate.name,
      })

      toast.success('Producto eliminado')
      setDeleteCandidate(null)
      refetch()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Administra los pasteles, postres y artículos a la venta en Madrigales Pastelería
          </p>
        </div>

        {admin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCategoriesOpen(true)}
              className="btn-secondary text-sm"
              title="Administrar categorías"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Categorías</span>
            </button>

            <button
              onClick={handleOpenCreate}
              className="btn-primary text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Buscador */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Filtro por Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Filtro por Estado */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-primary-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-white text-gray-700 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteCheck}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="No se encontraron productos"
          message={
            search || categoryFilter || statusFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda o categoría.'
              : 'Empieza agregando tu primer producto al catálogo para registrar ventas.'
          }
          action={
            admin && !search && !categoryFilter && statusFilter === 'all'
              ? { label: 'Crear Producto', onClick: handleOpenCreate }
              : null
          }
        />
      )}

      {/* Modal de Crear / Editar Producto */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        product={editingProduct}
        categories={categories}
        onSuccess={refetch}
      />

      {/* Modal de Administración de Categorías */}
      <Modal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        title="Categorías de Productos"
        size="md"
      >
        <div className="p-6">
          <CategoryManager
            categories={categories}
            onRefresh={() => {
              refetchCategories()
              refetch()
            }}
          />
        </div>
      </Modal>

      {/* Modal de Advertencia o Confirmación de Eliminación */}
      {deleteCandidate && (
        deleteWarningMessage ? (
          <Modal
            isOpen={true}
            onClose={() => setDeleteCandidate(null)}
            title="Acción no permitida: Producto con historial"
            size="md"
          >
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  {deleteWarningMessage}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="btn-secondary text-sm"
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
                  className="btn bg-amber-500 text-white hover:bg-amber-600 text-sm"
                >
                  Desactivar Producto
                </button>
              </div>
            </div>
          </Modal>
        ) : (
          <ConfirmDialog
            isOpen={true}
            onClose={() => setDeleteCandidate(null)}
            onConfirm={handleConfirmDelete}
            title="¿Eliminar producto?"
            message={`¿Estás seguro de eliminar permanentemente "${deleteCandidate.name}"? Esta acción no se puede deshacer.`}
            confirmLabel="Eliminar permanentemente"
            variant="danger"
            loading={isDeleting}
          />
        )
      )}
    </div>
  )
}
