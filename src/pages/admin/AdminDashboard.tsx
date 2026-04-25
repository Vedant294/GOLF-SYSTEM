import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Users, Trophy, Heart, TrendingUp, Settings, ChevronRight, Zap, AlertCircle, Database, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface Stats {
  totalUsers: number
  activeSubscribers: number
  totalRaised: number
  pendingWinners: number
  lastDraw: any
}

const ADMIN_LINKS = [
  { id: 'users', to: '/admin/users', label: 'Manage Users', icon: <Users size={20} />, color: '#818CF8', desc: 'View and manage all subscribers' },
  { id: 'draws', to: '/admin/draws', label: 'Run Draw', icon: <Trophy size={20} />, color: '#F59E0B', desc: 'Configure and publish monthly draws' },
  { id: 'charities', to: '/admin/charities', label: 'Manage Charities', icon: <Heart size={20} />, color: '#F87171', desc: 'Partner management' },
  { id: 'analytics', to: '/admin/reports', label: 'Analytics', icon: <TrendingUp size={20} />, color: '#A78BFA', desc: 'Revenue and impact reports' },
  { id: 'winners', to: '/admin/winners', label: 'Verify Winners', icon: <Trophy size={20} />, color: '#6EE7B7', desc: 'Review prize claims' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeSubscribers: 0, totalRaised: 0, pendingWinners: 0, lastDraw: null })
  const [loading, setLoading] = useState(true)
  const [isSeeding, setIsSeeding] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [usersRes, activeRes, winnersRes, drawRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabase.from('winners').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from('draws').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      const donationsRes = await supabase.from('donations').select('amount').eq('status', 'completed')
      const total = donationsRes.data?.reduce((a, d) => a + d.amount, 0) || 0

      setStats({
        totalUsers: usersRes.count || 0,
        activeSubscribers: activeRes.count || 0,
        totalRaised: total,
        pendingWinners: winnersRes.count || 0,
        lastDraw: drawRes.data,
      })
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  const seedSampleData = async () => {
    setIsSeeding(true)
    const toastId = toast.loading('Seeding sample data...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Seed Charities & Donations
      const charities = [
        { name: 'Golf for Kids', slug: 'golf-kids', category: 'Education', featured: true, image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800', description: 'Providing golf equipment and training for underprivileged children.' },
        { name: 'Green Links', slug: 'green-links', category: 'Environment', featured: true, image_url: 'https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&q=80&w=800', description: 'Reforestation and environmental protection across golf courses.' },
        { name: 'Hope Foundation', slug: 'hope-foundation', category: 'Health', featured: false, image_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&q=80&w=800', description: 'Medical assistance for remote golf-community areas.' }
      ]
      
      const { data: charData } = await supabase.from('charities').upsert(charities, { onConflict: 'slug' }).select()
      
      if (charData && charData.length > 0) {
        // Seed some donations to fix the ₹0 stat
        const donations = charData.map(c => ({
          user_id: user.id,
          charity_id: c.id,
          amount: Math.floor(Math.random() * 5000) + 1500,
          type: 'subscription',
          status: 'completed'
        }))
        await supabase.from('donations').insert(donations)
      }

      // 2. Create a Draw & a Winner
      const now = new Date()
      const { data: draw, error: drawErr } = await supabase.from('draws').upsert({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        status: 'pending',
        prize_pool_total: 125000,
        jackpot_amount: 75000
      }, { onConflict: 'month,year' }).select().single()

      if (drawErr) console.error('Draw seed error:', drawErr)

      if (draw) {
        const { error: winErr } = await supabase.from('winners').insert({
          draw_id: draw.id,
          user_id: user.id,
          match_type: '4-match',
          prize_amount: 5000,
          verification_status: 'pending'
        })
        if (winErr) console.error('Winner seed error:', winErr)
      }

      // 4. Seed Active Users (to boost the Prize Pool!)
      const sampleUsers = Array.from({ length: 50 }).map((_, i) => ({
        id: crypto.randomUUID(),
        email: `tester${i}@example.com`,
        full_name: `Sample Golfer ${i}`,
        subscription_status: 'active',
        subscription_plan: 'monthly',
        charity_contribution_pct: 10,
        role: 'user'
      }))
      const { data: seededUsers, error: userErr } = await supabase.from('profiles').upsert(sampleUsers, { onConflict: 'email' }).select('id')
      if (userErr) console.error('User seed error:', userErr)

      if (seededUsers) {
        const sampleScores: any[] = []
        const samplePayments: any[] = []
        const sampleDonations: any[] = []
        
        // 5. Generate 6 months of history for charts!
        for (let m = 0; m < 6; m++) {
          const date = new Date()
          date.setMonth(date.getMonth() - m)
          const dateStr = date.toISOString().split('T')[0]

          seededUsers.forEach((u, i) => {
            // Give them scores for the current month
            if (m === 0) {
              const usedNums = new Set()
              for (let j = 0; j < 5; j++) {
                let s = Math.floor(Math.random() * 45) + 1
                while (usedNums.has(s)) s = Math.floor(Math.random() * 45) + 1
                usedNums.add(s)
                sampleScores.push({ user_id: u.id, score: s, played_date: dateStr, course_name: 'Sample Course' })
              }
            }

            // Create a payment for this month (₹499)
            samplePayments.push({
              user_id: u.id,
              amount: 499,
              status: 'completed',
              created_at: date.toISOString()
            })

            // Create a donation for this month (₹50)
            if (i < 10) { // Only some users donate extra
              sampleDonations.push({
                user_id: u.id,
                charity_id: charData?.[0]?.id,
                amount: 50,
                status: 'completed',
                created_at: date.toISOString(),
                type: 'subscription'
              })
            }
          })
        }
        
        await supabase.from('scores').insert(sampleScores)
        await supabase.from('subscription_payments').insert(samplePayments)
        await supabase.from('donations').insert(sampleDonations)

        // 6. 🏆 FORCE A WINNER FOR THE CURRENT USER (For testing!)
        if (charData?.[0]) {
          const { data: latestDraw } = await supabase.from('draws').select('id').order('created_at', { ascending: false }).limit(1).single()
          if (latestDraw) {
            await supabase.from('winners').insert({
              user_id: user.id,
              draw_id: latestDraw.id,
              match_type: '5-match',
              prize_amount: 10000,
              verification_status: 'pending',
              payout_status: 'pending'
            })
          }
        }
      }

      toast.success('Time Machine Activated! You are now a Winner too!', { id: toastId })
      
      // Small delay to let DB catch up
      setTimeout(() => fetchStats(), 500)
    } catch (e: any) {
      console.error('Total seed error:', e)
      toast.error(e.message, { id: toastId })
    } finally { setIsSeeding(false) }
  }

  return (
    <div className="page-wrapper min-h-screen pt-24 relative overflow-hidden">
      <div className="mesh-bg opacity-10" />
      <div className="section-container relative z-10 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <Settings className="text-[#F59E0B]" size={28} />
            </div>
            <div>
              <h1 className="font-syne font-800 text-4xl text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-[#64748B]">Managing the Golff Ecosystem.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={seedSampleData} disabled={isSeeding} className="glass-card px-5 py-2.5 text-xs font-700 uppercase tracking-widest text-[#F59E0B] border-[#F59E0B]/20 flex items-center gap-2 hover:bg-[#F59E0B]/5">
              <Database size={14} /> {isSeeding ? 'Seeding...' : 'Seed Data'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Users', value: loading ? '...' : stats.totalUsers, icon: <Users size={20} />, color: '#818CF8', to: '/admin/users' },
            { label: 'Active VIPs', value: loading ? '...' : stats.activeSubscribers, icon: <Zap size={20} />, color: '#6EE7B7', to: '/admin/users' },
            { label: 'Charity Raised', value: loading ? '...' : `₹${stats.totalRaised.toLocaleString()}`, icon: <Heart size={20} />, color: '#F87171', to: '/admin/reports' },
            { label: 'Pending Claims', value: loading ? '...' : stats.pendingWinners, icon: <Trophy size={20} />, color: '#F59E0B', to: '/admin/winners' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={stat.to} className="glass-card-hover p-6 border-white/5 block group">
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
            <h2 className="font-syne font-800 text-xl text-white uppercase tracking-widest">Management</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {ADMIN_LINKS.map((link, i) => (
                <div key={link.id} className="relative group">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={link.to} className={`glass-card p-6 flex items-center gap-5 hover:border-[#6EE7B7]/30 transition-all ${link.id === 'winners' ? 'rounded-b-none' : ''}`}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${link.color}10`, color: link.color }}>{link.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-syne font-800 text-white group-hover:text-[#6EE7B7] transition-colors">{link.label}</h3>
                        <p className="text-[#64748B] text-xs truncate">{link.desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-[#374151] group-hover:text-white transition-colors" />
                    </Link>
                  </motion.div>
                  {link.id === 'winners' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-b-2xl border border-t-0 border-[#F59E0B]/20 bg-[#F59E0B]/5 flex gap-3">
                      <AlertCircle size={14} className="text-[#F59E0B] shrink-0 mt-0.5" />
                      <p className="text-[#94A3B8] text-[10px] leading-relaxed">
                        <span className="font-800 text-[#F59E0B]">QUICK TIP:</span> Use this to approve payout proofs.
                      </p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-syne font-800 text-xl text-white uppercase tracking-widest">Live Status</h2>
            <div className="glass-card p-6 bg-white/[0.02] flex flex-col">
              <h3 className="font-syne font-800 text-lg text-white mb-6 flex items-center gap-2"><Trophy size={18} className="text-[#F59E0B]" /> Monthly Draw</h3>
              {stats.lastDraw ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[#64748B] text-[10px] font-800 uppercase tracking-widest">Current Month</span>
                    <span className="text-white font-800">{stats.lastDraw.month}/{stats.lastDraw.year}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[#64748B] text-[10px] font-800 uppercase tracking-widest">Pool Amount</span>
                    <span className="text-[#6EE7B7] font-800 text-lg">₹{stats.lastDraw.prize_pool_total?.toLocaleString()}</span>
                  </div>
                  <div className="pt-2">
                    <Link to="/admin/draws" className="premium-btn w-full py-4 text-sm flex items-center justify-center gap-2">Manage Draw <ChevronRight size={16} /></Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10"><p className="text-[#64748B] text-sm mb-6">No active draw found.</p><button onClick={seedSampleData} className="outline-btn w-full py-3 text-xs">Create Initial Draw</button></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
