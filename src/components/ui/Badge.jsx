import React from 'react'
import { Crown, Shield, UserCheck, CircleDot, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, STOCK_STATUS_LABELS } from '@/utils'

/**
 * Badge de estado para pedidos (Entrega / Preparación)
 */
export function OrderStatusBadge({ status }) {
  const colors = ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.pendiente
  const label = ORDER_STATUS_LABELS[status] || status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} mr-1.5`} />
      {label}
    </span>
  )
}

/**
 * Badge de Estado de Pago (Pendiente | Parcial | Pagado)
 */
export function PaymentStatusBadge({ amountPaid = 0, balance = 0 }) {
  const paid = Number(amountPaid) || 0
  const bal = Number(balance) || 0

  if (bal <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
        <span>Pagado</span>
      </span>
    )
  }

  if (paid > 0 && bal > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
        <Clock className="w-3 h-3 text-purple-700" />
        <span>Parcial</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
      <AlertCircle className="w-3 h-3 text-amber-700" />
      <span>Pendiente</span>
    </span>
  )
}

/**
 * Badge de estado de stock para inventario
 */
export function StockStatusBadge({ status }) {
  const styles = {
    disponible: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bajo: 'bg-amber-100 text-amber-800 border-amber-200',
    agotado: 'bg-rose-100 text-rose-800 border-rose-200',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[status] || styles.disponible}`}>
      {STOCK_STATUS_LABELS[status] || status}
    </span>
  )
}

/**
 * Badge de rol de usuario redondeado (rounded-full) y estilizado
 */
export function RoleBadge({ role, isOwner = false }) {
  if (isOwner) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
        <Crown className="w-3 h-3 text-amber-700 fill-amber-700" />
        <span>PROPIETARIO</span>
      </span>
    )
  }

  if (role === 'administrador') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
        <Shield className="w-3 h-3 text-purple-700 fill-purple-700/30" />
        <span>ADMINISTRADOR</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs">
      <UserCheck className="w-3 h-3 text-blue-700" />
      <span>CAJERO</span>
    </span>
  )
}

/**
 * Badge genérico con variante
 */
export function Badge({ children, variant = 'gray' }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-purple-100 text-purple-700 border-purple-200',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger: 'bg-rose-100 text-rose-700 border-rose-200',
    gold: 'bg-amber-100 text-amber-900 border-amber-300',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${variants[variant] || variants.gray}`}>
      {children}
    </span>
  )
}
