import React, { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import AppRouter from '@/routes/AppRouter'
import { PageLoader } from '@/components/ui/Skeleton'

function App() {
  const { initialize, loading, setUser, setProfile, setSession, fetchProfile } = useAuthStore()

  useEffect(() => {
    initialize()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setSession(session)
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setSession(null)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <PageLoader />

  return (
    <>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#7C3AED', secondary: '#fff' },
            style: { background: '#F5F3FF', color: '#4C1D95', border: '1px solid #DDD6FE' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
            style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' },
          },
        }}
      />
    </>
  )
}

export default App
