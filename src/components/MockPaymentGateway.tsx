import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, QrCode, ShieldCheck, CheckCircle, X, ArrowRight, Loader2, Sparkles, Smartphone, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useMailStore } from '../store/useMailStore'

interface MockPaymentGatewayProps {
  amount: number
  planName: string
  email: string
  onSuccess: () => void
  onCancel: () => void
}

export default function MockPaymentGateway({ amount, planName, email, onSuccess, onCancel }: MockPaymentGatewayProps) {
  const addEmail = useMailStore(s => s.addEmail)
  const [method, setMethod] = useState<'card' | 'qr'>('card')
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isFailSafe, setIsFailSafe] = useState(false)
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' })

  const fillTestCard = () => {
    setCardData({
      number: '4242 4242 4242 4242',
      expiry: '12/28',
      cvv: '123',
      name: 'ARJUN SHARMA'
    })
    toast.success('Test card details filled!')
  }

  const handleCardInput = (field: string, val: string) => {
    // Basic formatting for number
    if (field === 'number') {
      val = val.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
    }
    if (field === 'expiry') {
      val = val.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(?=\d)/g, '$1/')
    }
    if (field === 'cvv') {
      val = val.replace(/\D/g, '').slice(0, 3)
    }
    setCardData({ ...cardData, [field]: val })
  }

  const triggerOtp = async () => {
    setStatus('processing')
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(newOtp)
      
      // PRD §06: Premium Resend Flow (Simulated via DevMailDrawer)
      addEmail({
        to: email,
        subject: `${newOtp} is your Golff verification code`,
        html: `
          <div style="font-family: 'Inter', sans-serif; background-color: #0A0A0F; color: #E2E8F0; padding: 20px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-size: 24px; font-weight: 800; color: #6EE7B7;">GOLFF</div>
            </div>
            <h1 style="color: #FFFFFF; font-size: 20px; text-align: center;">Verify Your Payment</h1>
            <p style="text-align: center; color: #94A3B8;">Enter the code below to complete your ₹${amount.toLocaleString()} subscription.</p>
            <div style="background: rgba(110,231,183,0.1); border: 1px dashed #6EE7B7; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
              <div class="otp-code" style="font-size: 32px; font-weight: 800; color: #6EE7B7; letter-spacing: 8px;">${newOtp}</div>
            </div>
          </div>
        `
      })

      // Still trigger Supabase OTP as fallback (as requested for "Real Email (Generic)")
      await supabase.auth.signInWithOtp({ email })
      
      toast.success('Security code sent!', { icon: '🔐' })
      setIsVerifying(true)
    } catch (err: any) {
      console.error('OTP failed:', err)
      setIsFailSafe(true)
      setIsVerifying(true)
    } finally {
      setStatus('idle')
    }
  }

  const handleVerify = async () => {
    setStatus('processing')
    try {
      if (generatedOtp) {
        // Verify against locally generated code (Resend Flow)
        if (otpCode !== generatedOtp && (!isFailSafe || otpCode !== '123456')) {
          throw new Error('Invalid code')
        }
      } else if (isFailSafe) {
        if (otpCode !== '123456') throw new Error('Invalid code')
      } else {
        // Verify against Supabase Auth code
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'email'
        })
        if (error) throw error
      }
      
      setStatus('success')
      setTimeout(() => {
        onSuccess()
      }, 2500)
    } catch (err: any) {
      toast.error(isFailSafe ? 'Invalid test code. Please use 123456.' : 'Invalid code. Please check your email.')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-[#0A0A0F]/80 backdrop-blur-md"
        onClick={status === 'idle' ? onCancel : undefined}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md glass-card border-white/10 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {status === 'success' ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 text-center py-20 relative overflow-hidden"
            >
              {/* Cinematic Confetti Shower (40 particles) */}
              {[...Array(40)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    top: '50%', 
                    left: '50%',
                    scale: 0,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    scale: [0, 1.2, 0],
                    rotate: Math.random() * 720,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 0.5
                  }}
                  className="absolute w-2.5 h-2.5 rounded-sm"
                  style={{ 
                    backgroundColor: ['#6EE7B7', '#F59E0B', '#818CF8', '#F87171', '#3B82F6'][Math.floor(Math.random() * 5)],
                    zIndex: 20
                  }}
                />
              ))}

              <div className="relative z-10">
                <div className="w-28 h-28 rounded-full bg-[#6EE7B7]/10 flex items-center justify-center mx-auto mb-10 relative">
                  <CheckCircle size={64} className="text-[#6EE7B7]" />
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-4 border-[#6EE7B7]/20"
                  />
                </div>
                
                <h2 className="font-syne font-800 text-4xl mb-4 bg-gradient-to-r from-[#6EE7B7] to-[#3B82F6] bg-clip-text text-transparent italic">
                  Account Secured!
                </h2>
                <p className="text-[#94A3B8] mb-10 text-lg font-500">
                  Welcome to the Golff VIP circle.
                </p>
                
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 text-[#6EE7B7] font-700 bg-[rgba(110,231,183,0.1)] py-4 px-8 rounded-2xl border border-[rgba(110,231,183,0.2)]">
                    <Loader2 className="animate-spin" size={20} /> 
                    <span className="text-sm tracking-wide">Personalizing your VIP dashboard...</span>
                  </div>
                  <p className="text-[10px] text-[#64748B] uppercase tracking-[0.2em] font-800">
                    Handshaking Secure Session
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div key="gateway">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="font-syne font-700 text-xl flex items-center gap-2">
                    {isVerifying ? (
                      <><Mail size={20} className="text-[#818CF8]" /> Verification Required</>
                    ) : (
                      <><Sparkles size={20} className="text-[#F59E0B]" /> Payment Gateway</>
                    )}
                  </h2>
                  <p className="text-[#64748B] text-xs">Test Mode — {isVerifying ? 'Real OTP Sent' : 'Simulated Environment'}</p>
                </div>
                {status === 'idle' && (
                  <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-[#64748B] transition-colors">
                    <X size={20} />
                  </button>
                )}
              </div>

              {!isVerifying && status === 'idle' && (
                <div className="px-6 pt-4">
                  <button 
                    onClick={fillTestCard}
                    className="w-full py-2 bg-[rgba(110,231,183,0.1)] border border-[rgba(110,231,183,0.2)] text-[#6EE7B7] text-[10px] uppercase font-800 tracking-widest rounded-lg hover:bg-[rgba(110,231,183,0.15)] transition-all"
                  >
                    ⚡ Quick Fill: Use Test Card
                  </button>
                </div>
              )}

              {isVerifying ? (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#818CF8]/10 flex items-center justify-center mx-auto mb-4">
                      <Smartphone size={32} className="text-[#818CF8]" />
                    </div>
                    <p className="text-sm text-[#94A3B8] mb-1">
                      {isFailSafe ? 'Email limit reached. Use Test Code below:' : 'Enter the 6-digit code sent to'}
                    </p>
                    {isFailSafe ? (
                      <p className="text-xl font-800 text-[#F59E0B] tracking-widest mb-2">123456</p>
                    ) : (
                      <p className="text-sm font-600 text-[#E2E8F0] mb-6">{email}</p>
                    )}

                    {deliveryError && (
                      <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
                        <p className="text-[10px] text-red-400 uppercase font-800 tracking-wider mb-1">Resend Error Log:</p>
                        <p className="text-xs text-red-200/80 font-inter leading-relaxed">{deliveryError}</p>
                        <p className="text-[10px] text-red-500/60 mt-2 italic">* Using Test Code mode automatically.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000"
                      className="w-full bg-[#12121A] border-2 border-white/10 rounded-xl px-4 py-4 text-center text-3xl font-grotesk tracking-[0.5em] focus:border-[#818CF8]/50 outline-none transition-all mb-6"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    />
                    
                    <button
                      onClick={handleVerify}
                      disabled={status === 'processing' || otpCode.length < 6}
                      className="w-full premium-btn py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {status === 'processing' ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <><ShieldCheck size={20} /> Verify & Activate Account</>
                      )}
                    </button>
                    
                    <div className="flex flex-col gap-2 mt-4 text-center">
                      {isFailSafe && (
                        <p className="text-[10px] text-[#F59E0B] font-700 uppercase tracking-widest">
                          Fail-Safe active: Use 123456
                        </p>
                      )}
                      <button 
                        onClick={triggerOtp}
                        disabled={status === 'processing'}
                        className="text-[10px] text-[#64748B] hover:text-[#94A3B8] transition-colors"
                      >
                        Didn't receive code? Resend
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Order Summary */}
                  <div className="mx-6 mt-6 p-4 rounded-xl bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.1)] flex items-center justify-between">
                    <div>
                      <p className="text-[#64748B] text-[10px] uppercase tracking-widest">Selected Plan</p>
                      <p className="font-600 text-sm capitalize">{planName} Subscription</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#64748B] text-[10px] uppercase tracking-widest">Total Amount</p>
                      <p className="font-grotesk font-800 text-xl text-[#F59E0B]">₹{amount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Method Switcher */}
                  <div className="p-6">
                    <div className="flex bg-[#12121A] p-1 rounded-xl mb-6">
                      <button 
                        onClick={() => setMethod('card')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-500 transition-all ${method === 'card' ? 'bg-[rgba(110,231,183,0.1)] text-[#6EE7B7] shadow-lg' : 'text-[#64748B]'}`}
                      >
                        <CreditCard size={18} /> Card
                      </button>
                      <button 
                        onClick={() => setMethod('qr')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-500 transition-all ${method === 'qr' ? 'bg-[rgba(110,231,183,0.1)] text-[#6EE7B7] shadow-lg' : 'text-[#64748B]'}`}
                      >
                        <QrCode size={18} /> UPI / QR
                      </button>
                    </div>

                    {/* Form Content */}
                    <AnimatePresence mode="wait">
                      {method === 'card' ? (
                        <motion.div 
                          key="card-form"
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-4"
                        >
                          <div className="space-y-1.5">
                            <label className="text-xs text-[#64748B]">Cardholder Name</label>
                            <input 
                              type="text" 
                              placeholder="ARJUN SHARMA"
                              className="w-full bg-[#12121A] border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:border-[#6EE7B7]/50 outline-none transition-all"
                              value={cardData.name}
                              onChange={(e) => handleCardInput('name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-[#64748B]">Card Number</label>
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder="4242 4242 4242 4242"
                                className="w-full bg-[#12121A] border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:border-[#6EE7B7]/50 outline-none transition-all pl-11"
                                value={cardData.number}
                                onChange={(e) => handleCardInput('number', e.target.value)}
                              />
                              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-[#374151]" size={18} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#64748B]">Expiry</label>
                              <input 
                                type="text" 
                                placeholder="MM/YY"
                                className="w-full bg-[#12121A] border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:border-[#6EE7B7]/50 outline-none transition-all"
                                value={cardData.expiry}
                                onChange={(e) => handleCardInput('expiry', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-[#64748B]">CVV</label>
                              <input 
                                type="password" 
                                placeholder="•••"
                                className="w-full bg-[#12121A] border border-white/5 rounded-lg px-4 py-2.5 text-sm focus:border-[#6EE7B7]/50 outline-none transition-all"
                                value={cardData.cvv}
                                onChange={(e) => handleCardInput('cvv', e.target.value)}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="qr-form"
                          initial={{ opacity: 0, x: 10 }} 
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-center py-6"
                        >
                          <div className="w-32 h-32 bg-white rounded-xl p-2 mx-auto mb-4 border-4 border-[#6EE7B7]/20 shadow-[0_0_20px_rgba(110,231,183,0.2)]">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GOLFF-SUBSCRIPTION-${amount}`}
                              alt="Payment QR"
                              className="w-full h-full grayscale opacity-80"
                            />
                          </div>
                          <p className="text-[#64748B] text-sm">Scan with any UPI app to pay</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <button
                      id="mock-pay-submit"
                      disabled={status === 'processing'}
                      onClick={triggerOtp}
                      className="w-full mt-8 premium-btn py-4 flex items-center justify-center gap-2 group overflow-hidden relative"
                    >
                      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      {status === 'processing' ? (
                        <><Loader2 className="animate-spin" size={20} /> Authorizing...</>
                      ) : (
                        <><ArrowRight size={20} /> Confirm Payment</>
                      )}
                    </button>

                    <div className="mt-6 flex items-center justify-center gap-4 border-t border-white/5 pt-6">
                      <div className="flex items-center gap-1.5 grayscale opacity-30">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
                      </div>
                      <div className="w-px h-4 bg-white/5" />
                      <div className="flex items-center gap-1.5 text-[#374151] text-[10px] uppercase font-700 tracking-tighter">
                        <ShieldCheck size={14} /> 256-bit Secure
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
