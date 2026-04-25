import { useEffect } from 'react'
import { useAuthStore } from '../store/useAuthStore'

export function useAuth() {
  const { user, loading, initialized, signOut, refreshUser } = useAuthStore()

  useEffect(() => {
    // Initialize auth and start real-time listener
    refreshUser().then(() => {
      useAuthStore.getState().subscribeToProfile()
    })
  }, [])

  return { user, loading, initialized, signOut, refreshUser }
}
