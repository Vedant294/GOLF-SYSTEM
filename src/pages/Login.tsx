import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Trophy, LogIn, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  
  // PRD §04: Auth State synchronization
  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const setSession = useAuthStore((s) => s.setSession)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // PRD §04: Routing Flexibility (Global Guard)
  // Handles both Real and Mock users (Developer Mode)
  useEffect(() => {
    if (initialized && user) {
      if (user.role === 'admin') navigate('/admin', { replace: true })
      else navigate('/dashboard', { replace: true })
    }
  }, [initialized, user, navigate])

    // PRD §06: Instant Demo Mode (Network-Bypass)
    // Decouples mock login from the Supabase network layer to prevent 'hanging'
    const handleQuickLogin = (email: string) => {
        setLoading(true)
        try {
            if (email === 'admin@golff.in') {
                const mockAdmin: any = {
                    id: 'mock_admin_123',
                    full_name: 'System Admin',
                    email: 'admin@golff.in',
                    role: 'admin',
                    subscription_status: 'active',
                    created_at: new Date().toISOString()
                }
                localStorage.setItem('golff_mock_user', JSON.stringify(mockAdmin))
                useAuthStore.setState({ user: mockAdmin, initialized: true, loading: false })
                toast.success('Admin Demo Mode Active')
                navigate('/admin')
            } else {
                const mockUser: any = {
                    id: 'mock_user_456',
                    full_name: 'Arjun (VIP Pro)',
                    email: 'arjun@test.in',
                    role: 'user',
                    subscription_status: 'active',
                    subscription_plan: 'monthly',
                    charity_id: '840f1a91-9c86-4444-a901-209a39151c8a',
                    charity_contribution_pct: 15,
                    subscription_start: new Date().toISOString(),
                    subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date().toISOString()
                }
                localStorage.setItem('golff_mock_user', JSON.stringify(mockUser))
                useAuthStore.setState({ user: mockUser, initialized: true, loading: false })
                toast.success('User Demo Mode Active')
                navigate('/dashboard')
            }
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        const cleanEmail = data.email.trim().toLowerCase()
        const cleanPass = data.password.trim()

        // PRD §06: Developer Bypass for Quick Testing
        // If real Auth fails, but they used the hardcoded test accounts, we let them in via Mock mode
        if (cleanEmail === 'admin@golff.in' && cleanPass === 'Admin@123456') {
          const mockAdmin: any = {
            id: 'mock_admin_123',
            full_name: 'System Admin',
            email: 'admin@golff.in',
            role: 'admin',
            subscription_status: 'active',
            created_at: new Date().toISOString()
          }
          localStorage.setItem('golff_mock_user', JSON.stringify(mockAdmin))
          useAuthStore.setState({ 
            user: mockAdmin, 
            initialized: true, 
            loading: false 
          })
          toast.success('Dev Account Detected: Activating Admin Mock Dashboard...')
          navigate('/admin')
          return
        } else if (cleanEmail === 'arjun@test.in' && cleanPass === 'Test@123456') {
          const mockUser: any = {
            id: 'mock_user_456',
            full_name: 'Arjun (VIP Pro)',
            email: 'arjun@test.in',
            role: 'user',
            subscription_status: 'active',
            subscription_plan: 'monthly',
            charity_id: '840f1a91-9c86-4444-a901-209a39151c8a', // CRY India (from seed)
            charity_contribution_pct: 15,
            subscription_start: new Date().toISOString(),
            subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString()
          }
          localStorage.setItem('golff_mock_user', JSON.stringify(mockUser))
          useAuthStore.setState({ 
            user: mockUser, 
            initialized: true, 
            loading: false 
          })
          toast.success('Dev Account Detected: Activating VIP User Mock Dashboard...')
          navigate('/dashboard')
          return
        }
        throw error
      }

      setSession(authData.session)

      // PRD §04: Optimistic VIP Handshake
      // We navigate immediately. The global useAuth hook & Dashboard 
      // will handle the background data sync.
      toast.success('Sign in successful!')
      
      // Admin check using the auth user metadata instead of waiting for profile fetch
      if (authData.user.app_metadata?.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // Instant Exit if already authenticated (Prevents UI flickering)
  if (initialized && user) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-6 pt-24">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Enhanced Header - No Duplicate Logo (Navbar has it) */}
          <div className="text-center mb-8">
            <h1 className="font-syne font-800 text-4xl mb-3 tracking-tight">Welcome back</h1>
            <p className="text-[#94A3B8] font-inter text-base">Please sign in to access your VIP dashboard</p>
          </div>

          {/* PRD §06: Activation Success Banner */}
          {status === 'activated' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card border-[#6EE7B7]/30 bg-[#6EE7B7]/5 p-4 mb-6 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-[#6EE7B7]/20 flex items-center justify-center shrink-0">
                <CheckCircle size={20} className="text-[#6EE7B7]" />
              </div>
              <div>
                <p className="text-[#6EE7B7] font-700 text-sm">Account Activated!</p>
                <p className="text-[#94A3B8] text-xs">Standard verification complete. Please sign in to access your dashboard.</p>
              </div>
            </motion.div>
          )}

          {/* Form */}
          <div className="glass-card p-8">
            <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-[#94A3B8] text-sm font-500 mb-2">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className="input-field"
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-[#F87171] text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-[#94A3B8] text-sm font-500 mb-2">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input-field pr-12"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-[#F87171] text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Test credentials hint & Quick Access */}
              <div className="glass-card p-4 bg-[rgba(245,158,11,0.05)] border-[rgba(245,158,11,0.2)]">
                <p className="text-[#F59E0B] text-xs font-700 mb-3 uppercase tracking-wider text-center">Test Access Hub</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@golff.in')}
                    className="glass-card py-2 px-1 text-[10px] text-[#6EE7B7] hover:bg-[#6EE7B7]/10 transition-all border-[#6EE7B7]/20 font-700 text-center uppercase"
                  >
                    Quick Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('arjun@test.in')}
                    className="glass-card py-2 px-1 text-[10px] text-[#818CF8] hover:bg-[#818CF8]/10 transition-all border-[#818CF8]/20 font-700 text-center uppercase"
                  >
                    Quick User
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[#94A3B8] text-[10px] text-center">admin@golff.in / Admin@123456</p>
                  <p className="text-[#94A3B8] text-[10px] text-center">arjun@test.in / Test@123456</p>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="premium-btn w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><LogIn size={18} /> Sign In</>
                )}
              </button>
            </form>

            <p className="text-center text-[#64748B] text-sm mt-6 font-inter">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#6EE7B7] hover:text-white transition-colors font-600">
                Sign up free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
