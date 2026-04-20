import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Trash2, Clock, Inbox, ChevronRight, Copy } from 'lucide-react'
import { useMailStore } from '../store/useMailStore'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export default function DevMailDrawer() {
  const { emails, isOpen, setOpen, removeEmail, clearAll } = useMailStore()

  // Hide in production
  if (import.meta.env.PROD) return null

  const copyCode = (html: string) => {
    const match = html.match(/class="otp-code">(\d+)<\/div>/)
    if (match && match[1]) {
      navigator.clipboard.writeText(match[1])
      toast.success('OTP copied to clipboard!')
    }
  }

  return (
    <>
      {/* Tab Button (when closed) */}
      {!isOpen && emails.length > 0 && (
        <motion.button
          initial={{ x: 100 }}
          animate={{ x: 0 }}
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[99] bg-[#12121A] border-l border-y border-[#6EE7B7]/30 p-3 rounded-l-2xl shadow-[0_0_20px_rgba(110,231,183,0.2)] group"
        >
          <div className="relative">
            <Mail className="text-[#6EE7B7] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-4 -right-4 w-5 h-5 bg-[#F59E0B] text-[#0A0A0F] text-[10px] font-800 rounded-full flex items-center justify-center border-2 border-[#12121A]">
              {emails.length}
            </span>
          </div>
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0A0A0F] border-l border-white/10 z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#12121A]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6EE7B7]/10 flex items-center justify-center">
                    <Inbox className="text-[#6EE7B7]" size={20} />
                  </div>
                  <div>
                    <h2 className="font-syne font-700 text-lg">Dev Mailbox</h2>
                    <p className="text-[#64748B] text-xs">Internal Mock Inbox (Development Only)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={clearAll} className="p-2 hover:bg-white/5 rounded-lg text-[#64748B] transition-colors" title="Clear all">
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-[#64748B] transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {emails.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                    <Mail size={48} className="mb-4" />
                    <p className="text-sm">Your mock inbox is empty</p>
                  </div>
                ) : (
                  emails.map((email) => (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card overflow-hidden border-white/5 flex flex-col"
                    >
                      <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[#6EE7B7] text-[10px] font-800 uppercase tracking-widest">New message</span>
                          <span className="text-[#64748B] text-[10px] flex items-center gap-1">
                            <Clock size={10} /> {format(new Date(email.receivedAt), 'HH:mm:ss')}
                          </span>
                        </div>
                        <h3 className="font-syne font-700 text-sm mb-1">{email.subject}</h3>
                        <p className="text-[#94A3B8] text-xs mb-3">To: {email.to}</p>
                        <button 
                          onClick={() => copyCode(email.html)}
                          className="w-full py-2 bg-[rgba(110,231,183,0.1)] hover:bg-[rgba(110,231,183,0.2)] border border-[rgba(110,231,183,0.2)] text-[#6EE7B7] text-xs font-700 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                          <Copy size={14} /> Copy OTP Code
                        </button>
                      </div>
                      <div className="p-4 bg-white max-h-[400px] overflow-y-auto scrollbar-thin">
                        <div dangerouslySetInnerHTML={{ __html: email.html }} />
                      </div>
                      <div className="p-3 flex justify-end bg-white/[0.02] border-t border-white/5">
                        <button onClick={() => removeEmail(email.id)} className="text-[10px] text-[#F87171] hover:underline uppercase font-700">Delete</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
