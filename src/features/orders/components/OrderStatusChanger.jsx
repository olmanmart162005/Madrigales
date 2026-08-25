import React, { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/utils'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import toast from 'react-hot-toast'

const STATUSES = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']

export default function OrderStatusChanger({ orderId, orderNumber, currentStatus, onStatusChanged }) {
  const [isOpen, setIsOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const handleSelect = async (newStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false)
      return
    }

    if (newStatus === 'cancelado') {
      if (!window.confirm(`¿Estás seguro de cancelar el pedido #${orderNumber}?`)) {
        return
      }
    }

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      await logActivity({
        action: `Cambió el estado del pedido #${orderNumber} a "${ORDER_STATUS_LABELS[newStatus]}"`,
        entityType: 'order',
        entityId: orderId,
        entityName: `#${orderNumber}`,
        details: { oldStatus: currentStatus, newStatus },
      })

      toast.success(`Estado actualizado a "${ORDER_STATUS_LABELS[newStatus]}"`)
      onStatusChanged?.(newStatus)
      setIsOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Error al actualizar estado: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  const currentColor = ORDER_STATUS_COLORS[currentStatus] || ORDER_STATUS_COLORS.pendiente

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={updating}
        onClick={() => setIsOpen(!isOpen)}
        className={`badge py-1 px-3 border transition-all cursor-pointer inline-flex items-center gap-1.5 ${currentColor.bg} ${currentColor.text} ${currentColor.border}`}
      >
        <span className={`w-2 h-2 rounded-full ${currentColor.dot}`} />
        <span className="font-semibold">{ORDER_STATUS_LABELS[currentStatus] || currentStatus}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-elevated border border-gray-100 py-1 z-30 animate-fade-in">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-50">
              Cambiar Estado
            </div>
            {STATUSES.map((status) => {
              const color = ORDER_STATUS_COLORS[status]
              const isSelected = status === currentStatus
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelect(status)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    isSelected ? 'font-bold text-primary-700 bg-primary-50/50' : 'text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
