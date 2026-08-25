import React from 'react'
import { Edit2, Power, Trash2, Package, Layers } from 'lucide-react'
import { formatCurrency } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'

export default function ProductCard({ product, onEdit, onToggleStatus, onDelete }) {
  const { isAdmin } = useAuthStore()
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()
  const admin = isAdmin()

  const variants = product.product_variants || []
  const hasVariants = variants.length > 0

  return (
    <div
      className={`card overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col ${
        !product.is_active ? 'opacity-75 bg-gray-50' : 'bg-white'
      }`}
    >
      {/* Imagen */}
      <div className="relative h-44 w-full bg-purple-50 flex items-center justify-center overflow-hidden border-b border-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-purple-300">
            <Package className="w-10 h-10 stroke-[1.5]" />
            <span className="text-[10px] font-medium mt-1">Sin imagen</span>
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span
            className={`badge shadow-xs text-[10px] font-bold ${
              product.is_active
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                product.is_active ? 'bg-emerald-500' : 'bg-gray-400'
              }`}
            />
            {product.is_active ? 'Activo' : 'Desactivado'}
          </span>
        </div>

        {product.product_categories?.name && (
          <div className="absolute bottom-2 left-2">
            <span className="badge bg-white/95 backdrop-blur-xs text-purple-900 border border-purple-100 shadow-xs text-[10px] font-bold">
              {product.product_categories.name}
            </span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-1" title={product.name}>
            {product.name}
          </h3>
          {product.description ? (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed" title={product.description}>
              {product.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1 italic">Sin descripción</p>
          )}
        </div>

        {/* Listado de Presentaciones y Precios */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <Layers className="w-3 h-3 text-purple-600" />
            <span>Presentaciones ({variants.length})</span>
          </div>

          {hasVariants ? (
            <div className="flex flex-wrap gap-1.5">
              {variants.map((v) => (
                <span
                  key={v.id || v.name}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 border border-purple-100 text-[11px] font-medium text-gray-800"
                >
                  <span className="font-bold text-purple-900">{v.name}:</span>
                  <span className="text-purple-700 font-extrabold">{formatCurrency(v.price, currencySymbol)}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-base font-extrabold text-purple-800">
              {formatCurrency(product.price, currencySymbol)}
            </div>
          )}
        </div>

        {/* Acciones para Admin */}
        {admin && (
          <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-1">
            <button
              onClick={() => onEdit(product)}
              title="Editar producto y presentaciones"
              className="p-1.5 rounded-lg text-gray-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleStatus(product)}
              title={product.is_active ? 'Desactivar producto' : 'Activar producto'}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                product.is_active
                  ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDelete(product)}
              title="Eliminar producto"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
