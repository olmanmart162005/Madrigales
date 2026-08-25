import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, Calendar, Filter, Eye, FileText, Download,
  Clock, CheckCircle, Package, ArrowUpRight, Sparkles, Layers
} from 'lucide-react'
import { useOrders, usePaymentMethods } from './hooks/useOrders'
import OrderStatusChanger from './components/OrderStatusChanger'
import InvoicePreviewModal from './components/InvoicePreviewModal'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/Badge'
import { TableSkeleton } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatTime, formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { generateOrderPDF } from '@/lib/pdf'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [generatingPdfId, setGeneratingPdfId] = useState(null)
  const [previewOrder, setPreviewOrder] = useState(null)

  const navigate = useNavigate()
  const { settings, getCurrencySymbol } = useSettingsStore()
  const { profile, isOwner } = useAuthStore()
  const currencySymbol = getCurrencySymbol()
  const owner = isOwner()

  const emitterName = profile?.full_name || 'Olman Martínez'
  const emitterRole = owner ? 'Propietario' : profile?.role === 'administrador' ? 'Administrador' : 'Cajero'

  const { orders, loading, stats, refetch } = useOrders({
    search,
    status: statusFilter,
    paymentMethodId: paymentFilter,
    dateFrom,
    dateTo,
  })

  const { paymentMethods } = usePaymentMethods()

  const handleDownloadPDF = async (e, order) => {
    e.stopPropagation()
    try {
      setGeneratingPdfId(order.id)
      const items = order.order_items || []
      await generateOrderPDF(order, items, settings || {}, { name: emitterName, role: emitterRole })
      toast.success(`Factura #${order.order_number} descargada con éxito`)
    } catch (err) {
      console.error(err)
      toast.error('Error al generar comprobante PDF')
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const handleOpenPreview = (e, order) => {
    e.stopPropagation()
    setPreviewOrder(order)
  }

  const statusCards = [
    { label: 'Todos los pedidos', count: stats.total, status: 'all', bg: 'bg-purple-50 text-purple-800 border-purple-100' },
    { label: 'Pendientes', count: stats.pendiente, status: 'pendiente', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    { label: 'En preparación', count: stats.en_preparacion, status: 'en_preparacion', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
    { label: 'Listos', count: stats.listo, status: 'listo', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { label: 'Entregados', count: stats.entregado, status: 'entregado', bg: 'bg-gray-100 text-gray-700 border-gray-200' },
  ]

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Pedidos & Facturación
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Registro inmutable de ventas, entregas, abonos y emisión de facturas oficiales
          </p>
        </div>

        <Link
          to="/pedidos/nuevo"
          className="btn-primary text-xs py-2.5 px-4 shadow-sm self-start sm:self-auto inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Pedido</span>
        </Link>
      </div>

      {/* Tarjetas de Estados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statusCards.map((c) => (
          <button
            key={c.status}
            onClick={() => setStatusFilter(c.status)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${c.bg} ${
              statusFilter === c.status ? 'ring-2 ring-purple-600 font-bold shadow-xs scale-[1.02]' : 'hover:opacity-90'
            }`}
          >
            <span className="text-[11px] block font-semibold opacity-90">{c.label}</span>
            <span className="text-2xl font-black mt-1 block">{c.count}</span>
          </button>
        ))}
      </div>

      {/* Filtros y Búsqueda */}
      <div className="card p-4 bg-white border border-purple-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por N° pedido o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs"
            />
          </div>

          {/* Método de Pago */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input text-xs"
            >
              <option value="">Todos los métodos de pago</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input text-xs"
              title="Fecha desde"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input text-xs"
              title="Fecha hasta"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="card bg-white border border-purple-100 shadow-sm overflow-visible">
        <div className="overflow-x-auto min-h-[320px] pb-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/60 border-b border-purple-100 text-gray-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">N° Pedido</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Fecha Entrega</th>
                <th className="px-4 py-3.5 text-right">Total</th>
                <th className="px-4 py-3.5 text-right">Saldo</th>
                <th className="px-4 py-3.5 text-center">Estado</th>
                <th className="px-4 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <TableSkeleton rows={6} columns={8} />
              ) : orders.length > 0 ? (
                orders.map((order) => {
                  const hasBalance = Number(order.balance) > 0
                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                      className="hover:bg-purple-50/25 transition-colors cursor-pointer group"
                    >
                      {/* Número */}
                      <td className="px-4 py-3.5 font-bold text-purple-900 whitespace-nowrap">
                        #{order.order_number}
                      </td>

                      {/* Cliente */}
                      <td className="px-4 py-3.5 font-semibold text-gray-900">
                        {order.customer_name || (
                          <span className="text-gray-400 italic">Consumidor Final</span>
                        )}
                      </td>

                      {/* Fecha de pedido */}
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {formatDate(order.order_date)}
                      </td>

                      {/* Fecha de entrega */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {order.delivery_date ? (
                          <span className="flex items-center gap-1 font-medium text-gray-800">
                            <Clock className="w-3.5 h-3.5 text-purple-500" />
                            {formatDate(order.delivery_date)}
                            {order.delivery_time && (
                              <span className="text-gray-400 font-normal text-[10px]">
                                ({formatTime(order.delivery_time)})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3.5 font-bold text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(order.total, currencySymbol)}
                      </td>

                      {/* Saldo y Estado de Pago */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-0.5">
                          <PaymentStatusBadge amountPaid={order.amount_paid} balance={order.balance} />
                          {hasBalance && (
                            <span className="font-black text-[11px] text-rose-600">
                              {formatCurrency(order.balance, currencySymbol)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado de Entrega */}
                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <OrderStatusChanger
                          orderId={order.id}
                          orderNumber={order.order_number}
                          currentStatus={order.status}
                          balance={order.balance}
                          onStatusChanged={refetch}
                        />
                      </td>

                      {/* Acciones: Ver, Vista Previa, Descargar PDF */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleOpenPreview(e, order)}
                            title="Vista previa de factura Carta"
                            className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleDownloadPDF(e, order)}
                            disabled={generatingPdfId === order.id}
                            title="Descargar PDF"
                            className="p-1.5 rounded-lg text-gray-600 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <Link
                            to={`/pedidos/${order.id}`}
                            title="Ver detalles del pedido"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <EmptyState
                      icon={Package}
                      title="No se encontraron pedidos"
                      description="No hay pedidos registrados con los filtros seleccionados."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Vista Previa Tamaño Carta */}
      {previewOrder && (
        <InvoicePreviewModal
          isOpen={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          order={previewOrder}
          items={previewOrder.order_items || []}
        />
      )}
    </div>
  )
}
