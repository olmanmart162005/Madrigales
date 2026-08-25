import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, Package, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'

export default function ProductSearchSelector({ onSelectProduct }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_categories(name),
            product_variants(id, name, price, is_active)
          `)
          .eq('is_active', true)
          .ilike('name', `%${query.trim()}%`)
          .limit(8)

        if (error) throw error
        setResults(data || [])
        setIsOpen(true)
      } catch (err) {
        console.error('Error searching products:', err)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (product, variant = null) => {
    onSelectProduct(product, variant)
    setQuery('')
    setResults([])
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar producto por nombre (ej. Pastel de Chocolate, Cupcake)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          className="input pl-9 pr-8 text-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-72 overflow-y-auto z-50 divide-y divide-gray-50 scrollbar-thin">
          {results.length > 0 ? (
            results.map((product) => {
              const activeVariants = (product.product_variants || []).filter((v) => v.is_active !== false)
              const hasVariants = activeVariants.length > 0

              return (
                <div
                  key={product.id}
                  className="p-3 hover:bg-purple-50/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-purple-100">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {product.product_categories?.name || 'General'}
                        </p>
                      </div>
                    </div>

                    {!hasVariants && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-purple-800">
                          {formatCurrency(product.price, currencySymbol)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelect(product, null)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Variantes / Presentaciones disponibles */}
                  {hasVariants && (
                    <div className="mt-2 pl-12 flex flex-wrap gap-1.5">
                      {activeVariants.map((v) => (
                        <button
                          key={v.id || v.name}
                          type="button"
                          onClick={() => handleSelect(product, v)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 border border-purple-200 text-xs font-medium text-gray-800 hover:text-purple-900 transition-all shadow-2xs cursor-pointer group"
                        >
                          <Layers className="w-3 h-3 text-purple-600" />
                          <span className="font-bold">{v.name}:</span>
                          <span className="text-purple-700 font-extrabold">{formatCurrency(v.price, currencySymbol)}</span>
                          <Plus className="w-3 h-3 text-purple-400 group-hover:text-purple-700 ml-0.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-4 text-center text-xs text-gray-400">
              No se encontraron productos con "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
