import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Trophy, Target, Heart, TrendingUp, Zap, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, ArrowRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { SkeletonStat } from '../components/SkeletonLoader'
import type { Score, Draw, DrawEntry, Charity, Winner } from '../types'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [scores, setScores] = useState<Score[]>([])
  const [latestDraw, setLatestDraw] = useState<Draw | null>(null)
  const [myEntry, setMyEntry] = useState<DrawEntry | null>(null)
  const [charity, setCharity] = useState<Charity | null>(null)
  const [winnings, setWinnings] = useState<Winner[]>([])
  const [daysUntilDraw, setDaysUntilDraw] = useState(0)
  
  // Independent loading states for speed
  const [loadingScores, setLoadingScores] = useState(true)
  const [loadingDraw, setLoadingDraw] = useState(true)
  const [loadingCharity, setLoadingCharity] = useState(true)

  // 1. Instant mount logic
  useEffect(() => {
    refreshUser(true) // Background sync
    
    // 🛡️ TRUTH CHECK: If we see inactive, double check the receipts table
    if (user?.subscription_status === 'inactive') {
      supabase.from('subscription_payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .maybeSingle()
        .then(res => {
          if (res.data) {
            console.log('🛡️ Dashboard found receipt. Activating session...')
            useAuthStore.getState().setSubscriptionActive(user.subscription_plan || 'monthly')
          }
        })
    }

    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setDaysUntilDraw(Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [])

  // 2. Fetch data independently (No blocking)
  useEffect(() => {
    if (!user?.id) return

    // Fetch Scores
    supabase.from('scores').select('id, score, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      .then(res => { setScores(res.data || []); setLoadingScores(false); })
      .catch(() => setLoadingScores(false))

    // Fetch Latest Draw & Entry
    supabase.from('draws').select('id, month, year, status, drawn_numbers').order('created_at', { ascending: false }).limit(1).single()
      .then(async res => {
        if (res.data) {
          setLatestDraw(res.data)
          const entry = await supabase.from('draw_entries').select('id, match_count, prize_amount').eq('draw_id', res.data.id).eq('user_id', user.id).maybeSingle()
          setMyEntry(entry.data)
        }
        setLoadingDraw(false)
      })
      .catch(() => setLoadingDraw(false))

    // Fetch Charity
    if (user.charity_id) {
      supabase.from('charities').select('id, name, image_url, description').eq('id', user.charity_id).single()
        .then(res => { setCharity(res.data); setLoadingCharity(false); })
        .catch(() => setLoadingCharity(false))
    } else {
      setLoadingCharity(false)
    }

    // Fetch Winnings
    supabase.from('winners').select('*, draws(month, year)').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(res => setWinnings(res.data || []))
      .catch(() => {})

  }, [user?.id])

  const loading = useAuthStore((s) => s.loading)
  const justPaid = useAuthStore((s) => s.justPaid)

  const charityAmount = user ? Math.round((user.subscription_plan === 'yearly' ? 4999 / 12 : 499) * (user.charity_contribution_pct / 100)) : 0
  const prizePool = user ? Math.round((user.subscription_plan === 'yearly' ? 4999 / 12 : 499) * 0.5) : 0

  const planName = user?.subscription_plan === 'yearly' ? 'Yearly Legend' : 'Monthly VIP'

  const getStatusBadge = () => {
    if (user?.subscription_status === 'active' || justPaid) return <span className="badge-active px-4 py-1.5 shadow-[0_0_15px_rgba(110,231,183,0.2)]">Active</span>
    return <span className="badge-inactive">Inactive</span>
  }

  return (
    <div className="page-wrapper min-h-screen pt-24">
      <div className="section-container pb-20">
        {/* Instant Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="font-syne font-800 text-5xl text-white mb-2 tracking-tight">
              Hey, {user?.full_name?.split(' ')[0] || 'Member'} 👋
            </motion.h1>
            <p className="text-[#64748B] text-lg">Your VIP dashboard is ready.</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <span className="badge-accent uppercase tracking-widest px-4 py-1.5">{planName}</span>
          </div>
        </div>

        {/* Status Alert (Only if definitely inactive and NOT just paid) */}
        {!loading && user?.subscription_status === 'inactive' && !justPaid && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-[#F59E0B]/20 bg-[#F59E0B]/5 p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B] shadow-lg"><Zap size={24} /></div>
              <div>
                <h3 className="font-700 text-lg text-white">Activation Required</h3>
                <p className="text-[#94A3B8] text-sm">Finish your subscription to enter this month's draw.</p>
              </div>
            </div>
            <Link to="/signup?step=3" className="premium-btn py-3 px-8">Complete Now</Link>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Draw Numbers', value: loadingScores ? '...' : `${scores.length}/5`, icon: <Target size={20} />, color: '#818CF8', to: '/scores' },
            { label: 'Entry Status', value: loadingDraw ? '...' : (myEntry ? 'Entered ✓' : 'Pending'), icon: <Trophy size={20} />, color: '#F59E0B', to: '/scores' },
            { label: 'Impact', value: `₹${charityAmount}`, icon: <Heart size={20} />, color: '#F87171', to: '/charities' },
            { label: 'Time Left', value: `${daysUntilDraw}d`, icon: <Clock size={20} />, color: '#6EE7B7', to: '#' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={stat.to} className="glass-card-hover p-6 block group">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[#64748B] text-[10px] font-800 uppercase tracking-widest group-hover:text-white transition-colors">{stat.label}</p>
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                </div>
                <p className="font-grotesk font-800 text-3xl text-white group-hover:scale-105 transition-transform origin-left">{stat.value}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Draw Numbers */}
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <h2 className="font-syne font-800 text-xl text-white">My Draw Numbers</h2>
                <Link to="/scores" className="text-[#6EE7B7] text-sm font-700 hover:underline">Add More +</Link>
              </div>
              <div className="p-8">
                {loadingScores ? (
                  <div className="flex gap-4"><div className="w-14 h-14 rounded-full bg-white/5 animate-pulse" /><div className="w-14 h-14 rounded-full bg-white/5 animate-pulse" /></div>
                ) : scores.length === 0 ? (
                  <div className="text-center py-6"><p className="text-[#64748B] mb-4 text-sm">No draw numbers yet this month</p><Link to="/scores" className="premium-btn text-xs py-2 px-6">Submit Your First Score</Link></div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {scores.map(s => <div key={s.id} className="draw-ball w-16 h-16 text-xl">{s.score}</div>)}
                    {Array.from({ length: 5 - scores.length }).map((_, i) => <div key={i} className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-[#374151]">?</div>)}
                  </div>
                )}
              </div>
            </div>

            {/* Winnings */}
            <div className="glass-card">
              <div className="p-6 border-b border-white/5 bg-white/[0.02]"><h2 className="font-syne font-800 text-xl text-white">Winnings</h2></div>
              <div className="p-6">
                {winnings.length === 0 ? (
                  <div className="text-center py-4 text-[#64748B] text-sm">Your winning history will appear here.</div>
                ) : (
                  <div className="space-y-3">
                    {winnings.map(w => (
                      <div key={w.id} className="flex justify-between p-4 glass-card bg-white/[0.01]">
                        <span className="font-700 capitalize">{w.match_type} Winner</span>
                        <span className="text-[#6EE7B7] font-grotesk font-800">₹{w.prize_amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-syne font-800 text-lg text-white mb-6">Contribution Split</h3>
              <div className="space-y-5">
                {[
                  { label: 'Prize Pool (50%)', amount: prizePool, color: '#F59E0B' },
                  { label: 'Charity Impact', amount: charityAmount, color: '#F87171' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs font-700 uppercase mb-2">
                      <span className="text-[#64748B]">{item.label}</span>
                      <span style={{ color: item.color }}>₹{item.amount}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} className="h-full" style={{ background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {loadingCharity ? <div className="glass-card h-48 animate-pulse" /> : charity && (
              <div className="glass-card overflow-hidden">
                <img src={charity.image_url} className="w-full h-32 object-cover" />
                <div className="p-6">
                  <h3 className="font-syne font-800 text-white mb-2">{charity.name}</h3>
                  <p className="text-[#94A3B8] text-xs leading-relaxed">{charity.description?.slice(0, 100)}...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
