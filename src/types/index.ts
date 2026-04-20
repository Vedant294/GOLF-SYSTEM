export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  role: 'user' | 'admin'
  subscription_status: 'active' | 'inactive' | 'lapsed' | 'cancelled'
  subscription_plan?: 'monthly' | 'yearly'
  subscription_start?: string
  subscription_end?: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
  charity_id?: string
  charity_contribution_pct: number
  created_at: string
}

export interface Score {
  id: string
  user_id: string
  score: number
  played_date: string
  created_at: string
}

export interface Charity {
  id: string
  name: string
  slug: string
  description: string
  image_url: string
  website_url: string
  category: string
  featured: boolean
  total_raised: number
  created_at: string
}

export interface CharityEvent {
  id: string
  charity_id: string
  title: string
  event_date: string
  location: string
  description: string
  created_at: string
}

export interface Draw {
  id: string
  month: number
  year: number
  status: 'pending' | 'simulated' | 'published'
  draw_mode: 'random' | 'algorithmic'
  drawn_numbers?: number[]
  prize_pool_total: number
  jackpot_amount: number
  jackpot_rolled_over: boolean
  run_by?: string
  published_at?: string
  created_at: string
}

export interface DrawEntry {
  id: string
  draw_id: string
  user_id: string
  user_numbers: number[]
  match_count: number
  prize_tier?: '5-match' | '4-match' | '3-match'
  prize_amount: number
  created_at: string
}

export interface Winner {
  id: string
  draw_id: string
  user_id: string
  match_type: '5-match' | '4-match' | '3-match'
  prize_amount: number
  proof_url?: string
  verification_status: 'pending' | 'approved' | 'rejected'
  payout_status: 'pending' | 'paid'
  payout_date?: string
  admin_notes?: string
  created_at: string
}

export interface Donation {
  id: string
  user_id: string
  charity_id: string
  amount: number
  type: 'subscription' | 'independent'
  stripe_payment_intent_id?: string
  status: 'pending' | 'completed'
  created_at: string
}

export interface SubscriptionPayment {
  id: string
  user_id: string
  stripe_invoice_id?: string
  amount: number
  plan: 'monthly' | 'yearly'
  status: 'paid' | 'failed'
  created_at: string
}

export type PlanType = 'monthly' | 'yearly'
