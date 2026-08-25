import React from 'react'
import { ArrowDownCircle, ArrowUpCircle, Calendar, User, Clock, Package } from 'lucide-react'
import { useInventoryMovements } from '../hooks/useInventory'
import Modal from '@/components/ui/Modal'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/utils'

export default function MovementHistoryModal({ isOpen, onClose, item }) {
  const { movements, loading } = useInventoryMovements(item?.id)

  if (!item) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Movimientos: ${item.name}`}
      size="lg"
    >
      <div className="p-6 space-y-4">
        {/* Resumen del ítem */}
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400 block">Stock Actual</span>
            <span className="font-bold text-gray-900 text-sm">
              {item.quantity} {item.unit}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-400 block">Total Movimientos</span>
            <span className="font-semibold text-gray-800">{movements.length}</span>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="border border-gray-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100 sticky top-0">
              <tr>
                <th className="px-3.5 py-2.5">Fecha</th>
                <th className="px-3.5 py-2.5">Tipo</th>
                <th className="px-3.5 py-2.5 text-center">Cant.</th>
                <th className="px-3.5 py-2.5 text-center">Antes / Después</th>
                <th className="px-3.5 py-2.5">Motivo / Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <TableSkeleton rows={4} columns={5} />
              ) : movements.length > 0 ? (
                movements.map((m) => {
                  const isEntrada = m.type === 'entrada'
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50">
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-gray-500">
                        {formatDate(m.created_at, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span
                          className={`badge text-[11px] py-0.5 px-2 font-semibold flex items-center gap-1 w-fit ${
                            isEntrada
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isEntrada ? (
                            <>
                              <ArrowDownCircle className="w-3 h-3 text-emerald-600" />
                              Entrada
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="w-3 h-3 text-red-600" />
                              Salida
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold whitespace-nowrap">
                        <span className={isEntrada ? 'text-emerald-700' : 'text-red-600'}>
                          {isEntrada ? '+' : '-'}
                          {m.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center text-gray-400 whitespace-nowrap">
                        {m.quantity_before} &rarr; <span className="font-semibold text-gray-800">{m.quantity_after}</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <p className="font-medium text-gray-900 line-clamp-1">{m.reason || 'Sin motivo'}</p>
                        <span className="text-[10px] text-gray-400 block">
                          Por: {m.profiles?.full_name || 'Sistema'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">
                    No hay movimientos registrados para este insumo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-xs">
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}
