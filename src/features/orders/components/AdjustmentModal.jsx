import React, { useState } from 'react'
import { DollarSign, ShieldAlert, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

const ADJUSTMENT_TYPES = [
  { value: 'descuento', label: 'Descuento Comercial Autorizado' },
  { value: 'correccion', label: 'Corrección de Monto' },
  { value: 'ajuste_autorizado', label: 'Ajuste Manual Autorizado' },
  { value: 'otro', label: 'Otro Ajuste' },
]

export default function AdjustmentModal({ isOpen, onClose, order, onSuccess }) {
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()
  const { isOwner, isAdmin } = useAuthStore()

  const currentBalance = Number(order?.balance) || 0

  const [adjustmentType, setAdjustmentType] = useState('descuento')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  // Seguridad: Solo Admin u Owner pueden acceder a este modal
  if (!isAdmin() && !isOwner()) {
    return null
  }

  const inputAmount = parseFloat(amount) || 0
  const isExceeding = inputAmount > currentBalance
  const newBalance = Math.max(0, currentBalance - inputAmount)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (inputAmount <= 0) {
      toast.error('El monto del ajuste debe ser mayor a 0')
      return
    }

    if (isExceeding) {
      toast.error(`El ajuste no puede superar el saldo pendiente (${formatCurrency(currentBalance, currencySymbol)})`)
      return
    }

    if (!reason.trim()) {
      toast.error('Debes ingresar un motivo o justificación obligatoria para este ajuste')
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Insertar en order_adjustments
      const { error: adjError } = await supabase.from('order_adjustments').insert({
        order_id: order.id,
        adjustment_type: adjustmentType,
        amount: inputAmount,
        reason: reason.trim(),
        created_by: user?.id,
      })

      if (adjError) throw adjError

      const typeLabel = ADJUSTMENT_TYPES.find((t) => t.value === adjustmentType)?.label || adjustmentType

      // 2. Registrar log de auditoría
      await logActivity({
        action: `Aplicó ajuste de ${formatCurrency(inputAmount, currencySymbol)} (${typeLabel}) al pedido #${order.order_number}. Motivo: "${reason.trim()}"`,
        entityType: 'order',
        entityId: order.id,
        entityName: `#${order.order_number}`,
        details: {
          adjustmentType,
          amount: inputAmount,
          previousBalance: currentBalance,
          newBalance,
          reason: reason.trim(),
        },
      })

      toast.success(`Ajuste de ${formatCurrency(inputAmount, currencySymbol)} aplicado correctamente`)
      setAmount('')
      setReason('')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error applying adjustment:', err)
      toast.error('Error al aplicar ajuste: ' + (err.message || 'Intenta nuevamente'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Ajustar Saldo — Pedido #${order.order_number}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Banner de Advertencia de Autorización */}
        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p>
            Esta acción modificará el saldo del pedido y quedará registrada en el historial financiero y de auditoría.
          </p>
        </div>

        {/* Resumen del Saldo Actual */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
          <div>
            <span className="text-gray-500 font-medium block">Total Pedido:</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(order.total, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block">Saldo Actual:</span>
            <span className="text-sm font-black text-rose-600">
              {formatCurrency(currentBalance, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Tipo de Ajuste */}
        <div>
          <label className="label text-xs font-bold text-gray-700">Tipo de Ajuste *</label>
          <select
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value)}
            className="input text-xs"
          >
            {ADJUSTMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Monto del Ajuste */}
        <div>
          <label className="label text-xs font-bold text-gray-700">
            Monto a Reducir / Ajustar ({currencySymbol}) *
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={currentBalance}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`input pl-9 text-xs font-bold ${isExceeding ? 'border-red-400 focus:border-red-500' : ''}`}
              required
            />
          </div>

          {isExceeding ? (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              El ajuste supera el saldo pendiente de {formatCurrency(currentBalance, currencySymbol)}
            </p>
          ) : inputAmount > 0 ? (
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
              <span>Nuevo saldo resultante:</span>
              <span className="font-black">{formatCurrency(newBalance, currencySymbol)}</span>
            </p>
          ) : null}
        </div>

        {/* Motivo o Justificación Obligatoria */}
        <div>
          <label className="label text-xs font-bold text-gray-700">
            Motivo / Justificación Obligatoria *
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica detalladamente la razón de este ajuste (ej. Descuento del 10% autorizado por Olman Martínez, corrección por redondeo...)"
              className="input pl-9 text-xs rounded-xl"
              required
            />
          </div>
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
            disabled={submitting || inputAmount <= 0 || isExceeding || !reason.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-sm hover:shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Aplicando Ajuste...' : 'Confirmar Ajuste'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
