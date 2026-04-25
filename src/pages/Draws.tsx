import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { History, Trophy, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useAuthStore } from '../store/useAuthStore'
import type { Draw, DrawEntry } from '../types'

interface DrawWithEntry extends Draw {
  entry?: DrawEntry
}

export default function Draws() {
  const user = useAuthStore((s) => s.user)
  const [draws, setDraws] = useState<DrawWithEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DrawWithEntry | null>(null)
  const [revealIndex, setRevealIndex] = useState(-1)

  useEffect(() => {
    if (user) fetchDraws()
  }, [user])

  const fetchDraws = async () => {
    setLoading(true)
    try {
      const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      const sessionData = storageKey ? JSON.parse(localStorage.getItem(storageKey) || '{}') : null
      const accessToken = sessionData?.access_token

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

      const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      const drawRes = await fetch(
        `${SUPABASE_URL}/rest/v1/draws?status=eq.published&order=created_at.desc&select=*`,
        { headers }
      )
      const drawData = await drawRes.json()

      if (Array.isArray(drawData) && drawData.length > 0) {
        const enriched = await Promise.all(
          drawData.map(async (draw) => {
            const entryRes = await fetch(
              `${SUPABASE_URL}/rest/v1/draw_entries?draw_id=eq.${draw.id}&user_id=eq.${user!.id}&select=*`,
              { headers }
            )
            const entries = await entryRes.json()
            return { ...draw, entry: entries?.[0] || undefined }
          })
        )
        setDraws(enriched)
      } else {
        setDraws([])
      }
    } catch (e) {
      console.error('Draws fetch error:', e)
      setDraws([])
    } finally {
      setLoading(false)
    }
  }

  const openDraw = (draw: DrawWithEntry) => {
    setSelected(draw)
    setRevealIndex(-1)
    if (draw.drawn_numbers) {
      draw.drawn_numbers.forEach((_, i) => {
        setTimeout(() => setRevealIndex(i), i * 400 + 200)
      })
    }
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-2 flex items-center gap-3">
          <History className="text-[#818CF8]" size={36} /> Draw History
        </motion.h1>
        <p className="text-[#64748B] mb-8">All published monthly draws — click to see results.</p>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={40} className="text-[#6EE7B7] animate-spin" />
          </div>
        ) : draws.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <History size={48} className="text-[#374151] mx-auto mb-4" />
            <p className="font-syne font-700 text-xl mb-2">No Draws Yet</p>
            <p className="text-[#64748B]">The first monthly draw will be published at the end of the month.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {draws.map((draw, i) => (
              <motion.div
                key={draw.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => openDraw(draw)}
                className="glass-card-hover p-6 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-syne font-700 text-lg">{MONTH_NAMES[draw.month - 1]} {draw.year}</p>
                    <p className="text-[#64748B] text-xs capitalize">{draw.draw_mode} mode</p>
                  </div>
                  {draw.entry ? (
                    draw.entry.match_count >= 3
                      ? <div className="w-10 h-10 rounded-full bg-[rgba(110,231,183,0.2)] flex items-center justify-center">
                          <Trophy size={18} className="text-[#F59E0B]" />
                        </div>
                      : <div className="w-10 h-10 rounded-full bg-[rgba(248,113,113,0.1)] flex items-center justify-center">
                          <XCircle size={18} className="text-[#374151]" />
                        </div>
                  ) : null}
                </div>

                {/* Winning numbers preview */}
                {draw.drawn_numbers && (
                  <div className="flex gap-2 mb-4">
                    {draw.drawn_numbers.map((n, i) => (
                      <div key={i} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center font-grotesk font-700 text-sm text-[#0A0A0F]">
                        {n}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#94A3B8] text-xs">Prize Pool</p>
                    <p className="font-grotesk font-700 text-[#F59E0B]">₹{draw.prize_pool_total.toLocaleString('en-IN')}</p>
                  </div>
                  {draw.entry && (
                    <span className={draw.entry.match_count >= 3 ? 'badge-active' : 'badge-inactive'}>
                      {draw.entry.match_count} match{draw.entry.match_count !== 1 && 'es'}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Draw Detail Modal */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6"
              onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9 }}
                className="glass-card p-8 max-w-lg w-full"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-syne font-800 text-2xl">
                    {MONTH_NAMES[selected.month - 1]} {selected.year} Draw
                  </h2>
                  <button onClick={() => setSelected(null)} className="text-[#64748B] hover:text-white text-2xl leading-none">×</button>
                </div>

                <div className="mb-6">
                  <p className="text-[#64748B] text-sm mb-4">Winning Numbers (revealed one by one):</p>
                  <div className="flex gap-3 justify-center">
                    {selected.drawn_numbers?.map((n, i) => (
                      <AnimatePresence key={i}>
                        {revealIndex >= i && (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="draw-ball"
                          >
                            {n}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    ))}
                  </div>
                </div>

                {selected.entry && (
                  <div className={`p-5 rounded-2xl mb-6 ${selected.entry.match_count >= 3 ? 'bg-[rgba(110,231,183,0.1)] border border-[rgba(110,231,183,0.2)]' : 'bg-[rgba(26,26,46,0.5)]'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      {selected.entry.match_count >= 3 ? <CheckCircle size={24} className="text-[#6EE7B7]" /> : <XCircle size={24} className="text-[#374151]" />}
                      <p className="font-syne font-700">
                        {selected.entry.match_count >= 3 ? `You won! ${selected.entry.match_count} matching numbers` : 'No match this draw'}
                      </p>
                    </div>
                    <p className="text-[#94A3B8] text-sm">Your numbers: {selected.entry.user_numbers.join(', ')}</p>
                    {selected.entry.prize_amount > 0 && (
                      <p className="text-[#F59E0B] font-grotesk font-800 text-2xl mt-2">
                        ₹{selected.entry.prize_amount.toLocaleString('en-IN')} prize
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Prize Pool', value: `₹${selected.prize_pool_total.toLocaleString('en-IN')}` },
                    { label: 'Jackpot', value: `₹${selected.jackpot_amount.toLocaleString('en-IN')}` },
                    { label: 'Draw Mode', value: selected.draw_mode },
                    { label: 'Rollover', value: selected.jackpot_rolled_over ? 'Yes' : 'No' },
                  ].map(stat => (
                    <div key={stat.label} className="glass-card p-3">
                      <p className="text-[#64748B] text-xs">{stat.label}</p>
                      <p className="font-600 text-sm capitalize">{stat.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
