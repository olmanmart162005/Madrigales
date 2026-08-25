import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const UNITS = [
  'libras',
  'kilos',
  'gramos',
  'litros',
  'mililitros',
  'unidades',
  'cajas',
  'bolsas',
  'paquetes',
  'docenas',
]

const itemSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  category_id: z.string().min(1, 'Selecciona una categoría'),
  quantity: z.coerce.number().min(0, 'La cantidad no puede ser negativa').default(0),
  unit: z.string().min(1, 'Selecciona una unidad de medida'),
  min_quantity: z.coerce.number().min(0, 'El mínimo no puede ser negativo').default(1),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
})

export default function InventoryItemFormModal({ isOpen, onClose, item, categories, onSuccess }) {
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuthStore()
  const isEditing = !!item

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      category_id: '',
      quantity: 0,
      unit: 'libras',
      min_quantity: 5,
      expiry_date: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (item) {
      reset({
        name: item.name || '',
        category_id: item.category_id || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'libras',
        min_quantity: item.min_quantity || 1,
        expiry_date: item.expiry_date || '',
        notes: item.notes || '',
      })
    } else {
      reset({
        name: '',
        category_id: categories[0]?.id || '',
        quantity: 0,
        unit: 'libras',
        min_quantity: 5,
        expiry_date: '',
        notes: '',
      })
    }
  }, [item, categories, reset, isOpen])

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)
      const payload = {
        name: values.name.trim(),
        category_id: values.category_id || null,
        unit: values.unit,
        min_quantity: parseFloat(values.min_quantity),
        expiry_date: values.expiry_date || null,
        notes: values.notes ? values.notes.trim() : null,
      }

      if (isEditing) {
        // En edición no cambiamos quantity directamente para mantener integridad
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', item.id)

        if (error) throw error

        await logActivity({
          action: `Modificó datos de la materia prima "${values.name}"`,
          entityType: 'inventory_item',
          entityId: item.id,
          entityName: values.name,
        })

        toast.success('Materia prima actualizada')
      } else {
        // Al crear, agregamos quantity inicial
        payload.quantity = parseFloat(values.quantity) || 0
        payload.created_by = user?.id || null

        const { data: created, error } = await supabase
          .from('inventory_items')
          .insert([payload])
          .select()
          .single()

        if (error) throw error

        // Si inició con cantidad > 0, registrar primer movimiento
        if (payload.quantity > 0) {
          await supabase.from('inventory_movements').insert({
            item_id: created.id,
            type: 'entrada',
            quantity: payload.quantity,
            quantity_before: 0,
            quantity_after: payload.quantity,
            reason: 'Inventario inicial al crear registro',
            created_by: user?.id || null,
          })
        }

        await logActivity({
          action: `Registró la nueva materia prima "${values.name}" con stock inicial de ${payload.quantity} ${payload.unit}`,
          entityType: 'inventory_item',
          entityId: created.id,
          entityName: values.name,
        })

        toast.success('Materia prima registrada exitosamente')
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar: ' + (err.message || 'Verifica los datos'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Materia Prima' : 'Nueva Materia Prima / Insumo'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <label className="label">Nombre del Insumo / Materia Prima *</label>
          <input
            {...register('name')}
            type="text"
            placeholder="Ej. Harina de Trigo Especial, Cacao 70%, Vainilla..."
            className="input"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Categoría *</label>
            <select {...register('category_id')} className="input">
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>
            )}
          </div>

          <div>
            <label className="label">Unidad de Medida *</label>
            <select {...register('unit')} className="input capitalize">
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEditing ? (
            <div>
              <label className="label">Cantidad Inicial *</label>
              <input
                {...register('quantity')}
                type="number"
                step="0.01"
                min="0"
                className="input"
              />
              {errors.quantity && (
                <p className="text-xs text-red-500 mt-1">{errors.quantity.message}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Cantidad Actual en Stock</label>
              <input
                type="text"
                disabled
                value={`${item?.quantity || 0} ${item?.unit || ''}`}
                className="input bg-gray-50 text-gray-500 font-bold"
              />
              <span className="text-[10px] text-gray-400">
                Usa los botones de Entrada (+) y Salida (-) para modificar stock.
              </span>
            </div>
          )}

          <div>
            <label className="label">Cantidad Mínima (Alerta Stock Bajo) *</label>
            <input
              {...register('min_quantity')}
              type="number"
              step="0.01"
              min="0"
              className="input"
            />
            {errors.min_quantity && (
              <p className="text-xs text-red-500 mt-1">{errors.min_quantity.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Fecha de Vencimiento (Opcional)</label>
          <input {...register('expiry_date')} type="date" className="input" />
        </div>

        <div>
          <label className="label">Observaciones / Proveedor</label>
          <textarea
            {...register('notes')}
            rows="2"
            placeholder="Proveedor habitual, marca, especificaciones..."
            className="input text-xs"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Insumo'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
