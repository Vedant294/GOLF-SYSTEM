import { create } from 'zustand'
import type { Profile } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export function getStoredToken(): string | null {
  try {
    const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!key) return null
    const data = JSON.parse(localStorage.getItem(key) || '{}')
    if (data.expires_at && data.expires_at * 1000 < Date.now()) return null
    return data.access_token || null
  } catch { return null }
}

export const useAuthStore = create<{
  user: Profile | null
  loading: boolean
  initialized: boolean
  justPaid: boolean
  signOut: () => void
  refreshUser: (silent?: boolean) => Promise<Profile | null>
  subscribeToProfile: () => void
  setSubscriptionActive: (plan?: 'monthly' | 'yearly') => void
}>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  justPaid: localStorage.getItem('just_paid_expiry') ? Number(localStorage.getItem('just_paid_expiry')) > Date.now() : false,

  signOut: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
    })
    set({ user: null, initialized: true, loading: false, justPaid: get().justPaid })
  },

  refreshUser: async (silent = false): Promise<Profile | null> => {
    try {
      if (!silent) set({ loading: true })

      const token = getStoredToken()
      if (!token) { set({ user: null, initialized: true, loading: false }); return null }

      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      })
      if (!userRes.ok) { set({ user: null, initialized: true, loading: false }); return null }
      const authUser = await userRes.json()

      const { supabase } = await import('../lib/supabase')
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      
      let profile = profileData as Profile | null

      if (profile && profile.subscription_status === 'inactive') {
        const { data: payments } = await supabase
          .from('subscription_payments')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('status', 'paid')
          .maybeSingle()
        
        if (payments) {
          profile.subscription_status = 'active'
          profile.subscription_plan = profile.subscription_plan || 'monthly'
          await supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', authUser.id)
        }
      }

      const expiry = Number(localStorage.getItem('just_paid_expiry') || 0)
      if (profile && expiry > Date.now() && profile.subscription_status === 'inactive') {
        profile.subscription_status = 'active'
      }

      set({ user: profile || null, initialized: true, loading: false })
      return profile
    } catch (error) { 
      set({ user: null, initialized: true, loading: false }) 
      return null
    }
  },

  subscribeToProfile: () => {
    const user = get().user
    if (!user) return

    import('../lib/supabase').then(({ supabase }) => {
      supabase
        .channel(`profile-${user.id}`)
        .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, 
          (payload: any) => {
            set({ user: payload.new as Profile })
          }
        )
        .subscribe()
    })
  },

  setSubscriptionActive: (plan: 'monthly' | 'yearly' = 'monthly'): void => {
    const expiry = Date.now() + 120000 
    localStorage.setItem('just_paid_expiry', expiry.toString())
    
    const currentUser = get().user
    if (currentUser) {
      set({ 
        justPaid: true,
        user: { ...currentUser, subscription_status: 'active', subscription_plan: plan } 
      })
    }
  },
}))
