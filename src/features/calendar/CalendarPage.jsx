import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
  User, ArrowRight, X, Phone, DollarSign, Package, CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, formatTime, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'
import { OrderStatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const navigate = useNavigate()
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()

  // Cargar pedidos con fecha de entrega
  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*, payment_methods(name)')
        .not('delivery_date', 'is', null)
        .order('delivery_time', { ascending: true })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching calendar orders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Agrupar pedidos por fecha ISO YYYY-MM-DD
  const ordersByDate = useMemo(() => {
    const map = {}
    orders.forEach((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return
      const dateKey = o.delivery_date
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(o)
    })
    return map
  }, [orders, statusFilter])

  // Pedidos del día seleccionado
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const ordersForSelectedDate = ordersByDate[selectedDateStr] || []

  // Generación de días de la cuadrícula mensual
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = []
    let day = startDate
    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }, [currentMonth])

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans">
      {/* Encabezado y controles de mes */}
      <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center flex-shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 capitalize leading-tight">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h1>
            <p className="text-xs text-gray-400">
              Calendario de Entregas &middot; Madrigales Pastelería
            </p>
          </div>
        </div>

        {/* Botones de navegación y filtro */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs py-1.5 px-3 bg-gray-50 border-gray-200"
          >
            <option value="all">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_preparacion">En Preparación</option>
            <option value="listo">Listos</option>
            <option value="entregado">Entregados</option>
          </select>

          {/* Navegación de mes */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-0.5 bg-gray-50">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const today = new Date()
                setCurrentMonth(today)
                setSelectedDate(today)
              }}
              className="px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cuadrícula Principal del Calendario */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vista Mensual (2 Columnas en Desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-purple-100 shadow-xs">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-2">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((d, index) => {
              const dateKey = format(d, 'yyyy-MM-dd')
              const dayOrders = ordersByDate[dateKey] || []
              const isCurrentMonth = isSameMonth(d, currentMonth)
              const isToday = isSameDay(d, new Date())
              const isSelected = isSameDay(d, selectedDate)

              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(d)}
                  className={`min-h-[85px] sm:min-h-[95px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between
                    ${!isCurrentMonth ? 'opacity-35 bg-gray-50/50 border-transparent' : 'bg-white'}
                    ${isSelected ? 'border-purple-600 ring-2 ring-purple-100 shadow-xs' : 'border-gray-100 hover:border-purple-200'}
                    ${isToday ? 'bg-purple-50/40' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center
                        ${isToday ? 'bg-purple-700 text-white' : isSelected ? 'bg-purple-100 text-purple-900' : 'text-gray-700'}
                      `}
                    >
                      {format(d, 'd')}
                    </span>
                    {dayOrders.length > 0 && (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
                        {dayOrders.length}
                      </span>
                    )}
                  </div>

                  {/* Badges de pedidos en el día */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayOrders.slice(0, 2).map((ord) => {
                      const colors = ORDER_STATUS_COLORS[ord.status] || ORDER_STATUS_COLORS.pendiente
                      return (
                        <div
                          key={ord.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrder(ord)
                          }}
                          className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                          title={`#${ord.order_number} ${ord.customer_name || ''} - ${ord.delivery_time ? formatTime(ord.delivery_time) : ''}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${colors.dot} flex-shrink-0`} />
                          <span className="truncate">
                            {ord.delivery_time ? formatTime(ord.delivery_time) : ''} #{ord.order_number}
                          </span>
                        </div>
                      )
                    })}
                    {dayOrders.length > 2 && (
                      <span className="text-[9px] text-gray-400 font-bold block text-center">
                        +{dayOrders.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel Lateral: Entregas del Día Seleccionado */}
        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex flex-col">
          <div className="border-b border-gray-100 pb-3 mb-3">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
              Entregas Programadas
            </span>
            <h2 className="text-sm font-extrabold text-gray-900 capitalize mt-0.5">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {ordersForSelectedDate.length} pedido(s) para este día
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[480px] pr-1">
            {ordersForSelectedDate.length > 0 ? (
              ordersForSelectedDate.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className="p-3 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-xs transition-all cursor-pointer bg-gray-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900">
                      #{ord.order_number}
                    </span>
                    <OrderStatusBadge status={ord.status} />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-800">
                      {ord.customer_name || 'Cliente sin nombre'}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                      {ord.delivery_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-purple-600" />
                          {formatTime(ord.delivery_time)}
                        </span>
                      )}
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(ord.total, currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-gray-400">
                <CalendarIcon className="w-8 h-8 text-purple-200 mb-2" />
                <p className="text-xs font-medium">No hay entregas programadas para esta fecha.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Entrega Rápido */}
      {selectedOrder && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedOrder(null)}
          title={`Detalle de Entrega #${selectedOrder.order_number}`}
          size="md"
        >
          <div className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-gray-400 block text-[11px]">Cliente</span>
                <span className="text-sm font-bold text-gray-900">
                  {selectedOrder.customer_name || 'Cliente General'}
                </span>
              </div>
              <OrderStatusBadge status={selectedOrder.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Fecha de Entrega</span>
                <span className="font-bold text-gray-800">
                  {formatDate(selectedOrder.delivery_date)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Hora de Entrega</span>
                <span className="font-bold text-gray-800">
                  {selectedOrder.delivery_time ? formatTime(selectedOrder.delivery_time) : 'No especificada'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Total del Pedido</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(selectedOrder.total, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block">Saldo Pendiente</span>
                <span className={`font-bold ${Number(selectedOrder.balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(selectedOrder.balance, currencySymbol)}
                </span>
              </div>
            </div>

            {selectedOrder.notes && (
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Notas / Instrucciones</span>
                <p className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900">
                  {selectedOrder.notes}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn-secondary text-xs"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => {
                  const id = selectedOrder.id
                  setSelectedOrder(null)
                  navigate(`/pedidos/${id}`)
                }}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <span>Ver Pedido Completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
