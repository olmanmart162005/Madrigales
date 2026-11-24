import { create } from 'zustand'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

/**
 * Notificaciones de pedidos web (solicitudes desde la página de Nani Cake).
 * - unseen: solicitudes que nadie ha visto todavía (globo rojo)
 * - pending: solicitudes esperando confirmar/rechazar
 */
export const useWebOrdersStore = create((set, get) => ({
  unseen: 0,
  pending: 0,
  available: true, // false si la migración aún no se ejecutó
  channel: null,
  pollId: null,
  listeners: new Set(),

  refreshCounts: async () => {
    const [unseenRes, pendingRes] = await Promise.all([
      supabase.from('web_orders').select('id', { count: 'exact', head: true }).is('seen_at', null),
      supabase.from('web_orders').select('id', { count: 'exact', head: true }).eq('status', 'pendiente'),
    ])
    if (unseenRes.error) {
      // Tabla inexistente → módulo aún no habilitado
      if (/web_orders|does not exist|schema cache/i.test(unseenRes.error.message || '')) set({ available: false })
      return
    }
    set({ unseen: unseenRes.count || 0, pending: pendingRes.count || 0, available: true })
  },

  /** Se llama al entrar al panel: cuenta inicial + tiempo real + respaldo cada 60 s */
  start: () => {
    if (get().channel) return
    get().refreshCounts()

    const channel = supabase
      .channel('web-orders-notify')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'web_orders' }, (payload) => {
        const w = payload.new || {}
        get().refreshCounts()
        get().listeners.forEach((fn) => fn(payload))
        toast(`🛎️ Nuevo pedido web de ${w.customer_name || 'un cliente'}`, {
          duration: 7000,
          style: { background: '#FFF4F4', color: '#6E1022', border: '1px solid #FFCACA', fontWeight: 600 },
        })
        playChime()
        showSystemNotification(w)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'web_orders' }, (payload) => {
        get().refreshCounts()
        get().listeners.forEach((fn) => fn(payload))
      })
      .subscribe()

    const pollId = setInterval(() => get().refreshCounts(), 60 * 1000)
    set({ channel, pollId })
  },

  stop: () => {
    const { channel, pollId } = get()
    if (channel) supabase.removeChannel(channel)
    if (pollId) clearInterval(pollId)
    set({ channel: null, pollId: null, unseen: 0, pending: 0 })
  },

  /** Al abrir el módulo: quitar la notificación */
  markAllSeen: async () => {
    if (get().unseen === 0) return
    set({ unseen: 0 })
    const { error } = await supabase
      .from('web_orders')
      .update({ seen_at: new Date().toISOString() })
      .is('seen_at', null)
    if (error) console.warn('No se pudieron marcar como vistas:', error.message)
    get().refreshCounts()
  },

  /** Permite a la página de Pedidos Web recargar su lista en tiempo real */
  subscribe: (fn) => {
    get().listeners.add(fn)
    return () => get().listeners.delete(fn)
  },
}))

function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    ;[880, 1320].forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.35)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + i * 0.18)
      o.stop(ctx.currentTime + i * 0.18 + 0.4)
    })
  } catch {
    /* sin sonido */
  }
}

function showSystemNotification(w) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
    new Notification('Nuevo pedido web · Nani Cake', {
      body: `${w.customer_name || 'Cliente'} · ${w.folio || ''}`,
      icon: '/icons/pwa-192x192.png',
      tag: w.id,
    })
  } catch {
    /* navegador sin soporte */
  }
}
