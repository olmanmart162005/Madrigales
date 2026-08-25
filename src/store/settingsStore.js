import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useSettingsStore = create((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    if (get().settings) return get().settings
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      set({ settings: data || { business_name: 'Madrigales Pastelería', currency_symbol: 'L' } })
      return data
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      set({ loading: false })
    }
  },

  updateSettings: async (updates) => {
    const { settings } = get()
    try {
      let data, error
      if (settings?.id) {
        ({ data, error } = await supabase
          .from('business_settings')
          .update(updates)
          .eq('id', settings.id)
          .select()
          .single())
      } else {
        ({ data, error } = await supabase
          .from('business_settings')
          .insert(updates)
          .select()
          .single())
      }
      if (error) throw error
      set({ settings: data })
      return data
    } catch (error) {
      throw error
    }
  },

  getCurrencySymbol: () => {
    return get().settings?.currency_symbol || 'L'
  },

  getBusinessName: () => {
    return get().settings?.business_name || 'Madrigales Pastelería'
  },
}))
