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

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}
        const userId = session.client_reference_id || meta.user_id // 🛡️ Dual-Lookup
        if (!userId) {
          console.error('No user_id in session metadata or client_reference_id')
          break
        }

        const plan = meta.plan as 'monthly' | 'yearly'
        const charityId = meta.charity_id || null
        const charityPct = parseInt(meta.charity_pct ?? '10')
        const amount = plan === 'yearly' ? 4999 : 499
        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + (plan === 'yearly' ? 365 : 30))

        // 🛡️ IDEMPOTENCY CHECK: Ensure we haven't already processed this session
        const { data: existingPayment } = await supabase
          .from('subscription_payments')
          .select('id')
          .eq('stripe_invoice_id', session.invoice as string)
          .maybeSingle()
        
        if (existingPayment) {
          console.log('⚠️ Webhook already processed for this invoice. Skipping.')
          break
        }

        const { error: profileError } = await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_start: now.toISOString(),
          subscription_end: end.toISOString(),
          charity_id: charityId,
          charity_contribution_pct: charityPct,
          stripe_subscription_id: session.subscription as string,
          stripe_customer_id: session.customer as string,
        }).eq('id', userId)

        if (profileError) console.error('Error updating profile:', profileError)

        // 2. SECONDARY TASKS: Wrap in try/catch so they don't break the webhook
        try {
          // Record payment record
          await supabase.from('subscription_payments').insert({
            user_id: userId,
            stripe_invoice_id: session.invoice as string ?? null,
            amount,
            plan,
            status: 'paid',
          })

          // Record charity donation + Increment raised
          if (charityId) {
            const donationAmount = Math.round(amount * (charityPct / 100))
            await supabase.from('donations').insert({
              user_id: userId,
              charity_id: charityId,
              amount: donationAmount,
              type: 'subscription',
              status: 'completed',
            })
            await supabase.rpc('increment_charity_raised', {
              charity_id_input: charityId,
              amount_input: donationAmount,
            })
          }

          // Trigger email (silent fail)
          await supabase.functions.invoke('send-email', {
            body: { type: 'welcome', userId, plan, charityId },
          }).catch(e => console.error('Email failed but user is active:', e))
          
        } catch (secondaryError) {
          console.error('Secondary webhook tasks failed:', secondaryError)
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = invoice.subscription
        if (!sub) break

        const subscription = await stripe.subscriptions.retrieve(sub as string)
        const userId = subscription.metadata?.user_id
        if (!userId) break

        const plan = subscription.metadata?.plan as 'monthly' | 'yearly' ?? 'monthly'
        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + (plan === 'yearly' ? 365 : 30))

        await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_end: end.toISOString(),
        }).eq('id', userId)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
