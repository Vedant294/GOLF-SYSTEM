import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { sessionId } = await req.json()
    if (!sessionId) throw new Error('sessionId is required')

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status === 'paid') {
      const userId = session.client_reference_id || session.metadata?.user_id
      if (!userId) throw new Error('No user identity found in session')

      // OPTIMIZATION: Instead of waiting for webhook, we update the status NOW.
      // This makes the UI redirect in 1-2 seconds instead of 10.
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', userId)
        .single()

      if (profile?.subscription_status !== 'active') {
        const plan = (session.client_reference_id ? session.metadata?.plan : session.metadata?.plan) || 'monthly'
        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + (plan === 'yearly' ? 365 : 30))

        // 1. Force update profile
        await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_start: now.toISOString(),
          subscription_end: end.toISOString(),
          stripe_subscription_id: session.subscription as string,
        }).eq('id', userId)

        // 2. Force create payment record (This is what was missing!)
        const amount = plan === 'yearly' ? 4999 : 499
        await supabase.from('subscription_payments').insert({
          user_id: userId,
          stripe_invoice_id: session.invoice as string || `manual_${Date.now()}`,
          amount,
          plan,
          status: 'paid',
        })

        // 3. Force create donation log
        const charityId = session.metadata?.charity_id
        const charityPct = parseInt(session.metadata?.charity_pct || '10')
        if (charityId) {
          const donationAmount = Math.round(amount * (charityPct / 100))
          await supabase.from('donations').insert({
            user_id: userId,
            charity_id: charityId,
            amount: donationAmount,
            type: 'subscription',
            status: 'completed',
          })
          await supabase.rpc('increment_charity_raised', { charity_id_input: charityId, amount_input: donationAmount })
        }
      }

      return new Response(
        JSON.stringify({ paid: true, subscription_status: 'active' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ paid: false, subscription_status: 'inactive' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
