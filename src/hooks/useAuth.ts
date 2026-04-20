import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'

export function useAuth() {
  const { user, session, loading, initialized, setUser, setSession, setLoading, signOut, refreshUser } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      setLoading(true)
      try {
        await refreshUser()
      } catch (err) {
        console.error('Initial auth failed:', err)
      } finally {
        setLoading(false)
        useAuthStore.setState({ initialized: true })
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        setSession(session)

        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (mounted && profile) setUser(profile)
        } else if (event === 'SIGNED_OUT') {
          // PRD §06: Mock Protection
          // Only clear if we aren't in manual Test Hub / Mock Mode
          const isMock = localStorage.getItem('golff_mock_user')
          if (!isMock) {
            setUser(null)
            setSession(null)
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          refreshUser()
        }
        // Only mark not-loading after initial session check (initialized handles the rest)
        if (!useAuthStore.getState().initialized) {
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, session, loading, initialized, signOut, refreshUser }
}
