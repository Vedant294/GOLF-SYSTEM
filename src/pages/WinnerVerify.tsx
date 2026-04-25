import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Trophy, CheckCircle, Clock, AlertCircle, XCircle, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'
import type { Winner } from '../types'

export default function WinnerVerify() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(true)
  const [pendingWin, setPendingWin] = useState<Winner | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)

  // Check if user actually has a pending win before showing upload form
  useEffect(() => {
    if (user) fetchPendingWin()
  }, [user])

  const fetchPendingWin = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('winners')
      .select('*')
      .eq('user_id', user!.id)
      .eq('verification_status', 'pending')
      .maybeSingle()
    setPendingWin(data)
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!file || !user || !pendingWin) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filePath = `proofs/${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('proofs')
        .getPublicUrl(filePath)

      await supabase
        .from('winners')
        .update({ proof_url: publicUrl })
        .eq('id', pendingWin.id)

      toast.success('Proof uploaded! Admin will verify shortly.')
      setUploaded(true)
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) return (
    <div className="page-wrapper flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#6EE7B7] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="section-container py-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-syne font-800 text-4xl mb-2 flex items-center gap-3"
        >
          <Trophy className="text-[#F59E0B]" size={36} /> Winner Verification
        </motion.h1>
        <p className="text-[#64748B] mb-8">Upload proof for your prize claim.</p>

        <div className="max-w-lg">
          {/* No pending win */}
          {!pendingWin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-10 text-center"
            >
              <XCircle size={56} className="text-[#374151] mx-auto mb-4" />
              <h2 className="font-syne font-700 text-2xl mb-2">No Pending Wins</h2>
              <p className="text-[#94A3B8] text-sm mb-6">
                You don't have any pending prize claims right now. Keep playing — the next draw is at month end!
              </p>
              <Link to="/draws" className="outline-btn inline-flex items-center gap-2 px-6 py-3">
                <LinkIcon size={15} /> View Draw History
              </Link>
            </motion.div>
          )}

          {/* Has pending win */}
          {pendingWin && (
            <div className="glass-card p-8">
              {uploaded ? (
                <div className="text-center py-8">
                  <CheckCircle size={64} className="text-[#6EE7B7] mx-auto mb-4" />
                  <h2 className="font-syne font-700 text-2xl mb-2">Proof Submitted!</h2>
                  <p className="text-[#94A3B8]">Admin will verify your claim within 24-48 hours.</p>
                </div>
              ) : (
                <>
                  {/* Win details */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] mb-6">
                    <AlertCircle size={20} className="text-[#F59E0B] shrink-0" />
                    <div>
                      <p className="text-[#F59E0B] text-sm font-600">
                        You won <span className="uppercase">{pendingWin.match_type}</span>!
                      </p>
                      <p className="text-[#F59E0B] text-xs mt-0.5">
                        Prize: ₹{pendingWin.prize_amount.toLocaleString('en-IN')} · Upload proof to claim
                      </p>
                    </div>
                  </div>

                  {/* Upload area */}
                  <div
                    className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center mb-6 hover:border-[rgba(110,231,183,0.4)] transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <Upload size={40} className="text-[#64748B] mx-auto mb-3" />
                    <p className="text-[#94A3B8] font-500">
                      {file ? file.name : 'Click to upload screenshot'}
                    </p>
                    <p className="text-[#64748B] text-sm mt-1">PNG, JPG, PDF — max 10MB</p>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="space-y-3 mb-6">
                    {[
                      { icon: <Clock size={16} />, text: 'Review takes 1-2 business days', color: '#F59E0B' },
                      { icon: <CheckCircle size={16} />, text: 'Payout within 7 days of approval', color: '#6EE7B7' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm" style={{ color: item.color }}>
                        {item.icon}
                        <span className="text-[#94A3B8]">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      id="upload-proof-btn"
                      onClick={handleUpload}
                      disabled={!file || uploading}
                      className="premium-btn flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading
                        ? <span className="w-5 h-5 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin" />
                        : <><Upload size={18} /> Upload Proof</>
                      }
                    </button>
                    <button
                      id="demo-proof-btn"
                      onClick={async () => {
                        setUploading(true)
                        await supabase.from('winners').update({ 
                          proof_url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&q=80&w=800' 
                        }).eq('id', pendingWin.id)
                        toast.success('Demo Proof Submitted! (For Judges)')
                        setUploaded(true)
                        setUploading(false)
                      }}
                      className="outline-btn px-4 py-3.5 text-xs flex items-center gap-2 whitespace-nowrap"
                    >
                      <Zap size={14} /> Demo Fill
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
