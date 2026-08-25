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
          throw new Error('Tu cuenta se encuentra desactivada. Contacta al administrador.')
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

  /**
   * Inicia sesión admitiendo tanto Correo Electrónico como Nombre de Usuario
   */
  signIn: async (identifier, password) => {
    let cleanIdentifier = identifier.trim().toLowerCase().replace(/\s+/g, '')
    let loginEmail = cleanIdentifier

    // Si ingresó solo el nombre de usuario (ej. suricastellon), convertir a email canónico
    if (!cleanIdentifier.includes('@')) {
      loginEmail = `${cleanIdentifier}@madrigales.com`
    }

    // Autenticar en Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (error) {
      throw error
    }

    // Obtener perfil asociado
    let { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle()

    // Si por alguna razón no existía en profiles, crearlo como fallback
    if (!userProfile) {
      const isOlman = loginEmail === 'olmanmart16@gmail.com'
      const usernameFromEmail = cleanIdentifier.includes('@') ? cleanIdentifier.split('@')[0] : cleanIdentifier
      const { data: newProf } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || (isOlman ? 'Olman Martínez' : usernameFromEmail),
          username: usernameFromEmail,
          role: data.user.user_metadata?.role || (isOlman ? 'administrador' : 'cajero'),
          is_owner: isOlman,
          is_active: true,
        })
        .select()
        .single()

      userProfile = newProf
    }

    // Verificar si la cuenta está activa
    if (userProfile && userProfile.is_active === false) {
      await supabase.auth.signOut()
      throw new Error('Tu cuenta se encuentra desactivada. Contacta al administrador.')
    }

    set({ session: data.session, user: data.user, profile: userProfile })
    return data
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignore
    }
    set({ user: null, profile: null, session: null })
  },

  isAdmin: () => {
    const { profile } = get()
    return profile?.role === 'administrador' || profile?.is_owner === true
  },

  isOwner: () => {
    const { profile } = get()
    return profile?.is_owner === true
  },

  isActive: () => {
    const { profile } = get()
    return profile?.is_active !== false
  },
}))
