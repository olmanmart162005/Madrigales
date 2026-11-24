import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Cake, Gift, CalendarDays, Sparkles, MapPin, Phone, Mail, MessageCircle,
  LogIn, LayoutDashboard, Star, X, ShoppingBag, Plus, Minus, Trash2, ChevronDown,
  Check, ArrowRight, FileText, Loader2, Download,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import Snowfall from '@/components/ui/Snowfall'
import { LANDING } from './landingContent'
import { useCart } from './useCart'

const LOGO = '/brand/nani-cake-logo.webp'
const BENEFIT_ICONS = { cake: Cake, gift: Gift, calendar: CalendarDays }

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

/** Normaliza un número para wa.me (Honduras: 8 dígitos → prefijo 504) */
function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return null
  return digits.length === 8 ? `504${digits}` : digits
}

function waLink(number, text) {
  return number ? `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(text)}` : null
}

function activeVariants(product) {
  return (product.product_variants || [])
    .filter((v) => v.is_active !== false)
    .sort((a, b) => Number(a.price) - Number(b.price))
}

/** Precio a mostrar: base o "desde" la presentación más económica */
function priceInfo(product) {
  const variants = activeVariants(product)
  if (variants.length > 0) return { from: variants.length > 1, amount: Number(variants[0].price) }
  return { from: false, amount: Number(product.price) }
}

function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function buildOrderMessage({ items, total, currency, name, date, notes, folio }) {
  const lines = [`¡Hola Nani Cake! 🎄 Quiero hacer este pedido${folio ? ` (*${folio}*)` : ''}:`, '']
  items.forEach((i) => {
    const label = i.variant ? `${i.name} (${i.variant})` : i.name
    lines.push(`• ${i.qty} x ${label} — ${formatCurrency(i.qty * i.price, currency)}`)
  })
  lines.push('', `*Total estimado: ${formatCurrency(total, currency)}*`)
  if (name) lines.push(`Nombre: ${name}`)
  if (date) {
    const [y, m, d] = date.split('-')
    lines.push(`Fecha deseada: ${d}/${m}/${y}`)
  }
  if (notes) lines.push(`Notas: ${notes}`)
  lines.push('', '¿Me confirman disponibilidad? ¡Gracias!')
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Piezas de interfaz                                                  */
/* ------------------------------------------------------------------ */

const CandyCane = () => (
  <div
    aria-hidden="true"
    className="h-1.5 w-full"
    style={{
      backgroundImage:
        'repeating-linear-gradient(135deg, #C8102E 0 14px, #FFFFFF 14px 28px, #1E6E41 28px 42px, #FFFFFF 42px 56px)',
    }}
  />
)

function SectionTitle({ script, title, subtitle }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <span className="font-script text-3xl text-purple-600">{script}</span>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mt-1">{title}</h2>
      {subtitle && <p className="text-gray-500 mt-3">{subtitle}</p>}
    </div>
  )
}

function ProductImage({ product, className = '', compact = false }) {
  const [error, setError] = useState(false)
  if (product.image_url && !error) {
    return (
      <img
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        onError={() => setError(true)}
        className={`w-full h-full object-cover ${className}`}
      />
    )
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 via-cream-100 to-pine-50 text-purple-300">
      <Cake className={compact ? 'w-7 h-7 stroke-[1.4]' : 'w-12 h-12 stroke-[1.3]'} />
      {!compact && <span className="text-[11px] font-semibold mt-1 text-purple-400">Foto próximamente</span>}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="rounded-3xl bg-white border border-purple-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-purple-50" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-2/3 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-5 w-1/3 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

function ProductTile({ product, currency, onOpen, onQuickAdd }) {
  const { from, amount } = priceInfo(product)
  const hasOptions = activeVariants(product).length > 1

  return (
    <article className="group rounded-3xl bg-white border border-purple-100/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative aspect-[4/3] w-full overflow-hidden"
        aria-label={`Ver detalles de ${product.name}`}
      >
        <ProductImage product={product} className="group-hover:scale-105 transition-transform duration-500" />
        {product.product_categories?.name && (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-[11px] font-bold text-pine-700 shadow-sm">
            {product.product_categories.name}
          </span>
        )}
        {product.is_featured && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold-400 text-[11px] font-bold text-gold-900 shadow-sm">
            <Star className="w-3 h-3 fill-current" /> Favorito
          </span>
        )}
      </button>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug">{product.name}</h3>
        {product.description && <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{product.description}</p>}
        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <div>
            {from && <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Desde</span>}
            <span className="text-xl font-extrabold text-purple-700">{formatCurrency(amount, currency)}</span>
          </div>
          <button
            type="button"
            onClick={() => (hasOptions ? onOpen(product) : onQuickAdd(product))}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> {hasOptions ? 'Elegir' : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  )
}

function useModalBehavior(open, onClose) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
}

function ProductModal({ product, currency, onClose, onAdd }) {
  const variants = activeVariants(product)
  const [variantId, setVariantId] = useState(variants[0]?.id || null)
  const [qty, setQty] = useState(1)
  useModalBehavior(true, onClose)

  const variant = variants.find((v) => v.id === variantId) || null
  const unit = variant ? Number(variant.price) : Number(product.price)

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="absolute inset-0 bg-pine-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up grid sm:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center text-gray-700 hover:text-purple-700"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="aspect-square sm:aspect-auto sm:min-h-full">
          <ProductImage product={product} />
        </div>
        <div className="p-6 sm:p-7 flex flex-col">
          {product.product_categories?.name && (
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-pine-600">{product.product_categories.name}</span>
          )}
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mt-1 pr-8">{product.name}</h3>
          {product.description && <p className="text-gray-600 mt-3 leading-relaxed text-sm">{product.description}</p>}

          {variants.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Presentación</legend>
              <div className="space-y-2">
                {variants.map((v) => (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-colors ${
                      variantId === v.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="variant"
                        checked={variantId === v.id}
                        onChange={() => setVariantId(v.id)}
                        className="accent-purple-600"
                      />
                      <span className="text-sm font-semibold text-gray-800">{v.name}</span>
                    </span>
                    <span className="text-sm font-extrabold text-purple-700">{formatCurrency(v.price, currency)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-6 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Cantidad</span>
            <div className="flex items-center gap-1 rounded-full border border-gray-200 p-1">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Menos">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold" aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Más">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onAdd(product, variant, qty)
              onClose()
            }}
            className="mt-6 sm:mt-auto w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md transition-colors"
          >
            <ShoppingBag className="w-5 h-5" /> Agregar al pedido · {formatCurrency(unit * qty, currency)}
          </button>
        </div>
      </div>
    </div>
  )
}

function canShareFile(file) {
  try {
    return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }))
  } catch {
    return false
  }
}

function downloadFile(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function CartDrawer({ open, onClose, cart, currency, waNumber, business }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null) // { folio, file, saved, summary }
  const [shareHint, setShareHint] = useState(null)
  useModalBehavior(open, onClose)

  const validate = () => {
    const e = {}
    if (name.trim().length < 2) e.name = 'Escribe tu nombre.'
    if (phone.replace(/\D/g, '').length < 8) e.phone = 'Escribe un teléfono / WhatsApp válido.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleConfirm = async () => {
    if (!validate()) return
    setSending(true)
    const items = cart.items
    const total = cart.total
    const customer = { name: name.trim(), phone: phone.trim(), date, notes: notes.trim() }
    const { generateWebOrderPdf, makeWebOrderFolio } = await import('@/lib/webOrderPdf')
    const folio = makeWebOrderFolio()

    // 1. Registrar la solicitud en el sistema de Nani Cake (Pedidos Web)
    const { error: saveError } = await supabase.from('web_orders').insert({
      folio,
      customer_name: customer.name.slice(0, 80),
      customer_phone: customer.phone.slice(0, 25),
      desired_date: date || null,
      notes: customer.notes ? customer.notes.slice(0, 600) : null,
      items: items.map((i) => ({
        product_id: i.productId || null,
        variant_id: i.variantId || null,
        name: i.name,
        variant: i.variant,
        qty: i.qty,
        price: i.price,
        image: i.image,
      })),
      total,
    })
    if (saveError) console.error('No se pudo registrar el pedido web:', saveError.message)

    // 2. PDF del pedido (para enviarlo como archivo por WhatsApp)
    let file = null
    try {
      const { blob, fileName } = await generateWebOrderPdf({ folio, items, total, currency, customer, business })
      file = new File([blob], fileName, { type: 'application/pdf' })
    } catch (err) {
      console.error('Error generando PDF del pedido:', err)
    }

    setSending(false)
    setDone({
      folio,
      file,
      saved: !saveError,
      summary: buildOrderMessage({ items, total, currency, name: customer.name, date, notes: customer.notes, folio }),
    })
  }

  const sharePdf = async () => {
    if (!done?.file) return
    const text = `¡Hola Nani Cake! 🎄 Te envío el PDF de mi pedido ${done.folio}.`
    if (canShareFile(done.file)) {
      try {
        await navigator.share({ files: [done.file], title: `Pedido ${done.folio}`, text })
        setShareHint(null)
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    // Navegador sin "compartir archivos" (p. ej. algunas PC): descargar + abrir chat para adjuntarlo
    downloadFile(done.file)
    const link = waLink(waNumber, `${text}\n\n(Te lo adjunto en este chat 📎)`)
    if (link) window.open(link, '_blank', 'noopener')
    setShareHint('Se descargó el PDF. En el chat de WhatsApp toca 📎 Adjuntar → Documento y elige el archivo.')
  }

  const reset = () => {
    cart.clear()
    setDone(null)
    setShareHint(null)
    setNotes('')
    setDate('')
    onClose()
  }

  const field = (key) => (errors[key] ? 'border-red-400 ring-2 ring-red-200' : '')

  return (
    <div className={`fixed inset-0 z-[70] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-pine-950/60 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mi pedido"
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-cream-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 h-16 bg-white border-b border-purple-100 flex-shrink-0">
          <h2 className="flex items-center gap-2 font-serif text-xl font-bold text-gray-900">
            <ShoppingBag className="w-5 h-5 text-purple-600" /> Mi pedido
          </h2>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          /* ---------------- PEDIDO ENVIADO ---------------- */
          <div className="flex-1 overflow-y-auto p-6 flex flex-col">
            <div className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${done.saved ? 'bg-pine-50' : 'bg-gold-50'}`}>
                <Check className={`w-10 h-10 ${done.saved ? 'text-pine-600' : 'text-gold-600'}`} />
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold text-gray-900">
                {done.saved ? '¡Pedido recibido!' : '¡Tu pedido está listo!'}
              </h3>
              <p className="mt-1 text-sm font-bold text-purple-700">{done.folio}</p>
              <p className="mt-3 text-sm text-gray-600">
                {done.saved
                  ? 'Nani Cake ya tiene tu pedido en su sistema y te confirmará por WhatsApp la disponibilidad y el total.'
                  : 'Envíanos el PDF por WhatsApp para recibir tu pedido.'}
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {done.file && (
                <button
                  type="button"
                  onClick={sharePdf}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#25D366] hover:bg-[#1fb457] text-white font-bold shadow-md transition-colors"
                >
                  <FileText className="w-5 h-5" /> Enviar PDF por WhatsApp
                </button>
              )}
              <p className="text-[11px] text-center text-gray-500 leading-snug">
                Se abrirá el menú para compartir: elige <b>WhatsApp</b> y el chat de <b>Nani Cake ({business?.whatsapp || LANDING.whatsapp})</b>.
              </p>
              {shareHint && (
                <p className="text-xs text-pine-900 bg-pine-50 border border-pine-200 rounded-xl p-3" role="status">{shareHint}</p>
              )}
              {done.file && (
                <button
                  type="button"
                  onClick={() => downloadFile(done.file)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border border-purple-200 text-purple-700 font-bold hover:bg-purple-50"
                >
                  <Download className="w-4 h-4" /> Descargar mi PDF
                </button>
              )}
              {waLink(waNumber, done.summary) && (
                <a
                  href={waLink(waNumber, done.summary)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border border-pine-200 text-pine-700 font-bold hover:bg-pine-50"
                >
                  <MessageCircle className="w-4 h-4" /> Abrir chat de Nani Cake
                </a>
              )}
            </div>

            <button type="button" onClick={reset} className="mt-auto pt-6 text-sm font-bold text-gray-500 hover:text-purple-700">
              Hacer un nuevo pedido
            </button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center">
              <ShoppingBag className="w-9 h-9 text-purple-300" />
            </div>
            <p className="mt-4 font-bold text-gray-800">Tu pedido está vacío</p>
            <p className="text-sm text-gray-500 mt-1">Agrega pasteles y postres desde el catálogo.</p>
            <a href="#catalogo" onClick={onClose} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-purple-700 hover:underline">
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.items.map((i) => (
                <div key={i.key} className="flex gap-3 p-3 rounded-2xl bg-white border border-purple-100">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <ProductImage product={{ name: i.name, image_url: i.image }} compact />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{i.name}</p>
                    {i.variant && <p className="text-xs text-gray-500">{i.variant}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 rounded-full border border-gray-200">
                        <button type="button" onClick={() => cart.setQty(i.key, i.qty - 1)} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label={`Quitar uno de ${i.name}`}>
                          {i.qty === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-500" /> : <Minus className="w-3.5 h-3.5" />}
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                        <button type="button" onClick={() => cart.setQty(i.key, i.qty + 1)} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center" aria-label={`Agregar uno de ${i.name}`}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-extrabold text-purple-700">{formatCurrency(i.qty * i.price, currency)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2 space-y-3">
                <label className="block">
                  <span className="label">Tu nombre *</span>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: null })) }}
                    className={`input ${field('name')}`}
                    placeholder="¿A nombre de quién?"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <span className="text-xs text-red-600 mt-1 block">{errors.name}</span>}
                </label>
                <label className="block">
                  <span className="label">Tu teléfono / WhatsApp *</span>
                  <input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: null })) }}
                    className={`input ${field('phone')}`}
                    placeholder="Ej. 9999-9999"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone && <span className="text-xs text-red-600 mt-1 block">{errors.phone}</span>}
                </label>
                <label className="block">
                  <span className="label">Fecha deseada de entrega</span>
                  <input type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} className="input" />
                </label>
                <label className="block">
                  <span className="label">Notas o personalización</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={600} className="input resize-none" placeholder="Ej. Dedicatoria, sabor, decoración..." />
                </label>
              </div>
            </div>

            <div className="p-5 bg-white border-t border-purple-100 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600">Total estimado</span>
                <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(cart.total, currency)}</span>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold shadow-md transition-colors"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {sending ? 'Enviando tu pedido...' : 'Confirmar pedido'}
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <FileText className="w-3.5 h-3.5" /> Recibirás un PDF detallado para enviarlo por WhatsApp
              </p>
              <button type="button" onClick={cart.clear} className="w-full text-xs font-semibold text-gray-400 hover:text-red-500">
                Vaciar pedido
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl bg-white border border-purple-100">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-bold text-gray-900">{q}</span>
        <ChevronDown className={`w-5 h-5 text-purple-600 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="px-5 pb-5 -mt-1 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const { user } = useAuthStore()
  const cart = useCart()
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    document.title = 'Nani Cake — Pastelería & Repostería · Pedidos navideños'
    let cancelled = false
    ;(async () => {
      try {
        const [prodRes, setRes] = await Promise.all([
          supabase
            .from('products')
            .select('*, product_categories(id, name), product_variants(id, name, price, is_active)')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase
            .from('business_settings')
            .select('business_name, address, phone, whatsapp, email, currency_symbol')
            .limit(1)
            .maybeSingle(),
        ])
        if (prodRes.error) throw prodRes.error
        if (cancelled) return
        const sorted = (prodRes.data || []).sort(
          (a, b) =>
            Number(!!b.is_featured) - Number(!!a.is_featured) ||
            Number(!!b.image_url) - Number(!!a.image_url) ||
            (a.sort_order || 0) - (b.sort_order || 0)
        )
        setProducts(sorted)
        setSettings(setRes.data || null)
      } catch (err) {
        console.error('Landing: error cargando productos', err)
        if (!cancelled) setError('No pudimos cargar el catálogo en este momento. Intenta de nuevo en unos minutos.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(t)
  }, [notice])

  const currency = settings?.currency_symbol || 'L'
  const waNumber = toWhatsAppNumber(settings?.whatsapp || LANDING.whatsapp)
  const contactLink = waLink(waNumber, '¡Hola Nani Cake! 🎄 Quiero información para un pedido navideño.')

  const addToCart = (product, variant = null, qty = 1) => {
    cart.add(product, variant, qty)
    setNotice(`${qty} × ${product.name}${variant ? ` (${variant.name})` : ''} agregado`)
  }
  const quickAdd = (product) => addToCart(product, activeVariants(product)[0] || null, 1)

  const categories = useMemo(() => {
    const map = new Map()
    products.forEach((p) => {
      const c = p.product_categories
      if (!c) return
      const entry = map.get(c.id) || { id: c.id, name: c.name, count: 0, image: null }
      entry.count += 1
      if (!entry.image && p.image_url) entry.image = p.image_url
      map.set(c.id, entry)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.product_categories?.id !== category) return false
      if (q && !`${p.name} ${p.description || ''} ${p.product_categories?.name || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, category, search])

  const featured = useMemo(() => {
    const marked = products.filter((p) => p.is_featured)
    const pool = marked.length > 0 ? marked : products.filter((p) => p.image_url)
    return pool.slice(0, 3)
  }, [products])

  const selectCategory = (id) => {
    setCategory(id)
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })
  }

  const shownWhatsapp = settings?.whatsapp || LANDING.whatsapp
  const hasContact = settings?.address || settings?.phone || shownWhatsapp || settings?.email

  return (
    <div className="min-h-screen bg-cream-50 text-gray-900 font-sans">
      {/* ================= AVISO ================= */}
      <div className="bg-pine-900 text-pine-50 text-center text-xs sm:text-sm font-semibold px-4 py-2">
        {LANDING.announcement}
      </div>

      {/* ================= NAV ================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(200,16,46,0.08)]">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="#inicio" className="flex items-center gap-2.5 min-w-0">
            <img src={LOGO} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <span className="font-script text-2xl font-bold text-purple-700 leading-none truncate">Nani Cake</span>
          </a>
          <div className="hidden md:flex items-center gap-1">
            {[['#catalogo', 'Catálogo'], ['#como-pedir', 'Cómo pedir'], ['#preguntas', 'Preguntas'], ['#contacto', 'Contacto']].map(([href, label]) => (
              <a key={href} href={href} className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-700">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={user ? '/panel' : '/login'}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-pine-700 hover:bg-pine-800 text-white text-xs font-bold shadow-sm"
              title="Ir a la administración"
            >
              {user ? <LayoutDashboard className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              <span>Admin<span className="hidden sm:inline">istración</span></span>
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              aria-label={`Mi pedido, ${cart.count} productos`}
            >
              <ShoppingBag className="w-4 h-4" /> <span className="hidden sm:inline">Mi pedido</span>
              {cart.count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-gold-400 text-gold-900 text-[11px] font-extrabold flex items-center justify-center">
                  {cart.count}
                </span>
              )}
            </button>
          </div>
        </nav>
        <CandyCane />
      </header>

      {/* ================= HERO ================= */}
      <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-pine-900 via-pine-800 to-pine-950 text-white">
        <Snowfall count={40} />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-400/15 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-24 sm:pt-20 sm:pb-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold tracking-[0.2em] uppercase text-gold-300">
              <Sparkles className="w-4 h-4" /> {LANDING.hero.badge}
            </span>
            <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05]">
              {LANDING.hero.titleTop}{' '}
              <span className="font-script text-purple-400 text-5xl sm:text-6xl lg:text-7xl">{LANDING.hero.titleScript}</span>
              <br /> {LANDING.hero.titleBottom}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-pine-100/85 max-w-xl mx-auto lg:mx-0">{LANDING.hero.subtitle}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/40 transition-colors"
              >
                <Cake className="w-5 h-5" /> Ver catálogo
              </a>
              {contactLink && (
                <a
                  href={contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-pine-800 hover:bg-cream-100 font-bold shadow-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" /> Escríbenos
                </a>
              )}
            </div>
            {!loading && products.length > 0 && (
              <p className="mt-6 text-sm text-pine-100/70 flex items-center gap-2 justify-center lg:justify-start">
                <Check className="w-4 h-4 text-gold-300" /> {products.length} delicias disponibles para tu pedido
              </p>
            )}
          </div>

          <div className="relative flex justify-center">
            <Star className="absolute top-2 left-10 w-6 h-6 text-gold-300 fill-gold-300 animate-twinkle" />
            <Star className="absolute bottom-10 right-6 w-5 h-5 text-gold-300 fill-gold-300 animate-twinkle [animation-delay:1s]" />
            <Star className="absolute top-1/3 right-0 w-4 h-4 text-white fill-white animate-twinkle [animation-delay:1.8s]" />
            <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white overflow-hidden shadow-[0_0_80px_rgba(200,16,46,0.45)] ring-8 ring-gold-400/30 animate-float-slow">
              <img src={LOGO} alt="Nani Cake · Pastelería & Repostería" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= BENEFICIOS ================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-10 relative z-10">
        <div className="grid sm:grid-cols-3 gap-4">
          {LANDING.benefits.map(({ icon, title, text }, i) => {
            const Icon = BENEFIT_ICONS[icon] || Cake
            const color = ['text-purple-600 bg-purple-50', 'text-pine-600 bg-pine-50', 'text-gold-600 bg-gold-50'][i % 3]
            return (
              <div key={title} className="flex items-start gap-4 p-5 rounded-3xl bg-white border border-purple-100 shadow-md">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ================= CATEGORÍAS ================= */}
      {categories.length > 1 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
          <SectionTitle script="Explora" title="Nuestras categorías" />
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCategory(c.id)}
                className="group relative aspect-[4/3] rounded-3xl overflow-hidden text-left shadow-sm hover:shadow-lg transition-shadow"
              >
                {c.image ? (
                  <img src={c.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pine-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-0 p-4 text-white">
                  <p className="font-serif text-lg font-bold leading-tight">{c.name}</p>
                  <p className="text-xs text-white/80">{c.count} {c.count === 1 ? 'producto' : 'productos'}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ================= DESTACADOS ================= */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
          <SectionTitle script="Favoritos de la casa" title="Para tu mesa navideña" />
          <div className="mt-10 grid md:grid-cols-3 md:grid-rows-2 gap-5">
            {featured.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p)}
                className={`group relative overflow-hidden rounded-3xl shadow-lg text-left ${
                  i === 0 ? 'md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto md:min-h-[420px]' : 'aspect-[4/3]'
                }`}
              >
                <div className="absolute inset-0">
                  <ProductImage product={p} className="group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-pine-950/85 via-pine-950/10 to-transparent" />
                <div className="absolute bottom-0 p-5 sm:p-6 text-white">
                  <h3 className={`font-serif font-bold ${i === 0 ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{p.name}</h3>
                  <p className="text-gold-300 font-extrabold mt-0.5">
                    {priceInfo(p).from ? 'Desde ' : ''}
                    {formatCurrency(priceInfo(p).amount, currency)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ================= CATÁLOGO ================= */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
        <SectionTitle script="Nuestro catálogo" title="Pasteles y postres" subtitle="Agrega tus favoritos y envía tu pedido por WhatsApp en un solo paso." />

        <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin">
            {[{ id: 'all', name: 'Todos' }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  category === c.id ? 'bg-purple-600 border-purple-600 text-white shadow' : 'bg-white border-purple-100 text-gray-700 hover:border-purple-300'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="relative md:w-72">
            <span className="sr-only">Buscar producto</span>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pastel, postre..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-purple-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </label>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
          {!loading &&
            filtered.map((p) => (
              <ProductTile key={p.id} product={p} currency={currency} onOpen={setSelected} onQuickAdd={quickAdd} />
            ))}
        </div>

        {!loading && (error || filtered.length === 0) && (
          <div className="mt-4 text-center py-14 rounded-3xl bg-white border border-dashed border-purple-200">
            <Cake className="w-12 h-12 mx-auto text-purple-300" />
            <p className="mt-3 font-bold text-gray-800">
              {error || (products.length === 0 ? 'Muy pronto publicaremos nuestros productos navideños.' : 'No encontramos productos con ese filtro.')}
            </p>
            {!error && products.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCategory('all')
                  setSearch('')
                }}
                className="mt-3 text-sm font-bold text-purple-700 hover:underline"
              >
                Ver todos los productos
              </button>
            )}
          </div>
        )}
      </section>

      {/* ================= CÓMO PEDIR ================= */}
      <section id="como-pedir" className="bg-white border-y border-purple-100 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <SectionTitle script="Así de fácil" title="¿Cómo hacer tu pedido?" />
          <ol className="mt-12 grid md:grid-cols-3 gap-8 md:gap-6">
            {LANDING.steps.map((s, i) => (
              <li key={s.title} className="relative p-6 pt-8 rounded-3xl bg-cream-50 border border-purple-100">
                <span className="absolute -top-5 left-6 w-10 h-10 rounded-full bg-purple-600 text-white font-extrabold flex items-center justify-center shadow-md ring-4 ring-white">
                  {i + 1}
                </span>
                <h3 className="font-serif text-xl font-bold text-gray-900">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => (cart.count > 0 ? setCartOpen(true) : document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }))}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md transition-colors"
            >
              {cart.count > 0 ? 'Revisar mi pedido' : 'Empezar mi pedido'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= PREGUNTAS ================= */}
      <section id="preguntas" className="max-w-3xl mx-auto px-4 sm:px-6 py-20 scroll-mt-24">
        <SectionTitle script="Resolvemos tus dudas" title="Preguntas frecuentes" />
        <div className="mt-10 space-y-3">
          {LANDING.faq.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ================= CONTACTO ================= */}
      <section id="contacto" className="relative overflow-hidden bg-purple-700 text-white scroll-mt-24">
        <Snowfall count={18} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="font-script text-3xl text-gold-300">{LANDING.closing.script}</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-1">{LANDING.closing.title}</h2>
            <p className="mt-3 text-purple-100 max-w-md">{LANDING.closing.text}</p>
            {contactLink && (
              <a
                href={contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-purple-700 hover:bg-cream-100 font-bold shadow-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" /> Reservar por WhatsApp
              </a>
            )}
          </div>
          <ul className="space-y-3">
            {settings?.address && (
              <li>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15"
                >
                  <MapPin className="w-5 h-5 text-gold-300 flex-shrink-0 mt-0.5" /> <span>{settings.address}</span>
                </a>
              </li>
            )}
            {settings?.phone && settings.phone !== shownWhatsapp && (
              <li>
                <a href={`tel:${settings.phone}`} className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15">
                  <Phone className="w-5 h-5 text-gold-300" /> {settings.phone}
                </a>
              </li>
            )}
            {shownWhatsapp && (
              <li>
                <a
                  href={contactLink || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15"
                >
                  <MessageCircle className="w-5 h-5 text-gold-300" /> WhatsApp: {shownWhatsapp}
                </a>
              </li>
            )}
            {settings?.email && (
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/15 hover:bg-white/15">
                  <Mail className="w-5 h-5 text-gold-300" /> {settings.email}
                </a>
              </li>
            )}
            {!hasContact && (
              <li className="p-4 rounded-2xl bg-white/10 border border-white/15 text-purple-100">Honduras · Pedidos por encargo</li>
            )}
          </ul>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-pine-950 text-pine-200/80">
        <CandyCane />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="" className="w-10 h-10 rounded-full bg-white object-cover" />
            <div>
              <p className="font-script text-xl text-white leading-none">Nani Cake</p>
              <p className="text-[11px] tracking-[0.2em] uppercase mt-1">Pastelería &amp; Repostería</p>
            </div>
          </div>
          <p>&copy; {new Date().getFullYear()} Nani Cake · Hecho con 🎄 en Honduras</p>
        </div>
      </footer>

      {/* ================= FLOTANTES ================= */}
      {cart.count > 0 && !cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 sm:hidden inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-purple-600 text-white font-bold shadow-2xl whitespace-nowrap"
        >
          <ShoppingBag className="w-5 h-5" /> Ver pedido ({cart.count}) · {formatCurrency(cart.total, currency)}
        </button>
      )}
      {contactLink && (
        <a
          href={contactLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escríbenos por WhatsApp"
          className="fixed bottom-5 right-5 z-50 hidden sm:flex w-14 h-14 rounded-full bg-[#25D366] text-white items-center justify-center shadow-xl hover:scale-105 transition-transform"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}

      {notice && (
        <div role="status" className="fixed top-24 left-1/2 -translate-x-1/2 z-[80] px-4 py-2.5 rounded-full bg-pine-800 text-white text-sm font-semibold shadow-xl animate-fade-in flex items-center gap-2 whitespace-nowrap">
          <Check className="w-4 h-4 text-gold-300" /> {notice}
        </div>
      )}

      {selected && <ProductModal product={selected} currency={currency} onClose={() => setSelected(null)} onAdd={addToCart} />}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        currency={currency}
        waNumber={waNumber}
        business={{ whatsapp: settings?.whatsapp || LANDING.whatsapp, address: settings?.address }}
      />
    </div>
  )
}
