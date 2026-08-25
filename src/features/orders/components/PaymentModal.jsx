import React, { useState } from 'react'
import { DollarSign, CreditCard, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { usePaymentMethods } from '../hooks/useOrders'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

export default function PaymentModal({ isOpen, onClose, order, onSuccess }) {
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()
  const { paymentMethods } = usePaymentMethods()

  const currentBalance = Number(order?.balance) || 0
  const todayStr = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayStr)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!order) return null

  const inputAmount = parseFloat(amount) || 0
  const isExceeding = inputAmount > currentBalance
  const newBalance = Math.max(0, currentBalance - inputAmount)

  const handlePayFull = () => {
    setAmount(currentBalance.toFixed(2))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (inputAmount <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    if (isExceeding) {
      toast.error(`El monto no puede superar el saldo pendiente (${formatCurrency(currentBalance, currencySymbol)})`)
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()

      // 1. Insertar en order_payments
      const { error: payError } = await supabase.from('order_payments').insert({
        order_id: order.id,
        amount: inputAmount,
        payment_method_id: paymentMethodId || null,
        payment_date: paymentDate || new Date().toISOString(),
        notes: notes.trim() || null,
        created_by: user?.id,
      })

      if (payError) throw payError

      // 2. Registrar log de auditoría
      await logActivity({
        action: `Registró un pago de ${formatCurrency(inputAmount, currencySymbol)} al pedido #${order.order_number}`,
        entityType: 'order',
        entityId: order.id,
        entityName: `#${order.order_number}`,
        details: {
          amount: inputAmount,
          previousBalance: currentBalance,
          newBalance,
          notes,
        },
      })

      toast.success(`Pago de ${formatCurrency(inputAmount, currencySymbol)} registrado con éxito`)
      setAmount('')
      setNotes('')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Error recording payment:', err)
      toast.error('Error al registrar pago: ' + (err.message || 'Intenta nuevamente'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar Pago / Abono — #${order.order_number}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Resumen Financiero Actual */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs">
          <div>
            <span className="text-gray-500 font-medium block">Total Pedido:</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(order.total, currencySymbol)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 font-medium block">Saldo Pendiente:</span>
            <span className="text-sm font-black text-rose-600">
              {formatCurrency(currentBalance, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Monto del Pago */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label text-xs font-bold text-gray-700 m-0">
              Monto a Pagar / Abonar ({currencySymbol}) *
            </label>
            <button
              type="button"
              onClick={handlePayFull}
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              Pagar todo el saldo
            </button>
          </div>

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
              autoFocus
              required
            />
          </div>

          {isExceeding ? (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              El monto supera el saldo pendiente de {formatCurrency(currentBalance, currencySymbol)}
            </p>
          ) : inputAmount > 0 ? (
            <p className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center justify-between">
              <span>Nuevo saldo resultante:</span>
              <span className="font-black">{formatCurrency(newBalance, currencySymbol)}</span>
            </p>
          ) : null}
        </div>

        {/* Método de Pago y Fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label text-xs font-bold text-gray-700">Método de Pago</label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                className="input pl-9 text-xs"
              >
                <option value="">Seleccionar método</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs font-bold text-gray-700">Fecha del Pago</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Observación / Referencia */}
        <div>
          <label className="label text-xs font-bold text-gray-700">
            Observación / Referencia (Opcional)
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Transferencia Bancaria BAC #4920, Efectivo en caja..."
              className="input pl-9 text-xs rounded-xl"
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
            disabled={submitting || inputAmount <= 0 || isExceeding}
            className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Guardando Pago...' : 'Confirmar Pago'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
