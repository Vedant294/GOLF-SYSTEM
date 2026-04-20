import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      throw new Error('Email and OTP are required')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Golff <onboarding@resend.dev>',
        to: [email],
        subject: `${otp} is your Golff verification code`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;600&display=swap" rel="stylesheet">
              <style>
                body { font-family: 'Inter', sans-serif; background-color: #0A0A0F; color: #E2E8F0; padding: 40px; }
                .container { max-width: 600px; margin: 0 auto; background-color: #12121A; border: 1px solid rgba(110,231,183,0.1); border-radius: 24px; padding: 40px; text-align: center; }
                .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 24px; color: #FFFFFF; display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 32px; }
                .icon { width: 48px; height: 48px; background: linear-gradient(135deg, #6EE7B7, #3B82F6); border-radius: 12px; display: inline-block; margin-right: 12px; vertical-align: middle; }
                h1 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 16px; color: #FFFFFF; }
                p { color: #94A3B8; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
                .otp-card { background: rgba(110,231,183,0.05); border: 1px dashed rgba(110,231,183,0.3); border-radius: 16px; padding: 24px; margin-bottom: 32px; }
                .otp-code { font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #6EE7B7; margin: 0; }
                .footer { color: #64748B; font-size: 12px; margin-top: 40px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <div class="icon"></div>
                  Golff Platform
                </div>
                <h1>Verify Your Payment</h1>
                <p>To complete your charity subscription and enter this month's draw, please enter the following verification code:</p>
                <div class="otp-card">
                  <div class="otp-code">${otp}</div>
                </div>
                <p style="font-size: 14px;">This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.</p>
                <div class="footer">
                  © 2026 Golff Platform. Making an impact through golf.
                </div>
              </div>
            </body>
          </html>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.status,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
