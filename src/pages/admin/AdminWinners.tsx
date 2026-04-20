import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, CheckCircle, XCircle, Clock, DollarSign, MessageSquare, Save, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { Winner, Profile } from '../../types'

interface WinnerWithUser extends Winner {
  profile?: Profile
}

export default function AdminWinners() {
  const [winners, setWinners] = useState<WinnerWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => { fetchWinners() }, [])

  const fetchWinners = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('winners')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
    if (data) {
      setWinners(data.map((w: any) => ({ ...w, profile: w.profiles ?? undefined })))
    }
    setLoading(false)
  }

  const notifyWinner = async (winner: WinnerWithUser) => {
    if (!winner.profile?.email) return
    const id = toast.loading('Sending winner alert...')
    try {
      await supabase.functions.invoke('send-email', {
        body: { type: 'winner_alert', winnerId: winner.id }
      })
      toast.success('Winner notified!', { id })
    } catch (err) {
      toast.error('Failed to send notification', { id })
    }
  }

  const updateWinner = async (id: string, updates: Partial<Winner>) => {
    setSavingId(id)
    await supabase.from('winners').update({ ...updates, admin_notes: notes[id] }).eq('id', id)
    toast.success('Winner updated!')
    setSavingId(null)
    fetchWinners()
  }

  const markPaid = async (id: string) => {
    await updateWinner(id, { payout_status: 'paid', payout_date: new Date().toISOString() })
  }

  const filtered = winners.filter(w => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') return w.verification_status === 'pending'
    if (statusFilter === 'approved') return w.verification_status === 'approved'
    if (statusFilter === 'unpaid') return w.verification_status === 'approved' && w.payout_status === 'pending'
    return true
  })

  const MATCH_COLORS: Record<string, string> = { '5-match': '#F59E0B', '4-match': '#818CF8', '3-match': '#6EE7B7' }

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-2 flex items-center gap-3">
          <Trophy className="text-[#F59E0B]" size={36} /> Winner Verification
        </motion.h1>
        <p className="text-[#64748B] mb-6">{winners.filter(w => w.verification_status === 'pending').length} pending verifications</p>

        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'unpaid'].map(f => (
            <button
              key={f}
              id={`winner-filter-${f}`}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-500 border capitalize transition-all ${statusFilter === f ? 'border-[#F59E0B] bg-[rgba(245,158,11,0.1)] text-[#F59E0B]' : 'border-white/10 text-[#64748B] hover:border-white/20'}`}
            >
              {f === 'unpaid' ? 'Approved / Unpaid' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Trophy size={48} className="text-[#374151] mx-auto mb-4" />
            <p className="font-syne font-700 text-xl mb-2">No winners here</p>
            <p className="text-[#64748B]">No records matching the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((winner, i) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-6"
              >
                <div className="flex flex-wrap items-start gap-5">
                  {/* User Info */}
                  <div className="flex items-center gap-3 min-w-48">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6EE7B7] to-[#818CF8] flex items-center justify-center font-700 text-[#0A0A0F]">
                      {winner.profile?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-600 text-sm">{winner.profile?.full_name || 'Unknown'}</p>
                      <p className="text-[#64748B] text-xs">{winner.profile?.email}</p>
                    </div>
                  </div>

                  {/* Match Type */}
                  <div>
                    <p className="text-[#64748B] text-xs mb-1">Match Type</p>
                    <span className="font-grotesk font-700 text-lg" style={{ color: MATCH_COLORS[winner.match_type] }}>{winner.match_type}</span>
                  </div>

                  {/* Prize */}
                  <div>
                    <p className="text-[#64748B] text-xs mb-1">Prize Amount</p>
                    <p className="text-[#F59E0B] font-grotesk font-700 text-lg">₹{winner.prize_amount.toLocaleString('en-IN')}</p>
                  </div>

                  {/* Statuses */}
                  <div className="flex flex-col gap-2">
                    <span className={winner.verification_status === 'approved' ? 'badge-active text-xs' : winner.verification_status === 'rejected' ? 'badge-inactive text-xs' : 'badge-gold text-xs'}>
                      {winner.verification_status}
                    </span>
                    <span className={winner.payout_status === 'paid' ? 'badge-active text-xs' : 'badge-inactive text-xs'}>
                      {winner.payout_status}
                    </span>
                  </div>

                  {/* Proof */}
                  {winner.proof_url && (
                    <a href={winner.proof_url} target="_blank" rel="noopener noreferrer" className="text-[#6EE7B7] text-sm hover:underline flex items-center gap-1">
                      📄 View Proof
                    </a>
                  )}

                  {/* Actions */}
                  <div className="ml-auto flex flex-col gap-2">
                    {winner.verification_status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          id={`approve-${winner.id}`}
                          onClick={() => updateWinner(winner.id, { verification_status: 'approved' })}
                          disabled={savingId === winner.id}
                          className="flex items-center gap-1 px-3 py-2 bg-[rgba(110,231,183,0.1)] border border-[rgba(110,231,183,0.3)] rounded-lg text-[#6EE7B7] text-sm hover:bg-[rgba(110,231,183,0.2)] transition-colors"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          id={`reject-${winner.id}`}
                          onClick={() => updateWinner(winner.id, { verification_status: 'rejected' })}
                          className="flex items-center gap-1 px-3 py-2 bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] rounded-lg text-[#F87171] text-sm hover:bg-[rgba(248,113,113,0.2)] transition-colors"
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                    {winner.verification_status === 'approved' && (
                      <div className="flex gap-2">
                        {winner.payout_status === 'pending' && (
                          <button
                            id={`mark-paid-${winner.id}`}
                            onClick={() => markPaid(winner.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg text-[#F59E0B] text-sm hover:bg-[rgba(245,158,11,0.2)] transition-colors"
                          >
                            <DollarSign size={14} /> Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => notifyWinner(winner)}
                          className="flex items-center gap-1 px-3 py-2 bg-[rgba(129,140,248,0.1)] border border-[rgba(129,140,248,0.3)] rounded-lg text-[#818CF8] text-sm hover:bg-[rgba(129,140,248,0.2)] transition-colors"
                          title="Notify Winner"
                        >
                          <Mail size={14} /> Notify
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 relative">
                    <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                    <input
                      className="input-field pl-9 text-sm py-2"
                      placeholder="Admin notes..."
                      value={notes[winner.id] ?? winner.admin_notes ?? ''}
                      onChange={e => setNotes({ ...notes, [winner.id]: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={() => updateWinner(winner.id, {})}
                    disabled={savingId === winner.id}
                    className="px-3 py-2 text-[#6EE7B7] border border-[rgba(110,231,183,0.3)] rounded-lg hover:bg-[rgba(110,231,183,0.1)] transition-colors"
                  >
                    {savingId === winner.id ? <Clock size={14} className="animate-spin" /> : <Save size={14} />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
