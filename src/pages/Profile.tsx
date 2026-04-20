import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Settings, CreditCard, Heart, Save, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { Charity } from '../types'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [charity, setCharity] = useState<Charity | null>(null)
  const [charityPct, setCharityPct] = useState(user?.charity_contribution_pct || 10)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'charity'>('profile')

  useEffect(() => {
    if (user?.charity_id) {
      supabase.from('charities').select('*').eq('id', user.charity_id).single().then(({ data }) => setCharity(data))
    }
    setCharityPct(user?.charity_contribution_pct || 10)
    setFullName(user?.full_name || '')
  }, [user])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      charity_contribution_pct: charityPct,
    }).eq('id', user.id)
    if (error) { toast.error('Failed to save'); setSaving(false); return }
    await refreshUser()
    toast.success('Profile updated!')
    setSaving(false)
  }

  const cancelSubscription = async () => {
    if (!confirm('Cancel your subscription? You can reactivate anytime.')) return
    if (!user?.stripe_customer_id) {
      toast.error('No active Stripe subscription found')
      return
    }
    try {
      // Create Stripe Customer Portal session for self-service cancellation
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId: user.stripe_customer_id,
          returnUrl: `${appUrl}/profile`,
        },
      })
      if (error || !data?.url) throw new Error('Could not create portal session')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message || 'Failed to open subscription portal')
    }
  }

  if (!user) return null

  const TABS = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'subscription', label: 'Subscription', icon: <CreditCard size={16} /> },
    { id: 'charity', label: 'Charity', icon: <Heart size={16} /> },
  ] as const

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-8 flex items-center gap-3">
          <Settings className="text-[#818CF8]" size={36} /> Account Settings
        </motion.h1>

        {/* Avatar */}
        <div className="glass-card p-6 mb-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6EE7B7] to-[#818CF8] flex items-center justify-center font-syne font-800 text-3xl text-[#0A0A0F]">
            {user.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-syne font-700 text-xl">{user.full_name}</h2>
            <p className="text-[#64748B] text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {user.role === 'admin' && <span className="badge-gold text-xs">Admin</span>}
              {user.subscription_status === 'active' ? <span className="badge-active text-xs">Active</span> : <span className="badge-inactive text-xs">{user.subscription_status}</span>}
              {user.subscription_plan && <span className="badge-accent text-xs capitalize">{user.subscription_plan}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 mb-6 gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 font-inter text-sm font-500 border-b-2 transition-all ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="max-w-xl">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-5">
              <div>
                <label className="block text-[#94A3B8] text-sm font-500 mb-2">Full Name</label>
                <input
                  id="profile-name"
                  className="input-field"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm font-500 mb-2">Email Address</label>
                <input className="input-field opacity-60" value={user.email} disabled />
                <p className="text-[#64748B] text-xs mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-[#94A3B8] text-sm font-500 mb-2">Account Role</label>
                <input className="input-field opacity-60 capitalize" value={user.role} disabled />
              </div>
              <button
                id="save-profile-btn"
                onClick={saveProfile}
                disabled={saving}
                className="premium-btn w-full py-3 flex items-center justify-center gap-2"
              >
                {saving ? <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Save Changes</>}
              </button>
            </motion.div>
          )}

          {activeTab === 'subscription' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="glass-card p-6">
                <h3 className="font-syne font-700 text-base mb-5">Subscription Details</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Plan', value: user.subscription_plan ? `${user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)} — ₹${user.subscription_plan === 'monthly' ? '499/mo' : '4,999/yr'}` : '—' },
                    { label: 'Status', value: user.subscription_status },
                    { label: 'Start Date', value: user.subscription_start ? format(parseISO(user.subscription_start), 'dd MMM yyyy') : '—' },
                    { label: 'Next Renewal', value: user.subscription_end ? format(parseISO(user.subscription_end), 'dd MMM yyyy') : '—' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-3 border-b border-white/5">
                      <span className="text-[#64748B] text-sm">{item.label}</span>
                      <span className="font-500 text-sm capitalize">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {user.subscription_status === 'active' && (
                <button onClick={cancelSubscription} className="outline-btn w-full py-3 text-[#F87171] border-[rgba(248,113,113,0.3)] hover:bg-[rgba(248,113,113,0.05)]">
                  Cancel Subscription
                </button>
              )}
              {user.subscription_status !== 'active' && (
                <Link to="/signup" className="premium-btn block text-center py-3">Reactivate Subscription</Link>
              )}
            </motion.div>
          )}

          {activeTab === 'charity' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {charity && (
                <div className="glass-card overflow-hidden">
                  <img src={charity.image_url} alt={charity.name} className="w-full h-32 object-cover" />
                  <div className="p-5">
                    <span className="badge-accent text-xs">{charity.category}</span>
                    <h3 className="font-syne font-700 text-lg mt-2">{charity.name}</h3>
                    <p className="text-[#94A3B8] text-sm mt-1">{charity.description}</p>
                    {charity.website_url && (
                      <a href={charity.website_url} target="_blank" rel="noopener noreferrer" className="text-[#6EE7B7] text-sm mt-2 inline-block hover:underline">Visit Website →</a>
                    )}
                  </div>
                </div>
              )}
              
              <div className="glass-card p-6">
                <h3 className="font-syne font-700 text-base mb-4">Charity Contribution</h3>
                <label className="block text-[#94A3B8] text-sm mb-3">
                  Monthly donation: <span className="text-[#6EE7B7] font-700">{charityPct}%</span>
                  <span className="text-[#64748B] ml-2 text-xs">
                    (₹{Math.round((user.subscription_plan === 'yearly' ? 416 : 499) * charityPct / 100)}/month)
                  </span>
                </label>
                <input
                  type="range" min={10} max={50} step={5}
                  value={charityPct}
                  onChange={e => setCharityPct(Number(e.target.value))}
                  className="w-full accent-[#6EE7B7] mb-2"
                />
                <div className="flex justify-between text-[#64748B] text-xs mb-5">
                  <span>10% (min)</span><span>50% (max)</span>
                </div>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="premium-btn w-full py-3 flex items-center justify-center gap-2"
                >
                  {saving ? <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Update Contribution</>}
                </button>
              </div>

              <div className="glass-card p-5">
                <p className="text-[#64748B] text-sm flex items-center gap-2">
                  <Heart size={14} className="text-[#F87171]" /> 
                  You can change your charity partner once per month. Contact support to switch.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
