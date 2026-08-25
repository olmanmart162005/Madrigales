import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import toast from 'react-hot-toast'

export default function CategoryManager({ categories, onRefresh }) {
  const [newCatName, setNewCatName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_categories')
        .insert([{ name: newCatName.trim() }])
        .select()
        .single()

      if (error) throw error

      await logActivity({
        action: `Agregó la categoría de productos "${newCatName.trim()}"`,
        entityType: 'product_category',
        entityId: data.id,
      })

      toast.success('Categoría agregada')
      setNewCatName('')
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.error('Error al crear categoría: ' + (err.message || 'Ya existe'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id) => {
    if (!editName.trim()) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('product_categories')
        .update({ name: editName.trim() })
        .eq('id', id)

      if (error) throw error

      toast.success('Categoría actualizada')
      setEditingId(null)
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    try {
      // Verificar si hay productos con esta categoría
      const { count, error: countError } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id)

      if (countError) throw countError

      if (count > 0) {
        toast.error(`No se puede eliminar: tiene ${count} producto(s) asignados.`)
        return
      }

      if (!window.confirm(`¿Seguro que deseas eliminar la categoría "${name}"?`)) {
        return
      }

      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Categoría eliminada')
      onRefresh()
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar: ' + err.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Formulario nueva categoría */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Nueva categoría..."
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="input text-sm flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newCatName.trim()}
          className="btn-primary py-2 px-3 text-xs"
        >
          <Plus className="w-4 h-4" />
          Agregar
        </button>
      </form>

      {/* Lista */}
      <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
        {categories.map((cat) => (
          <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-gray-50 text-sm">
            {editingId === cat.id ? (
              <div className="flex items-center gap-2 flex-1 mr-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input py-1 text-xs"
                  autoFocus
                />
                <button
                  onClick={() => handleUpdate(cat.id)}
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="font-medium text-gray-800">{cat.name}</span>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingId(cat.id)
                  setEditName(cat.name)
                }}
                className="p-1 text-gray-400 hover:text-primary-600 rounded"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(cat.id, cat.name)}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <p className="p-4 text-center text-xs text-gray-400">No hay categorías registradas.</p>
        )}
      </div>
    </div>
  )
}
