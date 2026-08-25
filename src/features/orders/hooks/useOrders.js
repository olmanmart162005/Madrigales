import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useOrders(filters = {}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    pendiente: 0,
    en_preparacion: 0,
    listo: 0,
    entregado: 0,
    cancelado: 0,
  })

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('orders')
        .select(`
          *,
          payment_methods(id, name),
          order_items(id, quantity, unit_price, product_name, subtotal)
        `)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`)
      }

      if (filters.dateFrom) {
        query = query.gte('order_date', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('order_date', filters.dateTo)
      }

      if (filters.paymentMethodId) {
        query = query.eq('payment_method_id', filters.paymentMethodId)
      }

      const { data, error: err } = await query

      if (err) throw err

      const orderList = data || []
      setOrders(orderList)

      // Calcular contadores
      const counts = {
        total: orderList.length,
        pendiente: 0,
        en_preparacion: 0,
        listo: 0,
        entregado: 0,
        cancelado: 0,
      }

      orderList.forEach((o) => {
        if (counts[o.status] !== undefined) {
          counts[o.status]++
        }
      })

      setStats(counts)
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [
    filters.status,
    filters.search,
    filters.dateFrom,
    filters.dateTo,
    filters.paymentMethodId,
  ])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single()

      if (err) throw err

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
      return { success: true, data }
    } catch (err) {
      console.error('Error updating order status:', err)
      return { success: false, error: err.message }
    }
  }

  const cancelOrder = async (orderId) => {
    return updateOrderStatus(orderId, 'cancelado')
  }

  return {
    orders,
    loading,
    error,
    stats,
    refetch: fetchOrders,
    updateOrderStatus,
    cancelOrder,
  }
}

export function useOrder(id) {
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOrder = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)

      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          payment_methods(id, name)
        `)
        .eq('id', id)
        .single()

      if (orderErr) throw orderErr

      const { data: itemsData, error: itemsErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true })

      if (itemsErr) throw itemsErr

      setOrder(orderData)
      setItems(itemsData || [])
    } catch (err) {
      console.error('Error fetching order details:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  return { order, items, loading, error, refetch: fetchOrder }
}

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMethods = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setPaymentMethods(data || [])
    } catch (err) {
      console.error('Error fetching payment methods:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMethods()
  }, [fetchMethods])

  return { paymentMethods, loading, refetch: fetchMethods }
}
