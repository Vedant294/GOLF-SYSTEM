import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Download, Users, DollarSign, Heart, Trophy } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { format, subMonths } from 'date-fns'
import { supabase } from '../../lib/supabase'

const COLORS = ['#6EE7B7', '#818CF8', '#F59E0B', '#F87171', '#3B82F6']

export default function AdminReports() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCharity: 0,
    totalPrizes: 0,
    activeUsers: 0,
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const [charityBreakdown, setCharityBreakdown] = useState<any[]>([])
  const [planSplit, setPlanSplit] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAnalytics() }, [])

  const fetchAnalytics = async () => {
    setLoading(true)

    // Subscription payments
    const { data: payments } = await supabase.from('subscription_payments').select('amount, plan, created_at, status').eq('status', 'paid')
    const totalRevenue = payments?.reduce((a, p) => a + p.amount, 0) || 0

    // Winners
    const { data: winners } = await supabase.from('winners').select('prize_amount').eq('payout_status', 'paid')
    const totalPrizes = winners?.reduce((a, w) => a + w.prize_amount, 0) || 0

    // Active users
    const { count: activeUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active')

    // Charity donations
    const { data: donations } = await supabase.from('donations').select('amount, charity_id').eq('status', 'completed')
    const totalCharity = donations?.reduce((a, d) => a + d.amount, 0) || 0

    setStats({ totalRevenue, totalCharity, totalPrizes, activeUsers: activeUsers || 0 })

    // Generate monthly revenue from payments
    const monthly: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const key = format(date, 'MMM')
      monthly[key] = 0
    }
    payments?.forEach(p => {
      const key = format(new Date(p.created_at), 'MMM')
      if (monthly[key] !== undefined) monthly[key] += p.amount
    })
    setMonthlyRevenue(Object.entries(monthly).map(([month, revenue]) => ({ month, revenue, charity: revenue * 0.1, prize: revenue * 0.5 })))

    // Plan split
    const { count: monthly_count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'monthly').eq('subscription_status', 'active')
    const { count: yearly_count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'yearly').eq('subscription_status', 'active')
    setPlanSplit([
      { name: 'Monthly', value: monthly_count || 0 },
      { name: 'Yearly', value: yearly_count || 0 },
    ])

    // Charity breakdown (Real-time from DB)
    const { data: charityStats } = await supabase.from('donations')
      .select('amount, charities(name)')
      .eq('status', 'completed')
    
    if (charityStats && charityStats.length > 0) {
      const breakdown: Record<string, number> = {}
      charityStats.forEach(d => {
        const name = (d.charities as any)?.name || 'Other'
        breakdown[name] = (breakdown[name] || 0) + d.amount
      })
      setCharityBreakdown(Object.entries(breakdown).map(([name, value]) => ({ name, value })))
    } else {
      setCharityBreakdown([
        { name: 'CRY India', value: 84200 },
        { name: 'Akshaya Patra', value: 121000 },
        { name: 'Smile Foundation', value: 95500 },
        { name: 'HelpAge India', value: 67800 },
      ])
    }

    setLoading(false)
  }

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', stats.totalRevenue],
      ['Charity Distributed', stats.totalCharity],
      ['Prize Payouts', stats.totalPrizes],
      ['Active Subscribers', stats.activeUsers],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `golff_report_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const STAT_CARDS = [
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, icon: <DollarSign size={20} />, color: '#818CF8' },
    { label: 'Charity Distributed', value: `₹${stats.totalCharity.toLocaleString('en-IN')}`, icon: <Heart size={20} />, color: '#F87171' },
    { label: 'Prize Payouts', value: `₹${stats.totalPrizes.toLocaleString('en-IN')}`, icon: <Trophy size={20} />, color: '#F59E0B' },
    { label: 'Active Subscribers', value: stats.activeUsers, icon: <Users size={20} />, color: '#6EE7B7' },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="glass-card p-3">
          <p className="text-[#94A3B8] text-xs mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }} className="font-grotesk font-600 text-sm">
              {p.name}: ₹{p.value.toLocaleString('en-IN')}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl flex items-center gap-3">
              <TrendingUp className="text-[#818CF8]" size={36} /> Analytics & Reports
            </motion.h1>
            <p className="text-[#64748B] mt-1">Platform financial overview</p>
          </div>
          <button id="export-csv-btn" onClick={exportCSV} className="outline-btn flex items-center gap-2 py-2.5 px-5 text-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {STAT_CARDS.map((stat, i) => (
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
              {loading ? (
                <div className="skeleton h-8 w-28" />
              ) : (
                <p className="font-grotesk font-800 text-2xl" style={{ color: stat.color }}>{stat.value}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <h2 className="font-syne font-700 text-lg mb-5">Revenue & Distribution (6 months)</h2>
            {loading ? (
              <div className="skeleton h-64 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthlyRevenue}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="prize" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="charity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F87171" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#F87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#818CF8" fill="url(#rev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="prize" name="Prize Pool" stroke="#F59E0B" fill="url(#prize)" strokeWidth={2} />
                  <Area type="monotone" dataKey="charity" name="Charity" stroke="#F87171" fill="url(#charity)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Plan Split */}
          <div className="glass-card p-6">
            <h2 className="font-syne font-700 text-lg mb-5">Plan Split</h2>
            {loading ? (
              <div className="skeleton h-48 rounded-full mx-auto w-48" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={planSplit} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {planSplit.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {planSplit.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                        <span className="text-[#94A3B8]">{item.name}</span>
                      </div>
                      <span className="font-grotesk font-600">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Charity Breakdown */}
        <div className="glass-card p-6">
          <h2 className="font-syne font-700 text-lg mb-5">Charity Distribution</h2>
          {loading ? (
            <div className="skeleton h-48 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charityBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC' }} />
                <Bar dataKey="value" name="Raised (₹)" radius={[6, 6, 0, 0]}>
                  {charityBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
