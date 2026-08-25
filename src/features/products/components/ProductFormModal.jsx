import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Upload, X, AlertCircle, Plus, Trash2, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import Modal from '@/components/ui/Modal'
import { useSettingsStore } from '@/store/settingsStore'
import { formatCurrency } from '@/utils'
import toast from 'react-hot-toast'

const productSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Selecciona una categoría'),
  price: z.coerce.number().min(0, 'El precio base debe ser mayor o igual a 0'),
  is_active: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, 'El nombre de la presentación es requerido'),
        price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
        is_active: z.boolean().default(true),
      })
    )
    .optional(),
})

export default function ProductFormModal({ isOpen, onClose, product, categories, onSuccess }) {
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()

  const isEditing = !!product

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      price: '',
      is_active: true,
      variants: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  })

  const watchedVariants = watch('variants') || []

  useEffect(() => {
    if (product) {
      const existingVariants = (product.product_variants || []).map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        is_active: v.is_active ?? true,
      }))

      reset({
        name: product.name || '',
        description: product.description || '',
        category_id: product.category_id || '',
        price: product.price || '',
        is_active: product.is_active ?? true,
        variants: existingVariants,
      })
      setImagePreview(product.image_url || null)
    } else {
      reset({
        name: '',
        description: '',
        category_id: categories[0]?.id || '',
        price: '',
        is_active: true,
        variants: [
          { name: 'Pequeño', price: '', is_active: true },
          { name: 'Mediano', price: '', is_active: true },
          { name: 'Grande', price: '', is_active: true },
        ],
      })
      setImagePreview(null)
    }
    setImageFile(null)
  }, [product, categories, reset, isOpen])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 2MB')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `products/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file)

    if (uploadError) {
      console.warn('Could not upload to storage bucket, continuing without image update:', uploadError)
      return null
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    return data.publicUrl
  }

  const onSubmit = async (values) => {
    try {
      setSubmitting(true)
      let imageUrl = product?.image_url || null

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        }
      }

      // Si tiene variantes válidas, el precio base del producto será el precio de la primera variante
      const validVariants = (values.variants || []).filter(
        (v) => v.name && v.name.trim() !== '' && Number(v.price) > 0
      )

      const basePrice =
        validVariants.length > 0
          ? Number(validVariants[0].price)
          : Number(values.price || 0)

      const productPayload = {
        name: values.name.trim(),
        description: values.description ? values.description.trim() : null,
        category_id: values.category_id || null,
        price: basePrice,
        is_active: values.is_active,
        image_url: imageUrl,
      }

      let productId = product?.id

      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', product.id)

        if (error) throw error

        await logActivity({
          action: `Modificó el producto "${values.name}"`,
          entityType: 'product',
          entityId: product.id,
          entityName: values.name,
        })
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productPayload])
          .select()
          .single()

        if (error) throw error
        productId = data.id

        await logActivity({
          action: `Creó el nuevo producto "${values.name}"`,
          entityType: 'product',
          entityId: data.id,
          entityName: values.name,
        })
      }

      // Sincronizar variantes en product_variants
      if (productId) {
        if (isEditing) {
          // Obtener variantes anteriores
          const { data: oldVariants } = await supabase
            .from('product_variants')
            .select('id')
            .eq('product_id', productId)

          const oldIds = (oldVariants || []).map((v) => v.id)
          const currentIds = validVariants.filter((v) => v.id).map((v) => v.id)
          const idsToDelete = oldIds.filter((id) => !currentIds.includes(id))

          // Eliminar variantes removidas
          if (idsToDelete.length > 0) {
            await supabase.from('product_variants').delete().in('id', idsToDelete)
          }
        }

        // Upsert variantes actuales
        for (const variant of validVariants) {
          const variantPayload = {
            product_id: productId,
            name: variant.name.trim(),
            price: parseFloat(variant.price),
            is_active: variant.is_active ?? true,
          }

          if (variant.id) {
            await supabase
              .from('product_variants')
              .update(variantPayload)
              .eq('id', variant.id)
          } else {
            await supabase.from('product_variants').insert([variantPayload])
          }
        }
      }

      toast.success(isEditing ? 'Producto y presentaciones actualizados' : 'Producto creado con éxito')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving product:', err)
      toast.error('Error al guardar el producto: ' + (err.message || 'Verifica los datos'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto & Presentaciones' : 'Nuevo Producto & Presentaciones'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
        {/* Nombre del Producto */}
        <div>
          <label className="label">Nombre del Producto *</label>
          <input
            {...register('name')}
            type="text"
            placeholder="Ej. Pastel de Chocolate / Cupcake Red Velvet"
            className="input text-sm font-semibold"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        {/* Categoría y Estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Categoría *</label>
            <select {...register('category_id')} className="input text-sm">
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>
            )}
          </div>

          <div>
            <label className="label">Estado del Producto</label>
            <div className="flex items-center gap-3 h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl">
              <input
                {...register('is_active')}
                type="checkbox"
                id="is_active"
                className="w-4 h-4 text-purple-600 rounded cursor-pointer accent-purple-600"
              />
              <label htmlFor="is_active" className="text-xs font-semibold text-gray-700 cursor-pointer">
                Disponible para la venta (Activo)
              </label>
            </div>
          </div>
        </div>

        {/* ============================================================
            SECCIÓN DE PRESENTACIONES / TAMAÑOS / VARIANTES
            ============================================================ */}
        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-700" />
              <div>
                <h4 className="text-xs font-bold text-gray-900">Presentaciones y Precios</h4>
                <p className="text-[11px] text-gray-500">
                  Define los diferentes tamaños o presentaciones con sus respectivos precios en Lempiras.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => append({ name: '', price: '', is_active: true })}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Presentación</span>
            </button>
          </div>

          {fields.length === 0 ? (
            <div className="p-3 bg-white border border-dashed border-purple-200 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-2">No hay presentaciones añadidas.</p>
              <button
                type="button"
                onClick={() => append({ name: 'Estándar', price: '', is_active: true })}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                + Añadir presentación única (Estándar)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2.5 p-2.5 bg-white border border-purple-100 rounded-xl shadow-2xs"
                >
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
                      Presentación / Tamaño
                    </label>
                    <input
                      {...register(`variants.${index}.name`)}
                      type="text"
                      placeholder="Ej. Pequeño / Mediano / Caja de 6"
                      className="input text-xs h-9 py-1"
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">
                      Precio ({currencySymbol})
                    </label>
                    <input
                      {...register(`variants.${index}.price`)}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="input text-xs h-9 py-1 font-bold text-purple-900"
                    />
                  </div>

                  <div className="pt-4 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar presentación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="label">Descripción Opcional</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Detalles sobre ingredientes, textura, recomendaciones..."
            className="input text-xs resize-none"
          />
        </div>

        {/* Imagen del Producto */}
        <div>
          <label className="label">Foto del Producto (Opcional)</label>
          <div className="flex items-center gap-4">
            {imagePreview && (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-purple-200 flex-shrink-0 shadow-2xs">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview(null)
                  }}
                  className="absolute top-1 right-1 p-0.5 bg-black/60 text-white rounded-full hover:bg-black"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <label className="flex-1 flex flex-col items-center justify-center p-3 border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl cursor-pointer bg-gray-50/50 hover:bg-purple-50/30 transition-all">
              <Upload className="w-4 h-4 text-purple-600 mb-1" />
              <span className="text-xs font-semibold text-gray-700">Subir imagen</span>
              <span className="text-[10px] text-gray-400">PNG, JPG (máx. 2MB)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary text-xs py-2.5 px-6"
          >
            {submitting ? 'Guardando...' : isEditing ? 'Actualizar Producto' : 'Crear Producto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
