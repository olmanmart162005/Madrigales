import React from 'react'
import { Crown } from 'lucide-react'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, STOCK_STATUS_LABELS } from '@/utils'

/**
 * Badge de estado para pedidos
 */
export function OrderStatusBadge({ status }) {
  const colors = ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.pendiente
  const label = ORDER_STATUS_LABELS[status] || status

  return (
    <span className={`badge ${colors.bg} ${colors.text} border ${colors.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} mr-1.5`} />
      {label}
    </span>
  )
}

/**
 * Badge de estado de stock para inventario
 */
export function StockStatusBadge({ status }) {
  const styles = {
    disponible: 'stock-disponible',
    bajo: 'stock-bajo',
    agotado: 'stock-agotado',
  }

  return (
    <span className={styles[status] || 'stock-disponible'}>
      {STOCK_STATUS_LABELS[status] || status}
    </span>
  )
}

/**
 * Badge de rol de usuario con distinción para el Propietario (Owner)
 */
export function RoleBadge({ role, isOwner = false }) {
  if (isOwner) {
    return (
      <span className="badge bg-gradient-to-r from-amber-100 via-rose-100 to-amber-100 text-amber-900 border border-amber-300/80 shadow-sm font-bold flex items-center gap-1">
        <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
        Propietario / Admin
      </span>
    )
  }

  const styles = {
    administrador: 'bg-purple-100 text-purple-800 border border-purple-200 font-semibold',
    cajero: 'bg-blue-100 text-blue-800 border border-blue-200 font-medium',
    empleado: 'bg-blue-100 text-blue-800 border border-blue-200 font-medium',
  }

  const labels = {
    administrador: 'Administrador',
    cajero: 'Cajero',
    empleado: 'Cajero',
  }

  return (
    <span className={`badge ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
      {labels[role] || role}
    </span>
  )
}

/**
 * Badge genérico con variante
 */
export function Badge({ children, variant = 'gray' }) {
  const variants = {
    gray: 'bg-gray-100 text-gray-700',
    primary: 'bg-primary-100 text-primary-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    gold: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={`badge ${variants[variant] || variants.gray}`}>
      {children}
    </span>
  )
}
