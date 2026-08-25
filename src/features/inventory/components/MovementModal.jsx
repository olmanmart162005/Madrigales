import React, { useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

export default function MovementModal({ isOpen, onClose, item, type = 'entrada', onSuccess }) {
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!item) return null

  const isEntrada = type === 'entrada'
  const currentStock = Number(item.quantity) || 0
  const inputQty = parseFloat(quantity) || 0
  const isExceeding = !isEntrada && inputQty > currentStock

  const resultingStock = isEntrada
    ? (currentStock + inputQty).toFixed(2)
    : Math.max(0, currentStock - inputQty).toFixed(2)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (inputQty <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0')
      return
    }

    if (isExceeding) {
      toast.error(`Stock insuficiente. Solo hay ${currentStock} ${item.unit} disponibles`)
      return
    }

    try {
      setSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()

      // Registrar movimiento
      const { error: moveError } = await supabase.from('inventory_movements').insert({
        item_id: item.id,
        type,
        quantity: inputQty,
        reason: reason.trim() || (isEntrada ? 'Entrada manual' : 'Salida manual'),
        created_by: user?.id,
      })

      if (moveError) throw moveError

      // Log de actividad
      await logActivity({
        action: `${isEntrada ? 'Ingresó' : 'Retiró'} ${inputQty} ${item.unit} de "${item.name}"`,
        entityType: 'inventory',
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
        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Stock Actual:</span>
          <span className="font-bold text-gray-900 text-sm">
            {currentStock} {item.unit}
          </span>
        </div>

        {/* Cantidad */}
        <div>
          <label className="label text-xs font-bold text-gray-700">
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
              className={`input text-xs ${isExceeding ? 'border-red-300 focus:border-red-500 ring-red-100' : ''}`}
              autoFocus
              required
            />
          </div>
          {isExceeding && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              La cantidad no puede superar el stock actual ({currentStock} {item.unit})
            </p>
          )}
        </div>

        {/* Preview del resultado */}
        {inputQty > 0 && !isExceeding && (
          <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 text-xs flex justify-between items-center text-purple-900">
            <span className="font-medium">Stock resultante estimado:</span>
            <span className="font-black text-sm text-purple-950">
              {resultingStock} {item.unit}
            </span>
          </div>
        )}

        {/* Motivo */}
        <div>
          <label className="label text-xs font-bold text-gray-700">Motivo o Justificación</label>
          <textarea
            rows="2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isEntrada
                ? 'Ej. Factura #1024, Proveedor La Doña...'
                : 'Ej. Producción de 5 Pasteles de Tres Leches...'
            }
            className="input text-xs rounded-xl"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={submitting || inputQty <= 0 || isExceeding}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:shadow-md transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isEntrada
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/20'
            }`}
          >
            {submitting ? (
              'Guardando...'
            ) : isEntrada ? (
              <>
                <ArrowDownCircle className="w-4 h-4" />
                <span>Confirmar Entrada</span>
              </>
            ) : (
              <>
                <ArrowUpCircle className="w-4 h-4" />
                <span>Confirmar Salida</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
