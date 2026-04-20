import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Users, Trophy, Heart, TrendingUp, Settings, ChevronRight, Zap, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Stats {
  totalUsers: number
  activeSubscribers: number
  totalRaised: number
  pendingWinners: number
  lastDraw: any
}

const ADMIN_LINKS = [
  { to: '/admin/users', label: 'Manage Users', icon: <Users size={20} />, color: '#818CF8', desc: 'View, edit and manage all subscribers' },
  { to: '/admin/draws', label: 'Run Draw', icon: <Trophy size={20} />, color: '#F59E0B', desc: 'Configure and publish monthly draws' },
  { to: '/admin/charities', label: 'Manage Charities', icon: <Heart size={20} />, color: '#F87171', desc: 'CRUD charity partners' },
  { to: '/admin/winners', label: 'Verify Winners', icon: <Trophy size={20} />, color: '#6EE7B7', desc: 'Review and approve prize claims' },
  { to: '/admin/reports', label: 'Analytics', icon: <TrendingUp size={20} />, color: '#818CF8', desc: 'Revenue, charity and user reports' },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, activeSubscribers: 0, totalRaised: 0, pendingWinners: 0, lastDraw: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
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
    setLoading(false)
  }

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
            <Settings size={24} className="text-[#0A0A0F]" />
          </div>
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl">
              Admin Dashboard
            </motion.h1>
            <p className="text-[#64748B]">Golff Platform Control Panel</p>
          </div>
          <div className="ml-auto">
            <span className="badge-gold text-sm">🔧 Admin Mode</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: loading ? '...' : stats.totalUsers, icon: <Users size={20} />, color: '#818CF8' },
            { label: 'Active Subscribers', value: loading ? '...' : stats.activeSubscribers, icon: <Zap size={20} />, color: '#6EE7B7' },
            { label: 'Charity Raised', value: loading ? '...' : `₹${stats.totalRaised.toLocaleString('en-IN')}`, icon: <Heart size={20} />, color: '#F87171' },
            { label: 'Pending Winners', value: loading ? '...' : stats.pendingWinners, icon: <AlertCircle size={20} />, color: '#F59E0B' },
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
              <p className="font-grotesk font-800 text-3xl" style={{ color: stat.color }}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Test Mode Banner */}
        <div className="glass-card p-4 border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)] mb-8 flex items-center gap-3">
          <AlertCircle size={18} className="text-[#F59E0B] shrink-0" />
          <p className="text-[#F59E0B] text-sm"><span className="font-700">Stripe Test Mode Active</span> — Use card 4242 4242 4242 4242 for payments. No real money is charged.</p>
        </div>

        {/* Quick Actions */}
        <h2 className="font-syne font-700 text-xl mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {ADMIN_LINKS.map((link, i) => (
            <motion.div
              key={link.to}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={link.to}
                className="glass-card-hover p-6 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${link.color}15`, color: link.color }}>
                  {link.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-syne font-700 text-base">{link.label}</p>
                  <p className="text-[#64748B] text-xs truncate">{link.desc}</p>
                </div>
                <ChevronRight size={18} className="text-[#374151] group-hover:text-[#6EE7B7] transition-colors" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Last Draw Status */}
        {stats.lastDraw && (
          <div className="glass-card p-6">
            <h3 className="font-syne font-700 text-lg mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-[#F59E0B]" /> Last Draw Status
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Month', value: `${stats.lastDraw.month}/${stats.lastDraw.year}` },
                { label: 'Status', value: stats.lastDraw.status },
                { label: 'Prize Pool', value: `₹${stats.lastDraw.prize_pool_total?.toLocaleString('en-IN') || 0}` },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-[#64748B] text-xs mb-1">{s.label}</p>
                  <p className="font-600 capitalize">{s.value}</p>
                </div>
              ))}
            </div>
            {stats.lastDraw.status !== 'published' && (
              <Link to="/admin/draws" className="mt-4 inline-flex items-center gap-2 text-[#F59E0B] text-sm hover:text-white transition-colors">
                → Go to Draw Engine
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
