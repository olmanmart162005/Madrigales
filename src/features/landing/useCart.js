import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'nanicake_cart_v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Carrito de pedido de la página web (persistente en el navegador). */
export function useCart() {
  const [items, setItems] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* almacenamiento lleno o bloqueado: el carrito sigue funcionando en memoria */
    }
  }, [items])

  const add = useCallback((product, variant = null, qty = 1) => {
    const key = `${product.id}:${variant?.id || 'base'}`
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i))
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          variant: variant?.name || null,
          price: Number(variant ? variant.price : product.price) || 0,
          image: product.image_url || null,
          qty,
        },
      ]
    })
  }, [])

  const setQty = useCallback((key, qty) => {
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i))))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])
  const total = useMemo(() => items.reduce((s, i) => s + i.qty * i.price, 0), [items])

  return { items, add, setQty, clear, count, total }
}
