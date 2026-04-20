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

      // ── Checkout completed → activate subscription OR confirm donation ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}

        // Independent donation
        if (meta.type === 'donation') {
          const { user_id, charity_id, amount } = meta
          if (!user_id) break

          // Mark donation completed
          await supabase.from('donations')
            .update({ status: 'completed' })
            .eq('stripe_payment_intent_id', session.payment_intent as string)

          // Update charity total_raised
          if (charity_id) {
            await supabase.rpc('increment_charity_raised', {
              charity_id_input: charity_id,
              amount_input: parseFloat(amount),
            })
          }

          // Send confirmation email
          await supabase.functions.invoke('send-email', {
            body: { type: 'donation_confirm', userId: user_id, charityId: charity_id, amount: parseFloat(amount) },
          })
          break
        }

        // Subscription checkout
        const userId = meta.user_id
        if (!userId) break

        const plan = meta.plan as 'monthly' | 'yearly'
        const charityId = meta.charity_id || null
        const charityPct = parseInt(meta.charity_pct ?? '10')
        const amount = plan === 'yearly' ? 4999 : 499
        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + (plan === 'yearly' ? 365 : 30))

        await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_start: now.toISOString(),
          subscription_end: end.toISOString(),
          charity_id: charityId,
          charity_contribution_pct: charityPct,
          stripe_subscription_id: session.subscription as string,
        }).eq('id', userId)

        // Record payment
        await supabase.from('subscription_payments').insert({
          user_id: userId,
          stripe_invoice_id: session.invoice as string ?? null,
          amount,
          plan,
          status: 'paid',
        })

        // Record charity donation
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

        // Send welcome email
        await supabase.functions.invoke('send-email', {
          body: { type: 'welcome', userId, plan, charityId },
        })
        break
      }

      // ── Invoice paid → renew subscription ──
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const sub = invoice.subscription
        if (!sub) break

        const subscription = await stripe.subscriptions.retrieve(sub as string)
        const userId = subscription.metadata?.user_id
        if (!userId) break

        const plan = subscription.metadata?.plan as 'monthly' | 'yearly' ?? 'monthly'
        const amount = invoice.amount_paid / 100 // Stripe uses paise

        const now = new Date()
        const end = new Date(now)
        end.setDate(end.getDate() + (plan === 'yearly' ? 365 : 30))

        await supabase.from('profiles').update({
          subscription_status: 'active',
          subscription_end: end.toISOString(),
        }).eq('id', userId)

        await supabase.from('subscription_payments').insert({
          user_id: userId,
          stripe_invoice_id: invoice.id,
          amount,
          plan,
          status: 'paid',
        })
        break
      }

      // ── Subscription cancelled or lapsed ──
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id
        if (!userId) break

        await supabase.from('profiles').update({
          subscription_status: 'cancelled',
        }).eq('id', userId)
        break
      }

      // ── Subscription updated (e.g. plan change) ──
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id
        if (!userId) break

        const status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'lapsed'
          : subscription.status === 'canceled' ? 'cancelled'
          : 'inactive'

        await supabase.from('profiles').update({ subscription_status: status }).eq('id', userId)
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
