# Golf Charity Subscription Platform — Master Plan
> Digital Heroes PRD v1.0 | Built Locally First → Deploy Later
> Stack: React + Vite + TypeScript + Supabase + Stripe + Tailwind CSS

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Backend / DB | Supabase (Auth + PostgreSQL + Storage + RLS) |
| Payments | Stripe (Test Mode) |
| State | Zustand (global) + React Query (server state) |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts (admin analytics) |
| Notifications | React Hot Toast |
| Date Handling | date-fns |
| Animations | Framer Motion + React Confetti |

---

## 2. PRICING & FINANCIALS

| Plan | Price |
|------|-------|
| Monthly | ₹499/month |
| Yearly | ₹4,999/year (₹999 savings) |

### Per Subscription Split:
| Bucket | % | Monthly Amount |
|--------|---|---------------|
| Prize Pool | 50% | ₹249.50 |
| Charity | 10% min (user can increase) | ₹49.90+ |
| Platform | 40% | ₹199.60 |

### Prize Pool Distribution (per draw):
| Match | Pool Share | Rollover? |
|-------|-----------|-----------|
| 5-Number | 40% | ✅ Yes (Jackpot) |
| 4-Number | 35% | ❌ No |
| 3-Number | 25% | ❌ No |

---

## 3. DATABASE SCHEMA (Supabase)

### Tables:

#### `profiles`
```sql
id uuid (FK → auth.users)
full_name text
email text
avatar_url text
role text DEFAULT 'user' -- 'user' | 'admin'
subscription_status text -- 'active' | 'inactive' | 'lapsed' | 'cancelled'
subscription_plan text -- 'monthly' | 'yearly'
subscription_start timestamptz
subscription_end timestamptz
stripe_customer_id text
stripe_subscription_id text
charity_id uuid (FK → charities)
charity_contribution_pct integer DEFAULT 10 -- 10 to 100
created_at timestamptz
```

#### `scores`
```sql
id uuid
user_id uuid (FK → profiles)
score integer -- 1 to 45 (Stableford)
played_date date
created_at timestamptz
-- Only last 5 per user retained (enforced via trigger)
```

#### `charities`
```sql
id uuid
name text
slug text UNIQUE
description text
image_url text -- Unsplash URL
website_url text
category text
featured boolean DEFAULT false
total_raised numeric DEFAULT 0
created_at timestamptz
```

#### `charity_events`
```sql
id uuid
charity_id uuid (FK → charities)
title text
event_date date
location text
description text
created_at timestamptz
```

#### `draws`
```sql
id uuid
month integer
year integer
status text -- 'pending' | 'simulated' | 'published'
draw_mode text -- 'random' | 'algorithmic'
drawn_numbers integer[] -- array of 5 numbers
prize_pool_total numeric
jackpot_amount numeric
jackpot_rolled_over boolean DEFAULT false
run_by uuid (FK → profiles admin)
published_at timestamptz
created_at timestamptz
```

#### `draw_entries`
```sql
id uuid
draw_id uuid (FK → draws)
user_id uuid (FK → profiles)
user_numbers integer[] -- user's 5 scores used for matching
match_count integer -- 3 | 4 | 5 | 0
prize_tier text -- '5-match' | '4-match' | '3-match' | null
prize_amount numeric DEFAULT 0
created_at timestamptz
```

#### `winners`
```sql
id uuid
draw_id uuid (FK → draws)
user_id uuid (FK → profiles)
match_type text -- '5-match' | '4-match' | '3-match'
prize_amount numeric
proof_url text -- screenshot upload
verification_status text -- 'pending' | 'approved' | 'rejected'
payout_status text -- 'pending' | 'paid'
payout_date timestamptz
admin_notes text
created_at timestamptz
```

#### `donations`
```sql
id uuid
user_id uuid (FK → profiles)
charity_id uuid (FK → charities)
amount numeric
type text -- 'subscription' | 'independent'
stripe_payment_intent_id text
status text -- 'pending' | 'completed'
created_at timestamptz
```

#### `subscription_payments`
```sql
id uuid
user_id uuid (FK → profiles)
stripe_invoice_id text
amount numeric
plan text -- 'monthly' | 'yearly'
status text -- 'paid' | 'failed'
created_at timestamptz
```

---

## 4. PAGES (16 Total)

### Public Pages
| Route | Page |
|-------|------|
| `/` | Landing — hero, how it works, live prize pool, charities, CTA |
| `/charities` | Charity Directory — search, filter, cards |
| `/charities/:slug` | Charity Profile — details, events, donate button |
| `/how-it-works` | Draw mechanics explained visually |
| `/login` | Login |
| `/signup` | Signup → Plan Selection → Charity → Pay |

### User Protected Pages
| Route | Page |
|-------|------|
| `/dashboard` | Full dashboard (all PRD modules) |
| `/scores` | Score entry & management (rolling 5) |
| `/draws` | Draw history & results |
| `/profile` | Profile + subscription settings + charity change |
| `/winners/verify` | Winner proof upload |

### Admin Protected Pages
| Route | Page |
|-------|------|
| `/admin` | Overview — stats, quick actions |
| `/admin/users` | User management — view, edit, filter |
| `/admin/draws` | Draw engine — configure, simulate, publish |
| `/admin/charities` | Charity management — CRUD + media |
| `/admin/winners` | Winner verification + payout tracking |
| `/admin/reports` | Analytics — charts, totals, export CSV |

---

## 5. USER FLOWS

### Signup Flow:
```
/signup
  → Enter name, email, password
  → Choose plan (Monthly ₹499 / Yearly ₹4,999)
  → Choose charity (searchable list)
  → Set charity contribution % (default 10%, can increase)
  → Stripe Checkout (test card: 4242 4242 4242 4242)
  → Webhook: subscription activated in Supabase
  → Redirect → /dashboard
```

### Score Entry Flow:
```
/scores
  → Check subscription status (gate if not active)
  → Enter score (1-45) + date (no future dates)
  → If already 5 scores: show "This will replace your oldest score (X on Date)" → confirm
  → Save → scores reorder newest first
  → Draw entry auto-updated for current month
```

### Draw Flow (Admin):
```
/admin/draws
  → Select month + draw mode (random / algorithmic)
  → Click "Run Simulation" → preview results (not published)
  → Admin reviews: who matched 3/4/5 numbers
  → Click "Publish Draw" → results go live
  → Winners table populated
  → Draw locked (scores frozen for that period)
```

### Winner Verification Flow:
```
User: /winners/verify
  → User sees they won
  → Uploads screenshot proof
  → Status: Pending

Admin: /admin/winners
  → Reviews proof
  → Approve ✅ or Reject ❌
  → Mark payout: Pending → Paid (with date)
```

---

## 6. DRAW ENGINE LOGIC

### Random Mode:
```
Generate 5 random numbers (range 1-45)
Compare against each active subscriber's last 5 scores
Count matches per user
Assign prize tier based on match count
Split prize equally among users in same tier
```

### Algorithmic Mode (Score-Weighted):
```
Collect all scores from all active subscribers this month
Calculate frequency of each number (1-45)
Most frequent numbers = LEAST likely drawn (harder to win = bigger prize)
OR least frequent = drawn (rarer score = reward for consistency)
Admin chooses weighting direction
```

### Jackpot Rollover:
```
If no 5-match winner:
  jackpot_rolled_over = true
  40% pool carries forward to next month's prize pool
  Accumulates until someone wins 5-match
```

---

## 7. DESIGN SYSTEM

### Color Palette:
```css
--bg-primary:    #0A0A0F   /* near black */
--bg-surface:    #12121A   /* card backgrounds */
--bg-elevated:   #1A1A2E   /* elevated cards */
--color-primary: #6EE7B7   /* emerald — charity/hope */
--color-accent:  #818CF8   /* indigo — premium */
--color-gold:    #F59E0B   /* prize/jackpot */
--color-danger:  #F87171   /* errors */
--text-primary:  #F8FAFC
--text-muted:    #94A3B8
--border:        rgba(255,255,255,0.08)
```

### Typography:
```
Headings: "Syne" (Google Fonts) — bold, modern, distinctive
Body:     "Inter" (Google Fonts) — clean, readable
Numbers:  "Space Grotesk" — prize amounts, stats
```

### Component Library:
- GlassCard — backdrop-blur card with subtle border
- PremiumButton — gradient bg + hover glow
- StatCard — animated number counter
- ScoreInput — large number pad for mobile
- DrawBall — lottery ball with spin animation
- ProgressBar — charity goal tracker
- SkeletonLoader — per-component loading states
- ToastNotification — via react-hot-toast
- ConfettiOverlay — on draw win

---

## 8. SEED DATA

### Admin:
```
Email:    admin@golff.in
Password: Admin@123456
Role:     admin
```

### Seed Users (4):
```
User 1: Arjun Sharma — Monthly Active — CRY India — Scores: [32, 28, 35, 24, 31]
User 2: Priya Mehta  — Yearly Active  — Smile Foundation — Scores: [18, 22, 25, 20, 19]
User 3: Rohan Gupta  — Monthly Lapsed — Akshaya Patra — Scores: [40, 38, 35, 42, 37]
User 4: Neha Singh   — Monthly Active — HelpAge India — Scores: [15, 12, 18, 14, 16]

All passwords: Test@123456
```

### Charities (6):
```
1. CRY India            — Child Rights and You
2. Akshaya Patra        — Midday meal program
3. Smile Foundation     — Education & healthcare
4. HelpAge India        — Elder care
5. GiveIndia            — Donation marketplace
6. Sammaan Foundation   — Dignity for all
```
All images: Unsplash URLs (Indian charity/people photography)

---

## 9. EXTRA FEATURES (All Essential)

### Developer Experience:
- [ ] One-click DB seeder in admin panel
- [ ] Test mode banner (Stripe test mode indicator)
- [ ] Environment health check on app startup
- [ ] `.env.example` with all required keys
- [ ] SQL migration files in `/supabase/migrations`
- [ ] Admin "Reset Draw" for testing

### Admin Power Tools:
- [ ] Draw Preview Mode before publish
- [ ] Bulk user export (CSV)
- [ ] Subscription status filter tabs
- [ ] Quick inline score override
- [ ] One-click payout mark with timestamp
- [ ] Featured charity toggle (one switch)
- [ ] Full draw history audit log

### User Experience:
- [ ] Score draft auto-save (localStorage)
- [ ] Draw entry confirmation widget
- [ ] Subscription renewal reminder banner (7 days before)
- [ ] Charity impact amount ("Your ₹49.90 donated")
- [ ] One-click charity change (once/month limit)
- [ ] Quick stats widget (draws entered, total won, scores submitted)
- [ ] Mobile number pad for score entry
- [ ] Winner badge on profile (🏆 if ever won)

### System Integrity:
- [ ] Draw lock (scores frozen after draw published)
- [ ] Subscription gate on score entry
- [ ] Duplicate draw prevention (1 per month)
- [ ] Score date validation (no future dates, warn duplicates)
- [ ] Stripe webhook retry handler
- [ ] Admin role guard (server-side check)
- [ ] Rate limiting on score entry

### Premium UX:
- [ ] Live prize pool counter on homepage (auto-calculated)
- [ ] Draw countdown timer (next draw in X days)
- [ ] Subscriber count ticker ("Join 47 active golfers")
- [ ] Charity progress bar (₹X raised toward goal)
- [ ] Draw results reveal (numbers appear one by one)
- [ ] Toast notifications for every action
- [ ] Confetti animation on draw win
- [ ] Skeleton screens (no spinners)
- [ ] Page transition animations (Framer Motion)

---

## 10. PACKAGES

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@supabase/supabase-js": "^2",
    "@stripe/stripe-js": "^3",
    "@stripe/react-stripe-js": "^2",
    "zustand": "^4",
    "@tanstack/react-query": "^5",
    "react-hook-form": "^7",
    "zod": "^3",
    "@hookform/resolvers": "^3",
    "framer-motion": "^11",
    "react-hot-toast": "^2",
    "recharts": "^2",
    "react-confetti": "^6",
    "date-fns": "^3",
    "lucide-react": "^0.400"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8",
    "eslint": "^8",
    "prettier": "^3"
  }
}
```

---

## 11. ENVIRONMENT VARIABLES NEEDED

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
VITE_STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
VITE_APP_URL=http://localhost:5173
```

---

## 12. BUILD ORDER

```
Phase 1: Foundation
  ✅ Vite + React + TypeScript + Tailwind setup
  ✅ Supabase schema + migrations
  ✅ Supabase RLS policies
  ✅ Seed data (admin + 4 users + charities)
  ✅ Auth (login, signup, route guards)

Phase 2: Core User Flow
  ✅ Landing page (premium design)
  ✅ Signup → Plan → Charity → Stripe checkout
  ✅ User dashboard (all 5 PRD modules)
  ✅ Score entry (rolling 5, validation)

Phase 3: Draw & Charity
  ✅ Charity directory + profiles + donate
  ✅ Draw results page
  ✅ Winner verification flow

Phase 4: Admin Panel
  ✅ Admin dashboard overview
  ✅ User management
  ✅ Draw engine (simulate + publish)
  ✅ Charity management
  ✅ Winner verification + payout
  ✅ Reports & analytics

Phase 5: Polish
  ✅ All animations + micro-interactions
  ✅ Mobile responsiveness audit
  ✅ Error states + loading states
  ✅ Toast notifications
  ✅ Performance optimization

Phase 6: Deploy (Later)
  ⏳ Vercel deployment
  ⏳ Stripe webhook endpoint live
  ⏳ Environment variables on Vercel
```

---

## 13. DEFERRED (Later)
- Email notifications (draw results, winner alerts, renewal reminders)
- Production Vercel deployment
- Real Stripe live keys
- Mobile app version

---

> **Status: READY FOR TESTING — All PRD Phases Complete**
> Implementation finished. Proceed to verification using 'manual_test.md'.
