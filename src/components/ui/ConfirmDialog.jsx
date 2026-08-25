import React from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

/**
 * Modal de confirmación para acciones destructivas
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning'
  loading = false,
}) {
  if (!isOpen) return null

  const isDanger = variant === 'danger'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className={`flex items-center gap-3 p-6 pb-4 border-b ${isDanger ? 'border-red-100' : 'border-amber-100'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDanger ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isDanger ? (
              <Trash2 className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 btn ${isDanger ? 'btn-danger' : 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400'}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Procesando...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
