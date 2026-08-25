import React, { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Package, Layers, Sparkles, Cake, Cookie, Coffee } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/utils'
import { useSettingsStore } from '@/store/settingsStore'

export default function PosProductCatalog({ onSelectProduct }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true)
        // 1. Cargar categorías
        const { data: cats } = await supabase
          .from('product_categories')
          .select('id, name')
          .order('name')

        setCategories(cats || [])

        // 2. Cargar productos con sus variantes activas
        const { data: prods, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            price,
            image_url,
            category_id,
            product_categories(id, name),
            product_variants(id, name, price, is_active)
          `)
          .eq('is_active', true)
          .order('name')

        if (error) throw error

        // Procesar variantes ordenadas por precio
        const processed = (prods || []).map((p) => ({
          ...p,
          product_variants: (p.product_variants || [])
            .filter((v) => v.is_active !== false)
            .sort((a, b) => Number(a.price) - Number(b.price)),
        }))

        setProducts(processed)
      } catch (err) {
        console.error('Error loading POS catalog:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCatalog()
  }, [])

  // Filtrar productos por búsqueda y categoría
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'all' || p.category_id === selectedCategory

      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase().trim())

      return matchCategory && matchSearch
    })
  }, [products, selectedCategory, searchQuery])

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda y Filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre (ej. Chocolate, Tres Leches, Red Velvet)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-purple-50/30 border-purple-200 focus:bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Pestañas de Categorías con Scroll Horizontal */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            Todos ({products.length})
          </button>

          {categories.map((c) => {
            const count = products.filter((p) => p.category_id === c.id).length
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
                }`}
              >
                {c.name} {count > 0 && <span className="opacity-75">({count})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid de Productos y Presentaciones */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-purple-100 rounded-2xl text-center bg-purple-50/20">
          <Package className="w-8 h-8 text-purple-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-gray-700">No se encontraron productos</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Intenta con otro término de búsqueda o selecciona otra categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
          {filteredProducts.map((product) => {
            const variants = product.product_variants || []
            const hasVariants = variants.length > 0

            return (
              <div
                key={product.id}
                className="p-3.5 bg-white rounded-2xl border border-purple-100/90 shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5"
              >
                {/* Cabecera del Producto */}
                <div className="flex items-start gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-purple-100/80">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-purple-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-gray-900 leading-tight truncate" title={product.name}>
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                      {product.product_categories?.name || 'General'}
                    </p>
                  </div>
                </div>

                {/* Botones de Selección de Presentaciones */}
                <div className="pt-1 border-t border-gray-50">
                  {hasVariants ? (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        Elegir Presentación:
                      </p>
                      <div className="grid grid-cols-1 gap-1">
                        {variants.map((v) => (
                          <button
                            key={v.id || v.name}
                            type="button"
                            onClick={() => onSelectProduct(product, v)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-purple-50/70 hover:bg-purple-600 text-gray-800 hover:text-white border border-purple-100 text-xs transition-all cursor-pointer group"
                          >
                            <span className="font-semibold text-[11px] group-hover:text-white">
                              {v.name}
                            </span>
                            <div className="flex items-center gap-1 font-extrabold text-purple-800 group-hover:text-white">
                              <span>{formatCurrency(v.price, currencySymbol)}</span>
                              <Plus className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product, null)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-600 text-gray-800 hover:text-white border border-purple-200 text-xs font-bold transition-all cursor-pointer group"
                    >
                      <span className="group-hover:text-white">Agregar Producto</span>
                      <div className="flex items-center gap-1 text-purple-800 group-hover:text-white">
                        <span>{formatCurrency(product.price, currencySymbol)}</span>
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
