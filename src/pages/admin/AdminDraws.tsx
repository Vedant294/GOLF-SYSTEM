import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Globe, AlertCircle, CheckCircle, Zap, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import type { Draw } from '../../types'

export default function AdminDraws() {
  const user = useAuthStore((s) => s.user)
  const [draws, setDraws] = useState<Draw[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [drawMode, setDrawMode] = useState<'random' | 'algorithmic'>('random')
  const [simulation, setSimulation] = useState<any | null>(null)
  const [prizePool, setPrizePool] = useState(0)

  useEffect(() => {
    fetchDraws()
    calcPrizePool()
  }, [])

  const fetchDraws = async () => {
    setLoading(true)
    const { data } = await supabase.from('draws').select('*').order('created_at', { ascending: false })
    setDraws(data || [])
    setLoading(false)
  }

  const calcPrizePool = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active')
    setPrizePool((count || 0) * 499 * 0.5)
  }

  const runSimulation = async () => {
    setRunning(true)
    try {
      // Generate drawn numbers
      let drawnNumbers: number[]
      if (drawMode === 'random') {
        const nums = new Set<number>()
        while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1)
        drawnNumbers = Array.from(nums).sort((a, b) => a - b)
      } else {
        // Algorithmic: use least frequent scores
        const { data: scores } = await supabase.from('scores').select('score')
        const freq: Record<number, number> = {}
        for (let i = 1; i <= 45; i++) freq[i] = 0
        scores?.forEach(s => freq[s.score] = (freq[s.score] || 0) + 1)
        drawnNumbers = Object.entries(freq).sort(([,a],[,b]) => a - b).slice(0, 5).map(([k]) => parseInt(k))
      }

      // ── Bulk fetch scores for all active users ──
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').eq('subscription_status', 'active')
      const profileIds = (profiles || []).map(p => p.id)

      const { data: allScores } = await supabase
        .from('scores')
        .select('user_id, score')
        .in('user_id', profileIds)

      const userScoresMap: Record<string, number[]> = {}
      allScores?.forEach(s => {
        if (!userScoresMap[s.user_id]) userScoresMap[s.user_id] = []
        if (userScoresMap[s.user_id].length < 5) userScoresMap[s.user_id].push(s.score)
      })

      const results: any[] = []
      profiles?.forEach(profile => {
        const userNums = userScoresMap[profile.id] || []
        const matches = userNums.filter(n => drawnNumbers.includes(n)).length
        if (matches >= 3) {
          results.push({ userId: profile.id, name: profile.full_name, matches, userNums })
        }
      })

      // Store simulation
      const { data: draw, error } = await supabase.from('draws').insert({
        month, year,
        status: 'simulated',
        draw_mode: drawMode,
        drawn_numbers: drawnNumbers,
        prize_pool_total: prizePool,
        jackpot_amount: prizePool * 0.4,
        jackpot_rolled_over: results.filter(r => r.matches === 5).length === 0,
        run_by: user!.id,
      }).select().single()

      if (error) throw error

      setSimulation({ draw, drawnNumbers, results })
      toast.success(`Draw simulated! ${results.length} winner(s) found.`)
      fetchDraws()
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed')
    } finally {
      setRunning(false)
    }
  }

  const publishDraw = async () => {
    if (!simulation?.draw) return
    // Prevent double-publish
    const { data: existing } = await supabase.from('draw_entries').select('id').eq('draw_id', simulation.draw.id).limit(1)
    if (existing && existing.length > 0) {
      toast.error('This draw was already published!')
      setPublishing(false)
      return
    }
    setPublishing(true)
    try {
      const { data: allProfiles } = await supabase.from('profiles').select('id').eq('subscription_status', 'active')
      const profileIds = (allProfiles || []).map(p => p.id)

      // Fetch all scores in one batch
      const { data: allScores } = await supabase.from('scores').select('user_id, score').in('user_id', profileIds)
      const userScoresMap: Record<string, number[]> = {}
      allScores?.forEach(s => {
        if (!userScoresMap[s.user_id]) userScoresMap[s.user_id] = []
        if (userScoresMap[s.user_id].length < 5) userScoresMap[s.user_id].push(s.score)
      })

      // ── PRD §07: Calculate per-tier winners first ──
      type MatchResult = { userId: string; userNums: number[]; matchCount: number; prizeTier: string }
      const tierResults: Record<string, MatchResult[]> = { '5-match': [], '4-match': [], '3-match': [] }

      allProfiles?.forEach(profile => {
        const userNums = userScoresMap[profile.id] || []
        const matchCount = userNums.filter((n: number) => simulation.drawnNumbers.includes(n)).length
        const prizeTier = matchCount === 5 ? '5-match' : matchCount === 4 ? '4-match' : matchCount === 3 ? '3-match' : null
        if (prizeTier) tierResults[prizeTier].push({ userId: profile.id, userNums, matchCount, prizeTier })
      })

      // ── Calculate prize amounts per tier ──
      const jackpotRollover = tierResults['5-match'].length === 0
      const jackpotPer5 = jackpotRollover ? 0 : Math.floor(simulation.draw.jackpot_amount / tierResults['5-match'].length)
      const prize4Total = Math.floor(simulation.draw.prize_pool_total * 0.35)
      const prize3Total = Math.floor(simulation.draw.prize_pool_total * 0.25)
      
      const prize4Per = tierResults['4-match'].length > 0 ? Math.floor(prize4Total / tierResults['4-match'].length) : 0
      const prize3Per = tierResults['3-match'].length > 0 ? Math.floor(prize3Total / tierResults['3-match'].length) : 0

      // ── Insert draw entries and winners for ALL active users ──
      for (const profile of allProfiles || []) {
        const userNums = userScoresMap[profile.id] || []
        const matchCount = userNums.filter((n: number) => simulation.drawnNumbers.includes(n)).length
        const prizeTier = matchCount === 5 ? '5-match' : matchCount === 4 ? '4-match' : matchCount === 3 ? '3-match' : null
        const prizeAmount = prizeTier === '5-match' ? jackpotPer5 : prizeTier === '4-match' ? prize4Per : prizeTier === '3-match' ? prize3Per : 0

        await supabase.from('draw_entries').insert({
          draw_id: simulation.draw.id,
          user_id: profile.id,
          user_numbers: userNums,
          match_count: matchCount,
          prize_tier: prizeTier,
          prize_amount: prizeAmount,
        })

        if (prizeTier && prizeAmount > 0) {
          await supabase.from('winners').insert({
            draw_id: simulation.draw.id,
            user_id: profile.id,
            match_type: prizeTier,
            prize_amount: prizeAmount,
            verification_status: 'pending',
            payout_status: 'pending',
          })
        }
      }

      // Update draw status
      await supabase.from('draws').update({ status: 'published' }).eq('id', simulation.draw.id)

      // PRD §07: 5-match jackpot carries forward if unclaimed
      if (jackpotRollover) {
        const nextMonth = simulation.draw.month === 12 ? 1 : simulation.draw.month + 1
        const nextYear = simulation.draw.month === 12 ? simulation.draw.year + 1 : simulation.draw.year
        
        // Check if next draw exists
        const { data: nextDraw } = await supabase.from('draws').select('*').eq('month', nextMonth).eq('year', nextYear).maybeSingle()
        
        if (nextDraw) {
          await supabase.from('draws').update({
            jackpot_amount: nextDraw.jackpot_amount + simulation.draw.jackpot_amount
          }).eq('id', nextDraw.id)
        } else {
          // Create next draw with carried over jackpot
          await supabase.from('draws').insert({
            month: nextMonth,
            year: nextYear,
            status: 'pending',
            draw_mode: 'random',
            jackpot_amount: simulation.draw.jackpot_amount,
            prize_pool_total: 0 // Will be updated as users subscribe
          })
        }
      }

      const winnerSummary = [
        tierResults['5-match'].length > 0 ? `${tierResults['5-match'].length}× jackpot (÷ equally)` : 'Jackpot rolled over',
        tierResults['4-match'].length > 0 ? `${tierResults['4-match'].length}× 4-match` : '',
        tierResults['3-match'].length > 0 ? `${tierResults['3-match'].length}× 3-match` : '',
      ].filter(Boolean).join(' · ')

      toast.success(`🎉 Draw published! ${winnerSummary}`)
      setSimulation(null)
      fetchDraws()
    } catch (err: any) {
      toast.error(err.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const broadcastResults = async (draw: Draw) => {
    if (!confirm('Send result emails to all active subscribers?')) return
    const id = toast.loading('Sending broadcast...')
    try {
      await supabase.functions.invoke('send-email', {
        body: { type: 'draw_results', drawId: draw.id }
      })
      toast.success('Broadcast sent to all subscribers!', { id })
    } catch (err) {
      toast.error('Broadcast failed', { id })
    }
  }

  const resetDraw = async (drawId: string) => {
    if (!confirm('This will delete this draw and all entries. Are you sure?')) return
    await supabase.from('draw_entries').delete().eq('draw_id', drawId)
    await supabase.from('winners').delete().eq('draw_id', drawId)
    await supabase.from('draws').delete().eq('id', drawId)
    toast.success('Draw reset')
    setSimulation(null)
    fetchDraws()
  }

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-2 flex items-center gap-3">
          <Trophy className="text-[#F59E0B]" size={36} /> Draw Engine
        </motion.h1>
        <p className="text-[#64748B] mb-8">Configure, simulate, and publish monthly prize draws.</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Draw Configuration */}
          <div className="space-y-5">
            <div className="glass-card p-6">
              <h2 className="font-syne font-700 text-lg mb-5">Configure Draw</h2>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2">Month</label>
                  <select id="draw-month" value={month} onChange={e => setMonth(Number(e.target.value))} className="input-field">
                    {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-sm mb-2">Year</label>
                  <input id="draw-year" type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="input-field" />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-[#94A3B8] text-sm mb-3">Draw Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['random', 'algorithmic'] as const).map(mode => (
                    <button
                      key={mode}
                      id={`mode-${mode}`}
                      onClick={() => setDrawMode(mode)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${drawMode === mode ? 'border-[#F59E0B] bg-[rgba(245,158,11,0.08)]' : 'border-white/10'}`}
                    >
                      <p className="font-600 capitalize mb-1">{mode}</p>
                      <p className="text-[#64748B] text-xs">{mode === 'random' ? '5 random numbers 1-45' : 'Based on score frequency'}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-4 mb-5">
                <p className="text-[#64748B] text-xs mb-2">Estimated Prize Pool</p>
                <p className="font-grotesk font-700 text-2xl text-[#F59E0B]">₹{prizePool.toLocaleString('en-IN')}</p>
                <p className="text-[#64748B] text-xs mt-1">Jackpot: ₹{(prizePool * 0.4).toLocaleString('en-IN')}</p>
              </div>

              <button
                id="run-simulation-btn"
                onClick={runSimulation}
                disabled={running}
                className="gold-btn w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {running ? <span className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : <><Zap size={18} /> Run Simulation</>}
              </button>
            </div>

            {/* Simulation Results */}
            <AnimatePresence>
              {simulation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 border-[rgba(110,231,183,0.3)]"
                >
                  <h3 className="font-syne font-700 text-lg mb-4 flex items-center gap-2">
                    <CheckCircle size={18} className="text-[#6EE7B7]" /> Simulation Preview
                  </h3>
                  <div className="flex gap-3 mb-4">
                    {simulation.drawnNumbers.map((n: number, i: number) => (
                      <div key={i} className="draw-ball">{n}</div>
                    ))}
                  </div>
                  {simulation.results.length > 0 ? (
                    <div className="space-y-2 mb-5">
                      {simulation.results.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[rgba(110,231,183,0.08)] rounded-xl">
                          <Trophy size={16} className="text-[#F59E0B]" />
                          <p className="text-sm font-500">{r.name}</p>
                          <span className="badge-active ml-auto">{r.matches} match</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#64748B] text-sm mb-5">No winners this draw. Jackpot rolls over!</p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => resetDraw(simulation.draw.id)} className="outline-btn flex-1 py-3 text-sm">Reset</button>
                    <button
                      id="publish-draw-btn"
                      onClick={publishDraw}
                      disabled={publishing}
                      className="premium-btn flex-1 py-3 flex items-center justify-center gap-2 text-sm"
                    >
                      {publishing ? <span className="w-4 h-4 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" /> : <><Globe size={16} /> Publish Draw</>}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Draw History */}
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/5">
              <h2 className="font-syne font-700 text-lg">Draw History</h2>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4 skeleton h-16" />)
              ) : draws.length === 0 ? (
                <div className="p-10 text-center text-[#64748B]">No draws yet</div>
              ) : draws.map(draw => (
                <div key={draw.id} className="p-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-600 text-sm">{MONTH_NAMES[draw.month - 1]} {draw.year}</p>
                      <p className="text-[#64748B] text-xs capitalize">{draw.draw_mode} • ₹{draw.prize_pool_total?.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={draw.status === 'published' ? 'badge-active text-xs' : draw.status === 'simulated' ? 'badge-gold text-xs' : 'badge-inactive text-xs'}>
                        {draw.status}
                      </span>
                      {draw.status === 'published' && (
                        <button onClick={() => broadcastResults(draw)} className="p-1.5 rounded-lg bg-[#818CF8]/10 text-[#818CF8] hover:bg-[#818CF8]/20 transition-colors">
                          <Send size={14} />
                        </button>
                      )}
                      <button onClick={() => resetDraw(draw.id)} className="text-[#374151] hover:text-[#F87171] text-xs transition-colors p-1">reset</button>
                    </div>
                  </div>
                  {draw.drawn_numbers && (
                    <div className="flex gap-1.5 mt-2">
                      {draw.drawn_numbers.map((n, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center font-grotesk font-700 text-xs text-[#0A0A0F]">{n}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
