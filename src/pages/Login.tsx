import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, CheckCircle, ArrowRight, Lock, Mail, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/useAuthStore'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export default function Login() {
  const [searchParams] = useSearchParams()
  const paymentSuccess = searchParams.get('payment_success')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const initialized = useAuthStore((s) => s.initialized)
  const refreshUser = useAuthStore((s) => s.refreshUser)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (paymentSuccess === 'true') {
      const email = localStorage.getItem('signup_email')
      if (email) {
        setValue('email', email)
        localStorage.removeItem('signup_email')
        toast.success('Payment successful! Please sign in.')
      }
    }
  }, [paymentSuccess, setValue])

  useEffect(() => {
    if (initialized && user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [initialized, user, navigate])

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const toastId = toast.loading('Signing in...')

    try {
      // 1. Get Auth Token
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })

      const authData = await res.json()

      if (!res.ok || authData.error) {
        throw new Error(authData.error_description || authData.message || 'Invalid email or password')
      }

      // 2. Store Session
      const storageKey = `sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`
      localStorage.setItem(storageKey, JSON.stringify({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
        expires_at: authData.expires_at,
        user: authData.user,
      }))

      // 3. Sync Store & Self-Heal
      const finalProfile = await refreshUser(true)
      
      toast.dismiss(toastId)
      toast.success('Welcome back!')

      // 4. SMART REDIRECT: Redirect based on the fixed profile status
      if (finalProfile && (finalProfile as any).role === 'admin') {
        navigate('/admin', { replace: true })
      } else if (finalProfile && (finalProfile as any).subscription_status === 'active') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate('/signup?step=1', { replace: true })
      }
    } catch (err: any) {
      toast.dismiss(toastId)
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper min-h-screen pt-32 pb-20 relative overflow-hidden">
      <div className="mesh-bg opacity-20" />
      
      <div className="section-container relative z-10 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#6EE7B7]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#6EE7B7]/20 shadow-[0_0_20px_rgba(110,231,183,0.2)]">
              <LogIn className="text-[#6EE7B7]" size={32} />
            </div>
            <h1 className="text-3xl font-syne font-800 text-white mb-2 tracking-tight">Sign In</h1>
            <p className="text-[#64748B]">Welcome back to the elite circle.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
                <input {...register('email')} placeholder="Email Address" className="input-field pl-12 py-4" />
              </div>
              {errors.email && <p className="text-[#F87171] text-xs mt-1.5 ml-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Password" className="input-field pl-12 py-4 pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-[#F87171] text-xs mt-1.5 ml-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="premium-btn w-full py-5 text-lg font-700 flex items-center justify-center gap-2">
              {loading ? 'Authenticating...' : <>Enter Dashboard <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center space-y-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-left mb-6">
              <p className="text-[10px] text-[#64748B] uppercase font-800 tracking-widest mb-3 flex items-center gap-2">
                <Settings size={12} className="text-[#F59E0B]" /> Demo Access
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#64748B]">Admin:</span>
                  <code className="text-[#6EE7B7]">admin@golff.in / Admin@123456</code>
                </div>
              </div>
            </div>
            <p className="text-[#64748B] text-sm">
              Don't have an account? <Link to="/signup" className="text-[#6EE7B7] font-700 hover:underline">Join Now</Link>
            </p>
            <p className="text-[10px] text-[#64748B] font-700 uppercase tracking-[0.2em]">Secured by Supabase & Stripe</p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
