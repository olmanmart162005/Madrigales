import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ session, user: session.user })
        const prof = await get().fetchProfile(session.user.id)
        if (prof && prof.is_active === false) {
          await get().signOut()
          throw new Error('Tu cuenta se encuentra desactivada. Comunícate con un administrador.')
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ loading: false, initialized: true })
    }
  },

  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('Error fetching profile:', error.message)
        return null
      }

      set({ profile: data })
      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  },

  signIn: async (email, password) => {
    const cleanEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })
    if (error) throw error

    // Obtener perfil asociado
    let { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    // Si por alguna razón no existía en profiles, crearlo como fallback
    if (!userProfile) {
      const isOlman = cleanEmail === 'olmanmart16@gmail.com'
      const { data: newProf } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || (isOlman ? 'Olman Martínez' : cleanEmail.split('@')[0]),
          role: 'administrador',
          is_owner: isOlman,
          is_active: true,
        })
        .select()
        .single()

      userProfile = newProf
    }

    if (userProfile && userProfile.is_active === false) {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta se encuentra desactivada. Comunícate con un administrador.')
    }

    set({ session: data.session, user: data.user, profile: userProfile })
    return data
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore
    } finally {
      set({ user: null, profile: null, session: null })
    }
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user) throw new Error('No hay usuario autenticado')

    const sanitizedUpdates = { ...updates }
    delete sanitizedUpdates.is_owner
    if (!get().isOwner()) {
      delete sanitizedUpdates.role
      delete sanitizedUpdates.is_active
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    set({ profile: data })
    return data
  },

  isOwner: () => {
    const { profile } = get()
    return profile?.is_owner === true
  },

  isAdmin: () => {
    const { profile } = get()
    return profile?.role === 'administrador' || profile?.is_owner === true
  },

  isCajero: () => {
    const { profile } = get()
    return profile?.role === 'cajero' || profile?.role === 'empleado'
  },

  isActive: () => {
    const { profile } = get()
    return profile?.is_active !== false
  },
}))
