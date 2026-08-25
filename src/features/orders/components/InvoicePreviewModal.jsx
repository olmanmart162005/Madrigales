import React, { useRef } from 'react'
import { Printer, Download, X, Layers, Sparkles } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatCurrency, formatDate, formatTime } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { generateOrderPDF } from '@/lib/pdf'
import toast from 'react-hot-toast'

export default function InvoicePreviewModal({ isOpen, onClose, order, items = [] }) {
  const { settings, getCurrencySymbol } = useSettingsStore()
  const { profile, isOwner } = useAuthStore()
  const currencySymbol = getCurrencySymbol()
  const printRef = useRef(null)

  if (!order) return null

  const owner = isOwner()
  const emitterName = profile?.full_name || 'Olman Martínez'
  const emitterRole = owner ? 'Propietario' : profile?.role === 'administrador' ? 'Administrador' : 'Cajero'

  const handleDownloadPDF = async () => {
    try {
      await generateOrderPDF(order, items, settings, { name: emitterName, role: emitterRole })
      toast.success(`Factura #${order.order_number} descargada con éxito`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.error('Error al generar el PDF de la factura')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vista Previa — Factura #${order.order_number}`} size="xl">
      <div className="p-4 sm:p-6 bg-slate-100/70 space-y-4 max-h-[85vh] overflow-y-auto scrollbar-thin">
        {/* Barra de Herramientas de la Vista Previa */}
        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-purple-100 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Formato Oficial Carta (8.5 × 11 in)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            HOJA TAMAÑO CARTA (8.5 x 11 in)
            ============================================================ */}
        <div
          ref={printRef}
          className="mx-auto bg-white shadow-xl border border-gray-200/80 rounded-2xl p-8 sm:p-12 max-w-[800px] text-gray-800 space-y-6 print:shadow-none print:border-none print:p-0"
          style={{ minHeight: '1056px' }}
        >
          {/* ENCABEZADO DE LA FACTURA */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 border-b-2 border-purple-100 pb-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              {/* Logo Oficial de Madrigales */}
              <div className="w-16 h-16 rounded-2xl bg-white border border-purple-100 p-2 shadow-xs flex items-center justify-center flex-shrink-0">
                <img
                  src="/LOGO_OFICIAL.png"
                  alt="Madrigales"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>

              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  MADRIGALES PASTELERÍA
                </h1>
                <p className="text-xs font-extrabold tracking-[0.25em] text-fuchsia-600 uppercase">
                  Pastelería y Repostería Fina
                </p>
                {settings?.address && (
                  <p className="text-[11px] text-gray-500 mt-1">{settings.address}</p>
                )}
                {settings?.phone && (
                  <p className="text-[11px] text-gray-500">Tel / WhatsApp: {settings.phone}</p>
                )}
              </div>
            </div>

            {/* Número y Estado de Factura */}
            <div className="text-center sm:text-right">
              <span className="inline-block px-3 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-bold uppercase tracking-wider mb-1">
                COMPROBANTE DE VENTA
              </span>
              <p className="text-2xl font-black text-purple-900 leading-tight">
                #{order.order_number}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Emisión: <span className="font-semibold text-gray-700">{formatDate(order.order_date)}</span>
              </p>
            </div>
          </div>

          {/* DATOS DE EMISOR Y CLIENTE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-purple-50/40 border border-purple-100 rounded-2xl text-xs">
            {/* Emisor */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Emitido por
              </p>
              <p className="font-bold text-gray-900 text-sm">{emitterName}</p>
              <p className="text-purple-700 font-semibold">{emitterRole}</p>
            </div>

            {/* Cliente */}
            <div className="space-y-1 sm:text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Cliente
              </p>
              <p className="font-bold text-gray-900 text-sm">
                {order.customer_name || 'Consumidor Final'}
              </p>
              {order.delivery_date && (
                <p className="text-gray-600">
                  Entrega: <span className="font-semibold">{formatDate(order.delivery_date)}</span>
                  {order.delivery_time && ` a las ${formatTime(order.delivery_time)}`}
                </p>
              )}
            </div>
          </div>

          {/* TABLA DE PRODUCTOS Y PRESENTACIONES */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-purple-900 text-white font-bold">
                <tr>
                  <th className="py-3 px-4">Descripción del Producto</th>
                  <th className="py-3 px-4 text-center w-20">Cant.</th>
                  <th className="py-3 px-4 text-right w-28">P. Unitario</th>
                  <th className="py-3 px-4 text-right w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-purple-50/20">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 text-sm leading-tight">
                        {item.product_name}
                      </p>
                      {item.variant_name && (
                        <p className="text-xs text-purple-700 font-semibold mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-purple-500" />
                          <span>Presentación: {item.variant_name}</span>
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">
                      {formatCurrency(item.unit_price, currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {formatCurrency(item.subtotal || item.unit_price * item.quantity, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALES Y OBSERVACIONES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Observaciones */}
            <div className="space-y-3">
              {order.notes && (
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-gray-700">Observaciones del Pedido:</p>
                  <p className="text-gray-600 leading-relaxed">{order.notes}</p>
                </div>
              )}

              <div className="text-xs space-y-1 text-gray-500">
                <p>
                  <span className="font-semibold text-gray-700">Método de pago:</span>{' '}
                  {order.payment_methods?.name || 'No especificado'}
                </p>
                <p>
                  <span className="font-semibold text-gray-700">Estado del pedido:</span>{' '}
                  <span className="font-bold uppercase text-purple-800">
                    {order.status?.replace('_', ' ')}
                  </span>
                </p>
              </div>
            </div>

            {/* Resumen de Pago */}
            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(order.subtotal, currencySymbol)}
                </span>
              </div>

              {Number(order.discount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Descuento aplicado:</span>
                  <span>-{formatCurrency(order.discount, currencySymbol)}</span>
                </div>
              )}

              <div className="border-t border-purple-200 pt-2 flex justify-between text-base font-black text-purple-950">
                <span>TOTAL:</span>
                <span>{formatCurrency(order.total, currencySymbol)}</span>
              </div>

              <div className="flex justify-between text-gray-700 pt-1">
                <span>Abono realizado:</span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(order.amount_paid || 0, currencySymbol)}
                </span>
              </div>

              <div className="border-t border-purple-200/80 pt-1 flex justify-between font-bold">
                <span className="text-gray-700">Saldo pendiente:</span>
                <span
                  className={
                    Number(order.balance) > 0 ? 'text-rose-600 font-extrabold' : 'text-emerald-700'
                  }
                >
                  {formatCurrency(order.balance || 0, currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* PIE DE PÁGINA INSTITUCIONAL */}
          <div className="border-t border-gray-200 pt-6 text-center space-y-1">
            <p className="text-xs font-bold text-purple-900">
              ¡Gracias por preferir Madrigales Pastelería!
            </p>
            <p className="text-[10px] text-gray-400">
              Calidad y dulzura artesanal en cada detalle. Para consultas o eventos, comunícate con nosotros.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
