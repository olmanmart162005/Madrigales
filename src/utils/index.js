/**
 * Genera un número de pedido en el cliente como fallback.
 * La lógica principal está en la función SQL generate_order_number().
 */
export function generateOrderNumber(lastNumber = 0) {
  const num = lastNumber + 1
  return `PED-${String(num).padStart(4, '0')}`
}

/**
 * Formatea una fecha a español
 */
export function formatDate(date, options = {}) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-HN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

/**
 * Formatea una hora HH:MM
 */
export function formatTime(time) {
  if (!time) return '—'
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

/**
 * Formatea moneda con símbolo configurable
 */
export function formatCurrency(amount, symbol = 'L') {
  if (amount === null || amount === undefined) return `${symbol}0.00`
  return `${symbol}${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * Calcula el estado de stock de una materia prima
 */
export function getStockStatus(quantity, minQuantity) {
  if (quantity <= 0) return 'agotado'
  if (quantity <= minQuantity) return 'bajo'
  return 'disponible'
}

/**
 * Trunca texto con elipsis
 */
export function truncate(str, maxLength = 50) {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}

/**
 * Obtiene las iniciales de un nombre
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

/**
 * Labels para estados de pedido
 */
export const ORDER_STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

/**
 * Colores para estados de pedido (Tailwind classes)
 */
export const ORDER_STATUS_COLORS = {
  pendiente: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
  },
  en_preparacion: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
  },
  listo: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-400',
  },
  entregado: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
  cancelado: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-400',
  },
}

/**
 * Labels para estados de stock
 */
export const STOCK_STATUS_LABELS = {
  disponible: 'Disponible',
  bajo: 'Existencia baja',
  agotado: 'Agotado',
}

/**
 * Debounce utility
 */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
