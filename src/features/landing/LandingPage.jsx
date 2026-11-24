import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Cake, Gift, Truck, Sparkles, MapPin, Phone, Mail, MessageCircle,
  LogIn, ChevronRight, Star, ImageOff, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/utils'
import Snowfall from '@/components/ui/Snowfall'

/** Normaliza un número para wa.me (Honduras: 8 dígitos → prefijo 504) */
function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return null
  return digits.length === 8 ? `504${digits}` : digits
}

function whatsappLink(number, text) {
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}

/** Precio a mostrar: base o "desde" la variante más barata */
function priceInfo(product) {
  const variants = (product.product_variants || []).filter((v) => v.is_active !== false)
  if (variants.length > 0) {
    const min = Math.min(...variants.map((v) => Number(v.price)))
    return { from: variants.length > 1, amount: min }
  }
  return { from: false, amount: Number(product.price) }
}

const CandyCane = () => (
  <div
    aria-hidden="true"
    className="h-2 w-full"
    style={{
      backgroundImage:
        'repeating-linear-gradient(135deg, #C8102E 0 14px, #FFFFFF 14px 28px, #1E6E41 28px 42px, #FFFFFF 42px 56px)',
    }}
  />
)

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

function ProductTile({ product, currency, waNumber, onOpen }) {
  const { from, amount } = priceInfo(product)
  const [imgError, setImgError] = useState(false)
  const orderLink = whatsappLink(
    waNumber,
    `¡Hola Nani Cake! 🎄 Me interesa: ${product.name}. ¿Me podrían dar más información?`
  )

  return (
    <article className="group rounded-3xl bg-white border border-purple-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <button
        type="button"
        onClick={() => onOpen(product)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-purple-50 to-cream-100 text-left"
        aria-label={`Ver ${product.name}`}
      >
        {product.image_url && !imgError ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-purple-300">
            <Cake className="w-12 h-12 stroke-[1.4]" />
            <span className="text-xs font-medium mt-1">Foto próximamente</span>
          </div>
        )}
        {product.product_categories?.name && (
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 text-[11px] font-bold text-pine-700 shadow-sm">
            {product.product_categories.name}
          </span>
        )}
      </button>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-serif text-lg font-bold text-gray-900 leading-snug">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-4 flex items-end justify-between gap-3">
          <div>
            {from && <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Desde</span>}
            <span className="text-xl font-extrabold text-purple-700">{formatCurrency(amount, currency)}</span>
          </div>
          {orderLink ? (
            <a
              href={orderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-pine-600 hover:bg-pine-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Pedir
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onOpen(product)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors"
            >
              Ver <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function ProductModal({ product, currency, waNumber, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!product) return null
  const variants = (product.product_variants || []).filter((v) => v.is_active !== false)
  const orderLink = whatsappLink(
    waNumber,
    `¡Hola Nani Cake! 🎄 Quiero pedir: ${product.name}.`
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={product.name}>
      <div className="absolute inset-0 bg-pine-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center text-gray-700 hover:text-purple-700"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="aspect-[16/10] bg-gradient-to-br from-purple-50 to-cream-100">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-purple-300">
              <ImageOff className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="p-6 sm:p-8">
          {product.product_categories?.name && (
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-pine-600">
              {product.product_categories.name}
            </span>
          )}
          <h3 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{product.name}</h3>
          {product.description && <p className="text-gray-600 mt-3 leading-relaxed">{product.description}</p>}

          {variants.length > 0 ? (
            <ul className="mt-5 divide-y divide-purple-100 border border-purple-100 rounded-2xl overflow-hidden">
              {variants.map((v) => (
                <li key={v.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium text-gray-700">{v.name}</span>
                  <span className="font-extrabold text-purple-700">{formatCurrency(v.price, currency)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-2xl font-extrabold text-purple-700">{formatCurrency(product.price, currency)}</p>
          )}

          {orderLink && (
            <a
              href={orderLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-pine-600 hover:bg-pine-700 text-white font-bold shadow-md transition-colors"
            >
              <MessageCircle className="w-5 h-5" /> Pedir por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [products, setProducts] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    document.title = 'Nani Cake — Pastelería & Repostería · Navidad 2026'
    let cancelled = false
    ;(async () => {
      try {
        const [prodRes, setRes] = await Promise.all([
          supabase
            .from('products')
            .select('id, name, description, price, image_url, product_categories(id, name), product_variants(id, name, price, is_active)')
            .eq('is_active', true)
            .order('name', { ascending: true }),
          supabase.from('business_settings').select('business_name, address, phone, whatsapp, email, currency_symbol').limit(1).maybeSingle(),
        ])
        if (prodRes.error) throw prodRes.error
        if (cancelled) return
        // Productos con foto primero
        const sorted = (prodRes.data || []).sort((a, b) => Number(!!b.image_url) - Number(!!a.image_url))
        setProducts(sorted)
        setSettings(setRes.data || null)
      } catch (err) {
        console.error('Landing: error cargando productos', err)
        if (!cancelled) setError('No pudimos cargar el catálogo en este momento.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const currency = settings?.currency_symbol || 'L'
  const waNumber = toWhatsAppNumber(settings?.whatsapp || settings?.phone)
  const heroWaLink = whatsappLink(waNumber, '¡Hola Nani Cake! 🎄 Quiero hacer un pedido navideño.')

  const categories = useMemo(() => {
    const map = new Map()
    products.forEach((p) => p.product_categories && map.set(p.product_categories.id, p.product_categories.name))
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.product_categories?.id !== category) return false
      if (q && !`${p.name} ${p.description || ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, category, search])

  const featured = useMemo(() => products.filter((p) => p.image_url).slice(0, 3), [products])

  return (
    <div className="min-h-screen bg-cream-50 text-gray-900 font-sans">
      {/* ================= NAV ================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#inicio" className="flex items-center gap-2.5">
            <img src="/brand/nani-cake-logo.webp" alt="" className="w-10 h-10 rounded-full object-cover" />
            <span className="font-script text-2xl font-bold text-purple-700 leading-none">Nani Cake</span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#catalogo" className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-700">Catálogo</a>
            <a href="#contacto" className="hidden sm:inline-flex px-3 py-2 text-sm font-semibold text-gray-700 hover:text-purple-700">Contacto</a>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50"
            >
              <LogIn className="w-4 h-4" /> Acceso<span className="hidden sm:inline"> personal</span>
            </Link>
          </div>
        </nav>
        <CandyCane />
      </header>

      {/* ================= HERO ================= */}
      <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-pine-900 via-pine-800 to-pine-950 text-white">
        <Snowfall count={40} />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-400/15 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold tracking-[0.2em] uppercase text-gold-300">
              <Sparkles className="w-4 h-4" /> Temporada Navideña 2026
            </span>
            <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05]">
              Endulza tu <span className="font-script text-purple-400 text-5xl sm:text-6xl lg:text-7xl">Navidad</span>
              <br /> con Nani Cake
            </h1>
            <p className="mt-5 text-base sm:text-lg text-pine-100/85 max-w-xl mx-auto lg:mx-0">
              Pasteles, postres y repostería hechos a mano con amor para tus cenas, regalos y celebraciones de fin de año.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-900/40 transition-colors"
              >
                <Cake className="w-5 h-5" /> Ver catálogo
              </a>
              {heroWaLink && (
                <a
                  href={heroWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-pine-800 hover:bg-cream-100 font-bold shadow-lg transition-colors"
                >
                  <MessageCircle className="w-5 h-5" /> Pedir por WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="relative flex justify-center">
            <Star className="absolute top-2 left-10 w-6 h-6 text-gold-300 fill-gold-300 animate-twinkle" />
            <Star className="absolute bottom-10 right-6 w-5 h-5 text-gold-300 fill-gold-300 animate-twinkle [animation-delay:1s]" />
            <Star className="absolute top-1/3 right-0 w-4 h-4 text-white fill-white animate-twinkle [animation-delay:1.8s]" />
            <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-white overflow-hidden shadow-[0_0_80px_rgba(200,16,46,0.45)] ring-8 ring-gold-400/30 animate-float-slow">
              <img src="/brand/nani-cake-logo.webp" alt="Nani Cake · Pastelería & Repostería" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ================= BENEFICIOS ================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 relative z-10">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: Cake, title: 'Hecho a mano', text: 'Recetas caseras con ingredientes frescos.', color: 'text-purple-600 bg-purple-50' },
            { icon: Gift, title: 'Ideal para regalar', text: 'Detalles navideños para quienes más quieres.', color: 'text-pine-600 bg-pine-50' },
            { icon: Truck, title: 'Pedidos por encargo', text: 'Agenda tu pedido con anticipación.', color: 'text-gold-600 bg-gold-50' },
          ].map(({ icon: Icon, title, text, color }) => (
            <div key={title} className="flex items-start gap-4 p-5 rounded-3xl bg-white border border-purple-100 shadow-md">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= DESTACADOS ================= */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20">
          <div className="text-center">
            <span className="font-script text-3xl text-purple-600">Favoritos de la casa</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mt-1">Para tu mesa navideña</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {featured.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p)}
                className={`group relative overflow-hidden rounded-3xl shadow-lg text-left ${i === 0 ? 'md:row-span-2 aspect-[4/5] md:aspect-auto' : 'aspect-[4/3]'}`}
              >
                <img src={p.image_url} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-pine-950/85 via-pine-950/10 to-transparent" />
                <div className="absolute bottom-0 p-5 text-white">
                  <h3 className="font-serif text-xl font-bold">{p.name}</h3>
                  <p className="text-gold-300 font-extrabold mt-0.5">
                    {priceInfo(p).from ? 'Desde ' : ''}{formatCurrency(priceInfo(p).amount, currency)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ================= CATÁLOGO ================= */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 sm:px-6 py-20 scroll-mt-20">
        <div className="text-center">
          <span className="font-script text-3xl text-purple-600">Nuestro catálogo</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mt-1">Pasteles y postres</h2>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-thin">
            {[{ id: 'all', name: 'Todos' }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                  category === c.id
                    ? 'bg-purple-600 border-purple-600 text-white shadow'
                    : 'bg-white border-purple-100 text-gray-700 hover:border-purple-300'
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
          {!loading && filtered.map((p) => (
            <ProductTile key={p.id} product={p} currency={currency} waNumber={waNumber} onOpen={setSelected} />
          ))}
        </div>

        {!loading && (error || filtered.length === 0) && (
          <div className="mt-4 text-center py-14 rounded-3xl bg-white border border-dashed border-purple-200">
            <Cake className="w-12 h-12 mx-auto text-purple-300" />
            <p className="mt-3 font-bold text-gray-800">
              {error || (products.length === 0 ? 'Muy pronto publicaremos nuestros productos navideños.' : 'No encontramos productos con ese filtro.')}
            </p>
            {heroWaLink && (
              <a href={heroWaLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-pine-700 hover:underline">
                <MessageCircle className="w-4 h-4" /> Escríbenos y te ayudamos
              </a>
            )}
          </div>
        )}
      </section>

      {/* ================= CONTACTO ================= */}
      <section id="contacto" className="relative overflow-hidden bg-purple-700 text-white scroll-mt-20">
        <Snowfall count={18} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="font-script text-3xl text-gold-300">¡Feliz Navidad!</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold mt-1">Haz tu pedido con tiempo</h2>
            <p className="mt-3 text-purple-100 max-w-md">
              Los cupos de diciembre se llenan rápido. Escríbenos para reservar tu pastel navideño o tu pedido de fin de año.
            </p>
            {heroWaLink && (
              <a
                href={heroWaLink}
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
              <li className="flex items-start gap-3 p-4 rounded-2xl bg-white/10 border border-white/15">
                <MapPin className="w-5 h-5 text-gold-300 flex-shrink-0 mt-0.5" /> <span>{settings.address}</span>
              </li>
            )}
            {settings?.phone && (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/15">
                <Phone className="w-5 h-5 text-gold-300" />
                <a href={`tel:${settings.phone}`} className="hover:underline">{settings.phone}</a>
              </li>
            )}
            {settings?.whatsapp && (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/15">
                <MessageCircle className="w-5 h-5 text-gold-300" /> <span>WhatsApp: {settings.whatsapp}</span>
              </li>
            )}
            {settings?.email && (
              <li className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 border border-white/15">
                <Mail className="w-5 h-5 text-gold-300" />
                <a href={`mailto:${settings.email}`} className="hover:underline">{settings.email}</a>
              </li>
            )}
            {!settings?.address && !settings?.phone && !settings?.whatsapp && !settings?.email && (
              <li className="p-4 rounded-2xl bg-white/10 border border-white/15 text-purple-100">
                Honduras · Pedidos por encargo
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-pine-950 text-pine-200/80">
        <CandyCane />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <img src="/brand/nani-cake-logo.webp" alt="" className="w-10 h-10 rounded-full bg-white object-contain" />
            <div>
              <p className="font-script text-xl text-white leading-none">Nani Cake</p>
              <p className="text-[11px] tracking-[0.2em] uppercase mt-1">Pastelería &amp; Repostería</p>
            </div>
          </div>
          <p>&copy; {new Date().getFullYear()} Nani Cake · Hecho con 🎄 en Honduras</p>
        </div>
      </footer>

      {selected && (
        <ProductModal product={selected} currency={currency} waNumber={waNumber} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
