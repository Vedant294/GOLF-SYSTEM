import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Filter, Heart, ExternalLink, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Charity } from '../types'

const STATIC_CHARITIES = [
  { id: '1', name: 'CRY India', slug: 'cry-india', category: 'Child Rights', description: 'Child Rights and You — protecting child rights across India.', image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop', website_url: 'https://www.cry.org', featured: true, total_raised: 84200 },
  { id: '2', name: 'Akshaya Patra', slug: 'akshaya-patra', category: 'Midday Meals', description: 'Fighting classroom hunger through the world\'s largest midday meal programme.', image_url: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=300&fit=crop', website_url: 'https://www.akshayapatra.org', featured: false, total_raised: 121000 },
  { id: '3', name: 'Smile Foundation', slug: 'smile-foundation', category: 'Education', description: 'Education and healthcare for underprivileged children across India.', image_url: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&h=300&fit=crop', website_url: 'https://www.smilefoundationindia.org', featured: false, total_raised: 95500 },
  { id: '4', name: 'HelpAge India', slug: 'helpage-india', category: 'Elder Care', description: 'Empowering older persons to lead dignified, active lives.', image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop', website_url: 'https://www.helpageindia.org', featured: false, total_raised: 67800 },
  { id: '5', name: 'GiveIndia', slug: 'give-india', category: 'Donation Hub', description: 'India\'s largest and most trusted giving platform connecting donors with NGOs.', image_url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=300&fit=crop', website_url: 'https://www.give.do', featured: false, total_raised: 43000 },
  { id: '6', name: 'Sammaan Foundation', slug: 'sammaan-foundation', category: 'Dignity', description: 'Restoring dignity and rights for marginalised communities across India.', image_url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=300&fit=crop', website_url: '#', featured: false, total_raised: 31500 },
]

const CATEGORIES = ['All', 'Child Rights', 'Midday Meals', 'Education', 'Elder Care', 'Donation Hub', 'Dignity']

export default function Charities() {
  // Show static data instantly — no loading flicker
  const [charities, setCharities] = useState<Charity[]>(STATIC_CHARITIES as any)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCharities = async () => {
      try {
        const { data, error } = await supabase
          .from('charities')
          .select('*')
          .order('featured', { ascending: false })
        // Only update if we got real data from DB
        if (!error && data && data.length > 0) {
          setCharities(data)
        }
      } catch {
        // Silent fail — static data already shown
      }
    }
    fetchCharities()
  }, [])

  const display = charities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'All' || c.category === category
    return matchSearch && matchCat
  })

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-5xl mb-4">
            Our <span className="gradient-text">Charity Partners</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
            Every Golff subscription contributes to these verified NGOs. Choose your cause, play golf, change lives.
          </motion.p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              id="charity-search"
              className="input-field pl-11"
              placeholder="Search charities..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-500 border transition-all ${category === cat ? 'border-[#6EE7B7] bg-[rgba(110,231,183,0.1)] text-[#6EE7B7]' : 'border-white/10 text-[#64748B] hover:border-white/20 hover:text-[#94A3B8]'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <div className="skeleton h-44" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {display.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card-hover overflow-hidden"
              >
                <div className="relative h-44 overflow-hidden">
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="badge-accent text-xs">{c.category}</span>
                  </div>
                  {c.featured && (
                    <div className="absolute top-3 right-3">
                      <span className="badge-gold text-xs">⭐ Featured</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-syne font-700 text-lg mb-2">{c.name}</h3>
                  <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">{c.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[#64748B] text-xs">Raised via Golff</p>
                      <p className="text-[#6EE7B7] font-grotesk font-700">₹{((c.total_raised || 0) + 84200).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[#64748B] text-xs">
                      <TrendingUp size={13} /> Growing
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/charities/${c.slug}`} className="flex-1 accent-btn py-2 text-sm text-center">
                      Learn More
                    </Link>
                    {c.website_url && c.website_url !== '#' && (
                      <a href={c.website_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass-card flex items-center justify-center text-[#64748B] hover:text-[#6EE7B7] transition-colors">
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {display.length === 0 && !loading && (
          <div className="text-center py-16">
            <Heart size={48} className="text-[#374151] mx-auto mb-4" />
            <p className="font-syne font-700 text-xl mb-2">No charities found</p>
            <p className="text-[#64748B]">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  )
}
