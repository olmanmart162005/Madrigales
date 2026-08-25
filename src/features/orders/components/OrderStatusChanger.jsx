import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, X, Lock } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import toast from 'react-hot-toast'

const STATUSES = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']

export default function OrderStatusChanger({ orderId, orderNumber, currentStatus, balance = 0, onStatusChanged }) {
  const [isOpen, setIsOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, openUpwards: false })
  const [isMobile, setIsMobile] = useState(false)
  const buttonRef = useRef(null)

  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()
  const currentBalance = Number(balance) || 0
  const hasPendingBalance = currentBalance > 0

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calcular la posición exacta en pantalla (en coordenadas fijas de viewport)
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 220
    const menuHeight = 250
    const margin = 6

    const spaceBelow = window.innerHeight - rect.bottom
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight

    let top = openUpwards ? rect.top - menuHeight - margin : rect.bottom + margin
    let left = rect.right - menuWidth

    if (left < 12) left = 12
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12
    }

    setCoords({ top, left, openUpwards })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    const handleScrollOrResize = () => {
      if (isMobile) return
      updatePosition()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isMobile, updatePosition])

  const handleToggle = (e) => {
    e.stopPropagation()
    if (!isOpen) {
      updatePosition()
    }
    setIsOpen(!isOpen)
  }

  const handleSelect = async (newStatus) => {
    if (newStatus === currentStatus) {
      setIsOpen(false)
      return
    }

    // ============================================================
    // REGLA CRÍTICA: BLOQUEAR ENTREGA SI TIENE SALDO PENDIENTE
    // ============================================================
    if (newStatus === 'entregado' && hasPendingBalance) {
      toast.error(
        `No se puede entregar este pedido porque tiene un saldo pendiente de ${formatCurrency(currentBalance, currencySymbol)}. Primero debe registrar el pago restante.`,
        { duration: 5000, id: `balance-lock-${orderId}` }
      )
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

      toast.success(`Estado de pedido #${orderNumber} actualizado a "${ORDER_STATUS_LABELS[newStatus]}"`)
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
    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        disabled={updating}
        onClick={handleToggle}
        className={`px-3 py-1 rounded-full text-[11px] font-bold border shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 hover:shadow-sm ${currentColor.bg} ${currentColor.text} ${currentColor.border}`}
      >
        <span className={`w-2 h-2 rounded-full ${currentColor.dot}`} />
        <span>{ORDER_STATUS_LABELS[currentStatus] || currentStatus}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-70 ml-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] overflow-hidden" onClick={() => setIsOpen(false)}>
            <div className={`fixed inset-0 ${isMobile ? 'bg-black/50 backdrop-blur-xs transition-opacity' : 'bg-transparent'}`} />

            {/* Versión Móvil: Bottom Sheet */}
            {isMobile ? (
              <div
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-purple-100 p-5 z-[100000] animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Estado de Entrega</h3>
                    <p className="text-xs text-purple-600 font-semibold">#{orderNumber}</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {hasPendingBalance && (
                  <div className="p-3 mb-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Saldo pendiente: <strong>{formatCurrency(currentBalance, currencySymbol)}</strong>. Debe estar pagado para entregar.</span>
                  </div>
                )}

                <div className="space-y-2">
                  {STATUSES.map((status) => {
                    const color = ORDER_STATUS_COLORS[status]
                    const isSelected = status === currentStatus
                    const isBlocked = status === 'entregado' && hasPendingBalance

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleSelect(status)}
                        className={`w-full text-left px-4 py-3 text-sm rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                          isSelected
                            ? 'font-bold text-purple-900 bg-purple-50 border-purple-200 shadow-xs'
                            : isBlocked
                            ? 'text-gray-400 bg-gray-50 border-gray-100 hover:bg-rose-50/40 hover:text-rose-700'
                            : 'text-gray-700 hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${color.dot}`} />
                          <span>{ORDER_STATUS_LABELS[status]}</span>
                        </span>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-purple-700" />
                        ) : isBlocked ? (
                          <span className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold">
                            <Lock className="w-3.5 h-3.5" />
                            Requiere Pago
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Versión Escritorio */
              <div
                style={{
                  position: 'fixed',
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: '220px',
                }}
                className="bg-white rounded-2xl shadow-2xl border border-purple-100 p-1.5 z-[100000] animate-fade-in select-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100/80 mb-1">
                  Estado de Entrega
                </div>
                <div className="space-y-0.5">
                  {STATUSES.map((status) => {
                    const color = ORDER_STATUS_COLORS[status]
                    const isSelected = status === currentStatus
                    const isBlocked = status === 'entregado' && hasPendingBalance

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleSelect(status)}
                        className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'font-bold text-purple-900 bg-purple-100/80'
                            : isBlocked
                            ? 'text-gray-400 hover:bg-rose-50 hover:text-rose-700'
                            : 'text-gray-700 hover:bg-purple-50/60'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                          {ORDER_STATUS_LABELS[status]}
                        </span>
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-purple-700" />
                        ) : isBlocked ? (
                          <Lock className="w-3.5 h-3.5 text-rose-500" title="Requiere pago completo" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
