import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Trophy, Star, Check, ArrowRight, ArrowLeft, Search, Shield, Lock, CreditCard, Heart, Zap } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const accountSchema = z.object({
  full_name: z.string().min(2, 'Name must be 2-50 chars').max(50, 'Name must be 2-50 chars'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Min 8 characters').regex(/[A-Z]/).regex(/[^A-Za-z0-9]/),
})
type AccountData = z.infer<typeof accountSchema>

const PLAN_DETAILS = {
  monthly: { id: 'monthly', name: 'Monthly VIP', price: 499, period: '/mo', features: ['5 Draw Entries', 'Any Charity', 'Cancel anytime'], priceId: import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID },
  yearly: { id: 'yearly', name: 'Yearly Legend', price: 4999, period: '/yr', features: ['60 Draw Entries', 'Any Charity', 'VIP Badge'], priceId: import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID, popular: true }
}

const CHARITIES_STATIC = [
  { id: '1', name: 'Golf for Kids', category: 'Children', image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400' },
  { id: '2', name: 'Green Links', category: 'Environment', image_url: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&q=80&w=400' }
]

export default function Signup() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuthStore()

  // 🚀 URL-BASED STEPS
  const step = Number(searchParams.get('step')) || 0
  const setStep = (newStep: number) => {
    setSearchParams({ step: newStep.toString() })
  }

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(() => (localStorage.getItem('signup_plan') as any) || 'monthly')
  const [selectedCharity, setSelectedCharity] = useState<string>(() => localStorage.getItem('signup_charity') || '')
  const [charityPct, setCharityPct] = useState(() => Number(localStorage.getItem('signup_pct')) || 10)

  const [charitySearch, setCharitySearch] = useState('')
  const [charities, setCharities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  
  const [prebuiltUrl, setPrebuiltUrl] = useState<string | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const lastRequestKey = useRef<string>('')

  const { register, handleSubmit, formState: { errors } } = useForm<AccountData>({ resolver: zodResolver(accountSchema) })

  // Save selections but let URL handle the step
  useEffect(() => {
    localStorage.setItem('signup_plan', selectedPlan)
    localStorage.setItem('signup_charity', selectedCharity)
    localStorage.setItem('signup_pct', charityPct.toString())
  }, [selectedPlan, selectedCharity, charityPct])

  // 🛡️ INTELLIGENT NAVIGATION
  useEffect(() => {
    if (user?.subscription_status === 'active') {
      navigate('/dashboard', { replace: true })
      return
    }

    if (!user && step !== 0) {
      setStep(0) // New users must start at account
    } else if (user && step === 0) {
      setStep(1) // Returning inactive users skip to plan
    }
  }, [user, navigate, step])

  useEffect(() => {
    fetch(`${SUPABASE_URL}/rest/v1/charities?select=*`, { headers: { apikey: SUPABASE_ANON_KEY } })
      .then(r => r.json()).then(d => setCharities(d.length > 0 ? d : CHARITIES_STATIC)).catch(() => setCharities(CHARITIES_STATIC))
  }, [])

  const getAuthToken = () => {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    return key ? JSON.parse(localStorage.getItem(key) || '{}').access_token : null
  }

  const generateStripeUrl = useCallback(async () => {
    const userId = user?.id
    const email = accountData?.email || user?.email
    const token = getAuthToken()
    if (!userId || !email || !token) return

    const requestKey = `${selectedPlan}-${selectedCharity}-${charityPct}-${userId}`
    if (requestKey === lastRequestKey.current) return
    
    lastRequestKey.current = requestKey
    setIsPreparing(true)

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          priceId: PLAN_DETAILS[selectedPlan].priceId,
          userId, plan: selectedPlan, charityId: selectedCharity || null, charityPct,
          successUrl: `${window.location.origin}/auth/payment-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email)}`,
          cancelUrl: `${window.location.origin}/signup?step=3`, 
        }),
      })
      const data = await res.json()
      if (data.url) setPrebuiltUrl(data.url)
    } catch (e) { console.error('Pre-build error:', e) } finally { setIsPreparing(false) }
  }, [user?.id, user?.email, accountData?.email, selectedPlan, selectedCharity, charityPct])

  useEffect(() => {
    if (step >= 1) generateStripeUrl()
  }, [step, selectedPlan, selectedCharity, charityPct, generateStripeUrl])

  const onAccountSubmit = async (data: AccountData) => {
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, data: { full_name: data.full_name } }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.msg || 'Signup failed')
      
      setAccountData(data)
      setStep(1)
      if (d.access_token) {
        localStorage.setItem(`sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`, JSON.stringify({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at, user: d.user }))
        refreshUser(true)
      }
    } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }

  const handlePayment = async () => {
    if (prebuiltUrl) { window.location.replace(prebuiltUrl); return }
    setLoading(true)
    const token = getAuthToken()
    try {
      const email = accountData?.email || user?.email
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          priceId: PLAN_DETAILS[selectedPlan].priceId,
          userId: user?.id, plan: selectedPlan, charityId: selectedCharity || null, charityPct,
          successUrl: `${window.location.origin}/auth/payment-success?session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(email || '')}`,
          cancelUrl: `${window.location.origin}/signup?step=3`,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Checkout failed')
    } catch (e: any) { toast.error(e.message); setLoading(false) }
  }

  const STEPS = [
    { name: 'Account', icon: <Lock size={18} /> },
    { name: 'Plan', icon: <CreditCard size={18} /> },
    { name: 'Charity', icon: <Heart size={18} /> },
    { name: 'Review', icon: <Trophy size={18} /> }
  ]

  return (
    <div className="page-wrapper min-h-screen bg-[#0A0A0F] pt-24 pb-12 relative overflow-hidden">
      <div className="mesh-bg opacity-20" />
      <div className="section-container relative z-10 max-w-4xl">
        <div className="flex justify-between mb-12 relative">
          <div className="absolute top-5 left-0 w-full h-px bg-white/10" />
          {STEPS.map((s, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${step >= i ? 'bg-[#6EE7B7] text-[#0A0A0F] shadow-[0_0_20px_rgba(110,231,183,0.3)]' : 'bg-[#1A1A2E] text-[#64748B]'}`}>
                {step > i ? <Check size={18} /> : s.icon}
              </div>
              <span className={`text-[10px] font-800 uppercase tracking-widest ${step >= i ? 'text-white' : 'text-[#64748B]'}`}>{s.name}</span>
            </div>
          ))}
        </div>

        <div className="glass-card p-8 md:p-12 max-w-2xl mx-auto border border-white/5">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h1 className="text-3xl font-syne font-800 mb-2 text-white text-center">Join Golff</h1>
                <p className="text-[#94A3B8] mb-8 text-center">Create your account to start winning.</p>
                <form onSubmit={handleSubmit(onAccountSubmit)} className="space-y-6">
                  <div>
                    <input {...register('full_name')} placeholder="Full Name" className="input-field" />
                    <p className="text-[10px] text-[#64748B] mt-1.5 ml-1 font-700 uppercase tracking-wider">Characters from 2 - 50</p>
                  </div>
                  <div>
                    <input {...register('email')} placeholder="Email" className="input-field" />
                    <p className="text-[10px] text-[#64748B] mt-1.5 ml-1 font-700 uppercase tracking-wider">e.g. username@gmail.com</p>
                  </div>
                  <div>
                    <div className="relative">
                      <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Password" className="input-field" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-1.5 ml-1 font-700 uppercase tracking-wider">Min 8 characters, 1 uppercase, 1 special character</p>
                  </div>
                  <button type="submit" disabled={loading} className="premium-btn w-full mt-2 py-4">{loading ? 'Creating Account...' : 'Continue'}</button>
                </form>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-2xl font-syne font-800 mb-6 text-white text-center">Select Your Plan</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(PLAN_DETAILS).map(p => (
                    <button key={p.id} onClick={() => setSelectedPlan(p.id as any)} className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 ${selectedPlan === p.id ? 'border-[#6EE7B7] bg-[#6EE7B7]/5 ring-4 ring-[#6EE7B7]/10' : 'border-white/5 hover:border-white/10'}`}>
                      <h3 className="font-700 mb-1 text-white">{p.name}</h3>
                      <p className="text-2xl font-grotesk font-800 text-[#6EE7B7]">₹{p.price.toLocaleString('en-IN')}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(2)} className="premium-btn w-full mt-8 py-4 shadow-[0_10px_20px_-5px_rgba(110,231,183,0.3)]">Next: Charity</button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <h2 className="text-2xl font-syne font-800 mb-4 text-white text-center">Support a Cause</h2>
                <div className="grid grid-cols-2 gap-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {charities.map(c => (
                    <button key={c.id} onClick={() => setSelectedCharity(c.id)} className={`p-3 rounded-xl border-2 text-left transition-all ${selectedCharity === c.id ? 'border-[#6EE7B7] bg-[#6EE7B7]/5' : 'border-white/5'}`}>
                      <img src={c.image_url} className="w-full h-20 object-cover rounded-lg mb-2" />
                      <p className="text-xs font-700 truncate text-center text-white">{c.name}</p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setStep(3)} disabled={!selectedCharity} className="premium-btn w-full py-4 disabled:opacity-50">Final Review</button>
                  <button onClick={() => setStep(1)} className="text-[#64748B] text-xs font-700 uppercase tracking-widest py-2 hover:text-white transition-colors">← Back to Plans</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <h2 className="text-3xl font-syne font-800 mb-8 text-center text-white">Final Review</h2>
                <div className="space-y-4 mb-10">
                  <div className="glass-card p-5 flex justify-between items-center"><span className="text-[#64748B]">Plan</span><span className="font-700 uppercase text-white">{selectedPlan}</span></div>
                  <div className="glass-card p-5 flex justify-between items-center"><span className="text-[#64748B]">Total</span><span className="text-[#6EE7B7] font-800 text-xl">₹{PLAN_DETAILS[selectedPlan].price.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="flex flex-col gap-4">
                  <button onClick={handlePayment} disabled={loading} className="premium-btn w-full py-5 text-lg flex items-center justify-center gap-3">
                    {isPreparing && !prebuiltUrl ? <><span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Preparing...</> : <><Zap size={20} /> Pay Now ⚡</>}
                  </button>
                  <button onClick={() => setStep(2)} className="text-[#64748B] text-xs font-700 uppercase tracking-widest py-2 hover:text-white transition-colors">← Back to Charity</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
