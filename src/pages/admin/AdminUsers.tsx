import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Search, Edit3, Save, X, ChevronDown, ChevronUp, Target, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { supabase } from '../../lib/supabase'
import type { Profile, Score } from '../../types'

const STATUS_OPTIONS = ['active', 'inactive', 'lapsed', 'cancelled']
const PLAN_OPTIONS = ['monthly', 'yearly']

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editPlan, setEditPlan] = useState('')

  // Score editing state
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userScores, setUserScores] = useState<Record<string, Score[]>>({})
  const [loadingScores, setLoadingScores] = useState(false)
  const [newScore, setNewScore] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const startEdit = (user: Profile) => {
    setEditingUser(user)
    setEditStatus(user.subscription_status)
    setEditPlan(user.subscription_plan || 'monthly')
  }

  const saveEdit = async () => {
    if (!editingUser) return
    const { error } = await supabase.from('profiles').update({
      subscription_status: editStatus,
      subscription_plan: editPlan,
    }).eq('id', editingUser.id)
    if (error) { toast.error('Update failed'); return }
    toast.success('User updated!')
    setEditingUser(null)
    fetchUsers()
  }

  // ── PRD §11: Admin can view & edit user scores ──
  const toggleScores = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null)
      return
    }
    setExpandedUser(userId)
    if (userScores[userId]) return // already loaded
    setLoadingScores(true)
    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setUserScores(prev => ({ ...prev, [userId]: data || [] }))
    setLoadingScores(false)
  }

  const [newCourse, setNewCourse] = useState('Admin Manual Entry')

  const addScoreForUser = async (userId: string) => {
    const s = parseInt(newScore)
    if (isNaN(s) || s < 1 || s > 45) {
      toast.error('Score must be 1–45')
      return
    }
    const scores = userScores[userId] || []
    // If 5 scores, delete the oldest first
    if (scores.length >= 5) {
      const oldest = scores[scores.length - 1]
      await supabase.from('scores').delete().eq('id', oldest.id)
    }
    const { error } = await supabase.from('scores').insert({
      user_id: userId,
      score: s,
      played_date: newDate,
    })
    if (error) { 
      console.error('Score add error:', error)
      toast.error('Failed to add score: ' + error.message)
      return 
    }
    toast.success('Score added')
    setNewScore('')
    // Refresh scores for this user
    const { data } = await supabase.from('scores').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setUserScores(prev => ({ ...prev, [userId]: data || [] }))
  }

  const deleteScoreForUser = async (userId: string, scoreId: string) => {
    const { error } = await supabase.from('scores').delete().eq('id', scoreId)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Score removed')
    setUserScores(prev => ({
      ...prev,
      [userId]: (prev[userId] || []).filter(s => s.id !== scoreId)
    }))
  }

  const filtered = users.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || u.subscription_status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-syne font-800 text-4xl mb-2 flex items-center gap-3">
          <Users className="text-[#818CF8]" size={36} /> User Management
        </motion.h1>
        <p className="text-[#64748B] mb-8">{users.length} total subscribers</p>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input id="user-search" className="input-field pl-10" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', ...STATUS_OPTIONS].map(s => (
              <button
                key={s}
                id={`filter-${s}`}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-500 border capitalize transition-all ${statusFilter === s ? 'border-[#818CF8] bg-[rgba(129,140,248,0.1)] text-[#818CF8]' : 'border-white/10 text-[#64748B] hover:border-white/20'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Charity %</th>
                  <th>Joined</th>
                  <th>Scores</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><div className="skeleton h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.map((user, i) => (
                  <>
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6EE7B7] to-[#818CF8] flex items-center justify-center text-[#0A0A0F] font-700 text-sm shrink-0">
                            {user.full_name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-500 text-white text-sm">{user.full_name}</p>
                            <p className="text-[#64748B] text-xs">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {editingUser?.id === user.id ? (
                          <select value={editPlan} onChange={e => setEditPlan(e.target.value)} className="input-field text-xs py-1">
                            {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <span className="badge-accent capitalize text-xs">{user.subscription_plan || '—'}</span>
                        )}
                      </td>
                      <td>
                        {editingUser?.id === user.id ? (
                          <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input-field text-xs py-1">
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className={user.subscription_status === 'active' ? 'badge-active text-xs' : user.subscription_status === 'cancelled' ? 'badge-inactive text-xs' : 'badge-gold text-xs'}>
                            {user.subscription_status}
                          </span>
                        )}
                      </td>
                      <td className="text-[#94A3B8]">{user.charity_contribution_pct}%</td>
                      <td className="text-[#94A3B8] text-xs">
                        {user.created_at ? format(parseISO(user.created_at), 'dd MMM yyyy') : '—'}
                      </td>
                      <td>
                        {/* PRD §11: Edit golf scores */}
                        <button
                          id={`scores-user-${user.id}`}
                          onClick={() => toggleScores(user.id)}
                          className="flex items-center gap-1 text-[#818CF8] hover:text-white text-xs transition-colors"
                        >
                          <Target size={13} />
                          {expandedUser === user.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </td>
                      <td>
                        {editingUser?.id === user.id ? (
                          <div className="flex gap-2">
                            <button id={`save-user-${user.id}`} onClick={saveEdit} className="p-2 text-[#6EE7B7] hover:bg-[rgba(110,231,183,0.1)] rounded-lg transition-colors">
                              <Save size={16} />
                            </button>
                            <button onClick={() => setEditingUser(null)} className="p-2 text-[#F87171] hover:bg-[rgba(248,113,113,0.1)] rounded-lg transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button id={`edit-user-${user.id}`} onClick={() => startEdit(user)} className="p-2 text-[#64748B] hover:text-[#6EE7B7] transition-colors">
                            <Edit3 size={16} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
  
                    {/* Score Editing Panel — PRD §11 */}
                    <AnimatePresence>
                      {expandedUser === user.id && (
                        <tr key={`scores-${user.id}`}>
                          <td colSpan={7} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-[rgba(129,140,248,0.05)] border-t border-white/5 p-5"
                            >
                              <p className="text-[#818CF8] text-xs font-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Target size={13} /> Scores for {user.full_name}
                              </p>
  
                              {loadingScores ? (
                                <div className="flex gap-2">
                                  {[1,2,3].map(i => <div key={i} className="skeleton h-10 w-16 rounded-xl" />)}
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {(userScores[user.id] || []).length === 0 ? (
                                    <p className="text-[#64748B] text-sm">No scores entered</p>
                                  ) : (
                                    (userScores[user.id] || []).map(score => (
                                      <div key={score.id} className="flex items-center gap-1 bg-[rgba(26,26,46,0.8)] border border-white/10 rounded-xl px-3 py-2">
                                        <span className="font-grotesk font-700 text-[#F59E0B] text-sm">{score.score}</span>
                                        <span className="text-[#64748B] text-xs ml-1">{format(parseISO(score.played_date), 'dd MMM')}</span>
                                        <button
                                          onClick={() => deleteScoreForUser(user.id, score.id)}
                                          className="ml-2 text-[#374151] hover:text-[#F87171] transition-colors"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
  
                              {/* Add score */}
                              <div className="flex gap-2 items-center flex-wrap">
                                <input
                                  type="number" min={1} max={45}
                                  value={newScore}
                                  onChange={e => setNewScore(e.target.value)}
                                  placeholder="Score (1-45)"
                                  className="input-field w-32 text-sm py-2"
                                />
                                <input
                                  type="date"
                                  value={newDate}
                                  max={format(new Date(), 'yyyy-MM-dd')}
                                  onChange={e => setNewDate(e.target.value)}
                                  className="input-field w-36 text-sm py-2"
                                />
                                <button
                                  onClick={() => addScoreForUser(user.id)}
                                  disabled={!newScore}
                                  className="premium-btn text-xs py-2 px-4 disabled:opacity-50"
                                >
                                  Add Score
                                </button>
                                <span className="text-[#64748B] text-xs">
                                  {(userScores[user.id] || []).length}/5 scores
                                  {(userScores[user.id] || []).length >= 5 && ' — will replace oldest'}
                                </span>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-[#64748B]">No users found</div>
          )}
        </div>
      </div>
    </div>
  )
}
