import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Globe, CheckCircle2, XCircle, Clock, Phone, CalendarDays, MessageCircle, FileDown,
  StickyNote, ArrowUpRight, Loader2, BellRing, RefreshCw, Inbox,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/utils'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useSettingsStore } from '@/store/settingsStore'
import { useWebOrdersStore } from '@/store/webOrdersStore'
import { logActivity } from '@/lib/activity'

const TABS = [
  { key: 'pendiente', label: 'Por confirmar', icon: Clock },
  { key: 'confirmado', label: 'Confirmados', icon: CheckCircle2 },
  { key: 'rechazado', label: 'Rechazados', icon: XCircle },
]

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  const d = Math.floor(diff / 86400)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

function customerWaLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  const n = digits.length === 8 ? `504${digits}` : digits
  return `https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(text)}`
}

function StatusPill({ status }) {
  const map = {
    pendiente: 'bg-gold-100 text-gold-800 border-gold-300',
    confirmado: 'bg-pine-50 text-pine-700 border-pine-200',
    rechazado: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  const label = { pendiente: 'Por confirmar', confirmado: 'Confirmado', rechazado: 'Rechazado' }
  return <span className={`badge ${map[status] || map.rechazado}`}>{label[status] || status}</span>
}

function WebOrderCard({ order, currency, isNew, onConfirm, onReject, onPdf, pdfLoading }) {
  const items = Array.isArray(order.items) ? order.items : []
  const units = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
  const greeting =
    order.status === 'confirmado'
      ? `¡Hola ${order.customer_name}! 🎄 Tu pedido ${order.folio} en Nani Cake está CONFIRMADO. ¡Gracias por tu compra!`
      : `¡Hola ${order.customer_name}! Te escribimos de Nani Cake sobre tu pedido ${order.folio}.`
  const wa = customerWaLink(order.customer_phone, greeting)

  return (
    <article
      className={`card p-4 sm:p-5 flex flex-col gap-4 ${isNew ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-[#FFF9F2]' : ''}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-extrabold text-gray-900 truncate">{order.customer_name}</h3>
            {isNew && (
              <span className="badge bg-purple-600 text-white border-purple-600 animate-pulse">Nuevo</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-bold text-purple-700">{order.folio}</span> · {timeAgo(order.created_at)}
          </p>
        </div>
        <div className="text-right">
          <StatusPill status={order.status} />
          <p className="text-lg font-extrabold text-gray-900 mt-1">{formatCurrency(order.total, currency)}</p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        <p className="flex items-center gap-2 text-gray-700">
          <Phone className="w-4 h-4 text-purple-500" />
          <a href={`tel:${order.customer_phone}`} className="font-semibold hover:underline">{order.customer_phone}</a>
        </p>
        <p className="flex items-center gap-2 text-gray-700">
          <CalendarDays className="w-4 h-4 text-purple-500" />
          Para: <span className="font-semibold">{order.desired_date ? formatDate(order.desired_date) : 'Sin fecha'}</span>
        </p>
      </div>

      <ul className="rounded-xl border border-purple-100 divide-y divide-purple-50 overflow-hidden">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-3 px-3 py-2 bg-white">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-purple-50 flex-shrink-0">
              {i.image && <img src={i.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">
                {i.qty} × {i.name}
              </p>
              {i.variant && <p className="text-[11px] text-gray-500">{i.variant}</p>}
            </div>
            <span className="text-xs font-bold text-gray-700">{formatCurrency((Number(i.price) || 0) * (Number(i.qty) || 0), currency)}</span>
          </li>
        ))}
        <li className="flex justify-between px-3 py-2 bg-purple-50/60 text-xs">
          <span className="font-semibold text-gray-600">{units} {units === 1 ? 'artículo' : 'artículos'}</span>
          <span className="font-extrabold text-purple-700">{formatCurrency(order.total, currency)}</span>
        </li>
      </ul>

      {order.notes && (
        <p className="flex gap-2 text-xs text-gray-700 bg-gold-50 border border-gold-200 rounded-xl p-3">
          <StickyNote className="w-4 h-4 text-gold-600 flex-shrink-0" /> {order.notes}
        </p>
      )}
      {order.status === 'rechazado' && order.reject_reason && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3">
          <span className="font-bold">Motivo del rechazo:</span> {order.reject_reason}
        </p>
      )}

      <footer className="flex flex-wrap gap-2 pt-1">
        {order.status === 'pendiente' && (
          <>
            <button type="button" onClick={() => onConfirm(order)} className="btn-success flex-1 sm:flex-none">
              <CheckCircle2 className="w-4 h-4" /> Confirmar
            </button>
            <button
              type="button"
              onClick={() => onReject(order)}
              className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex-1 sm:flex-none"
            >
              <XCircle className="w-4 h-4" /> Rechazar
            </button>
          </>
        )}
        {order.status === 'confirmado' && order.order_id && (
          <Link to={`/pedidos/${order.order_id}`} className="btn-primary flex-1 sm:flex-none">
            <ArrowUpRight className="w-4 h-4" /> Ver en Pedidos
          </Link>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn bg-[#25D366] hover:bg-[#1fb457] text-white flex-1 sm:flex-none">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => onPdf(order)}
          disabled={pdfLoading}
          className="btn-secondary flex-1 sm:flex-none"
        >
          {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} PDF
        </button>
      </footer>
    </article>
  )
}

export default function WebOrdersPage() {
  const navigate = useNavigate()
  const { settings, getCurrencySymbol } = useSettingsStore()
  const currency = getCurrencySymbol()
  const { markAllSeen, subscribe, refreshCounts, pending, available } = useWebOrdersStore()

  const [tab, setTab] = useState('pendiente')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [newIds, setNewIds] = useState(() => new Set())
  const [confirming, setConfirming] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [reason, setReason] = useState('')
  const [working, setWorking] = useState(false)
  const [pdfId, setPdfId] = useState(null)
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('web_orders')
      .select('*')
      .eq('status', tab)
      .order('created_at', { ascending: tab === 'pendiente' })
      .limit(100)
    if (error) {
      console.error(error)
      setOrders([])
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }, [tab])

  // Primera carga: resaltar las nuevas y quitar la notificación
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('web_orders').select('id').is('seen_at', null)
      if (data?.length) setNewIds(new Set(data.map((d) => d.id)))
      markAllSeen()
    })()
  }, [markAllSeen])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // Tiempo real: recargar al llegar/cambiar solicitudes (y quitar notificación porque ya estoy aquí)
  useEffect(
    () =>
      subscribe((payload) => {
        if (payload.eventType === 'INSERT' && payload.new?.id) {
          setNewIds((prev) => new Set(prev).add(payload.new.id))
          markAllSeen()
        }
        load()
      }),
    [subscribe, load, markAllSeen]
  )

  const openConfirm = (order) => {
    setConfirming(order)
    setDeliveryDate(order.desired_date || '')
    setDeliveryTime('')
  }

  const handleConfirm = async () => {
    if (!confirming) return
    setWorking(true)
    const { data: orderId, error } = await supabase.rpc('confirm_web_order', {
      p_id: confirming.id,
      p_delivery_date: deliveryDate || null,
      p_delivery_time: deliveryTime || null,
    })
    setWorking(false)
    if (error) {
      toast.error('No se pudo confirmar: ' + error.message)
      return
    }
    await logActivity({
      action: `Confirmó el pedido web ${confirming.folio} de ${confirming.customer_name}`,
      entityType: 'order',
      entityId: orderId,
      entityName: confirming.folio,
    }).catch(() => {})
    toast.success(`Pedido ${confirming.folio} confirmado y agregado a Pedidos`)
    setConfirming(null)
    refreshCounts()
    load()
    if (orderId) navigate(`/pedidos/${orderId}`)
  }

  const handleReject = async () => {
    if (!rejecting) return
    setWorking(true)
    const { error } = await supabase.rpc('reject_web_order', { p_id: rejecting.id, p_reason: reason || null })
    setWorking(false)
    if (error) {
      toast.error('No se pudo rechazar: ' + error.message)
      return
    }
    await logActivity({
      action: `Rechazó el pedido web ${rejecting.folio} de ${rejecting.customer_name}`,
      entityType: 'order',
      entityName: rejecting.folio,
    }).catch(() => {})
    toast.success(`Pedido ${rejecting.folio} rechazado`)
    setRejecting(null)
    setReason('')
    refreshCounts()
    load()
  }

  const handlePdf = async (order) => {
    try {
      setPdfId(order.id)
      const { generateWebOrderPdf } = await import('@/lib/webOrderPdf')
      const { doc, fileName } = await generateWebOrderPdf({
        folio: order.folio,
        items: order.items || [],
        total: Number(order.total),
        currency,
        customer: { name: order.customer_name, phone: order.customer_phone, date: order.desired_date, notes: order.notes },
        business: { whatsapp: settings?.whatsapp, address: settings?.address },
      })
      doc.save(fileName)
    } catch (err) {
      toast.error('No se pudo generar el PDF')
      console.error(err)
    } finally {
      setPdfId(null)
    }
  }

  const askNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const p = await Notification.requestPermission()
    setNotifPermission(p)
    if (p === 'granted') toast.success('Recibirás avisos de nuevos pedidos web')
  }

  const confirmTotal = useMemo(() => Number(confirming?.total || 0), [confirming])

  if (!available) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto mt-6">
        <Globe className="w-10 h-10 mx-auto text-purple-400" />
        <h1 className="text-lg font-bold mt-3">Módulo de Pedidos Web no habilitado</h1>
        <p className="text-sm text-gray-600 mt-2">
          Ejecuta <code className="bg-purple-50 px-1 rounded">database/migration_pedidos_web.sql</code> en Supabase para activarlo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#0F2E1F] via-[#15462D] to-[#1E6E41] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <Globe className="w-5 h-5 text-gold-300" /> Pedidos Web
          </h1>
          <p className="text-xs text-pine-100/80 mt-1">
            Solicitudes hechas desde la página de Nani Cake. Confírmalas para pasarlas a Pedidos.
          </p>
        </div>
        <div className="flex gap-2">
          {notifPermission === 'default' && (
            <button type="button" onClick={askNotifications} className="btn bg-white/10 hover:bg-white/20 text-white border border-white/20">
              <BellRing className="w-4 h-4" /> Activar avisos
            </button>
          )}
          <button type="button" onClick={() => { setLoading(true); load(); refreshCounts() }} className="btn bg-white text-pine-800 hover:bg-cream-100">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`relative whitespace-nowrap inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
              tab === key ? 'bg-purple-600 border-purple-600 text-white shadow' : 'bg-white border-purple-100 text-gray-700 hover:border-purple-300'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
            {key === 'pendiente' && pending > 0 && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center ${tab === key ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'}`}>
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="card h-64 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Inbox}
            title={tab === 'pendiente' ? 'No hay pedidos por confirmar' : tab === 'confirmado' ? 'Aún no hay pedidos confirmados' : 'No hay pedidos rechazados'}
            message={tab === 'pendiente' ? 'Cuando un cliente haga un pedido desde la página aparecerá aquí con una notificación.' : 'Los pedidos web revisados aparecerán aquí.'}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {orders.map((o) => (
            <WebOrderCard
              key={o.id}
              order={o}
              currency={currency}
              isNew={newIds.has(o.id) && o.status === 'pendiente'}
              onConfirm={openConfirm}
              onReject={(order) => { setRejecting(order); setReason('') }}
              onPdf={handlePdf}
              pdfLoading={pdfId === o.id}
            />
          ))}
        </div>
      )}

      {/* Confirmar */}
      <Modal isOpen={!!confirming} onClose={() => !working && setConfirming(null)} title="Confirmar pedido web" size="md">
        {confirming && (
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Se creará un pedido programado en <span className="font-bold">Pedidos</span> para{' '}
              <span className="font-bold text-gray-900">{confirming.customer_name}</span> ({confirming.folio}) con los precios vigentes del catálogo.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="label">Fecha de entrega</span>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="input" />
              </label>
              <label className="block">
                <span className="label">Hora (opcional)</span>
                <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="input" />
              </label>
            </div>
            <div className="flex justify-between items-center rounded-xl bg-purple-50 px-4 py-3">
              <span className="text-xs font-semibold text-gray-600">Total solicitado</span>
              <span className="text-lg font-extrabold text-purple-700">{formatCurrency(confirmTotal, currency)}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setConfirming(null)} disabled={working} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={handleConfirm} disabled={working} className="btn-success">
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar pedido
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rechazar */}
      <Modal isOpen={!!rejecting} onClose={() => !working && setRejecting(null)} title="Rechazar pedido web" size="md">
        {rejecting && (
          <div className="p-5 sm:p-6 space-y-4">
            <p className="text-sm text-gray-600">
              ¿Rechazar el pedido <span className="font-bold">{rejecting.folio}</span> de{' '}
              <span className="font-bold text-gray-900">{rejecting.customer_name}</span>?
            </p>
            <label className="block">
              <span className="label">Motivo (opcional, solo para registro interno)</span>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="input resize-none" placeholder="Ej. Sin disponibilidad para esa fecha" />
            </label>
            <p className="text-[11px] text-gray-500">Recuerda avisarle al cliente por WhatsApp.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejecting(null)} disabled={working} className="btn-secondary">
                Cancelar
              </button>
              <button type="button" onClick={handleReject} disabled={working} className="btn bg-red-600 hover:bg-red-700 text-white">
                {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Rechazar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
