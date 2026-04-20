import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Trophy, Star, Check, ArrowRight, ArrowLeft, Search, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { PLAN_DETAILS } from '../lib/stripe'
import { useAuthStore } from '../store/useAuthStore'
import type { Charity } from '../types'

const accountSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})
type AccountData = z.infer<typeof accountSchema>

const CHARITIES_STATIC = [
  { id: '1', name: 'CRY India', slug: 'cry-india', category: 'Child Rights', description: 'Child Rights and You — protecting child rights since 1979.', image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&h=200&fit=crop' },
  { id: '2', name: 'Akshaya Patra', slug: 'akshaya-patra', category: 'Midday Meals', description: 'Fighting classroom hunger through the midday meal programme.', image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=300&h=200&fit=crop' },
  { id: '3', name: 'Smile Foundation', slug: 'smile-foundation', category: 'Education', description: 'Education and healthcare for underprivileged children.', image_url: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300&h=200&fit=crop' },
  { id: '4', name: 'HelpAge India', slug: 'helpage-india', category: 'Elder Care', description: 'Empowering older persons to lead dignified lives.', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=300&h=200&fit=crop' },
  { id: '5', name: 'GiveIndia', slug: 'give-india', category: 'Donation Hub', description: 'India\'s largest donation platform connecting donors and NGOs.', image_url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=300&h=200&fit=crop' },
  { id: '6', name: 'Sammaan Foundation', slug: 'sammaan-foundation', category: 'Dignity', description: 'Restoring dignity and rights for marginalised communities.', image_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=300&h=200&fit=crop' },
]

const STEPS = ['Account', 'Plan', 'Charity', 'Payment']

export default function Signup() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(
    (searchParams.get('plan') as 'monthly' | 'yearly') || 'monthly'
  )
  const [selectedCharity, setSelectedCharity] = useState<string>('')
  const [charitySearch, setCharitySearch] = useState('')
  const [charities, setCharities] = useState<Charity[]>([])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [charityPct, setCharityPct] = useState(10)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
  })

  // Redirect already-active users away from signup
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data: profile } = await supabase
        .from('profiles').select('subscription_status').eq('id', session.user.id).single()
      if (profile?.subscription_status === 'active') navigate('/dashboard')
    }
    check()
  }, [navigate])

  // Load charities + handle returning inactive user (skip to payment step)
  useEffect(() => {
    const fetchCharities = async () => {
      const { data } = await supabase.from('charities').select('*').order('featured', { ascending: false })
      if (data && data.length > 0) setCharities(data)
      else setCharities(CHARITIES_STATIC as any)
    }
    fetchCharities()

    const checkReturning = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single()
      if (profile && profile.subscription_status === 'inactive') {
        setUserId(profile.id)
        setAccountData({ full_name: profile.full_name || '', email: profile.email || '', password: '' })
        setSelectedPlan(profile.subscription_plan || 'monthly')
        setSelectedCharity(profile.charity_id || '')
        setCharityPct(profile.charity_contribution_pct || 10)
        setStep(parseInt(searchParams.get('step') ?? '3'))
      }
    }
    checkReturning()
  }, [])

  const filteredCharities = (charities.length > 0 ? charities : CHARITIES_STATIC).filter(c =>
    c.name.toLowerCase().includes(charitySearch.toLowerCase()) ||
    c.category.toLowerCase().includes(charitySearch.toLowerCase())
  )

  const onAccountSubmit = (data: AccountData) => {
    setAccountData(data)
    setStep(1)
  }

  // ── Real Stripe Checkout ──
  // 1. Create Supabase account (if not already logged in)
  // 2. Save charity preference to profile
  // 3. Call edge function → get Stripe Checkout URL → redirect
  // Stripe webhook handles activation after payment succeeds
  const handlePayment = async () => {
    if (!accountData) return
    setLoading(true)
    try {
      // Step 1: Get or create auth user
      let currentUserId = userId
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        currentUserId = session.user.id
      } else {
        // Create account
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email: accountData.email,
          password: accountData.password,
          options: { data: { full_name: accountData.full_name } },
        })
        if (signupError) {
          if (signupError.message.includes('already registered')) {
            // Already exists — just sign them in
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: accountData.email,
              password: accountData.password,
            })
            if (signInError) {
              toast.error('Email already registered. Please sign in.')
              navigate('/login')
              return
            }
            currentUserId = signInData.user!.id
          } else {
            throw signupError
          }
        } else {
          if (!authData.user) throw new Error('Account creation failed')
          currentUserId = authData.user.id

          // When email confirmation is OFF, signUp returns a session directly
          // Use it — no need for a separate signInWithPassword call
          if (authData.session) {
            await supabase.auth.setSession({
              access_token: authData.session.access_token,
              refresh_token: authData.session.refresh_token,
            })
          } else {
            // Fallback: sign in with password
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: accountData.email,
              password: accountData.password,
            })
            if (signInError) console.error('Auto sign-in failed:', signInError)
          }
        }
      }

      setUserId(currentUserId)

      // Small wait to ensure session is persisted to localStorage
      // before browser navigates away to Stripe
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 2: Save charity preference before redirecting to Stripe
      await supabase.from('profiles').update({
        charity_id: selectedCharity || null,
        charity_contribution_pct: charityPct,
        subscription_plan: selectedPlan,
      }).eq('id', currentUserId)

      // Step 3: Create Stripe Checkout session via edge function
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: PLAN_DETAILS[selectedPlan].priceId,
          userId: currentUserId,
          plan: selectedPlan,
          charityId: selectedCharity || null,
          charityPct,
          successUrl: `${appUrl}/dashboard?success=true`,
          cancelUrl: `${appUrl}/signup?step=3`,
        },
      })

      if (error || !data?.url) throw new Error(error?.message || 'Could not create checkout session')

      // Step 4: Redirect to Stripe Checkout (test mode — no real money)
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 pt-24 pb-12">
      <div className="w-full max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6EE7B7] to-[#3B82F6] flex items-center justify-center shadow-[0_0_30px_rgba(110,231,183,0.3)]">
                <Trophy size={24} className="text-[#0A0A0F]" />
              </div>
              <span className="font-syne font-800 text-2xl text-white">Golff</span>
            </Link>
            <h1 className="font-syne font-800 text-3xl">Create Your Account</h1>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-0 mb-10">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-500 transition-all ${
                  i === step ? 'bg-[rgba(110,231,183,0.15)] text-[#6EE7B7] border border-[rgba(110,231,183,0.3)]' :
                  i < step ? 'text-[#6EE7B7]' : 'text-[#374151]'
                }`}>
                  {i < step ? <Check size={14} /> : <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">{i + 1}</span>}
                  <span className="hidden sm:inline">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${i < step ? 'bg-[#6EE7B7]' : 'bg-[rgba(255,255,255,0.1)]'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="glass-card p-8">
            <AnimatePresence mode="wait">
              {/* Step 0: Account */}
              {step === 0 && (
                <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-syne font-700 text-xl mb-6">Your Details</h2>
                  <form id="signup-form" onSubmit={handleSubmit(onAccountSubmit)} className="space-y-5">
                    <div>
                      <label className="block text-[#94A3B8] text-sm font-500 mb-2">Full Name</label>
                      <input id="signup-name" className="input-field" placeholder="Arjun Sharma" {...register('full_name')} />
                      {errors.full_name && <p className="text-[#F87171] text-xs mt-1">{errors.full_name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[#94A3B8] text-sm font-500 mb-2">Email Address</label>
                      <input id="signup-email" type="email" className="input-field" placeholder="you@example.com" {...register('email')} />
                      {errors.email && <p className="text-[#F87171] text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-[#94A3B8] text-sm font-500 mb-2">Password</label>
                      <div className="relative">
                        <input id="signup-password" type={showPassword ? 'text' : 'password'} className="input-field pr-12" placeholder="Min 8 chars, 1 uppercase, 1 number" {...register('password')} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-[#F87171] text-xs mt-1">{errors.password.message}</p>}
                    </div>
                    <button id="next-step-1" type="submit" className="premium-btn w-full py-3.5 flex items-center justify-center gap-2">
                      Continue <ArrowRight size={18} />
                    </button>
                  </form>
                  <p className="text-center text-[#64748B] text-sm mt-4">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#6EE7B7] font-600">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {/* Step 1: Plan */}
              {step === 1 && (
                <motion.div key="plan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-syne font-700 text-xl mb-6">Choose Your Plan</h2>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {(['monthly', 'yearly'] as const).map(plan => {
                      const p = PLAN_DETAILS[plan]
                      const selected = selectedPlan === plan
                      return (
                        <button
                          key={plan}
                          id={`plan-${plan}`}
                          onClick={() => setSelectedPlan(plan)}
                          className={`text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
                            selected
                              ? 'border-[#6EE7B7] bg-[rgba(110,231,183,0.08)]'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-syne font-700 text-lg">{p.name}</span>
                            {selected && <Check size={18} className="text-[#6EE7B7]" />}
                          </div>
                          {p.savings && <span className="badge-active text-xs">{p.savings}</span>}
                          <div className="mt-3 mb-4">
                            <span className="font-syne font-800 text-3xl">₹{p.price.toLocaleString('en-IN')}</span>
                            <span className="text-[#64748B] text-sm">{p.period}</span>
                          </div>
                          <ul className="space-y-2">
                            {p.features.slice(0, 3).map(f => (
                              <li key={f} className="flex items-center gap-2 text-[#94A3B8] text-xs">
                                <Star size={11} className="text-[#6EE7B7] shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(0)} className="outline-btn flex-1 flex items-center justify-center gap-2 py-3">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button id="next-step-2" onClick={() => setStep(2)} className="premium-btn flex-1 flex items-center justify-center gap-2 py-3">
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Charity */}
              {step === 2 && (
                <motion.div key="charity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-syne font-700 text-xl mb-2">Choose Your Charity</h2>
                  <p className="text-[#64748B] text-sm mb-5">Min 10% of your subscription will go to this charity.</p>
                  
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      className="input-field pl-9"
                      placeholder="Search charities..."
                      value={charitySearch}
                      onChange={e => setCharitySearch(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5 max-h-60 overflow-y-auto">
                    {filteredCharities.map(c => (
                      <button
                        key={c.id}
                        id={`charity-${c.id}`}
                        onClick={() => setSelectedCharity(c.id)}
                        className={`text-left rounded-xl border-2 transition-all p-3 ${
                          selectedCharity === c.id
                            ? 'border-[#6EE7B7] bg-[rgba(110,231,183,0.08)]'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <img src={c.image_url} alt={c.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                        <p className="font-inter font-600 text-xs text-white truncate">{c.name}</p>
                        <p className="text-[#64748B] text-xs">{c.category}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mb-6">
                    <label className="block text-[#94A3B8] text-sm font-500 mb-2">
                      Charity Contribution: <span className="text-[#6EE7B7] font-700">{charityPct}%</span>
                      <span className="text-[#64748B] text-xs ml-2">(₹{Math.round(PLAN_DETAILS[selectedPlan].price * charityPct / 100)}/mo)</span>
                    </label>
                    <input
                      type="range" min={10} max={50} step={5}
                      value={charityPct}
                      onChange={e => setCharityPct(Number(e.target.value))}
                      className="w-full accent-[#6EE7B7]"
                    />
                    <div className="flex justify-between text-[#64748B] text-xs mt-1">
                      <span>10% (min)</span><span>50% (max)</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="outline-btn flex-1 flex items-center justify-center gap-2 py-3">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      id="next-step-3"
                      onClick={() => setStep(3)}
                      disabled={!selectedCharity}
                      className="premium-btn flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-syne font-700 text-xl mb-6">Confirm & Pay</h2>
                  
                  {/* Summary */}
                  <div className="space-y-3 mb-6">
                    <div className="glass-card p-4">
                      <p className="text-[#64748B] text-xs mb-1">Your Details</p>
                      <p className="font-500 text-sm">{accountData?.full_name}</p>
                      <p className="text-[#94A3B8] text-xs">{accountData?.email}</p>
                    </div>
                    <div className="glass-card p-4">
                      <p className="text-[#64748B] text-xs mb-1">Plan</p>
                      <div className="flex items-center justify-between">
                        <span className="font-600 text-sm capitalize">{selectedPlan}</span>
                        <span className="text-[#6EE7B7] font-grotesk font-700">
                          ₹{PLAN_DETAILS[selectedPlan].price.toLocaleString('en-IN')}{PLAN_DETAILS[selectedPlan].period}
                        </span>
                      </div>
                    </div>
                    <div className="glass-card p-4">
                      <p className="text-[#64748B] text-xs mb-1">Charity</p>
                      <div className="flex items-center justify-between">
                        <span className="font-600 text-sm">
                          {(charities.length > 0 ? charities : CHARITIES_STATIC).find(c => c.id === selectedCharity)?.name || 'None'}
                        </span>
                        <span className="badge-active">{charityPct}% donation</span>
                      </div>
                    </div>
                    <div className="glass-card p-3 border-[rgba(110,231,183,0.15)] bg-[rgba(110,231,183,0.03)]">
                      <p className="text-[#6EE7B7] text-xs font-600 flex items-center gap-2">
                        <Shield size={14} /> Secured by Stripe · Test mode · No real charges
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="outline-btn flex-1 flex items-center justify-center gap-2 py-3">
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      id="pay-btn"
                      onClick={handlePayment}
                      disabled={loading}
                      className="premium-btn flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-60"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <><ArrowRight size={18} /> Pay Now</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
