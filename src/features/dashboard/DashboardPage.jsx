import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, ShoppingBag, Clock, AlertTriangle,
  TrendingUp, Calendar, ArrowRight, Activity, Plus
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, formatTime } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { StatCardSkeleton } from '@/components/ui/Skeleton'
import { OrderStatusBadge } from '@/components/ui/Badge'

const PIE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1']

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    ventasHoy: 0,
    ventasMes: 0,
    pedidosHoy: 0,
    pendientes: 0,
    enPreparacion: 0,
    listos: 0,
    entregados: 0,
    productosActivos: 0,
    stockBajo: 0,
    stockAgotado: 0,
  })

  const [salesByDay, setSalesByDay] = useState([])
  const [paymentStats, setPaymentStats] = useState([])
  const [recentActivities, setRecentActivities] = useState([])
  const [upcomingOrders, setUpcomingOrders] = useState([])

  const { getCurrencySymbol } = useSettingsStore()
  const { profile } = useAuthStore()
  const currencySymbol = getCurrencySymbol()

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        const todayStr = new Date().toISOString().split('T')[0]
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split('T')[0]

        // 1. Consultar pedidos
        const { data: allOrders } = await supabase
          .from('orders')
          .select('*, payment_methods(name)')
          .order('created_at', { ascending: false })

        const ordersList = allOrders || []

        let vHoy = 0
        let vMes = 0
        let pHoy = 0
        let pend = 0
        let prep = 0
        let listos = 0
        let entregados = 0

        const salesDayMap = {}
        const paymentMap = {}

        // Últimos 7 días
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const dateKey = d.toISOString().split('T')[0]
          const label = d.toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric' })
          salesDayMap[dateKey] = { date: label, total: 0 }
        }

        ordersList.forEach((o) => {
          const orderTotal = Number(o.total) || 0
          const isNotCancelled = o.status !== 'cancelado'

          if (o.order_date === todayStr && isNotCancelled) {
            vHoy += orderTotal
            pHoy++
          }

          if (o.order_date >= firstDayOfMonth && isNotCancelled) {
            vMes += orderTotal
          }

          if (o.status === 'pendiente') pend++
          if (o.status === 'en_preparacion') prep++
          if (o.status === 'listo') listos++
          if (o.status === 'entregado') entregados++

          if (salesDayMap[o.order_date] && isNotCancelled) {
            salesDayMap[o.order_date].total += orderTotal
          }

          if (isNotCancelled && o.payment_methods?.name) {
            const pmName = o.payment_methods.name
            paymentMap[pmName] = (paymentMap[pmName] || 0) + orderTotal
          }
        })

        setSalesByDay(Object.values(salesDayMap))
        setPaymentStats(
          Object.entries(paymentMap).map(([name, value]) => ({ name, value }))
        )

        // 2. Inventario y productos
        const { data: invItems } = await supabase
          .from('inventory_items')
          .select('quantity, min_quantity, is_active')
          .eq('is_active', true)

        let sBajo = 0
        let sAgotado = 0
        ;(invItems || []).forEach((item) => {
          const q = Number(item.quantity) || 0
          const min = Number(item.min_quantity) || 0
          if (q === 0) sAgotado++
          else if (q <= min) sBajo++
        })

        const { count: prodCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)

        setMetrics({
          ventasHoy: vHoy,
          ventasMes: vMes,
          pedidosHoy: pHoy,
          pendientes: pend,
          enPreparacion: prep,
          listos,
          entregados,
          productosActivos: prodCount || 0,
          stockBajo: sBajo,
          stockAgotado: sAgotado,
        })

        // 3. Actividad reciente
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(6)
        setRecentActivities(logs || [])

        // 4. Próximas entregas
        const { data: upcoming } = await supabase
          .from('orders')
          .select('*')
          .gte('delivery_date', todayStr)
          .neq('status', 'entregado')
          .neq('status', 'cancelado')
          .order('delivery_date', { ascending: true })
          .limit(4)
        setUpcomingOrders(upcoming || [])
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans">
      {/* ============================================================
          BANNER COMPACTO DE BIENVENIDA
          ============================================================ */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#2C1536] via-[#3B1947] to-[#4A1E59] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-purple-900/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-purple-200 border border-white/10">
              Panel Principal
            </span>
            <span className="text-xs text-purple-300">
              {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
            Hola, {profile?.full_name?.split(' ')[0] || 'Olman'} 👋
          </h1>
          <p className="text-xs text-purple-200/80 mt-0.5">
            Resumen operativo y comercial de Madrigales Pastelería
          </p>
        </div>

        <Link
          to="/pedidos/nuevo"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-gray-950 text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Pedido</span>
        </Link>
      </div>

      {/* ============================================================
          MÉTRICAS CLAVE (DISEÑO COMPACTO Y ELEGANTE)
          ============================================================ */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 01: Ventas Hoy */}
          <div className="bg-white rounded-xl p-3.5 border border-purple-100/80 shadow-xs border-l-4 border-l-purple-600 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                01 &middot; Ventas Hoy
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-extrabold text-gray-900 block leading-tight">
                {formatCurrency(metrics.ventasHoy, currencySymbol)}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">
                {metrics.pedidosHoy} pedido(s) hoy
              </span>
            </div>
          </div>

          {/* 02: Ventas del Mes */}
          <div className="bg-white rounded-xl p-3.5 border border-purple-100/80 shadow-xs border-l-4 border-l-purple-400 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                02 &middot; Ventas Mes
              </span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-extrabold text-gray-900 block leading-tight">
                {formatCurrency(metrics.ventasMes, currencySymbol)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Acumulado del mes
              </span>
            </div>
          </div>

          {/* 03: Por Preparar */}
          <div className="bg-white rounded-xl p-3.5 border border-purple-100/80 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                03 &middot; Por Preparar
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-extrabold text-amber-700 block leading-tight">
                {metrics.pendientes + metrics.enPreparacion}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                {metrics.pendientes} pendientes &middot; {metrics.enPreparacion} en prep
              </span>
            </div>
          </div>

          {/* 04: Alertas Almacén */}
          <div className="bg-white rounded-xl p-3.5 border border-purple-100/80 shadow-xs border-l-4 border-l-rose-500 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                04 &middot; Almacén
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-extrabold text-rose-600 block leading-tight">
                {metrics.stockBajo + metrics.stockAgotado}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                {metrics.stockBajo} bajo stock &middot; {metrics.stockAgotado} agotados
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          GRÁFICAS COMPACTAS (VENTAS & MÉTODOS DE PAGO)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Gráfica Ventas 7 Días */}
        <div className="bg-white rounded-xl p-4 border border-purple-100/70 shadow-xs lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                Ventas de los Últimos 7 Días
              </h3>
              <p className="text-[11px] text-gray-400">Ingresos diarios registrados</p>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {currencySymbol} Lempiras
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByDay}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9CA3AF" />
                <Tooltip
                  formatter={(val) => [`${currencySymbol}${Number(val).toFixed(2)}`, 'Total']}
                  contentStyle={{ borderRadius: '8px', fontSize: '11px', padding: '6px 10px' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución Métodos de Pago */}
        <div className="bg-white rounded-xl p-4 border border-purple-100/70 shadow-xs space-y-3">
          <div className="border-b border-gray-100 pb-2.5">
            <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
              Métodos de Pago
            </h3>
            <p className="text-[11px] text-gray-400">Distribución de cobros</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {paymentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${currencySymbol}${Number(val).toFixed(2)}`, 'Total']}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[11px] text-gray-400 text-center">Sin datos de cobro registrados</p>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          TABLAS RESUMIDAS: PRÓXIMAS ENTREGAS & ACTIVIDAD
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Próximos Pedidos a Entregar */}
        <div className="bg-white rounded-xl p-4 border border-purple-100/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                Próximas Entregas
              </h3>
            </div>
            <Link
              to="/pedidos"
              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50 text-xs">
            {upcomingOrders.length > 0 ? (
              upcomingOrders.map((ord) => (
                <div key={ord.id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900">
                      {ord.customer_name || 'Cliente sin nombre'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      #{ord.order_number} &middot; {formatDate(ord.delivery_date)} {ord.delivery_time ? formatTime(ord.delivery_time) : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">
                      {formatCurrency(ord.total, currencySymbol)}
                    </span>
                    <OrderStatusBadge status={ord.status} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-400 py-3 text-center">
                No hay pedidos pendientes de entrega próximos.
              </p>
            )}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white rounded-xl p-4 border border-purple-100/70 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-xs sm:text-sm">
                Actividad Reciente
              </h3>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Auditoría en vivo</span>
          </div>

          <div className="divide-y divide-gray-50 text-xs">
            {recentActivities.length > 0 ? (
              recentActivities.map((log) => (
                <div key={log.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 truncate leading-tight">
                      {log.action}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Por {log.user_name || 'Sistema'}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {formatDate(log.created_at, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-gray-400 py-3 text-center">
                Aún no hay registros de actividad.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
