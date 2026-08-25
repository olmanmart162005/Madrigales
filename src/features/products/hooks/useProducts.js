import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function useProducts(filters = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('products')
        .select(`
          *,
          product_categories(id, name),
          product_variants(id, name, price, is_active, created_at)
        `)
        .order('name', { ascending: true })

      if (filters.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false)
      }

      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error: err } = await query

      if (err) throw err

      // Ordenar las variantes de cada producto por precio ascendente
      const processed = (data || []).map((p) => ({
        ...p,
        product_variants: (p.product_variants || []).sort(
          (a, b) => Number(a.price) - Number(b.price)
        ),
      }))

      setProducts(processed)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.categoryId, filters.search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return { products, loading, error, refetch: fetchProducts }
}

export function useProductCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return { categories, loading, refetch: fetchCategories }
}
