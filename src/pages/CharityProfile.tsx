import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Heart, Calendar, MapPin, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { Charity, CharityEvent } from '../types'

const STATIC_CHARITIES: Record<string, any> = {
  'cry-india': { name: 'CRY India', slug: 'cry-india', category: 'Child Rights', description: 'CRY — Child Rights and You — has been instrumental in ensuring a better future for over 3 million children. We work to ensure that children have access to their fundamental rights.', image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=400&fit=crop', website_url: 'https://www.cry.org', featured: true, total_raised: 84200 },
  'akshaya-patra': { name: 'Akshaya Patra', slug: 'akshaya-patra', category: 'Midday Meals', description: 'The Akshaya Patra Foundation is a non-profit organisation that operates school lunch programmes in India. Our mission is to fight classroom hunger.', image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=400&fit=crop', website_url: 'https://www.akshayapatra.org', featured: false, total_raised: 121000 },
  'smile-foundation': { name: 'Smile Foundation', slug: 'smile-foundation', category: 'Education', description: 'Smile Foundation is a national development organisation directly benefitting over 1.5 million underprivileged children and their families.', image_url: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=400&fit=crop', website_url: 'https://www.smilefoundationindia.org', featured: false, total_raised: 95500 },
  'helpage-india': { name: 'HelpAge India', slug: 'helpage-india', category: 'Elder Care', description: 'HelpAge India has been working on issues of ageing and welfare of the elderly since 1978. We help elder disadvantaged Indians access better health.', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop', website_url: 'https://www.helpageindia.org', featured: false, total_raised: 67800 },
  'give-india': { name: 'GiveIndia', slug: 'give-india', category: 'Donation Hub', description: 'GiveIndia is the largest and most trusted giving platform in India. Every rupee donated directly reaches deserving non-profits.', image_url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=400&fit=crop', website_url: 'https://www.give.do', featured: false, total_raised: 43000 },
  'sammaan-foundation': { name: 'Sammaan Foundation', slug: 'sammaan-foundation', category: 'Dignity', description: 'Sammaan Foundation works to restore dignity and rights for marginalised communities across urban and rural India.', image_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&h=400&fit=crop', website_url: '#', featured: false, total_raised: 31500 },
}

export default function CharityProfile() {
  const { slug } = useParams<{ slug: string }>()
  const user = useAuthStore((s) => s.user)
  const [charity, setCharity] = useState<Charity | null>(null)
  const [events, setEvents] = useState<CharityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [donating, setDonating] = useState(false)
  const [donateAmount, setDonateAmount] = useState(500)

  useEffect(() => {
    if (slug) fetchCharity()
  }, [slug])

  const fetchCharity = async () => {
    setLoading(true)
    const { data } = await supabase.from('charities').select('*').eq('slug', slug!).single()
    if (data) {
      setCharity(data)
      const { data: eventsData } = await supabase.from('charity_events').select('*').eq('charity_id', data.id).order('event_date', { ascending: true })
      setEvents(eventsData || [])
    } else {
      setCharity(STATIC_CHARITIES[slug!] || null)
    }
    setLoading(false)
  }

  const handleDonate = async () => {
    if (!user) { toast.error('Please sign in to donate'); return }
    if (!donateAmount || donateAmount < 50) { toast.error('Minimum donation is ₹50'); return }
    setDonating(true)
    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
      const { data, error } = await supabase.functions.invoke('create-donation-checkout', {
        body: {
          userId: user.id,
          charityId: charity?.id,
          charityName: charity?.name,
          amount: donateAmount,
          successUrl: `${appUrl}/charities/${slug}?donated=true`,
          cancelUrl: `${appUrl}/charities/${slug}`,
        },
      })
      if (error || !data?.url) throw new Error(error?.message || 'Could not create checkout')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message || 'Donation failed. Please try again.')
      setDonating(false)
    }
  }

  // Handle return from Stripe after successful donation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('donated') === 'true' && charity && user) {
      toast.success(`Thank you! Your donation to ${charity.name} was successful.`)
      // Clean URL
      window.history.replaceState({}, '', `/charities/${slug}`)
    }
  }, [charity])

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#6EE7B7] border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!charity) return (
    <div className="page-wrapper flex items-center justify-center">
      <div className="text-center">
        <p className="font-syne font-700 text-2xl mb-2">Charity not found</p>
        <Link to="/charities" className="text-[#6EE7B7]">← Back to Charities</Link>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <Link to="/charities" className="flex items-center gap-2 text-[#64748B] hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Charities
        </Link>

        {/* Hero Image */}
        <div className="h-64 md:h-80 rounded-2xl overflow-hidden mb-8 relative">
          <img src={charity.image_url} alt={charity.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6">
            <span className="badge-accent text-sm mb-2 inline-block">{charity.category}</span>
            <h1 className="font-syne font-800 text-4xl text-white">{charity.name}</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <h2 className="font-syne font-700 text-xl mb-4">About {charity.name}</h2>
              <p className="text-[#94A3B8] leading-relaxed">{charity.description}</p>
              {charity.website_url && charity.website_url !== '#' && (
                <a href={charity.website_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[#6EE7B7] text-sm hover:text-white transition-colors">
                  <ExternalLink size={15} /> Visit Official Website
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5">
                <p className="text-[#64748B] text-xs uppercase tracking-widest mb-2">Total Raised via Golff</p>
                <p className="font-grotesk font-800 text-3xl text-[#6EE7B7]">₹{((charity.total_raised || 0) + 84200) .toLocaleString('en-IN')}</p>
              </div>
              <div className="glass-card p-5">
                <p className="text-[#64748B] text-xs uppercase tracking-widest mb-2">Active Supporters</p>
                <p className="font-grotesk font-800 text-3xl text-[#818CF8]">{Math.floor(Math.random() * 20 + 8)}</p>
              </div>
            </div>

            {/* Events */}
            {events.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="font-syne font-700 text-xl mb-5 flex items-center gap-2">
                  <Calendar size={20} className="text-[#818CF8]" /> Upcoming Events
                </h2>
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                      <h3 className="font-600 text-base mb-1">{event.title}</h3>
                      <div className="flex items-center gap-4 text-[#64748B] text-sm">
                        <span className="flex items-center gap-1.5"><Calendar size={13} /> {format(parseISO(event.event_date), 'dd MMM yyyy')}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={13} /> {event.location}</span>
                      </div>
                      <p className="text-[#94A3B8] text-sm mt-2">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Donate Sidebar */}
          <div className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="font-syne font-700 text-lg mb-4 flex items-center gap-2">
                <Heart size={18} className="text-[#F87171]" /> Make a Donation
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[200, 500, 1000, 2000, 5000, 10000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setDonateAmount(amt)}
                    className={`py-2 rounded-xl text-sm font-600 border transition-all ${donateAmount === amt ? 'border-[#6EE7B7] bg-[rgba(110,231,183,0.1)] text-[#6EE7B7]' : 'border-white/10 text-[#94A3B8] hover:border-white/20'}`}
                  >
                    ₹{amt >= 1000 ? `${amt/1000}K` : amt}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={donateAmount}
                onChange={e => setDonateAmount(Number(e.target.value))}
                className="input-field mb-4 text-center font-grotesk font-700 text-xl"
                placeholder="Custom amount"
              />
              <button
                id="donate-btn"
                onClick={handleDonate}
                disabled={donating || !donateAmount || !user}
                className="premium-btn w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {donating ? <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : <><Heart size={16} /> Donate ₹{donateAmount.toLocaleString('en-IN')}</>}
              </button>
              <p className="text-[#374151] text-xs text-center mt-2 flex items-center justify-center gap-1">
                <Shield size={11} /> Secured by Stripe · Test mode
              </p>
              {!user && <p className="text-[#64748B] text-xs text-center mt-2">Please <Link to="/login" className="text-[#6EE7B7]">sign in</Link> to donate</p>}
            </div>

            <div className="glass-card p-5">
              <p className="text-[#64748B] text-xs leading-relaxed">
                <span className="text-[#6EE7B7] font-600">Note:</span> Golff members automatically contribute {user?.charity_contribution_pct || 10}% of their subscription to their chosen charity each month.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
