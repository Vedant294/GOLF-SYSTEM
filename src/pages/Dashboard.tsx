import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { Trophy, Target, Heart, TrendingUp, Zap, Clock, CheckCircle, XCircle, AlertCircle, DollarSign, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import { SkeletonStat } from '../components/SkeletonLoader'
import type { Score, Draw, DrawEntry, Charity, Winner } from '../types'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [searchParams] = useSearchParams()
  const [scores, setScores] = useState<Score[]>([])
  const [latestDraw, setLatestDraw] = useState<Draw | null>(null)
  const [myEntry, setMyEntry] = useState<DrawEntry | null>(null)
  const [charity, setCharity] = useState<Charity | null>(null)
  const [winnings, setWinnings] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [daysUntilDraw, setDaysUntilDraw] = useState(0)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('🎉 Subscription activated! Welcome to Golff!')
      // Webhook fires async — poll DB until subscription is active (max 15s)
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        await refreshUser()
        const currentStatus = useAuthStore.getState().user?.subscription_status
        if (currentStatus === 'active' || attempts >= 8) {
          clearInterval(poll)
        }
      }, 2000)
      return () => clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    if (user) fetchData()
    // Days until end of month
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setDaysUntilDraw(Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    const [scoresRes, drawRes, charityRes, winnersRes] = await Promise.all([
      supabase.from('scores').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('draws').select('*').order('created_at', { ascending: false }).limit(1),
      user?.charity_id ? supabase.from('charities').select('*').eq('id', user.charity_id).single() : Promise.resolve({ data: null }),
      // PRD §10: Winnings overview — all time history
      supabase.from('winners').select('*, draws(month, year)').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])
    setScores(scoresRes.data || [])
    if (drawRes.data && drawRes.data.length > 0) {
      setLatestDraw(drawRes.data[0])
      const entryRes = await supabase.from('draw_entries').select('*').eq('draw_id', drawRes.data[0].id).eq('user_id', user!.id).maybeSingle()
      setMyEntry(entryRes.data)
    }
    setCharity(charityRes.data)
    setWinnings(winnersRes.data || [])
    setLoading(false)
  }

  const charityAmount = user ? Math.round((user.subscription_plan === 'yearly' ? 4999 / 12 : 499) * (user.charity_contribution_pct / 100)) : 0
  const prizePool = user ? Math.round((user.subscription_plan === 'yearly' ? 4999 / 12 : 499) * 0.5) : 0

  const getStatusBadge = () => {
    switch (user?.subscription_status) {
      case 'active': return <span className="badge-active">Active</span>
      case 'inactive': return <span className="badge-inactive">Inactive</span>
      case 'lapsed': return <span className="badge-gold">Lapsed</span>
      case 'cancelled': return <span className="badge-inactive">Cancelled</span>
      default: return null
    }
  }

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-1">
              Hey, {user?.full_name?.split(' ')[0]} 👋
            </motion.h1>
            <p className="text-[#64748B]">Here's your Golff overview for this month.</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            {user?.subscription_plan && (
              <span className="badge-accent capitalize">{user.subscription_plan}</span>
            )}
          </div>
        </div>
        
        {/* PRD §04: Inactive Subscription Alert */}
        {user?.subscription_status === 'inactive' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center text-[#F59E0B]">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="font-syne font-700 text-lg text-white">Complete Your Subscription</h3>
                <p className="text-[#94A3B8] text-sm">Your account is created, but your subscription is not yet active. Pay now to enter this month's draw!</p>
              </div>
            </div>
            <Link 
              to="/signup?step=3" 
              className="premium-btn py-3 px-8 flex items-center gap-2"
            >
              Finish Activation <ArrowRight size={18} />
            </Link>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          ) : (
            <>
              {[
                { label: 'Scores Entered', value: `${scores.length}/5`, icon: <Target size={20} />, color: '#818CF8' },
                { label: 'Draw Entry', value: myEntry ? 'Entered ✓' : 'Not entered', icon: <Trophy size={20} />, color: '#F59E0B' },
                { label: 'Charity Contribution', value: `₹${charityAmount}`, icon: <Heart size={20} />, color: '#F87171' },
                { label: 'Days Until Draw', value: `${daysUntilDraw}d`, icon: <Clock size={20} />, color: '#6EE7B7' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[#64748B] text-xs uppercase tracking-widest">{stat.label}</p>
                    <div style={{ color: stat.color }}>{stat.icon}</div>
                  </div>
                  <p className="font-grotesk font-700 text-2xl" style={{ color: stat.color }}>{stat.value}</p>
                </motion.div>
              ))}
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* My Scores */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-syne font-700 text-lg flex items-center gap-2">
                  <Target size={18} className="text-[#818CF8]" /> My Draw Numbers
                </h2>
                <Link to="/scores" className="text-[#6EE7B7] text-sm hover:text-white transition-colors">Add Score →</Link>
              </div>
              <div className="p-6">
                {scores.length === 0 ? (
                  <div className="text-center py-8">
                    <Target size={40} className="text-[#374151] mx-auto mb-3" />
                    <p className="text-[#64748B] text-sm">No scores yet this month</p>
                    <Link to="/scores" className="text-[#6EE7B7] text-sm hover:underline mt-2 inline-block">Add your first score →</Link>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {scores.map((score, i) => (
                      <motion.div
                        key={score.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1, type: 'spring' }}
                        className="draw-ball"
                      >
                        {score.score}
                      </motion.div>
                    ))}
                    {Array.from({ length: 5 - scores.length }).map((_, i) => (
                      <div key={i} className="w-14 h-14 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center text-[#374151]">?</div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Latest Draw */}
            {latestDraw && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h2 className="font-syne font-700 text-lg flex items-center gap-2">
                    <Trophy size={18} className="text-[#F59E0B]" /> Latest Draw
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${latestDraw.status === 'published' ? 'bg-[rgba(110,231,183,0.2)] text-[#6EE7B7]' : 'bg-[rgba(245,158,11,0.2)] text-[#F59E0B]'}`}>
                      {latestDraw.status}
                    </span>
                  </h2>
                </div>
                <div className="p-6">
                  {latestDraw.status === 'published' && latestDraw.drawn_numbers ? (
                    <>
                      <p className="text-[#64748B] text-sm mb-4">Winning numbers for {format(new Date(latestDraw.year, latestDraw.month - 1), 'MMMM yyyy')}:</p>
                      <div className="flex gap-3 mb-4">
                        {latestDraw.drawn_numbers.map((num, i) => (
                          <div key={i} className="draw-ball">{num}</div>
                        ))}
                      </div>
                      {myEntry && (
                        <div className={`flex items-center gap-3 p-4 rounded-xl ${myEntry.match_count >= 3 ? 'bg-[rgba(110,231,183,0.1)] border border-[rgba(110,231,183,0.2)]' : 'bg-[rgba(26,26,46,0.5)]'}`}>
                          {myEntry.match_count >= 3 ? <CheckCircle size={20} className="text-[#6EE7B7]" /> : <XCircle size={20} className="text-[#374151]" />}
                          <div>
                            <p className="font-600 text-sm">{myEntry.match_count >= 3 ? `🎉 You won! ${myEntry.match_count} matches` : 'No match this month'}</p>
                            {myEntry.prize_amount > 0 && <p className="text-[#F59E0B] font-grotesk font-700">₹{myEntry.prize_amount.toLocaleString('en-IN')} prize</p>}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle size={32} className="text-[#64748B] mx-auto mb-2" />
                      <p className="text-[#64748B] text-sm">Draw has not been published yet. Check back at month end.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PRD §10: Winnings Overview — total won + payment status history */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="font-syne font-700 text-lg flex items-center gap-2">
                  <DollarSign size={18} className="text-[#6EE7B7]" /> Winnings Overview
                </h2>
                <div className="text-right">
                  <p className="text-[#64748B] text-xs">Total Won (All Time)</p>
                  <p className="font-grotesk font-700 text-xl text-[#6EE7B7]">
                    ₹{winnings.reduce((sum, w) => sum + (w.prize_amount || 0), 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="p-6">
                {winnings.length === 0 ? (
                  <div className="text-center py-6">
                    <Trophy size={36} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-[#64748B] text-sm">No winnings yet — your first draw is coming!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {winnings.map(w => (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(26,26,46,0.5)] border border-white/5">
                        <div>
                          <p className="text-sm font-600 capitalize">{w.match_type} Winner</p>
                          <p className="text-[#64748B] text-xs">
                            {(w as any).draws ? `${format(new Date((w as any).draws.year, (w as any).draws.month - 1), 'MMM yyyy')} Draw` : 'Draw'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-grotesk font-700 text-[#F59E0B] text-sm">₹{w.prize_amount?.toLocaleString('en-IN')}</p>
                          <span className={w.payout_status === 'paid' ? 'badge-active text-xs' : 'badge-gold text-xs'}>
                            {w.payout_status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Subscription Card */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
              <h3 className="font-syne font-700 text-base mb-4 flex items-center gap-2">
                <Zap size={16} className="text-[#6EE7B7]" /> Subscription
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Plan</span>
                  <span className="font-600 capitalize">{user?.subscription_plan || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Status</span>
                  {getStatusBadge()}
                </div>
                {user?.subscription_end && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B]">Renews</span>
                    <span>{format(parseISO(user.subscription_end), 'dd MMM yyyy')}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Charity Card */}
            {charity && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="glass-card overflow-hidden">
                <img src={charity.image_url} alt={charity.name} className="w-full h-28 object-cover" />
                <div className="p-5">
                  <p className="text-[#64748B] text-xs uppercase tracking-widest mb-1">Your Charity</p>
                  <h3 className="font-syne font-700 text-base mb-1">{charity.name}</h3>
                  <p className="text-[#94A3B8] text-xs mb-3">{charity.description?.slice(0, 80)}...</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6EE7B7] font-grotesk font-700 text-sm">₹{charityAmount}/mo</span>
                    <span className="badge-active">{user?.charity_contribution_pct}% of plan</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Prize Pool Breakdown */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
              <h3 className="font-syne font-700 text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-[#F59E0B]" /> Your Contribution Split
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Prize Pool (50%)', amount: prizePool, color: '#F59E0B' },
                  { label: `Charity (${user?.charity_contribution_pct || 10}%)`, amount: charityAmount, color: '#F87171' },
                  { label: 'Platform (40%)', amount: Math.round((user?.subscription_plan === 'yearly' ? 4999 / 12 : 499) * 0.4), color: '#818CF8' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#64748B]">{item.label}</span>
                      <span style={{ color: item.color }} className="font-grotesk font-600">₹{item.amount}</span>
                    </div>
                    <div className="prize-bar">
                      <div className="prize-bar-fill" style={{ width: `${(item.amount / (user?.subscription_plan === 'yearly' ? 416 : 499)) * 100}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
