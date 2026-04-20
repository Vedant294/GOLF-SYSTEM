import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM = 'Golff <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ── Send via Resend ──
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  return res.json()
}

// ── Email templates ──
function baseTemplate(content: string) {
  return `<!DOCTYPE html><html><head>
    <style>
      body{font-family:Inter,sans-serif;background:#0A0A0F;color:#E2E8F0;margin:0;padding:40px}
      .wrap{max-width:600px;margin:0 auto;background:#12121A;border:1px solid rgba(110,231,183,0.15);border-radius:24px;padding:40px}
      .logo{font-size:22px;font-weight:800;color:#fff;text-align:center;margin-bottom:32px;letter-spacing:-0.04em}
      .logo span{color:#6EE7B7}
      h1{font-size:26px;font-weight:800;color:#fff;margin:0 0 12px;letter-spacing:-0.03em}
      p{color:#94A3B8;font-size:15px;line-height:1.7;margin:0 0 20px}
      .card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;margin:20px 0}
      .btn{display:inline-block;background:linear-gradient(135deg,#6EE7B7,#3B82F6);color:#0A0A0F;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;margin:8px 0}
      .gold{color:#F59E0B;font-weight:700}
      .green{color:#6EE7B7;font-weight:700}
      .num{font-size:40px;font-weight:800;letter-spacing:8px;color:#6EE7B7;text-align:center;padding:16px 0}
      .ball{display:inline-block;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#F59E0B,#D97706);color:#0A0A0F;font-weight:800;font-size:16px;text-align:center;line-height:44px;margin:4px}
      .footer{color:#374151;font-size:12px;text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.05)}
    </style></head><body>
    <div class="wrap">
      <div class="logo">⛳ <span>Golff</span> Platform</div>
      ${content}
      <div class="footer">© 2026 Golff Platform · Making an impact through golf</div>
    </div></body></html>`
}

function welcomeTemplate(name: string, plan: string, charityName: string) {
  return baseTemplate(`
    <h1>Welcome to Golff, ${name}! 🎉</h1>
    <p>Your <span class="green">${plan}</span> subscription is now active. You're officially part of the Golff community — where every round you play funds a cause you care about.</p>
    <div class="card">
      <p style="margin:0"><strong style="color:#fff">Your charity:</strong> <span class="gold">${charityName || 'Not selected yet'}</span></p>
      <p style="margin:8px 0 0"><strong style="color:#fff">Next step:</strong> Log your first 5 Stableford scores to enter this month's draw.</p>
    </div>
    <p>Head to your dashboard to get started:</p>
    <a href="${Deno.env.get('APP_URL') ?? 'https://golff.vercel.app'}/dashboard" class="btn">Go to Dashboard →</a>
  `)
}

function drawResultsTemplate(name: string, drawnNumbers: number[], matchCount: number, prizeAmount: number, month: string) {
  const balls = drawnNumbers.map(n => `<span class="ball">${n}</span>`).join('')
  const won = matchCount >= 3
  return baseTemplate(`
    <h1>${month} Draw Results 🏆</h1>
    <p>Hi ${name}, the monthly draw has been published. Here are the winning numbers:</p>
    <div class="card" style="text-align:center">${balls}</div>
    ${won
      ? `<div class="card" style="border-color:rgba(110,231,183,0.3);background:rgba(110,231,183,0.05)">
          <p style="margin:0;color:#6EE7B7;font-weight:700;font-size:18px">🎉 You matched ${matchCount} numbers!</p>
          <p style="margin:8px 0 0">Your prize: <span class="gold" style="font-size:24px">₹${prizeAmount.toLocaleString('en-IN')}</span></p>
          <p style="margin:8px 0 0;font-size:13px">Upload your proof to claim your prize.</p>
        </div>
        <a href="${Deno.env.get('APP_URL') ?? 'https://golff.vercel.app'}/winners/verify" class="btn">Claim Prize →</a>`
      : `<div class="card">
          <p style="margin:0">You matched <strong style="color:#fff">${matchCount}</strong> number${matchCount !== 1 ? 's' : ''} this month. Keep playing — the jackpot rolls over!</p>
        </div>
        <a href="${Deno.env.get('APP_URL') ?? 'https://golff.vercel.app'}/scores" class="btn">Add Scores for Next Draw →</a>`
    }
  `)
}

function winnerAlertTemplate(name: string, matchType: string, prizeAmount: number) {
  return baseTemplate(`
    <h1>You're a Winner! 🏆</h1>
    <p>Congratulations ${name}! Your <span class="gold">${matchType}</span> win has been verified by our team.</p>
    <div class="card" style="text-align:center">
      <p style="margin:0;color:#94A3B8;font-size:13px">Prize Amount</p>
      <p class="gold" style="font-size:36px;font-weight:800;margin:8px 0">₹${prizeAmount.toLocaleString('en-IN')}</p>
      <p style="margin:0;color:#6EE7B7;font-size:13px">Payment will be processed within 7 days</p>
    </div>
    <a href="${Deno.env.get('APP_URL') ?? 'https://golff.vercel.app'}/dashboard" class="btn">View Dashboard →</a>
  `)
}

function otpTemplate(otp: string, amount: number) {
  return baseTemplate(`
    <h1>Verify Your Payment</h1>
    <p>Enter the code below to complete your ₹${amount.toLocaleString('en-IN')} subscription:</p>
    <div class="card"><div class="num">${otp}</div></div>
    <p style="font-size:13px;color:#64748B">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
  `)
}

function donationConfirmTemplate(name: string, charityName: string, amount: number) {
  return baseTemplate(`
    <h1>Donation Confirmed 💚</h1>
    <p>Hi ${name}, your donation to <span class="gold">${charityName}</span> has been processed.</p>
    <div class="card" style="text-align:center">
      <p style="margin:0;color:#94A3B8;font-size:13px">Amount Donated</p>
      <p class="green" style="font-size:32px;font-weight:800;margin:8px 0">₹${amount.toLocaleString('en-IN')}</p>
    </div>
    <p>Thank you for making a difference. Every rupee counts.</p>
    <a href="${Deno.env.get('APP_URL') ?? 'https://golff.vercel.app'}/charities" class="btn">View Charity Impact →</a>
  `)
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { type } = body
    let result

    switch (type) {

      case 'otp': {
        const { email, otp, amount } = body
        result = await sendEmail(email, `${otp} is your Golff verification code`, otpTemplate(otp, amount ?? 0))
        break
      }

      case 'welcome': {
        const { userId, plan, charityId } = body
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
        let charityName = ''
        if (charityId) {
          const { data: charity } = await supabase.from('charities').select('name').eq('id', charityId).single()
          charityName = charity?.name ?? ''
        }
        result = await sendEmail(
          profile!.email,
          'Welcome to Golff — Your subscription is active!',
          welcomeTemplate(profile!.full_name ?? 'Golfer', plan, charityName)
        )
        break
      }

      case 'draw_results': {
        // Broadcast to all active subscribers with their personal match results
        const { drawId } = body
        const { data: draw } = await supabase.from('draws').select('*').eq('id', drawId).single()
        if (!draw) throw new Error('Draw not found')

        const month = new Date(draw.year, draw.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
        const { data: entries } = await supabase
          .from('draw_entries')
          .select('*, profiles(email, full_name)')
          .eq('draw_id', drawId)

        const results = await Promise.allSettled(
          (entries ?? []).map(async (entry: any) => {
            const profile = entry.profiles
            if (!profile?.email) return
            return sendEmail(
              profile.email,
              `${month} Draw Results — Golff`,
              drawResultsTemplate(
                profile.full_name ?? 'Golfer',
                draw.drawn_numbers ?? [],
                entry.match_count,
                entry.prize_amount,
                month
              )
            )
          })
        )
        result = { sent: results.filter(r => r.status === 'fulfilled').length }
        break
      }

      case 'winner_alert': {
        const { winnerId } = body
        const { data: winner } = await supabase
          .from('winners')
          .select('*, profiles(email, full_name)')
          .eq('id', winnerId)
          .single()
        if (!winner) throw new Error('Winner not found')
        const profile = (winner as any).profiles
        result = await sendEmail(
          profile.email,
          '🏆 Your Golff prize has been approved!',
          winnerAlertTemplate(profile.full_name ?? 'Golfer', winner.match_type, winner.prize_amount)
        )
        break
      }

      case 'donation_confirm': {
        const { userId, charityId, amount } = body
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
        const { data: charity } = await supabase.from('charities').select('name').eq('id', charityId).single()
        result = await sendEmail(
          profile!.email,
          'Donation confirmed — Golff',
          donationConfirmTemplate(profile!.full_name ?? 'Golfer', charity?.name ?? '', amount)
        )
        break
      }

      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
