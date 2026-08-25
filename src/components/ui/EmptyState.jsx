import React from 'react'
import { Package, ShoppingBag, Inbox } from 'lucide-react'

/**
 * Componente de estado vacío genérico
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'No hay resultados',
  message = 'Aún no hay datos para mostrar.',
  action = null, // { label, onClick }
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-primary-300" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 btn-primary"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
