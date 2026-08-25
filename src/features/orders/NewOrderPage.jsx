import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, Calendar,
  CreditCard, User, Clock, FileText, CheckCircle2, Layers, Minus
} from 'lucide-react'
import PosProductCatalog from './components/PosProductCatalog'
import { usePaymentMethods } from './hooks/useOrders'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { formatCurrency } from '@/utils'
import toast from 'react-hot-toast'

const orderSchema = z.object({
  customer_name: z.string().optional(),
  order_date: z.string().min(1, 'La fecha del pedido es requerida'),
  delivery_date: z.string().optional(),
  delivery_time: z.string().optional(),
  payment_method_id: z.string().optional(),
  discount: z.coerce.number().min(0, 'El descuento no puede ser negativo').default(0),
  amount_paid: z.coerce.number().min(0, 'El abono no puede ser negativo').default(0),
  notes: z.string().optional(),
  status: z.enum(['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado']).default('pendiente'),
})

export default function NewOrderPage() {
  const [items, setItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()
  const { paymentMethods } = usePaymentMethods()

  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '',
      order_date: today,
      delivery_date: '',
      delivery_time: '',
      payment_method_id: '',
      discount: 0,
      amount_paid: 0,
      notes: '',
      status: 'pendiente',
    },
  })

  const discount = Number(watch('discount')) || 0
  const amountPaid = Number(watch('amount_paid')) || 0

  // Agregar producto o variante a la orden
  const handleAddProduct = (product, variant = null) => {
    const variantId = variant?.id || null
    const variantName = variant?.name || null
    const price = variant ? parseFloat(variant.price) : parseFloat(product.price || 0)

    const existingIndex = items.findIndex(
      (i) => i.product_id === product.id && i.variant_id === variantId
    )

    if (existingIndex >= 0) {
      const updated = [...items]
      updated[existingIndex].quantity += 1
      updated[existingIndex].subtotal =
        updated[existingIndex].quantity * updated[existingIndex].unit_price
      setItems(updated)
      toast.success(`+1 ${product.name} (${variantName || 'Estándar'})`, { duration: 1200 })
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          variant_id: variantId,
          variant_name: variantName,
          unit_price: price, // SNAPSHOT HISTÓRICO INMUTABLE
          quantity: 1,
          subtotal: price,
        },
      ])
      toast.success(`Agregado: ${product.name} (${variantName || 'Estándar'})`, { duration: 1200 })
    }
  }

  // Modificar cantidad
  const handleQuantityChange = (index, delta) => {
    const updated = [...items]
    const newQty = updated[index].quantity + delta
    if (newQty <= 0) {
      handleRemoveItem(index)
      return
    }
    updated[index].quantity = newQty
    updated[index].subtotal = newQty * updated[index].unit_price
    setItems(updated)
  }

  // Modificar cantidad directamente
  const handleDirectQuantity = (index, newQty) => {
    const qty = parseInt(newQty, 10) || 1
    if (qty < 1) return
    const updated = [...items]
    updated[index].quantity = qty
    updated[index].subtotal = qty * updated[index].unit_price
    setItems(updated)
  }

  // Eliminar producto de la orden
  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Cálculos en tiempo real
  const subtotal = items.reduce((acc, curr) => acc + curr.subtotal, 0)
  const total = Math.max(0, subtotal - discount)
  const balance = Math.max(0, total - amountPaid)

  // Generador único de número de pedido MAD-000001
  const generateNextOrderNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_number')

      if (error) throw error

      let maxNum = 0
      if (data && data.length > 0) {
        data.forEach((row) => {
          if (row.order_number) {
            const numPart = row.order_number.replace(/\D/g, '')
            const parsed = parseInt(numPart, 10)
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed
            }
          }
        })
      }

      const nextNum = maxNum + 1
      return `MAD-${String(nextNum).padStart(6, '0')}`
    } catch {
      return `MAD-${String(Date.now()).slice(-6)}`
    }
  }

  const onSubmit = async (values) => {
    if (items.length === 0) {
      toast.error('Debes seleccionar al menos un producto del catálogo')
      return
    }

    if (amountPaid > total) {
      toast.error('El abono no puede ser mayor que el total del pedido')
      return
    }

    const calculatedBalance = Math.max(0, total - amountPaid)

    if (values.status === 'entregado' && calculatedBalance > 0) {
      toast.error(
        `No se puede marcar el pedido como "Entregado" porque tiene un saldo pendiente de ${formatCurrency(calculatedBalance, currencySymbol)}. Primero debe registrarse el pago completo.`
      )
      return
    }

    try {
      setSubmitting(true)
      let orderNumber = await generateNextOrderNumber()
      let newOrder = null
      let attempts = 0
      const maxAttempts = 5

      while (!newOrder && attempts < maxAttempts) {
        attempts++
        const orderPayload = {
          order_number: orderNumber,
          customer_name: values.customer_name?.trim() || null, // Opcional
          order_date: values.order_date,
          delivery_date: values.delivery_date || null,
          delivery_time: values.delivery_time || null,
          payment_method_id: values.payment_method_id || null,
          subtotal,
          discount,
          total,
          amount_paid: amountPaid,
          notes: values.notes?.trim() || null,
          status: values.status,
          created_by: user?.id || null,
        }

        const { data, error: orderError } = await supabase
          .from('orders')
          .insert([orderPayload])
          .select()
          .single()

        if (orderError) {
          if (orderError.code === '23505' || orderError.message?.includes('duplicate key')) {
            const currentNum = parseInt(orderNumber.replace(/\D/g, ''), 10) || 1
            orderNumber = `MAD-${String(currentNum + 1).padStart(6, '0')}`
            continue
          }
          throw orderError
        }

        newOrder = data
      }

      if (!newOrder) {
        throw new Error('No se pudo generar el número de pedido. Intenta nuevamente.')
      }

      // Insertar Detalle de Pedido (order_items) con snapshot inmutable
      const orderItemsPayload = items.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        variant_id: item.variant_id || null,
        variant_name: item.variant_name || null,
        unit_price: item.unit_price, // PRECIO HISTÓRICO CONGELADO
        quantity: item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)

      if (itemsError) throw itemsError

      // Si se registró un abono inicial, guardarlo en order_payments para el historial financiero
      if (amountPaid > 0) {
        await supabase.from('order_payments').insert({
          order_id: newOrder.id,
          amount: amountPaid,
          payment_method_id: values.payment_method_id || null,
          payment_date: values.order_date || new Date().toISOString(),
          notes: 'Pago / abono inicial registrado al crear el pedido',
          created_by: user?.id || null,
        })
      }

      // Registrar Log de Actividad
      await logActivity({
        action: `Registró el pedido #${newOrder.order_number}${
          values.customer_name ? ` para ${values.customer_name}` : ''
        } por un total de ${formatCurrency(total, currencySymbol)}${
          amountPaid > 0 ? ` con un abono de ${formatCurrency(amountPaid, currencySymbol)}` : ''
        }`,
        entityType: 'order',
        entityId: newOrder.id,
        entityName: `#${newOrder.order_number}`,
        details: {
          itemsCount: items.length,
          total,
          balance,
        },
      })

      toast.success(`Pedido #${newOrder.order_number} registrado exitosamente`)
      navigate(`/pedidos/${newOrder.id}`)
    } catch (err) {
      console.error('Error creating order:', err)
      toast.error('Error al registrar pedido: ' + (err.message || 'Verifica los datos'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          to="/pedidos"
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-purple-700 hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Punto de Venta · Registrar Pedido
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Haz clic en los productos y presentaciones del catálogo para armar el pedido rápidamente.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============================================================
              COLUMNA IZQUIERDA (7 cols): CATÁLOGO VISUAL DE PRODUCTOS
              ============================================================ */}
          <div className="lg:col-span-7 space-y-5">
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Catálogo de Productos</h3>
                    <p className="text-[11px] text-gray-500">
                      Selecciona la categoría y haz clic en el tamaño deseado
                    </p>
                  </div>
                </div>
              </div>

              {/* Catálogo Interactivo POS */}
              <PosProductCatalog onSelectProduct={handleAddProduct} />
            </div>

            {/* Observaciones y Notas */}
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-2">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>Observaciones del Pedido (Dedicatoria, decorado, etc.)</span>
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Ej. Dedicatoria en el pastel, flores en tono lila, retirar a las 4:00 PM..."
                className="input text-xs resize-none"
              />
            </div>
          </div>

          {/* ============================================================
              COLUMNA DERECHA (5 cols): RESUMEN DE ORDEN & FACTURACIÓN
              ============================================================ */}
          <div className="lg:col-span-5 space-y-5">
            {/* Lista de Productos en la Orden */}
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Detalle del Pedido</h3>
                </div>
                <span className="text-xs font-extrabold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-6 border-2 border-dashed border-purple-100 rounded-2xl text-center bg-purple-50/20 my-2">
                  <ShoppingCart className="w-8 h-8 text-purple-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-gray-700">Orden vacía</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Haz clic en cualquier presentación del catálogo a la izquierda para agregar.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {items.map((item, index) => (
                    <div
                      key={`${item.product_id}_${item.variant_id || 'base'}`}
                      className="py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                          {item.product_name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.variant_name ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                              {item.variant_name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">Estándar</span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {formatCurrency(item.unit_price, currencySymbol)} c/u
                          </span>
                        </div>
                      </div>

                      {/* Controles de Cantidad + / - */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, -1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-900 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <span className="w-6 text-center font-black text-xs text-gray-900">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuantityChange(index, 1)}
                          className="w-6 h-6 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right min-w-[70px]">
                        <p className="text-xs font-black text-purple-900">
                          {formatCurrency(item.subtotal, currencySymbol)}
                        </p>
                      </div>

                      {/* Eliminar */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-gray-300 hover:text-red-600 transition-colors"
                        title="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Datos del Cliente y Entrega */}
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-3">
              <div>
                <label className="label text-xs">
                  Cliente <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    {...register('customer_name')}
                    type="text"
                    placeholder="Nombre del cliente o mostrador"
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label text-xs">Fecha Pedido *</label>
                  <input {...register('order_date')} type="date" className="input text-xs" />
                </div>
                <div>
                  <label className="label text-xs">Fecha Entrega</label>
                  <input {...register('delivery_date')} type="date" className="input text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="label text-xs">Hora Entrega</label>
                  <input {...register('delivery_time')} type="time" className="input text-xs" />
                </div>
                <div>
                  <label className="label text-xs">Método de Pago</label>
                  <select {...register('payment_method_id')} className="input text-xs">
                    <option value="">Seleccionar</option>
                    {paymentMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Resumen Financiero y Botón Final */}
            <div className="card p-5 bg-gradient-to-br from-purple-950 via-[#2C1536] to-purple-900 text-white shadow-lg space-y-3.5 rounded-2xl">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-purple-200">
                  <span>Subtotal:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(subtotal, currencySymbol)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-purple-200">Descuento:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-300 font-bold">{currencySymbol}</span>
                    <input
                      {...register('discount')}
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-20 h-7 text-right text-xs bg-purple-900/80 border border-purple-700/80 rounded px-1.5 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="border-t border-purple-800 pt-2 flex items-center justify-between text-sm font-black">
                  <span>TOTAL:</span>
                  <span className="text-xl text-amber-300 font-black">
                    {formatCurrency(total, currencySymbol)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 border-t border-purple-800/60">
                  <span className="text-purple-200">Abono:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-purple-300 font-bold">{currencySymbol}</span>
                    <input
                      {...register('amount_paid')}
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 h-7 text-right text-xs bg-purple-900/80 border border-purple-700/80 rounded px-2 text-emerald-300 font-black"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between font-bold pt-1">
                  <span className="text-purple-300">Saldo Pendiente:</span>
                  <span
                    className={`text-sm font-black ${
                      balance > 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {formatCurrency(balance, currencySymbol)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || items.length === 0}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Procesando...' : 'Guardar y Generar Factura'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
