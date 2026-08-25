import React, { useState, useEffect } from 'react'
import {
  BarChart3, Calendar, Download, TrendingUp, DollarSign,
  ShoppingBag, Package, Warehouse, Layers, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { TableSkeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

const COLORS = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('ventas')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const [loading, setLoading] = useState(true)
  const [ordersReport, setOrdersReport] = useState([])
  const [productReport, setProductReport] = useState([])
  const [paymentReport, setPaymentReport] = useState([])
  const [statusReport, setStatusReport] = useState([])
  const [inventoryMovementsReport, setInventoryMovementsReport] = useState([])

  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()

  useEffect(() => {
    async function fetchReportData() {
      try {
        setLoading(true)

        // 1. Pedidos dentro del rango
        const { data: orders } = await supabase
          .from('orders')
          .select('*, payment_methods(name)')
          .gte('order_date', dateFrom)
          .lte('order_date', dateTo)
          .order('order_date', { ascending: false })

        const orderList = orders || []
        setOrdersReport(orderList)

        // Estadísticas por estado
        const stMap = {}
        orderList.forEach((o) => {
          stMap[o.status] = (stMap[o.status] || 0) + 1
        })
        setStatusReport(Object.entries(stMap).map(([status, count]) => ({ status, count })))

        // Estadísticas por método de pago
        const pmMap = {}
        orderList
          .filter((o) => o.status !== 'cancelado')
          .forEach((o) => {
            const name = o.payment_methods?.name || 'No especificado'
            pmMap[name] = (pmMap[name] || 0) + Number(o.total || 0)
          })
        setPaymentReport(Object.entries(pmMap).map(([name, value]) => ({ name, value })))

        // 2. Productos vendidos en el rango
        const orderIds = orderList.map((o) => o.id)
        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('product_name, quantity, subtotal')
            .in('order_id', orderIds)

          const prMap = {}
          ;(items || []).forEach((i) => {
            const name = i.product_name || 'Sin nombre'
            if (!prMap[name]) prMap[name] = { name, cantidad: 0, total: 0 }
            prMap[name].cantidad += Number(i.quantity || 0)
            prMap[name].total += Number(i.subtotal || 0)
          })

          const sortedProd = Object.values(prMap).sort((a, b) => b.total - a.total)
          setProductReport(sortedProd)
        } else {
          setProductReport([])
        }

        // 3. Movimientos de almacén en el rango
        const { data: moves } = await supabase
          .from('inventory_movements')
          .select('*, inventory_items(name, unit)')
          .gte('created_at', `${dateFrom}T00:00:00`)
          .lte('created_at', `${dateTo}T23:59:59`)
          .order('created_at', { ascending: false })

        setInventoryMovementsReport(moves || [])
      } catch (err) {
        console.error('Error fetching reports:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [dateFrom, dateTo])

  // Cálculos resumen de ventas
  const totalSales = ordersReport
    .filter((o) => o.status !== 'cancelado')
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0)

  const validOrdersCount = ordersReport.filter((o) => o.status !== 'cancelado').length
  const avgTicket = validOrdersCount > 0 ? totalSales / validOrdersCount : 0

  // Exportar a CSV
  const exportOrdersCSV = () => {
    if (ordersReport.length === 0) {
      toast.error('No hay datos para exportar')
      return
    }

    const headers = ['Numero_Pedido', 'Cliente', 'Fecha_Pedido', 'Fecha_Entrega', 'Total', 'Abono', 'Saldo', 'Estado', 'Metodo_Pago', 'Registrado_Por']
    const rows = ordersReport.map((o) => [
      o.order_number,
      `"${o.customer_name || ''}"`,
      o.order_date,
      o.delivery_date || '',
      o.total,
      o.amount_paid,
      o.balance,
      o.status,
      `"${o.payment_methods?.name || ''}"`,
      `"${o.profiles?.full_name || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Reporte_Ventas_Madrigales_${dateFrom}_al_${dateTo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Reporte exportado a CSV')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado y Filtro de Fechas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reportes y Estadísticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analítica de ventas, productos más vendidos y movimientos de almacén
          </p>
        </div>

        <div className="card p-2 flex items-center gap-2 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-gray-400 ml-2" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs p-1 rounded border-0 focus:ring-0 text-gray-700 font-medium"
          />
          <span className="text-xs text-gray-400">al</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs p-1 rounded border-0 focus:ring-0 text-gray-700 font-medium"
          />
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="flex border-b border-gray-200 overflow-x-auto gap-2">
        {[
          { id: 'ventas', label: 'Ventas y Facturación', icon: DollarSign },
          { id: 'productos', label: 'Por Producto', icon: Package },
          { id: 'pagos', label: 'Métodos de Pago', icon: TrendingUp },
          { id: 'almacen', label: 'Movimientos Almacén', icon: Warehouse },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Pestaña: Ventas */}
      {activeTab === 'ventas' && (
        <div className="space-y-6">
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-5">
              <span className="text-xs text-gray-500 font-semibold uppercase">Total Ventas en Rango</span>
              <span className="text-2xl font-black text-primary-700 block mt-1">
                {formatCurrency(totalSales, currencySymbol)}
              </span>
            </div>

            <div className="card p-5">
              <span className="text-xs text-gray-500 font-semibold uppercase">Pedidos Realizados</span>
              <span className="text-2xl font-black text-gray-900 block mt-1">
                {validOrdersCount} pedidos
              </span>
            </div>

            <div className="card p-5">
              <span className="text-xs text-gray-500 font-semibold uppercase">Ticket Promedio</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1">
                {formatCurrency(avgTicket, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Tabla de Ventas y Botón Exportar */}
          <div className="card overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-xs text-gray-900 uppercase">Detalle de Pedidos en Rango</h3>
              <button onClick={exportOrdersCSV} className="btn-secondary text-xs">
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3"># Pedido</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Método</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {loading ? (
                    <TableSkeleton rows={5} columns={6} />
                  ) : ordersReport.length > 0 ? (
                    ordersReport.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-primary-700">#{o.order_number}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{o.customer_name || 'Sin nombre'}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(o.order_date)}</td>
                        <td className="px-4 py-3 text-gray-500">{o.payment_methods?.name || '—'}</td>
                        <td className="px-4 py-3 capitalize">{o.status?.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {formatCurrency(o.total, currencySymbol)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-400">
                        No hay ventas registradas en el rango de fechas seleccionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Por Producto */}
      {activeTab === 'productos' && (
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-bold text-sm text-gray-900 mb-4">Top Productos por Ingresos</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productReport.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${currencySymbol}${Number(val).toFixed(2)}`, 'Ventas']} />
                  <Bar dataKey="total" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-center">Unidades Vendidas</th>
                  <th className="px-4 py-3 text-right">Ingresos Generados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productReport.map((p, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{p.cantidad}</td>
                    <td className="px-4 py-3 text-right font-black text-primary-700">
                      {formatCurrency(p.total, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pestaña: Métodos de Pago */}
      {activeTab === 'pagos' && (
        <div className="card p-6 space-y-6">
          <h3 className="font-bold text-sm text-gray-900">Ingresos por Método de Pago</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentReport}
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentReport.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => [`${currencySymbol}${Number(val).toFixed(2)}`, 'Total']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {paymentReport.map((p, idx) => (
                <div key={idx} className="p-3 flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-800">{p.name}</span>
                  <span className="font-black text-primary-700">
                    {formatCurrency(p.value, currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña: Almacén */}
      {activeTab === 'almacen' && (
        <div className="card overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-xs text-gray-900 uppercase">
              Movimientos de Materias Primas en Rango ({inventoryMovementsReport.length} registros)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-center">Cantidad</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {inventoryMovementsReport.map((m) => {
                  const isEntrada = m.type === 'entrada'
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(m.created_at, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {m.inventory_items?.name || 'Insumo'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge text-[10px] font-bold ${
                            isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isEntrada ? 'Entrada (+)' : 'Salida (-)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {m.quantity} {m.inventory_items?.unit}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{m.profiles?.full_name || 'Sistema'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
