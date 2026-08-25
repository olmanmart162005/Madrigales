import React, { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

export default function MovementModal({ isOpen, onClose, item, type = 'entrada', onSuccess }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuthStore()

  if (!item) return null

  const isEntrada = type === 'entrada'
  const currentStock = Number(item.quantity) || 0
  const inputQty = parseFloat(quantity) || 0

  const resultingStock = isEntrada
    ? currentStock + inputQty
    : Math.max(0, currentStock - inputQty)

  const isExceeding = !isEntrada && inputQty > currentStock

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (inputQty <= 0) {
      toast.error('Ingresa una cantidad mayor a 0')
      return
    }

    if (isExceeding) {
      toast.error(`Stock insuficiente. Máximo disponible: ${currentStock} ${item.unit}`)
      return
    }

    try {
      setSubmitting(true)

      const movementPayload = {
        item_id: item.id,
        type: isEntrada ? 'entrada' : 'salida',
        quantity: inputQty,
        quantity_before: currentStock,
        quantity_after: resultingStock,
        reason: reason.trim() || (isEntrada ? 'Compra / Reabastecimiento' : 'Uso en producción'),
        created_by: user?.id || null,
      }

      // 1. Insertar movimiento
      const { error: moveError } = await supabase
        .from('inventory_movements')
        .insert([movementPayload])

      if (moveError) throw moveError

      // 2. Actualizar cantidad en inventory_items
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: resultingStock })
        .eq('id', item.id)

      if (updateError) throw updateError

      // 3. Registrar en Activity Log
      await logActivity({
        action: isEntrada
          ? `Registró ENTRADA de ${inputQty} ${item.unit} de "${item.name}" (Nuevo stock: ${resultingStock})`
          : `Registró SALIDA de ${inputQty} ${item.unit} de "${item.name}" (Nuevo stock: ${resultingStock})`,
        entityType: 'inventory_movement',
        entityId: item.id,
        entityName: item.name,
        details: {
          type,
          quantity: inputQty,
          previous: currentStock,
          resulting: resultingStock,
          reason,
        },
      })

      toast.success(
        isEntrada
          ? `Entrada de ${inputQty} ${item.unit} registrada`
          : `Salida de ${inputQty} ${item.unit} registrada`
      )

      setQuantity('')
      setReason('')
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar movimiento: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEntrada ? `Registrar Entrada: ${item.name}` : `Registrar Salida: ${item.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Banner de stock actual */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">Stock Actual:</span>
          <span className="font-bold text-gray-900 text-sm">
            {currentStock} {item.unit}
          </span>
        </div>

        {/* Cantidad */}
        <div>
          <label className="label">
            Cantidad a {isEntrada ? 'Ingresar' : 'Retirar'} ({item.unit}) *
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`input ${isExceeding ? 'border-red-300 focus:border-red-500 ring-red-100' : ''}`}
              autoFocus
              required
            />
          </div>
          {isExceeding && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              La cantidad no puede superar el stock actual ({currentStock} {item.unit})
            </p>
          )}
        </div>

        {/* Preview del resultado */}
        {inputQty > 0 && !isExceeding && (
          <div className="p-3 bg-primary-50/60 rounded-xl border border-primary-100 text-xs flex justify-between items-center text-primary-900">
            <span>Stock resultante estimado:</span>
            <span className="font-bold text-sm">
              {resultingStock} {item.unit}
            </span>
          </div>
        )}

        {/* Motivo */}
        <div>
          <label className="label">Motivo o Justificación</label>
          <textarea
            rows="2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isEntrada
                ? 'Ej. Factura #1024, Proveedor La Doña...'
                : 'Ej. Producción de 5 Pasteles de Tres Leches...'
            }
            className="input text-xs"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || inputQty <= 0 || isExceeding}
            className={`btn ${
              isEntrada
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {submitting ? (
              'Guardando...'
            ) : isEntrada ? (
              <span className="flex items-center gap-1.5">
                <ArrowDownCircle className="w-4 h-4" />
                Confirmar Entrada
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <ArrowUpCircle className="w-4 h-4" />
                Confirmar Salida
              </span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
