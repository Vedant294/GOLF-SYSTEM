import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

interface Props {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const loading = useAuthStore((s) => s.loading)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [waited, setWaited] = useState(false)

  // After Stripe redirect, session may take a moment to load from localStorage.
  // Wait up to 3s before deciding user is not logged in.
  useEffect(() => {
    if (!user && initialized && !loading) {
      refreshUser().finally(() => setWaited(true))
    } else {
      setWaited(true)
    }
  }, [initialized])

  if (!initialized || loading || !waited) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#6EE7B7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
