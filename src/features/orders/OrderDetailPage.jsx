import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Printer, FileText, Download, Calendar, Clock, User,
  CreditCard, CheckCircle, AlertTriangle, Trash2, Layers
} from 'lucide-react'
import { useOrder } from './hooks/useOrders'
import OrderStatusChanger from './components/OrderStatusChanger'
import InvoicePreviewModal from './components/InvoicePreviewModal'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDate, formatTime, formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { generateOrderPDF } from '@/lib/pdf'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import toast from 'react-hot-toast'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { order, items, loading, error, refetch } = useOrder(id)
  const { settings, getCurrencySymbol } = useSettingsStore()
  const { profile, isOwner, isAdmin } = useAuthStore()
  const admin = isAdmin()
  const owner = isOwner()
  const currencySymbol = getCurrencySymbol()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-600 mb-4">No se pudo encontrar el pedido solicitado.</p>
        <Link to="/pedidos" className="btn-primary">
          Volver a Pedidos
        </Link>
      </div>
    )
  }

  const emitterName = profile?.full_name || 'Olman Martínez'
  const emitterRole = owner ? 'Propietario' : profile?.role === 'administrador' ? 'Administrador' : 'Cajero'

  const handleDownloadPDF = async () => {
    try {
      setGeneratingPdf(true)
      await generateOrderPDF(order, items, settings || {}, { name: emitterName, role: emitterRole })
      toast.success('Factura descargada correctamente')
    } catch (err) {
      console.error(err)
      toast.error('Error al generar factura PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDeleteOrder = async () => {
    try {
      setIsDeleting(true)
      const { error: delErr } = await supabase.from('orders').delete().eq('id', order.id)
      if (delErr) throw delErr

      await logActivity({
        action: `Eliminó el pedido #${order.order_number}`,
        entityType: 'order',
        entityId: order.id,
        entityName: `#${order.order_number}`,
      })

      toast.success('Pedido eliminado')
      navigate('/pedidos')
    } catch (err) {
      console.error(err)
      toast.error('Error al eliminar pedido: ' + err.message)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const hasBalance = Number(order.balance) > 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-fade-in">
      {/* Barra superior con navegación y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/pedidos"
            className="p-2 rounded-xl text-gray-500 hover:text-purple-700 bg-white hover:bg-purple-50 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Pedido #{order.order_number}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-gray-400">
              Registrado el {formatDate(order.order_date)}
            </p>
          </div>
        </div>

        {/* Botones de Acción: Vista Previa, Descargar PDF, Eliminar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Ver vista previa de factura Carta"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Vista Previa</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
            title="Descargar comprobante en PDF"
          >
            <Download className="w-4 h-4" />
            <span>{generatingPdf ? 'Generando...' : 'Descargar PDF'}</span>
          </button>

          {admin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
              title="Eliminar pedido"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid de Estado y Cambiador de Estado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cambiador de Estado */}
        <div className="card p-5 bg-white border border-purple-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Estado del Pedido
          </span>
          <OrderStatusChanger
            orderId={order.id}
            currentStatus={order.status}
            onStatusChange={() => refetch()}
          />
        </div>

        {/* Cliente & Entrega */}
        <div className="card p-5 bg-white border border-purple-100 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Cliente & Entrega
          </span>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="font-bold text-gray-900 text-sm">
              {order.customer_name || 'Consumidor Final'}
            </span>
          </div>
          {order.delivery_date && (
            <div className="flex items-center gap-2 text-xs text-gray-600 pt-1">
              <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <span>
                Entrega: {formatDate(order.delivery_date)}
                {order.delivery_time ? ` (${formatTime(order.delivery_time)})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Estado Financiero */}
        <div className="card p-5 bg-white border border-purple-100 shadow-xs space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            Resumen Financiero
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">Total:</span>
            <span className="text-lg font-black text-purple-900">
              {formatCurrency(order.total, currencySymbol)}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-gray-500">Saldo pendiente:</span>
            <span className={`font-bold ${hasBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
              {hasBalance ? formatCurrency(order.balance, currencySymbol) : 'Pagado completo'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Productos y Presentaciones del Pedido */}
      <div className="card bg-white border border-purple-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-purple-50/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">
            Detalle de Productos ({items.length})
          </h2>
          <span className="text-xs font-semibold text-purple-700">
            Precios Históricos Congelados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Producto & Presentación</th>
                <th className="py-3 px-4 text-center w-24">Cantidad</th>
                <th className="py-3 px-4 text-right w-32">P. Unitario Histórico</th>
                <th className="py-3 px-4 text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/20">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-gray-900 text-sm">{item.product_name}</p>
                    {item.variant_name ? (
                      <span className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                        <Layers className="w-2.5 h-2.5" />
                        Presentación: {item.variant_name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">Estándar</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-800 text-sm">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-gray-700">
                    {formatCurrency(item.unit_price, currencySymbol)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-purple-900 text-sm">
                    {formatCurrency(item.subtotal || item.unit_price * item.quantity, currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Desglose de Totales */}
        <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
          <div className="text-xs text-gray-500 space-y-1">
            {order.notes && (
              <p>
                <span className="font-bold text-gray-700">Notas:</span> {order.notes}
              </p>
            )}
            <p>
              <span className="font-bold text-gray-700">Método de pago:</span>{' '}
              {order.payment_methods?.name || 'No especificado'}
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(order.subtotal, currencySymbol)}
              </span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Descuento:</span>
                <span>-{formatCurrency(order.discount, currencySymbol)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-black text-purple-950">
              <span>TOTAL:</span>
              <span>{formatCurrency(order.total, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1">
              <span>Abono:</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(order.amount_paid || 0, currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Saldo Pendiente:</span>
              <span className={hasBalance ? 'text-rose-600 font-black' : 'text-emerald-600'}>
                {formatCurrency(order.balance || 0, currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Vista Previa Tamaño Carta */}
      <InvoicePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        order={order}
        items={items}
      />

      {/* Confirmación para Eliminar Pedido */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteOrder}
        title="Eliminar Pedido"
        message={`¿Estás seguro de que deseas eliminar el pedido #${order.order_number}? Esta acción es irreversible.`}
        confirmText="Eliminar Pedido"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
