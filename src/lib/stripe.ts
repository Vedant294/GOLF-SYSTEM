import { loadStripe, type Stripe } from '@stripe/stripe-js'

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined

if (!stripePublicKey) {
  console.warn('⚠️ VITE_STRIPE_PUBLIC_KEY is missing — Stripe features will be disabled')
}

// stripePromise is always a Promise (never null at module level)
// If key is missing we return a promise that resolves to null
export const stripePromise: Promise<Stripe | null> = stripePublicKey
  ? loadStripe(stripePublicKey)
  : Promise.resolve(null)

export const STRIPE_PRICES = {
  monthly: (import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string) || 'price_monthly_placeholder',
  yearly: (import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID as string) || 'price_yearly_placeholder',
}

export const PLAN_DETAILS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    price: 499,
    priceId: STRIPE_PRICES.monthly,
    period: '/month',
    description: 'Flexible month-to-month subscription',
    savings: null as string | null,
    features: [
      'Monthly prize draw entry',
      '₹249.50 to prize pool',
      '₹49.90+ to charity',
      'Score tracking (rolling 5)',
      'Cancel anytime',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    price: 4999,
    priceId: STRIPE_PRICES.yearly,
    period: '/year',
    description: 'Best value — save ₹999',
    savings: '₹999 savings' as string | null,
    features: [
      'All monthly features',
      '12 prize draw entries',
      'Priority winner verification',
      'Exclusive yearly badge',
      'Best value — 2 months free',
    ],
  },
}
