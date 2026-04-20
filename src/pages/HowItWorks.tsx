import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Target, Zap, Trophy, Heart, ArrowRight, HelpCircle, Shield, CheckCircle } from 'lucide-react'

const STEPS = [
  {
    step: '01', icon: <Target size={40} />, color: '#6EE7B7',
    title: 'Subscribe to Golff',
    desc: 'Choose Monthly (₹499) or Yearly (₹4,999). Select a charity partner from our verified list — a minimum of 10% of your subscription automatically goes to them.',
    details: ['Secure payment via Stripe', 'Cancel anytime (monthly)', 'Charity allocation starts from Day 1'],
  },
  {
    step: '02', icon: <Zap size={40} />, color: '#818CF8',
    title: 'Play Golf & Log Scores',
    desc: 'After each round, log your Stableford score (1–45) in your dashboard. We keep your 5 most recent scores — these become your 5 lucky numbers in the monthly draw.',
    details: ['Stableford scoring (1–45 points)', 'Up to 5 scores stored (rolling)', 'Enter before month-end draw date'],
  },
  {
    step: '03', icon: <Trophy size={40} />, color: '#F59E0B',
    title: 'Monthly Prize Draw',
    desc: 'At month-end, we draw 5 random numbers (1–45). Your 5 scores are compared against the winning numbers. Match 3, 4, or all 5 to win a share of the prize pool.',
    details: ['5-match jackpot rolls over if unclaimed', '4-match wins 35% of pool', '3-match wins 25% of pool'],
  },
  {
    step: '04', icon: <Heart size={40} />, color: '#F87171',
    title: 'Charity Impact',
    desc: 'Every subscription automatically contributes to your chosen charity. You can increase your charity % (up to 100%) anytime. Track total raised on each charity\'s page.',
    details: ['Minimum 10% goes to charity', 'Track impact on your dashboard', 'Change charity partner once/month'],
  },
]

const FAQS = [
  { q: 'What is Stableford scoring?', a: 'Stableford is a golf scoring system where you earn points based on how you play each hole relative to par. Most recreational golfers score between 20-40 points per round.' },
  { q: 'When are draws held?', a: 'Draws are held at the end of each calendar month. The admin runs the draw and publishes results. Winners are notified and can upload proof for verification.' },
  { q: 'How is the jackpot calculated?', a: 'The jackpot starts at 40% of the monthly prize pool. If no one matches all 5 numbers, it rolls over and accumulates month-over-month until someone wins.' },
  { q: 'Can I change my charity?', a: 'Yes! You can change your charity partner once per month through your Profile settings.' },
  { q: 'What if no one wins the jackpot?', a: 'The jackpot rolls over to the next month\'s prize pool. It keeps growing until someone matches all 5 winning numbers.' },
  { q: 'How do I claim my prize?', a: 'Winning users are identified automatically. Navigate to /winners/verify, upload a screenshot as proof, and the admin will approve and process your payout within 7 days.' },
]

export default function HowItWorks() {
  return (
    <div className="page-wrapper">
      {/* Hero */}
      <section className="py-20">
        <div className="section-container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="badge-accent text-xs uppercase tracking-widest">How It Works</span>
            <h1 className="font-syne font-800 text-5xl md:text-6xl mt-5 mb-6">
              Golf. Draw. <span className="gradient-text">Give.</span>
            </h1>
            <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto">
              Golff turns your Stableford scores into lottery numbers — while automatically funding the charity of your choice every month.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-10">
        <div className="section-container">
          <div className="space-y-8">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6 }}
                className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                <div className="glass-card p-8">
                  <div className="flex items-start gap-5">
                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0" style={{ background: `${step.color}15`, color: step.color }}>
                      {step.icon}
                    </div>
                    <div>
                      <span className="font-syne font-800" style={{ color: step.color, fontSize: '12px', letterSpacing: '0.1em' }}>STEP {step.step}</span>
                      <h2 className="font-syne font-800 text-2xl mt-1 mb-3">{step.title}</h2>
                      <p className="text-[#94A3B8] leading-relaxed text-sm">{step.desc}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {step.details.map((detail, di) => (
                    <motion.div
                      key={di}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: di * 0.1 }}
                      className="flex items-center gap-3 p-4 glass-card"
                    >
                      <CheckCircle size={18} style={{ color: step.color, flexShrink: 0 }} />
                      <span className="text-[#CBD5E1] text-sm">{detail}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize Distribution Visual */}
      <section className="py-20 bg-[rgba(18,18,26,0.5)]">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-syne font-800 text-4xl mb-4">How Your ₹499 is Split</h2>
            <p className="text-[#94A3B8]">Complete transparency — every rupee accounted for.</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-8">
              {[
                { label: 'Prize Pool', pct: 50, amount: 249.50, color: '#F59E0B', desc: 'Goes into the monthly draw prize pool' },
                { label: 'Charity', pct: 10, amount: 49.90, color: '#F87171', desc: 'Min 10% — you can increase this up to 100%' },
                { label: 'Platform', pct: 40, amount: 199.60, color: '#818CF8', desc: 'Operations, development, payment fees' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="mb-6 last:mb-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-syne font-700 text-lg" style={{ color: item.color }}>{item.label}</span>
                      <span className="text-[#64748B] text-sm ml-3">({item.pct}%)</span>
                    </div>
                    <span className="font-grotesk font-700" style={{ color: item.color }}>₹{item.amount}</span>
                  </div>
                  <div className="prize-bar mb-1">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: item.color }}
                    />
                  </div>
                  <p className="text-[#64748B] text-xs">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20">
        <div className="section-container">
          <div className="text-center mb-12">
            <h2 className="font-syne font-800 text-4xl mb-4 flex items-center justify-center gap-3">
              <HelpCircle className="text-[#818CF8]" /> Frequently Asked Questions
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {FAQS.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6"
              >
                <h3 className="font-syne font-700 text-lg mb-2">{faq.q}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-white/5">
        <div className="section-container text-center">
          <h2 className="font-syne font-800 text-4xl mb-4">Ready to Play?</h2>
          <p className="text-[#94A3B8] mb-8">Join hundreds of golfers already making a difference.</p>
          <Link to="/signup" id="howitworks-cta" className="premium-btn inline-flex items-center gap-2 px-8 py-4 text-base">
            Get Started for ₹499 <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  )
}
