import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthState {
  user: Profile | null
  session: Session | null
  loading: boolean
  initialized: boolean
  setUser: (user: Profile | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,

  setUser: (user) => {
    set({ user })
    if (user) {
      localStorage.setItem('golff_user_cache', JSON.stringify(user))
    } else {
      localStorage.removeItem('golff_user_cache')
    }
  },
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  signOut: async () => {
    // 1. Aggressive local wipe
    localStorage.removeItem('golff_user_cache')
    localStorage.removeItem('golff_mock_user')
    
    // 2. Clear state instantly to stop all reactivity
    set({ 
      user: null, 
      session: null, 
      initialized: false, // Reset initialization so App.tsx can re-init cleanly
      loading: false 
    })

    // 3. Official Supabase sign out (Background)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Supabase signOut error (ignoring):', err)
    }
  },

  refreshUser: async () => {
    // 1. Instant Cache Load (Optimistic)
    const cachedUser = localStorage.getItem('golff_user_cache')
    const mockUser = localStorage.getItem('golff_mock_user')
    
    if (cachedUser && !get().user) {
      set({ user: JSON.parse(cachedUser), initialized: true, loading: false })
    } else if (mockUser && !get().user) {
      set({ user: JSON.parse(mockUser), initialized: true, loading: false })
    }

    // 2. Real-time Verification (Truth)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      set({ session })
      
      if (!session?.user) {
        if (!mockUser) {
          set({ user: null, initialized: true, loading: false })
        }
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        set({ user: profile, initialized: true, loading: false })
        localStorage.setItem('golff_user_cache', JSON.stringify(profile))
      } else {
        // PRD §04/§06: Self-Healing Profile (Auto-Repair)
        // If auth user exists but profile row is missing, handle gracefully by creating it
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            role: session.user.app_metadata?.role || 'user',
            subscription_status: session.user.app_metadata?.status || 'inactive'
          })
          .select()
          .single()

        if (!createError && newProfile) {
          set({ user: newProfile, initialized: true, loading: false })
          localStorage.setItem('golff_user_cache', JSON.stringify(newProfile))
        } else {
          set({ user: null, initialized: true, loading: false })
          localStorage.removeItem('golff_user_cache')
        }
      }
    } catch (error) {
      console.error('Refresh User failed:', error)
      set({ initialized: true, loading: false })
    }
  },
}))
