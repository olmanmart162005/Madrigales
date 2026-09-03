import React, { useState, useMemo, useEffect } from 'react'
import { DollarSign, CreditCard, Calendar, FileText, CheckCircle2, AlertCircle, Banknote, CheckCheck } from 'lucide-react'
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
  const [cashReceived, setCashReceived] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayStr)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Por defecto seleccionar Efectivo
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !paymentMethodId) {
      const cash = paymentMethods.find((m) => m.name.toLowerCase().includes('efectivo'))
      setPaymentMethodId(cash ? cash.id : paymentMethods[0].id)
    }
  }, [paymentMethods, paymentMethodId])

  if (!order) return null

  const selectedMethod = paymentMethods.find((m) => m.id === paymentMethodId)
  const isCash = selectedMethod?.name.toLowerCase().includes('efectivo')

  const inputAmount = parseFloat(amount) || 0
  const isExceeding = inputAmount > currentBalance
  const newBalance = Math.max(0, currentBalance - inputAmount)

  const numCashReceived = parseFloat(cashReceived) || 0
  const cashDiff = numCashReceived - inputAmount
  const isExactPayment = isCash && inputAmount > 0 && Math.abs(cashDiff) < 0.001
  const hasCashChange = isCash && inputAmount > 0 && cashDiff > 0.001
  const hasCashShortage = isCash && inputAmount > 0 && cashReceived !== '' && cashDiff < -0.001

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

    if (isCash && numCashReceived > 0 && numCashReceived < inputAmount) {
      toast.error(`Efectivo insuficiente. Faltan ${formatCurrency(inputAmount - numCashReceived, currencySymbol)}`)
      return
    }

    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()

      const calculatedChange = isCash && numCashReceived >= inputAmount
        ? numCashReceived - inputAmount
        : null

      // 1. Insertar en order_payments
      const { error: payError } = await supabase.from('order_payments').insert({
        order_id: order.id,
        amount: inputAmount,
        payment_method_id: paymentMethodId || null,
        cash_received: isCash && numCashReceived > 0 ? numCashReceived : null,
        change_returned: calculatedChange,
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
          cashReceived: isCash ? numCashReceived : null,
          changeReturned: calculatedChange,
          notes,
        },
      })

      toast.success(`Pago de ${formatCurrency(inputAmount, currencySymbol)} registrado con éxito`)
      setAmount('')
      setCashReceived('')
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
      <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans">
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
              className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
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

        {/* Si es Efectivo -> Calculadora de Vuelto */}
        {isCash && inputAmount > 0 && (
          <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Efectivo Recibido:</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-bold text-xs">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={inputAmount.toFixed(2)}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-24 h-8 text-right text-xs bg-white border border-gray-300 rounded-lg px-2 font-bold focus:border-purple-600"
                />
              </div>
            </div>

            {hasCashShortage ? (
              <p className="text-[11px] text-red-600 font-bold flex items-center justify-between">
                <span>Faltante:</span>
                <span>{formatCurrency(Math.abs(cashDiff), currencySymbol)}</span>
              </p>
            ) : isExactPayment ? (
              <p className="text-[11px] text-emerald-700 font-bold flex items-center justify-between">
                <span>Pago Exacto:</span>
                <span>Vuelto: L 0.00</span>
              </p>
            ) : hasCashChange ? (
              <div className="p-2 rounded-xl bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-black">
                <span>VUELTO A ENTREGAR:</span>
                <span>{formatCurrency(cashDiff, currencySymbol)}</span>
              </div>
            ) : null}
          </div>
        )}

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
            disabled={submitting || inputAmount <= 0 || isExceeding || hasCashShortage}
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
