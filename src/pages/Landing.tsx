import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { Trophy, Heart, Target, Zap, ChevronRight, Star, Shield, ArrowRight, TrendingUp, Users, Gift, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Animated counter component ──
function AnimatedCounter({ end, prefix = '', suffix = '', decimals = 0 }: {
  end: number; prefix?: string; suffix?: string; decimals?: number
}) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    let start = 0
    const duration = 2200
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(decimals > 0 ? parseFloat(start.toFixed(decimals)) : Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [isInView, end])

  return (
    <span ref={ref} className="stat-number">
      {prefix}{decimals > 0 ? count.toFixed(decimals) : count.toLocaleString('en-IN')}{suffix}
    </span>
  )
}

// ── Floating orb background ──
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4], x: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(110,231,183,0.12) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.6, 0.3], x: [0, -20, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-[20%] right-[5%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)' }}
      />
    </div>
  )
}

const STATS = [
  { label: 'Active Golfers', value: 847, suffix: '+', color: '#6EE7B7', prefix: '' },
  { label: 'Prize Pool', value: 182450, suffix: '', color: '#F59E0B', prefix: '₹' },
  { label: 'Raised for Charity', value: 3.68, suffix: 'L+', color: '#818CF8', prefix: '₹', decimals: 2 },
  { label: 'Winners Paid Out', value: 23, suffix: '', color: '#F87171', prefix: '' },
]

const STEPS = [
  {
    step: '01', color: '#6EE7B7',
    icon: <Target size={26} />,
    title: 'Subscribe — takes 3 minutes',
    desc: '₹499/month or ₹4,999/year. Pick the charity you care about. Your first draw entry lands the moment you join.',
    tag: 'Zero friction',
  },
  {
    step: '02', color: '#818CF8',
    icon: <Zap size={26} />,
    title: 'Log scores after every round',
    desc: 'Your 5 most recent Stableford points become your personal lottery numbers. No extra steps. No guessing.',
    tag: 'Automatic',
  },
  {
    step: '03', color: '#F59E0B',
    icon: <Trophy size={26} />,
    title: 'Draw night — last day, every month',
    desc: 'We draw 5 numbers publicly. Match 3 and pocket cash. Match all 5? The jackpot is yours — completely.',
    tag: 'Every month',
  },
  {
    step: '04', color: '#F87171',
    icon: <Heart size={26} />,
    title: 'Your round fed someone today',
    desc: "While you drove home from the course, your subscription quietly funded a child's meal or an elder's medicine.",
    tag: 'Real impact',
  },
]

const PRIZES = [
  {
    tier: 'JACKPOT',
    match: '5 Numbers',
    share: '40%',
    rollover: true,
    color: '#F59E0B',
    glow: 'rgba(245,158,11,0.3)',
    desc: 'Rolls over every month until claimed',
  },
  {
    tier: 'MAJOR',
    match: '4 Numbers',
    share: '35%',
    rollover: false,
    color: '#818CF8',
    glow: 'rgba(129,140,248,0.3)',
    desc: 'Split equally among all 4-match winners',
  },
  {
    tier: 'PRIZE',
    match: '3 Numbers',
    share: '25%',
    rollover: false,
    color: '#6EE7B7',
    glow: 'rgba(110,231,183,0.3)',
    desc: 'Split equally among all 3-match winners',
  },
]

const CHARITIES = [
  {
    name: 'CRY India',
    category: 'Child Rights',
    impact: '3M+ children helped',
    raised: 84200,
    img: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=300&fit=crop',
    color: '#F87171',
  },
  {
    name: 'Akshaya Patra',
    category: 'Midday Meals',
    impact: '2M+ meals daily',
    raised: 121000,
    img: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&h=300&fit=crop',
    color: '#F59E0B',
  },
  {
    name: 'Smile Foundation',
    category: 'Education',
    impact: '1.5M+ lives touched',
    raised: 95500,
    img: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&h=300&fit=crop',
    color: '#818CF8',
  },
  {
    name: 'HelpAge India',
    category: 'Elder Care',
    impact: 'Since 1978',
    raised: 67800,
    img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop',
    color: '#6EE7B7',
  },
]

const TESTIMONIALS = [
  {
    name: 'Rajesh Mehta',
    location: 'Mumbai',
    score: '4-match winner',
    prize: '₹8,750',
    text: 'Never thought my love for golf could fund a child\'s education. Golff made it real. Won ₹8,750 on my 3rd month!',
    avatar: 'R',
  },
  {
    name: 'Priya Sharma',
    location: 'Delhi',
    score: '3-match winner',
    prize: '₹4,200',
    text: 'The best part? Every month I know my subscription makes a real difference. Winning was just the bonus!',
    avatar: 'P',
  },
  {
    name: 'Arun Nair',
    location: 'Bangalore',
    score: '5-match JACKPOT',
    prize: '₹42,000',
    text: 'HIT THE JACKPOT! My 5 Stableford scores matched perfectly. Golff is now my favourite part of golf.',
    avatar: 'A',
  },
]

export default function Landing() {
  const [subscriberCount, setSubscriberCount] = useState(847)
  const [prizePool] = useState(182450)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  useEffect(() => {
    const fetchStats = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active')
      if (count && count > 0) setSubscriberCount(count)
    }
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden pt-20">
        <FloatingOrbs />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="section-container relative z-10 py-24 w-full">
          <div className="max-w-5xl mx-auto text-center">

            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-2.5 glass-card px-5 py-2.5 mb-10 cursor-default"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6EE7B7] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#6EE7B7]" />
              </span>
              <span className="text-[#6EE7B7] font-outfit font-600 text-sm tracking-wide">
                {subscriberCount.toLocaleString('en-IN')} golfers playing • Next draw in {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} days
              </span>
            </motion.div>

            {/* Main headline — clean 3-line hook */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <h1 className="font-outfit font-900 leading-[0.92] mb-2" style={{ fontSize: 'clamp(52px, 9vw, 108px)', letterSpacing: '-0.04em' }}>
                <span className="block text-white">Your score.</span>
                <span className="block" style={{ background: 'linear-gradient(135deg, #6EE7B7 0%, #818CF8 50%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Their meal.
                </span>
                <span className="block text-white">Your ₹42,000.</span>
              </h1>
            </motion.div>

            {/* Sub-copy — simple, single hook sentence */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="font-jakarta text-[#94A3B8] text-lg md:text-xl mt-8 mb-12 max-w-xl mx-auto leading-relaxed"
            >
              Log your Stableford scores. We turn them into your monthly draw numbers —{' '}
              <span className="text-white font-500">win real cash</span>,{' '}
              fund a charity you believe in,{' '}
              <span className="text-[#6EE7B7] font-500">automatically.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                to="/signup"
                id="hero-cta"
                className="group relative premium-btn text-base px-9 py-4 inline-flex items-center gap-2.5 font-outfit font-700"
              >
                Start for ₹499/month
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/how-it-works" className="outline-btn text-base px-8 py-4 font-outfit font-600">
                See How It Works
              </Link>
            </motion.div>

            {/* Trust row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-10 text-[#64748B] text-sm font-jakarta"
            >
              {[
                { icon: <Shield size={14} />, text: 'Stripe Secured' },
                { icon: <CheckCircle size={14} />, text: 'Cancel Anytime' },
                { icon: <Users size={14} />, text: '847+ Members' },
                { icon: <Gift size={14} />, text: '23 Winners Paid' },
              ].map(t => (
                <div key={t.text} className="flex items-center gap-1.5">
                  <span className="text-[#6EE7B7]">{t.icon}</span>
                  {t.text}
                </div>
              ))}
            </motion.div>

            {/* Prize pool card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 100 }}
              className="mt-16 glass-card p-8 inline-block relative overflow-hidden"
              style={{ boxShadow: '0 0 80px rgba(245,158,11,0.15)' }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
              <p className="text-[#64748B] font-jakarta text-xs uppercase tracking-[0.15em] mb-1">Current Prize Pool</p>
              <p className="font-outfit font-900 text-5xl md:text-6xl leading-none" style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-0.04em' }}>
                ₹<AnimatedCounter end={prizePool} />
              </p>
              <p className="text-[#64748B] font-jakarta text-xs mt-2">Jackpot grows every month until someone wins all 5 🏆</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#374151]"
        >
          <ChevronRight size={22} className="rotate-90" />
        </motion.div>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="py-16 border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(110,231,183,0.03), transparent)' }} />
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="font-outfit font-900 text-4xl md:text-5xl mb-2 leading-none" style={{ color: stat.color, letterSpacing: '-0.04em' }}>
                  {stat.prefix}<AnimatedCounter end={stat.value} suffix={stat.suffix} decimals={(stat as any).decimals || 0} />
                </p>
                <p className="text-[#64748B] font-jakarta text-sm font-500 uppercase tracking-[0.1em]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-28">
        <div className="section-container">
          <div className="text-center mb-20">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-jakarta font-600 text-[#6EE7B7] text-sm uppercase tracking-[0.2em] mb-4"
            >
              No luck required. Just golf.
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-outfit font-800 mb-5 leading-none"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.04em' }}
            >
              <span className="text-[#475569] font-400" style={{ fontStyle: 'italic', fontSize: '0.7em', display: 'block', fontFamily: 'Plus Jakarta Sans' }}>From tee-off to</span>
              <span style={{ background: 'linear-gradient(135deg, #6EE7B7, #818CF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                prize in 4 steps
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[#64748B] font-jakarta max-w-xl mx-auto text-lg leading-relaxed"
            >
              You play the same golf you always did. We handle everything else.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Connector line (desktop) */}
            <div className="absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent hidden lg:block" />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 100 }}
                className="glass-card-hover p-7 relative group"
              >
                {/* Step badge */}
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-outfit font-800"
                  style={{ background: `${step.color}20`, color: step.color, border: `1px solid ${step.color}40` }}>
                  {i + 1}
                </div>

                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                  style={{ background: `${step.color}15`, color: step.color }}>
                  {step.icon}
                </div>

                <span className="font-jakarta text-xs font-700 uppercase tracking-[0.15em] mb-3 inline-block px-2.5 py-1 rounded-full"
                  style={{ background: `${step.color}15`, color: step.color }}>
                  {step.tag}
                </span>

                <h3 className="font-outfit font-700 text-lg mb-3 leading-tight" style={{ letterSpacing: '-0.02em' }}>
                  {step.title}
                </h3>
                <p className="text-[#64748B] font-jakarta text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIZE STRUCTURE ── */}
      <section className="py-28" style={{ background: 'linear-gradient(180deg, transparent, rgba(18,18,26,0.8), transparent)' }}>
        <div className="section-container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="font-jakarta font-600 text-[#F59E0B] text-sm uppercase tracking-[0.2em] mb-4">
                Your ₹499 works harder than you think
              </motion.p>
              <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="font-outfit font-800 mb-5 leading-none"
                style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.04em' }}>
                <span className="text-[#475569] font-400 block" style={{ fontStyle: 'italic', fontSize: '0.65em', fontFamily: 'Plus Jakarta Sans' }}>Half your subscription is</span>
                <span style={{ background: 'linear-gradient(135deg, #F59E0B, #FCD34D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  waiting for you to claim it.
                </span>
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="text-[#64748B] font-jakarta text-lg max-w-xl mx-auto">
                50% of every subscription goes into the prize pool. The rest feeds charities and keeps the lights on.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {PRIZES.map((prize, i) => (
                <motion.div
                  key={prize.tier}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="glass-card p-8 text-center relative overflow-hidden cursor-default"
                  style={{ borderColor: `${prize.color}30`, boxShadow: `0 0 40px ${prize.glow}` }}
                >
                  <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 0%, ${prize.color}08 0%, transparent 60%)` }} />

                  {prize.rollover && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-outfit font-700 tracking-widest uppercase"
                      style={{ background: `${prize.color}20`, color: prize.color, border: `1px solid ${prize.color}40` }}>
                      🔄 Rolls Over
                    </div>
                  )}

                  <p className="font-outfit font-800 text-xs tracking-[0.25em] uppercase mt-6 mb-2"
                    style={{ color: prize.color }}>
                    {prize.tier}
                  </p>

                  <p className="font-outfit font-900 text-6xl mb-1 leading-none"
                    style={{ color: prize.color, letterSpacing: '-0.04em', textShadow: `0 0 40px ${prize.glow}` }}>
                    {prize.share}
                  </p>
                  <p className="text-[#64748B] font-jakarta text-xs mb-6">of prize pool</p>

                  <div className="border-t pt-5" style={{ borderColor: `${prize.color}20` }}>
                    <p className="font-outfit font-700 text-xl mb-1" style={{ color: prize.color }}>{prize.match}</p>
                    <p className="text-[#64748B] font-jakarta text-xs leading-relaxed">{prize.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Prize pool explainer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10 glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <p className="text-[#94A3B8] font-jakarta text-sm text-center md:text-left">
                With 100 active members: <span className="text-white font-600">₹24,950 pool</span> →
                Jackpot <span className="text-[#F59E0B] font-600">₹9,980</span> ·
                4-match <span className="text-[#818CF8] font-600">₹8,733</span> ·
                3-match <span className="text-[#6EE7B7] font-600">₹6,238</span>
              </p>
              <Link to="/signup?plan=monthly" id="monthly-plan-cta" className="outline-btn text-sm py-2.5 px-6 whitespace-nowrap font-outfit font-600">
                Claim Your Spot →
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CHARITY PARTNERS ── */}
      <section className="py-28">
        <div className="section-container">
          <div className="text-center mb-20">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="font-jakarta font-600 text-[#F87171] text-sm uppercase tracking-[0.2em] mb-4">
              Because golf is better when it means something
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-outfit font-800 mb-5 leading-none"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.04em' }}>
              <span className="text-[#475569] font-400 block" style={{ fontStyle: 'italic', fontSize: '0.65em', fontFamily: 'Plus Jakarta Sans' }}>Pick the cause</span>
              <span style={{ background: 'linear-gradient(135deg, #F87171, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                you'll fight for.
              </span>
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="text-[#64748B] font-jakarta text-lg max-w-xl mx-auto">
              Your minimum 10% goes automatically. Increase it any time you want to do more.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CHARITIES.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-hover overflow-hidden group"
              >
                <div className="h-44 overflow-hidden relative">
                  <img
                    src={c.img} alt={c.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <span className="font-jakarta text-xs font-700 px-2.5 py-1 rounded-full"
                      style={{ background: `${c.color}25`, color: c.color, border: `1px solid ${c.color}40` }}>
                      {c.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-outfit font-700 text-base mb-1 leading-tight" style={{ letterSpacing: '-0.02em' }}>{c.name}</h3>
                  <p className="font-jakarta text-xs text-[#64748B] mb-3">{c.impact}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-grotesk font-700 text-sm" style={{ color: c.color }}>
                      ₹{c.raised.toLocaleString('en-IN')} raised
                    </p>
                    <TrendingUp size={14} style={{ color: c.color }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/charities" className="outline-btn inline-flex items-center gap-2 font-outfit font-600">
              View All 6 Charities <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TESTIMONIALS ── */}
      <section className="py-28" style={{ background: 'linear-gradient(180deg, transparent, rgba(18,18,26,0.6), transparent)' }}>
        <div className="section-container">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="font-jakarta font-600 text-[#818CF8] text-sm uppercase tracking-[0.2em] mb-4">
              Don't take our word for it
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-outfit font-800 leading-none"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.04em' }}>
              <span className="text-[#475569] font-400 block" style={{ fontStyle: 'italic', fontSize: '0.65em', fontFamily: 'Plus Jakarta Sans' }}>People who almost didn't join —</span>
              <span style={{ background: 'linear-gradient(135deg, #818CF8, #6EE7B7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                then won.
              </span>
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-7 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-5"
                  style={{ background: i === 2 ? '#F59E0B' : i === 0 ? '#818CF8' : '#6EE7B7' }} />

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} size={13} className="text-[#F59E0B] fill-[#F59E0B]" />
                  ))}
                </div>

                <p className="font-jakarta text-[#CBD5E1] text-sm leading-relaxed mb-6">"{t.text}"</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6EE7B7] to-[#818CF8] flex items-center justify-center font-outfit font-800 text-[#0A0A0F]">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-outfit font-700 text-sm">{t.name}</p>
                      <p className="text-[#64748B] font-jakarta text-xs">{t.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-grotesk font-700 text-[#F59E0B] text-sm">{t.prize}</p>
                    <p className="text-[#64748B] font-jakarta text-xs">{t.score}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-28">
        <div className="section-container">
          <div className="text-center mb-16">
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="font-jakarta font-600 text-[#6EE7B7] text-sm uppercase tracking-[0.2em] mb-4">
              Two plans. One purpose.
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-outfit font-800 leading-none"
              style={{ fontSize: 'clamp(36px, 5vw, 60px)', letterSpacing: '-0.04em' }}>
              <span className="text-[#475569] font-400 block" style={{ fontStyle: 'italic', fontSize: '0.65em', fontFamily: 'Plus Jakarta Sans' }}>Start today.</span>
              <span className="gradient-text">No surprises, ever.</span>
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">

            {/* Monthly */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-8 flex flex-col"
            >
              <div>
                <p className="text-[#64748B] font-jakarta text-sm mb-1">Monthly</p>
                <h3 className="font-outfit font-900 text-5xl mb-1 leading-none" style={{ letterSpacing: '-0.04em' }}>₹499</h3>
                <p className="text-[#64748B] font-jakarta text-sm mb-8">per month · cancel anytime</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Monthly prize draw entry', '₹249.50 → prize pool', '₹49.90+ → your charity', '5 Stableford score slots', 'Full dashboard access'].map(f => (
                  <li key={f} className="flex items-start gap-3 font-jakarta text-sm text-[#CBD5E1]">
                    <CheckCircle size={15} className="text-[#6EE7B7] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup?plan=monthly" className="outline-btn block text-center font-outfit font-700 py-3.5">
                Get Started Monthly
              </Link>
            </motion.div>

            {/* Yearly */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="glass-card p-8 flex flex-col relative overflow-hidden"
              style={{ borderColor: 'rgba(110,231,183,0.3)', boxShadow: '0 0 60px rgba(110,231,183,0.08)' }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 80% 0%, rgba(110,231,183,0.07) 0%, transparent 60%)' }} />
              <div className="absolute top-5 right-5 badge-active text-xs font-outfit font-700 tracking-wider">BEST VALUE</div>

              <div className="relative">
                <p className="text-[#6EE7B7] font-jakarta text-sm mb-1 font-600">Yearly · Save ₹999</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <h3 className="font-outfit font-900 text-5xl leading-none" style={{ letterSpacing: '-0.04em' }}>₹4,999</h3>
                  <span className="text-[#374151] font-jakarta text-sm line-through">₹5,988</span>
                </div>
                <p className="text-[#64748B] font-jakarta text-sm mb-8">per year · 2 months free</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {['12 draw entries per year', '₹2,994 → prize pool', '₹598.80+ → your charity', 'Priority winner verification', 'Exclusive yearly badge'].map(f => (
                  <li key={f} className="flex items-start gap-3 font-jakarta text-sm text-[#CBD5E1]">
                    <CheckCircle size={15} className="text-[#6EE7B7] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/signup?plan=yearly" id="yearly-plan-cta" className="premium-btn block text-center font-outfit font-700 py-3.5">
                Get Yearly — Best Value
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section className="py-16 border-t border-white/5">
        <div className="section-container">
          <div className="grid md:grid-cols-3 gap-10 text-center">
            {[
              { icon: <Shield size={28} />, color: '#6EE7B7', title: 'Stripe Secured', desc: 'PCI DSS compliant payments. Your card data never touches our servers.' },
              { icon: <Heart size={28} />, color: '#F87171', title: 'Verified NGOs Only', desc: 'All charity partners are registered with complete audit trails and transparency reports.' },
              { icon: <TrendingUp size={28} />, color: '#818CF8', title: 'Public Draw Results', desc: 'Every draw is documented, timestamped, and publicly verifiable. Zero manipulation.' },
            ].map((t, i) => (
              <motion.div
                key={t.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: `${t.color}15`, color: t.color }}>
                  {t.icon}
                </div>
                <h3 className="font-outfit font-700 text-lg mb-2" style={{ letterSpacing: '-0.02em' }}>{t.title}</h3>
                <p className="text-[#64748B] font-jakarta text-sm leading-relaxed max-w-xs mx-auto">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-32">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-14 md:p-20 text-center relative overflow-hidden max-w-4xl mx-auto"
            style={{ boxShadow: '0 0 120px rgba(110,231,183,0.08)' }}
          >
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(110,231,183,0.12) 0%, transparent 60%)' }} />
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#6EE7B7] to-[#3B82F6] flex items-center justify-center mx-auto mb-8"
                style={{ boxShadow: '0 0 60px rgba(110,231,183,0.4)' }}
              >
                <Trophy size={44} className="text-[#0A0A0F]" />
              </motion.div>

              <h2 className="font-outfit font-900 leading-none mb-6" style={{ fontSize: 'clamp(38px, 5vw, 64px)', letterSpacing: '-0.04em' }}>
                <span className="text-[#475569] font-400 block mb-2" style={{ fontStyle: 'italic', fontSize: '0.55em', fontFamily: 'Plus Jakarta Sans' }}>The round you played last Saturday?</span>
                <span className="text-white block">It just became</span>
                <span style={{ background: 'linear-gradient(135deg, #6EE7B7, #818CF8, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  a lottery ticket.
                </span>
              </h2>
              <p className="text-[#94A3B8] font-jakarta text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                <span className="text-white font-600">847 golfers</span> across India are already winning prizes{' '}
                and funding causes they believe in —{' '}
                <span className="text-[#6EE7B7] font-600" style={{ fontStyle: 'italic' }}>on the same rounds they already play.</span>
              </p>

              <Link to="/signup" id="final-cta" className="premium-btn text-xl px-12 py-5 inline-flex items-center gap-3 font-outfit font-800 group">
                Start Playing for ₹499
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <p className="text-[#374151] font-jakarta text-xs mt-6">
                No commitment. Cancel anytime. First draw entry on signup.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-14">
        <div className="section-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6EE7B7] to-[#3B82F6] flex items-center justify-center">
                <Trophy size={17} className="text-[#0A0A0F]" />
              </div>
              <div>
                <p className="font-outfit font-800 text-white text-lg leading-none" style={{ letterSpacing: '-0.03em' }}>Golff</p>
                <p className="text-[#374151] text-xs font-jakarta">Play. Win. Give.</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              {[
                { to: '/how-it-works', label: 'How It Works' },
                { to: '/charities', label: 'Charities' },
                { to: '/draws', label: 'Draws' },
                { to: '/login', label: 'Login' },
              ].map(link => (
                <Link key={link.to} to={link.to} className="text-[#64748B] hover:text-[#94A3B8] text-sm font-jakarta transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
            <p className="text-[#1F2937] text-xs font-jakarta text-center">© 2026 Golff · Stripe Test Mode · digitalheroes.co.in</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
