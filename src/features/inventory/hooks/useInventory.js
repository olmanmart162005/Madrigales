import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getStockStatus } from '@/utils'

export function useInventory(filters = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    disponible: 0,
    bajo: 0,
    agotado: 0,
  })

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('inventory_items')
        .select('*, inventory_categories(id, name)')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error: err } = await query

      if (err) throw err

      // Calcular stock_status para cada ítem
      const processedItems = (data || []).map((item) => ({
        ...item,
        stock_status: getStockStatus(Number(item.quantity), Number(item.min_quantity)),
      }))

      // Filtrar por status en memoria si aplica
      let filtered = processedItems
      if (filters.status && filters.status !== 'all') {
        filtered = processedItems.filter((i) => i.stock_status === filters.status)
      }

      setItems(filtered)

      // Calcular estadísticas de todo el inventario activo
      const counts = {
        total: processedItems.length,
        disponible: 0,
        bajo: 0,
        agotado: 0,
      }
      processedItems.forEach((i) => {
        if (counts[i.stock_status] !== undefined) {
          counts[i.stock_status]++
        }
      })
      setStats(counts)
    } catch (err) {
      console.error('Error fetching inventory:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters.categoryId, filters.search, filters.status])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  return { items, loading, error, stats, refetch: fetchInventory }
}

export function useInventoryCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching inventory categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return { categories, loading, refetch: fetchCategories }
}

export function useInventoryMovements(itemId) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMovements = useCallback(async () => {
    if (!itemId) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMovements(data || [])
    } catch (err) {
      console.error('Error fetching movements:', err)
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  return { movements, loading, refetch: fetchMovements }
}
