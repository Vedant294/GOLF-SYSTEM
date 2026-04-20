import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Target, PlusCircle, AlertTriangle, Calendar, Trophy, TrendingUp, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO, isAfter } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { Score } from '../types'

export default function Scores() {
  const user = useAuthStore((s) => s.user)
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newScore, setNewScore] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [confirmReplace, setConfirmReplace] = useState<Score | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    if (user) fetchScores()
  }, [user])

  const fetchScores = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setScores(data || [])
    ensureDrawEntry(data || [])
    setLoading(false)
  }

  const ensureDrawEntry = async (currentScores: Score[]) => {
    if (!user) return
    try {
      const now = new Date()
      const { data: draw } = await supabase
        .from('draws')
        .select('id')
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear())
        .maybeSingle()

      if (!draw) return

      if (currentScores.length < 5) {
        // PRD §08: If less than 5 scores, remove entry for this month
        await supabase.from('draw_entries').delete().eq('draw_id', draw.id).eq('user_id', user.id)
        return
      }

      const numbers = currentScores.map(s => s.score)
      const { data: existing } = await supabase
        .from('draw_entries')
        .select('id')
        .eq('draw_id', draw.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        await supabase.from('draw_entries').update({ user_numbers: numbers }).eq('id', existing.id)
      } else {
        await supabase.from('draw_entries').insert({
          draw_id: draw.id,
          user_id: user.id,
          user_numbers: numbers
        })
      }
    } catch (err) {
      console.error('Draw entry sync failed:', err)
    }
  }

  const validateScore = () => {
    const s = parseInt(newScore)
    if (isNaN(s) || s < 1 || s > 45) {
      toast.error('Score must be between 1 and 45 (Stableford)')
      return false
    }
    if (isAfter(parseISO(newDate), new Date())) {
      toast.error('Cannot enter future dates')
      return false
    }
    return true
  }

  const handleAdd = async () => {
    if (!validateScore()) return
    if (!user) return

    // PRD §05: If already 5 scores, show confirmation dialog
    if (scores.length >= 5) {
      setConfirmReplace(scores[scores.length - 1])
      return
    }

    await doAdd()
  }

  const doAdd = async () => {
    setAdding(true)
    try {
      if (confirmReplace) {
        await supabase.from('scores').delete().eq('id', confirmReplace.id)
      }

      const { error } = await supabase.from('scores').insert({
        user_id: user!.id,
        score: parseInt(newScore),
        played_date: newDate,
      })

      if (error) throw error
      toast.success('Score added! Your oldest score was replaced.')
      setNewScore('')
      setNewDate(format(new Date(), 'yyyy-MM-dd'))
      setConfirmReplace(null)
      fetchScores()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add score')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (scoreId: string) => {
    const { error } = await supabase.from('scores').delete().eq('id', scoreId)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Score removed')
    fetchScores()
  }

  const isSubscriptionActive = user?.subscription_status === 'active'
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        {/* Header */}
        <div className="mb-8">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-2 flex items-center gap-3">
            <Target className="text-[#818CF8]" size={36} /> My Scores
          </motion.h1>
          <p className="text-[#64748B]">Your last 5 Stableford scores — these become your draw numbers.</p>
        </div>

        {/* Subscription Gate */}
        {!isSubscriptionActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.05)] mb-8"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-[#F87171]" />
              <div>
                <p className="font-syne font-700 text-[#F87171]">Subscription Required</p>
                <p className="text-[#94A3B8] text-sm">You need an active subscription to enter scores.</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Score Entry */}
          <div className="lg:col-span-2">
            {isSubscriptionActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 mb-6"
              >
                <h2 className="font-syne font-700 text-lg mb-5 flex items-center gap-2">
                  <PlusCircle size={20} className="text-[#6EE7B7]" /> Add New Score
                </h2>

                {/* Big Number Pad */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="block text-[#94A3B8] text-sm font-500 mb-2">Stableford Score (1–45)</label>
                    <input
                      id="score-input"
                      type="number"
                      min={1} max={45}
                      value={newScore}
                      onChange={e => setNewScore(e.target.value)}
                      className="input-field text-3xl font-grotesk font-700 text-center h-20"
                      placeholder="32"
                    />
                  </div>
                  <div>
                    <label className="block text-[#94A3B8] text-sm font-500 mb-2">Date Played</label>
                    <input
                      id="date-input"
                      type="date"
                      value={newDate}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={e => setNewDate(e.target.value)}
                      className="input-field h-20 text-center font-grotesk"
                    />
                  </div>
                </div>

                {/* Mobile Number Pad */}
                <div className="grid grid-cols-3 gap-2 mb-5 md:hidden">
                  {[1,2,3,4,5,6,7,8,9,'',0,'←'].map((btn, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (btn === '←') setNewScore(String(newScore).slice(0, -1))
                        else if (btn !== '') setNewScore(prev => String(prev) + String(btn))
                      }}
                      className="h-14 rounded-xl bg-[rgba(26,26,46,0.8)] border border-white/10 font-grotesk font-600 text-xl text-white hover:bg-[rgba(110,231,183,0.1)] transition-colors"
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                {scores.length >= 5 && (
                  <div className="flex items-start gap-2 text-[#F59E0B] text-sm mb-4 p-3 bg-[rgba(245,158,11,0.08)] rounded-xl">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <span>You have 5 scores. Adding this will replace your oldest score: <strong>{scores[scores.length - 1]?.score}</strong> on {scores[scores.length - 1] ? format(parseISO(scores[scores.length - 1].played_date), 'dd MMM') : ''}.</span>
                  </div>
                )}

                <button
                  id="add-score-btn"
                  onClick={handleAdd}
                  disabled={!newScore || adding}
                  className="premium-btn w-full py-3.5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {adding ? <span className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : 'Add Score'}
                </button>

                {/* Confirm Replace Dialog */}
                <AnimatePresence>
                  {confirmReplace && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
                    >
                      <div className="glass-card p-8 max-w-sm w-full text-center">
                        <AlertTriangle size={40} className="text-[#F59E0B] mx-auto mb-4" />
                        <h3 className="font-syne font-700 text-xl mb-2">Replace Oldest Score?</h3>
                        <p className="text-[#94A3B8] text-sm mb-6">
                          This will remove score <strong className="text-white">{confirmReplace.score}</strong> ({format(parseISO(confirmReplace.played_date), 'dd MMM yyyy')}) to make room for your new score.
                        </p>
                        <div className="flex gap-3">
                          <button onClick={() => setConfirmReplace(null)} className="outline-btn flex-1">Cancel</button>
                          <button onClick={doAdd} disabled={adding} className="premium-btn flex-1">
                            {adding ? <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin mx-auto" /> : 'Confirm'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Scores List */}
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h2 className="font-syne font-700 text-lg">Your Draw Numbers</h2>
                <p className="text-[#64748B] text-sm">These 5 scores are your entries for this month's draw.</p>
              </div>
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
                </div>
              ) : scores.length === 0 ? (
                <div className="p-12 text-center">
                  <Target size={48} className="text-[#374151] mx-auto mb-4" />
                  <p className="text-[#64748B] font-inter">No scores yet. Add your first score above!</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {scores.map((score, i) => (
                    <motion.div
                      key={score.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 hover:bg-white/2 transition-colors"
                    >
                      {/* Score Ball */}
                      <div className="draw-ball text-sm w-12 h-12" style={{ fontSize: '18px' }}>
                        {score.score}
                      </div>
                      <div className="flex-1">
                        <p className="font-grotesk font-700 text-lg text-white">{score.score} points</p>
                        <p className="text-[#64748B] text-sm flex items-center gap-1.5">
                          <Calendar size={13} /> {format(parseISO(score.played_date), 'EEEE, dd MMM yyyy')}
                        </p>
                      </div>
                      {i === 0 && <span className="badge-active text-xs">Latest</span>}
                      {i === scores.length - 1 && scores.length === 5 && (
                        <span className="badge-inactive text-xs">Oldest</span>
                      )}
                      {isSubscriptionActive && (
                        <button
                          onClick={() => handleDelete(score.id)}
                          className="text-[#374151] hover:text-[#F87171] transition-colors p-2"
                        >
                          ✕
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6"
            >
              <p className="text-[#64748B] text-xs uppercase tracking-widest mb-3">Average Score</p>
              <p className="font-grotesk font-800 text-4xl text-[#6EE7B7]">{avgScore || '—'}</p>
              <p className="text-[#64748B] text-sm mt-1">Stableford points</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card p-6"
            >
              <p className="text-[#64748B] text-xs uppercase tracking-widest mb-3">Scores Entered</p>
              <p className="font-grotesk font-800 text-4xl text-[#818CF8]">{scores.length}<span className="text-[#374151] text-xl">/5</span></p>
              <div className="prize-bar mt-3">
                <div className="prize-bar-fill" style={{ width: `${(scores.length / 5) * 100}%` }} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5"
            >
              <p className="text-[#64748B] text-xs font-600 flex items-center gap-2 mb-3">
                <Info size={14} /> How Draws Work
              </p>
              <ul className="space-y-2 text-[#94A3B8] text-xs leading-relaxed">
                <li>• Your 5 scores = your 5 draw numbers</li>
                <li>• Match 3 numbers → win 25% of pool</li>
                <li>• Match 4 numbers → win 35% of pool</li>
                <li>• Match all 5 → win jackpot (40%+)</li>
                <li>• Jackpot rolls over each month</li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-5"
            >
              <p className="text-[#64748B] text-xs font-600 flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-[#6EE7B7]" /> Score History
              </p>
              {scores.length > 0 ? (
                <div className="flex items-end gap-2 h-20">
                  {scores.slice().reverse().map((s, i) => (
                    <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(s.score / 45) * 60}px`,
                          background: `linear-gradient(180deg, #6EE7B7, #3B82F6)`,
                          opacity: 0.7 + i * 0.06,
                        }}
                      />
                      <span className="text-[#64748B] text-xs">{s.score}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#374151] text-xs">No scores yet</p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
