import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, FileText, Download, Calendar, Clock, User,
  CreditCard, CheckCircle2, AlertCircle, Trash2, Layers,
  Plus, Sliders, DollarSign, History, ShieldCheck, Tag
} from 'lucide-react'
import { useOrder } from './hooks/useOrders'
import OrderStatusChanger from './components/OrderStatusChanger'
import InvoicePreviewModal from './components/InvoicePreviewModal'
import PaymentModal from './components/PaymentModal'
import AdjustmentModal from './components/AdjustmentModal'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
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
  const { order, items, payments = [], adjustments = [], loading, error, refetch } = useOrder(id)
  const { settings, getCurrencySymbol } = useSettingsStore()
  const { profile, isOwner, isAdmin } = useAuthStore()
  const admin = isAdmin()
  const owner = isOwner()
  const currencySymbol = getCurrencySymbol()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
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
  const totalPaid = Number(order.amount_paid) || 0
  const totalAdjustments = Number(order.discount) || 0

  // Historial Financiero Unificado
  const financialMovements = [
    ...payments.map((p) => ({
      id: p.id,
      type: 'payment',
      title: `Pago / Abono recibido`,
      amount: Number(p.amount),
      method: p.payment_methods?.name || 'Método no especificado',
      date: p.payment_date || p.created_at,
      notes: p.notes,
    })),
    ...adjustments.map((a) => ({
      id: a.id,
      type: 'adjustment',
      title: `Ajuste / Descuento aplicado (${a.adjustment_type})`,
      amount: Number(a.amount),
      method: null,
      date: a.created_at,
      notes: a.reason,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 animate-fade-in font-sans">
      {/* Barra superior con navegación y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/pedidos"
            className="p-2.5 rounded-2xl text-gray-500 hover:text-purple-700 bg-white hover:bg-purple-50 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Pedido #{order.order_number}
              </h1>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge amountPaid={order.amount_paid} balance={order.balance} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Registrado el {formatDate(order.order_date)}
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Ver vista previa de factura"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Vista Previa</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className="btn-primary text-xs py-2.5 px-4 inline-flex items-center gap-1.5"
            title="Descargar comprobante en PDF"
          >
            <Download className="w-4 h-4" />
            <span>{generatingPdf ? 'Generando...' : 'Descargar PDF'}</span>
          </button>

          {admin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
              title="Eliminar pedido"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid de Estado y Resumen Operativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cambiador de Estado de Entrega */}
        <div className="card p-5 bg-white border border-purple-100 shadow-xs space-y-2.5">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
            Estado de Entrega
          </span>
          <OrderStatusChanger
            orderId={order.id}
            orderNumber={order.order_number}
            currentStatus={order.status}
            balance={order.balance}
            onStatusChanged={() => refetch()}
          />
        </div>

        {/* Cliente & Entrega */}
        <div className="card p-5 bg-white border border-purple-100 shadow-xs space-y-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
            Cliente & Entrega
          </span>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span className="font-bold text-gray-900 text-sm truncate">
              {order.customer_name || 'Consumidor Final'}
            </span>
          </div>
          {order.delivery_date && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 pt-0.5">
              <Calendar className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
              <span>
                {formatDate(order.delivery_date)}
                {order.delivery_time ? ` (${formatTime(order.delivery_time)})` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Estado Financiero Rápido */}
        <div className="card p-5 bg-white border border-purple-100 shadow-xs space-y-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
            Estado de Pago
          </span>
          <div className="flex items-center justify-between">
            <PaymentStatusBadge amountPaid={order.amount_paid} balance={order.balance} />
            <span className={`text-base font-black ${hasBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
              {hasBalance ? `Saldo: ${formatCurrency(order.balance, currencySymbol)}` : '100% Pagado'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECCIÓN PRINCIPAL: PAGOS DEL PEDIDO (Módulo Financiero)
          ============================================================ */}
      <div className="card bg-white border border-purple-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-purple-50/70 via-purple-50/40 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <span>PAGOS DEL PEDIDO</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Registro de abonos, pagos recibidos y ajustes autorizados de saldo
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {admin && hasBalance && (
              <button
                onClick={() => setAdjustmentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Ajustar saldo (Solo Administrador / Propietario)"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-700" />
                <span>Ajustar Saldo</span>
              </button>
            )}

            {hasBalance && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Pago / Abono</span>
              </button>
            )}
          </div>
        </div>

        {/* Tarjetas de Resumen Financiero */}
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-100 bg-white">
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Total del Pedido
            </span>
            <span className="text-base sm:text-lg font-black text-gray-900">
              {formatCurrency(order.total, currencySymbol)}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Total Pagado
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-700">
              {formatCurrency(totalPaid, currencySymbol)}
            </span>
          </div>

          <div className={`p-3.5 rounded-2xl border ${hasBalance ? 'bg-rose-50/70 border-rose-100' : 'bg-purple-50/60 border-purple-100'}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${hasBalance ? 'text-rose-800' : 'text-purple-800'}`}>
              Saldo Pendiente
            </span>
            <span className={`text-base sm:text-lg font-black ${hasBalance ? 'text-rose-600' : 'text-purple-900'}`}>
              {formatCurrency(order.balance, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Historial Financiero */}
        <div className="p-4 sm:p-5 space-y-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>Historial Financiero del Pedido ({financialMovements.length})</span>
          </h3>

          {financialMovements.length > 0 ? (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
              {financialMovements.map((mov) => (
                <div
                  key={mov.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-purple-50/20 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          mov.type === 'payment'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {mov.type === 'payment' ? 'Pago' : 'Ajuste'}
                      </span>
                      <span className="font-bold text-xs text-gray-900">{mov.title}</span>
                    </div>

                    <p className="text-[11px] text-gray-500">
                      {formatDate(mov.date)}
                      {mov.method && ` · Método: ${mov.method}`}
                      {mov.notes && ` · Nota: "${mov.notes}"`}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span
                      className={`text-sm font-black ${
                        mov.type === 'payment' ? 'text-emerald-600' : 'text-amber-700'
                      }`}
                    >
                      {mov.type === 'payment' ? '+' : '-'}{formatCurrency(mov.amount, currencySymbol)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
              No hay pagos registrados para este pedido.
            </div>
          )}
        </div>
      </div>

      {/* Tabla de Productos del Pedido */}
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
              <span className="font-bold text-gray-700">Método de pago inicial:</span>{' '}
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
            {totalAdjustments > 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Descuento / Ajustes:</span>
                <span>-{formatCurrency(totalAdjustments, currencySymbol)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-1.5 flex justify-between text-sm font-black text-purple-950">
              <span>TOTAL:</span>
              <span>{formatCurrency(order.total, currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-gray-600 pt-1">
              <span>Total Pagado:</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(totalPaid, currencySymbol)}
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

      {/* Modal de Registro de Pago */}
      {paymentModalOpen && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          order={order}
          onSuccess={() => refetch()}
        />
      )}

      {/* Modal de Ajuste de Saldo */}
      {adjustmentModalOpen && (
        <AdjustmentModal
          isOpen={adjustmentModalOpen}
          onClose={() => setAdjustmentModalOpen(false)}
          order={order}
          onSuccess={() => refetch()}
        />
      )}

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
