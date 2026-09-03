import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ShoppingCart, Calendar,
  CreditCard, User, Clock, FileText, CheckCircle2, Layers, Minus,
  Banknote, AlertCircle, Sparkles, Check, CheckCheck, PackageCheck,
  CalendarClock, Store, ArrowRight
} from 'lucide-react'
import PosProductCatalog from './components/PosProductCatalog'
import { usePaymentMethods } from './hooks/useOrders'
import { useSettingsStore } from '@/store/settingsStore'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { formatCurrency } from '@/utils'
import toast from 'react-hot-toast'

export default function NewOrderPage() {
  const [items, setItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getCurrencySymbol } = useSettingsStore()
  const currencySymbol = getCurrencySymbol()
  const { paymentMethods } = usePaymentMethods()

  const todayStr = new Date().toISOString().split('T')[0]
  const currentTimeStr = new Date().toTimeString().slice(0, 5)

  // ==========================================
  // ESTADOS DEL FORMULARIO
  // ==========================================
  const [customerName, setCustomerName] = useState('')
  const [orderDate, setOrderDate] = useState(todayStr)
  const [isScheduled, setIsScheduled] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [immediateDelivery, setImmediateDelivery] = useState(true) // Si es venta inmediata, entregar de inmediato
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)

  // Estado de Pago: 'pagado' (completo), 'parcial' (abono), 'pendiente'
  const [paymentStatus, setPaymentStatus] = useState('pagado')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [customAbono, setCustomAbono] = useState('')
  const [cashReceived, setCashReceived] = useState('')

  // Establecer método 'Efectivo' por defecto al cargar los métodos
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !paymentMethodId) {
      const cashMethod = paymentMethods.find(
        (m) => m.name.toLowerCase().includes('efectivo')
      )
      if (cashMethod) {
        setPaymentMethodId(cashMethod.id)
      } else {
        setPaymentMethodId(paymentMethods[0].id)
      }
    }
  }, [paymentMethods, paymentMethodId])

  // Método seleccionado actual
  const selectedMethod = useMemo(() => {
    return paymentMethods.find((m) => m.id === paymentMethodId) || null
  }, [paymentMethods, paymentMethodId])

  const isCashMethod = useMemo(() => {
    if (!selectedMethod) return false
    return selectedMethod.name.toLowerCase().includes('efectivo')
  }, [selectedMethod])

  // ==========================================
  // CÁLCULOS MATEMÁTICOS DEL PEDIDO
  // ==========================================
  const subtotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.subtotal, 0)
  }, [items])

  const discountAmount = Number(discount) || 0
  const total = Math.max(0, subtotal - discountAmount)

  // Monto a cobrar / abonar según el estado de pago seleccionado
  const amountToCharge = useMemo(() => {
    if (paymentStatus === 'pagado') {
      return total
    }
    if (paymentStatus === 'parcial') {
      const parsed = parseFloat(customAbono) || 0
      return Math.min(total, Math.max(0, parsed))
    }
    return 0 // 'pendiente'
  }, [paymentStatus, total, customAbono])

  const balance = Math.max(0, total - amountToCharge)

  // Cálculo de Efectivo Recibido y Vuelto
  const numCashReceived = parseFloat(cashReceived) || 0
  const cashDifference = numCashReceived - amountToCharge
  const isExactPayment = isCashMethod && amountToCharge > 0 && Math.abs(cashDifference) < 0.001
  const hasCashChange = isCashMethod && amountToCharge > 0 && cashDifference > 0.001
  const hasCashShortage = isCashMethod && amountToCharge > 0 && cashReceived !== '' && cashDifference < -0.001

  // Autocompletar efectivo recibido cuando cambia a pago exacto o total
  const handleSetExactCash = () => {
    if (amountToCharge > 0) {
      setCashReceived(amountToCharge.toFixed(2))
    }
  }

  const handleAddCash = (extra) => {
    const current = parseFloat(cashReceived) || 0
    const base = current > 0 ? current : amountToCharge
    setCashReceived((base + extra).toFixed(2))
  }

  const handleSetCashBill = (billAmount) => {
    setCashReceived(billAmount.toFixed(2))
  }

  // ==========================================
  // GESTIÓN DEL CARRITO / DETALLE DE PRODUCTOS
  // ==========================================
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
      toast.success(`+1 ${product.name} (${variantName || 'Estándar'})`, { duration: 1000 })
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          variant_id: variantId,
          variant_name: variantName,
          unit_price: price, // SNAPSHOT INMUTABLE DE PRECIO
          quantity: 1,
          subtotal: price,
        },
      ])
      toast.success(`Agregado: ${product.name} (${variantName || 'Estándar'})`, { duration: 1000 })
    }
  }

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

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Generador único de número de pedido MAD-000001
  const generateNextOrderNumber = async () => {
    try {
      const { data, error } = await supabase.from('orders').select('order_number')
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

  // ==========================================
  // VALIDACIÓN Y PROCESAMIENTO DEL COBRO (SUBMIT)
  // ==========================================
  const handleProcessOrder = async (e) => {
    e.preventDefault()

    // 1. Validar productos
    if (items.length === 0) {
      toast.error('Debes seleccionar al menos un producto del catálogo')
      return
    }

    // 2. Validar pedido programado
    if (isScheduled) {
      if (!deliveryDate) {
        toast.error('Ingresa la fecha de entrega para el pedido programado')
        return
      }
      if (!deliveryTime) {
        toast.error('Ingresa la hora de entrega para el pedido programado')
        return
      }
    }

    // 3. Validar estado de pago y montos
    if (paymentStatus === 'parcial') {
      const parsedAbono = parseFloat(customAbono) || 0
      if (parsedAbono <= 0) {
        toast.error('Ingresa un monto válido para el abono')
        return
      }
      if (parsedAbono >= total) {
        toast.error('El abono parcial debe ser menor al total. Si paga completo, selecciona "Pago Completo"')
        return
      }
    }

    // 4. Validar efectivo recibido cuando corresponda
    if (isCashMethod && amountToCharge > 0) {
      if (cashReceived === '' || numCashReceived <= 0) {
        toast.error('Ingresa el monto de efectivo recibido para calcular el vuelto')
        return
      }
      if (numCashReceived < amountToCharge) {
        toast.error(`Efectivo insuficiente. Faltan ${formatCurrency(amountToCharge - numCashReceived, currencySymbol)}`)
        return
      }
    }

    try {
      setSubmitting(true)
      let orderNumber = await generateNextOrderNumber()
      let newOrder = null
      let attempts = 0
      const maxAttempts = 5

      // Determinar estado de entrega (status):
      // - Si es venta inmediata, está pagada y marcada como entrega inmediata -> 'entregado'
      // - Si es venta inmediata pero no entregada aún -> 'listo'
      // - Si es pedido programado -> 'pendiente'
      let finalOrderStatus = 'pendiente'
      if (!isScheduled) {
        if (paymentStatus === 'pagado' && immediateDelivery) {
          finalOrderStatus = 'entregado'
        } else {
          finalOrderStatus = 'listo'
        }
      }

      const calculatedChange = isCashMethod && amountToCharge > 0 && numCashReceived >= amountToCharge
        ? numCashReceived - amountToCharge
        : null

      while (!newOrder && attempts < maxAttempts) {
        attempts++
        const orderPayload = {
          order_number: orderNumber,
          customer_name: customerName.trim() || null,
          order_date: orderDate || todayStr,
          delivery_date: isScheduled ? deliveryDate : (orderDate || todayStr),
          delivery_time: isScheduled ? deliveryTime : currentTimeStr,
          payment_method_id: amountToCharge > 0 ? (paymentMethodId || null) : null,
          subtotal,
          discount: discountAmount,
          total,
          amount_paid: amountToCharge,
          notes: notes.trim() || null,
          status: finalOrderStatus,
          order_type: isScheduled ? 'programado' : 'inmediato',
          payment_status: paymentStatus,
          cash_received: isCashMethod && amountToCharge > 0 ? numCashReceived : null,
          change_returned: calculatedChange,
          created_by: user?.id || null,
        }

        const { data: orderData, error: orderError } = await supabase
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

        newOrder = orderData
      }

      if (!newOrder) {
        throw new Error('No se pudo generar el número de pedido. Intenta nuevamente.')
      }

      // 5. Insertar Detalle de Productos con SNAPSHOT INMUTABLE DE PRECIO
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

      // 6. Registrar en el HISTORIAL DE PAGOS (order_payments) si hubo pago / abono
      if (amountToCharge > 0) {
        const { error: payError } = await supabase.from('order_payments').insert({
          order_id: newOrder.id,
          amount: amountToCharge,
          payment_method_id: paymentMethodId || null,
          cash_received: isCashMethod ? numCashReceived : null,
          change_returned: calculatedChange,
          payment_date: new Date().toISOString(),
          notes: paymentStatus === 'pagado'
            ? 'Pago completo registrado en caja'
            : `Abono inicial registrado en caja (Saldo: ${formatCurrency(balance, currencySymbol)})`,
          created_by: user?.id || null,
        })

        if (payError) {
          console.warn('Could not register in order_payments:', payError)
        }
      }

      // 7. Registrar Log de Actividad
      await logActivity({
        action: `Registró venta #${newOrder.order_number} (${
          isScheduled ? 'Pedido Programado' : 'Venta Inmediata'
        }) por ${formatCurrency(total, currencySymbol)} · ${
          paymentStatus === 'pagado' ? 'Pagado Completo' : paymentStatus === 'parcial' ? 'Abonado' : 'Pendiente'
        }`,
        entityType: 'order',
        entityId: newOrder.id,
        entityName: `#${newOrder.order_number}`,
        details: {
          order_type: isScheduled ? 'programado' : 'inmediato',
          payment_status: paymentStatus,
          total,
          amount_paid: amountToCharge,
          balance,
          cash_received: isCashMethod ? numCashReceived : null,
          change_returned: calculatedChange,
        },
      })

      toast.success(`Venta #${newOrder.order_number} procesada con éxito`)
      navigate(`/pedidos/${newOrder.id}`)
    } catch (err) {
      console.error('Error creating order:', err)
      toast.error('Error al procesar pedido: ' + (err.message || 'Verifica los datos ingresados'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16 animate-fade-in font-sans">
      {/* Encabezado Superior */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/pedidos"
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-purple-700 hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Punto de Venta · Caja</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold border border-purple-200">
                POS Madrigales
              </span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Haz clic en los productos para armar la orden y cobrar rápidamente.
            </p>
          </div>
        </div>

        {/* Toggle Rápido: Venta Inmediata vs Pedido Programado */}
        <div className="bg-white p-1.5 rounded-2xl border border-purple-100 shadow-xs flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsScheduled(false)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isScheduled
                ? 'bg-purple-900 text-white shadow-xs'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Venta Inmediata</span>
          </button>

          <button
            type="button"
            onClick={() => setIsScheduled(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isScheduled
                ? 'bg-purple-900 text-white shadow-xs'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-900'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Pedido Programado</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleProcessOrder} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ============================================================
              COLUMNA IZQUIERDA (7 cols): CATÁLOGO VISUAL DE PRODUCTOS
              ============================================================ */}
          <div className="lg:col-span-7 space-y-5">
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Catálogo de Productos</h3>
                    <p className="text-[11px] text-gray-500">
                      Selecciona una categoría y haz clic en la presentación deseada
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej. Dedicatoria: '¡Feliz Cumpleaños Mamá!', flores lila, empacar para regalo..."
                className="input text-xs resize-none rounded-xl"
              />
            </div>
          </div>

          {/* ============================================================
              COLUMNA DERECHA (5 cols): RESUMEN, PAGOS & COBRO COMERCIAL
              ============================================================ */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Detalle de Productos en la Orden */}
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Detalle de la Orden</h3>
                </div>
                <span className="text-xs font-black text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                  {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-purple-100 rounded-2xl text-center bg-purple-50/20 my-2">
                  <ShoppingCart className="w-8 h-8 text-purple-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-gray-700">Orden vacía</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Haz clic en los productos del catálogo a la izquierda para agregar a la venta.
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

                      {/* Controles de Cantidad */}
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
                        className="p-1 text-gray-300 hover:text-red-600 transition-colors cursor-pointer"
                        title="Quitar ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Cliente y Programación de Entrega */}
            <div className="card p-4 sm:p-5 bg-white border border-purple-100 shadow-xs space-y-3">
              <div>
                <label className="label text-xs font-bold text-gray-700">
                  Cliente <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Consumidor Final o Nombre del Cliente"
                    className="input pl-9 text-xs"
                  />
                </div>
              </div>

              {/* Si es Pedido Programado -> Mostrar Fecha y Hora de Entrega Obligatorias */}
              {isScheduled ? (
                <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5 animate-fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <CalendarClock className="w-4 h-4 text-purple-700" />
                    <span>Programación de Entrega *</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Fecha de Entrega *</label>
                      <input
                        type="date"
                        min={todayStr}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="input text-xs bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Hora de Entrega *</label>
                      <input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="input text-xs bg-white"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Venta Inmediata: Opción de entrega inmediata en mostrador */
                <label className="flex items-center gap-2.5 p-2.5 bg-gray-50 hover:bg-purple-50/50 rounded-xl border border-gray-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={immediateDelivery}
                    onChange={(e) => setImmediateDelivery(e.target.checked)}
                    className="rounded text-purple-700 focus:ring-purple-500 w-4 h-4"
                  />
                  <span className="text-xs text-gray-700 font-medium">
                    Entregar productos de inmediato al cliente en mostrador
                  </span>
                </label>
              )}
            </div>

            {/* 3. SECCIÓN DE PAGO Y FACTURACIÓN COMERCIAL (POS) */}
            <div className="card p-5 bg-gradient-to-br from-[#230d2a] via-[#32123d] to-[#1f0b26] text-white shadow-xl space-y-4 rounded-3xl border border-purple-900/60">
              {/* Selector de Estado de Pago: Completo (default) | Parcial | Pendiente */}
              <div>
                <label className="text-xs font-bold text-purple-200 uppercase tracking-wider block mb-2">
                  Estado de Pago
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-black/30 p-1 rounded-2xl border border-purple-800/40">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pagado')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                      paymentStatus === 'pagado'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Pago Completo
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStatus('parcial')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                      paymentStatus === 'parcial'
                        ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Abono / Parcial
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pendiente')}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                      paymentStatus === 'pendiente'
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Pendiente
                  </button>
                </div>
              </div>

              {/* Selector de Método de Pago */}
              {paymentStatus !== 'pendiente' && (
                <div>
                  <label className="text-xs font-bold text-purple-200 block mb-1.5">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {paymentMethods.map((m) => {
                      const isSelected = paymentMethodId === m.id
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethodId(m.id)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer border truncate ${
                            isSelected
                              ? 'bg-white text-purple-950 border-white shadow-xs'
                              : 'bg-white/5 text-purple-200 border-purple-800/40 hover:bg-white/10'
                          }`}
                        >
                          {m.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Resumen de Totales y Descuentos */}
              <div className="space-y-2 text-xs pt-1 border-t border-purple-800/50">
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
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-20 h-7 text-right text-xs bg-purple-900/80 border border-purple-700/80 rounded-lg px-1.5 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="border-t border-purple-800/80 pt-2 flex items-center justify-between text-sm font-black">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-xl text-amber-300 font-black">
                    {formatCurrency(total, currencySymbol)}
                  </span>
                </div>

                {/* Si es Pago Parcial -> Campo de Abono */}
                {paymentStatus === 'parcial' && (
                  <div className="p-3 bg-white/5 rounded-2xl border border-purple-700/50 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-200 font-bold">Monto del Abono:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-purple-300 font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={total - 0.01}
                          value={customAbono}
                          onChange={(e) => setCustomAbono(e.target.value)}
                          placeholder="0.00"
                          className="w-24 h-8 text-right text-xs bg-black/40 border border-purple-500 rounded-lg px-2 text-emerald-300 font-black"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-purple-800/40">
                      <span className="text-purple-300">Saldo que quedará pendiente:</span>
                      <span className="text-rose-300 font-black">
                        {formatCurrency(balance, currencySymbol)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Si es Pago Pendiente -> Mostrar Saldo Total */}
                {paymentStatus === 'pendiente' && (
                  <div className="flex items-center justify-between font-bold pt-1 text-xs">
                    <span className="text-purple-300">Saldo Pendiente:</span>
                    <span className="text-sm font-black text-rose-300">
                      {formatCurrency(total, currencySymbol)}
                    </span>
                  </div>
                )}
              </div>

              {/* ============================================================
                  CALCULADORA DE VUELTO EN EFECTIVO (SOLO SI MÉTODO ES EFECTIVO)
                  ============================================================ */}
              {isCashMethod && amountToCharge > 0 && (
                <div className="p-3.5 bg-black/35 rounded-2xl border border-purple-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Efectivo Recibido:</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400 font-bold">{currencySymbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="w-28 h-8 text-right text-sm bg-black/50 border border-emerald-500/80 rounded-xl px-2 text-white font-black focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  {/* Botones de Efectivo Rápido */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSetExactCash}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer transition-colors"
                    >
                      Exacto
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCash(50)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-purple-200 border border-white/10 cursor-pointer transition-colors"
                    >
                      +L50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCash(100)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-purple-200 border border-white/10 cursor-pointer transition-colors"
                    >
                      +L100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCashBill(500)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-purple-200 border border-white/10 cursor-pointer transition-colors"
                    >
                      L500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCashBill(1000)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-purple-200 border border-white/10 cursor-pointer transition-colors"
                    >
                      L1000
                    </button>
                  </div>

                  {/* Indicador de Vuelto / Faltante / Pago Exacto */}
                  {hasCashShortage ? (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Faltante:</span>
                      </span>
                      <span className="font-black text-rose-200">
                        {formatCurrency(Math.abs(cashDifference), currencySymbol)}
                      </span>
                    </div>
                  ) : isExactPayment ? (
                    <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-emerald-400" />
                        <span>Pago Exacto</span>
                      </span>
                      <span>Vuelto: L 0.00</span>
                    </div>
                  ) : hasCashChange ? (
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-400/50 text-emerald-200 text-xs flex items-center justify-between font-black">
                      <span className="uppercase tracking-wider">VUELTO A ENTREGAR:</span>
                      <span className="text-base text-emerald-300">
                        {formatCurrency(cashDifference, currencySymbol)}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Botón Principal Dinámico de Cobro */}
              <button
                type="submit"
                disabled={submitting || items.length === 0 || hasCashShortage}
                className={`w-full py-4 px-4 rounded-2xl text-xs font-black shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  paymentStatus === 'pagado'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/40'
                    : paymentStatus === 'parcial'
                    ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white'
                    : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Procesando Venta...'
                    : paymentStatus === 'pagado'
                    ? `COBRAR ${formatCurrency(total, currencySymbol)} Y GENERAR FACTURA`
                    : paymentStatus === 'parcial'
                    ? `REGISTRAR ABONO ${formatCurrency(amountToCharge, currencySymbol)} Y FACTURAR`
                    : `GUARDAR PEDIDO PENDIENTE (${formatCurrency(total, currencySymbol)})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
