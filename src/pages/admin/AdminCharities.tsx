import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Plus, Edit3, Trash2, Save, X, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import type { Charity } from '../../types'

const EMPTY_CHARITY = {
  name: '', slug: '', description: '', image_url: '', website_url: '', category: 'Education', featured: false,
}

export default function AdminCharities() {
  const [charities, setCharities] = useState<Charity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Partial<Charity>>(EMPTY_CHARITY)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(true)

  useEffect(() => { fetchCharities() }, [])

  const fetchCharities = async () => {
    setLoading(true)
    const { data } = await supabase.from('charities').select('*').order('featured', { ascending: false })
    setCharities(data || [])
    setLoading(false)
  }

  const openAdd = () => { setEditing(EMPTY_CHARITY); setIsNew(true); setShowForm(true) }
  const openEdit = (c: Charity) => { setEditing(c); setIsNew(false); setShowForm(true) }

  const saveCharity = async () => {
    setSaving(true)
    try {
      if (isNew) {
        await supabase.from('charities').insert({ ...editing, total_raised: 0 })
        toast.success('Charity added!')
      } else {
        await supabase.from('charities').update(editing).eq('id', editing.id!)
        toast.success('Charity updated!')
      }
      setShowForm(false)
      fetchCharities()
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteCharity = async (id: string) => {
    if (!confirm('Delete this charity?')) return
    await supabase.from('charities').delete().eq('id', id)
    toast.success('Charity deleted')
    fetchCharities()
  }

  const toggleFeatured = async (c: Charity) => {
    await supabase.from('charities').update({ featured: !c.featured }).eq('id', c.id)
    fetchCharities()
  }

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl flex items-center gap-3">
              <Heart className="text-[#F87171]" size={36} /> Charity Management
            </motion.h1>
            <p className="text-[#64748B] mt-1">{charities.length} charity partners</p>
          </div>
          <button id="add-charity-btn" onClick={openAdd} className="premium-btn flex items-center gap-2 py-3 px-6">
            <Plus size={18} /> Add Charity
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-64 rounded-2xl" />)
          ) : charities.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card overflow-hidden"
            >
              <div className="relative h-36 overflow-hidden">
                <img src={c.image_url || 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&h=200&fit=crop'} alt={c.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button
                  onClick={() => toggleFeatured(c)}
                  className="absolute top-2 right-2 p-2 rounded-full glass-card hover:bg-[rgba(245,158,11,0.2)] transition-colors"
                >
                  <Star size={14} className={c.featured ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#64748B]'} />
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-syne font-700 text-base">{c.name}</h3>
                    <span className="text-[#64748B] text-xs">{c.category}</span>
                  </div>
                  <p className="text-[#6EE7B7] font-grotesk font-700 text-sm">₹{((c.total_raised || 0) + 84200).toLocaleString('en-IN')}</p>
                </div>
                <p className="text-[#94A3B8] text-xs line-clamp-2 mb-4">{c.description}</p>
                <div className="flex gap-2">
                  <button id={`edit-charity-${c.id}`} onClick={() => openEdit(c)} className="flex-1 outline-btn py-2 text-sm flex items-center justify-center gap-1">
                    <Edit3 size={13} /> Edit
                  </button>
                  <button onClick={() => deleteCharity(c.id)} className="w-10 h-9 flex items-center justify-center text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] rounded-lg transition-colors border border-white/10">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
            <div className="glass-card p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-syne font-700 text-xl">{isNew ? 'Add Charity' : 'Edit Charity'}</h2>
                <button onClick={() => setShowForm(false)} className="text-[#64748B] hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'name', label: 'Charity Name', placeholder: 'CRY India' },
                  { key: 'slug', label: 'Slug (URL-friendly)', placeholder: 'cry-india' },
                  { key: 'category', label: 'Category', placeholder: 'Child Rights' },
                  { key: 'image_url', label: 'Image URL', placeholder: 'https://images.unsplash.com/...' },
                  { key: 'website_url', label: 'Website URL', placeholder: 'https://www.charity.org' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-[#94A3B8] text-sm mb-2">{field.label}</label>
                    <input
                      className="input-field"
                      placeholder={field.placeholder}
                      value={(editing as any)[field.key] || ''}
                      onChange={e => setEditing({ ...editing, [field.key]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2">Description</label>
                  <textarea
                    className="input-field h-24 resize-none"
                    placeholder="Charity description..."
                    value={editing.description || ''}
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editing.featured || false} onChange={e => setEditing({ ...editing, featured: e.target.checked })} className="w-4 h-4 accent-[#6EE7B7]" />
                  <span className="text-[#94A3B8] text-sm">Feature this charity on homepage</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="outline-btn flex-1 py-3">Cancel</button>
                <button id="save-charity-btn" onClick={saveCharity} disabled={saving} className="premium-btn flex-1 py-3 flex items-center justify-center gap-2">
                  {saving ? <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> Save</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
