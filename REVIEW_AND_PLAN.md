# Golff Platform — Complete Review & Action Plan

**Date:** April 20, 2026  
**Reviewer:** Kiro AI  
**Project:** Golf Charity Subscription Platform (Digital Heroes PRD)

---

## Executive Summary

**Overall Assessment:** ✅ **STRONG SUBMISSION**

The project demonstrates solid full-stack development skills with 85-90% PRD coverage. Core features are implemented correctly with proper database design, security (RLS), and modern UI/UX. The main gaps are production-readiness items (real Stripe integration, email notifications, edge cases).

**Recommendation:** This is a sensible, well-structured project suitable for trainee evaluation. With the fixes outlined below, it would be production-ready.

---

## 1. PRD Compliance Analysis

### ✅ Fully Implemented (90% coverage)

#### User Roles & Access Control
- ✅ Public visitor flow (landing, charities, how-it-works)
- ✅ Registered subscriber dashboard with all required features
- ✅ Admin panel with full CRUD operations
- ✅ Route guards (`ProtectedRoute`, `AdminRoute`)
- ✅ RLS policies with `is_admin()` security definer function

#### Subscription & Payment System
- ✅ Monthly (₹499) and Yearly (₹4,999) plans with correct pricing
- ✅ Subscription lifecycle states (active/inactive/lapsed/cancelled)
- ✅ Mock payment gateway with OTP verification
- ✅ Stripe integration scaffolding (test mode ready)
- ✅ Real-time subscription status checks
- ⚠️ **Missing:** Production Stripe webhook handler for `invoice.paid` events

#### Score Management System
- ✅ 5-score rolling logic (oldest auto-replaced)
- ✅ Stableford validation (1-45 range)
- ✅ Date validation (no future dates)
- ✅ Reverse chronological display
- ✅ Admin can edit user scores (`AdminUsers.tsx`)

#### Draw & Reward System
- ✅ Random and algorithmic draw modes
- ✅ Simulation before publish
- ✅ Prize pool calculation (40/35/25% split)
- ✅ Equal split among multiple winners per tier
- ✅ Jackpot rollover logic (carries to next month if unclaimed)
- ✅ Draw entries auto-created when users have 5 scores
- ⚠️ **Edge case:** Draw row must exist before users can be entered

#### Charity System
- ✅ Charity directory with search/filter
- ✅ Individual charity profiles with images
- ✅ Charity events table in schema
- ✅ Featured/spotlight charity
- ✅ 10% minimum contribution with slider (10-50%)
- ✅ Independent donation type in schema
- ⚠️ **Missing:** Independent donation UI (only subscription-based donations implemented)

#### Winner Verification
- ✅ Proof upload to Supabase storage
- ✅ Pending → Approved/Rejected → Paid workflow
- ✅ Admin review interface with notes
- ✅ Payout tracking
- ⚠️ **Issue:** `WinnerVerify.tsx` doesn't check if user actually has a pending win

#### User Dashboard (PRD §10)
- ✅ Subscription status with renewal date
- ✅ Score entry and edit interface
- ✅ Selected charity + contribution %
- ✅ Participation summary (draws entered, upcoming)
- ✅ Winnings overview with payment status history

#### Admin Dashboard (PRD §11)
- ✅ User management (view, edit, subscription control)
- ✅ Score editing per user
- ✅ Draw configuration and publishing
- ✅ Charity CRUD operations
- ✅ Winner verification workflow
- ✅ Reports with charts (revenue, charity breakdown, plan split)

#### UI/UX Requirements (PRD §12)
- ✅ Modern, emotion-driven design (no golf clichés)
- ✅ Dark theme with gradient accents
- ✅ Framer Motion animations throughout
- ✅ Mobile-first responsive layout
- ✅ Animated counters on landing page
- ✅ Prominent CTAs
- ✅ Micro-interactions (hover states, transitions)

#### Database & Security
- ✅ Comprehensive RLS policies
- ✅ `is_admin()` security definer function
- ✅ Auto-profile creation trigger (with role injection prevention)
- ✅ Storage bucket for winner proofs
- ✅ Proper foreign key relationships
- ✅ Check constraints (score range, percentages, status enums)

---

### ⚠️ Partially Implemented / Needs Attention

#### Email Notifications (PRD §13)
**Status:** 30% implemented

**What exists:**
- `send-otp` edge function for OTP delivery
- Draw results broadcast to all subscribers (`AdminDraws.tsx`)
- Winner notification button (`AdminWinners.tsx`)

**What's missing:**
- Individual winner alerts (automated)
- Subscription renewal reminders
- Welcome email on signup
- Payment confirmation emails
- Draw result emails to individual users (not just broadcast)

**Action needed:**
1. Rename `send-otp` to `send-email` (more generic)
2. Add email templates for each notification type
3. Trigger emails automatically via database triggers or scheduled functions

---

#### Stripe Integration
**Status:** 50% implemented (mock only)

**What exists:**
- `MockPaymentGateway` component with full UI
- Stripe SDK loaded (`@stripe/stripe-js`)
- Price IDs configured in `stripe.ts`
- Test mode banner throughout app

**What's missing:**
- Backend function to create Stripe Checkout sessions
- Webhook handler for `invoice.paid` and `customer.subscription.updated`
- Subscription cancellation via Stripe portal
- Real payment flow (currently bypasses Stripe entirely)

**Action needed:**
1. Create Supabase Edge Function: `create-checkout-session`
2. Create webhook handler: `stripe-webhook`
3. Update `Signup.tsx` to call real Stripe Checkout
4. Add Stripe Customer Portal link in Profile page

---

#### Winner Eligibility Check
**Status:** Missing validation

**Issue:** `WinnerVerify.tsx` always shows upload UI, even if user has no pending wins.

**Action needed:**
```typescript
// Add to WinnerVerify.tsx useEffect
const { data: pendingWin } = await supabase
  .from('winners')
  .select('*')
  .eq('user_id', user.id)
  .eq('verification_status', 'pending')
  .maybeSingle()

if (!pendingWin) {
  // Show "No pending wins" message instead of upload form
}
```

---

#### Draw Entry Sync
**Status:** Works but requires pre-existing draw row

**Issue:** `ensureDrawEntry` in `Scores.tsx` only syncs if a draw row exists for current month. If admin hasn't created the draw yet, users with 5 scores won't be entered.

**Action needed:**
1. Create a scheduled function to auto-create next month's draw row
2. Or: Modify `ensureDrawEntry` to create the draw row if missing
3. Or: Admin must manually create draw rows at start of each month

---

### ❌ Not Implemented

#### Email Verification Flow
**Status:** Not implemented

**Issue:** Users can sign up and immediately access dashboard without confirming their email.

**Action needed:**
1. Enable email confirmation in Supabase Auth settings
2. Add email confirmation page/flow
3. Block dashboard access until email is verified

---

#### Independent Charity Donations
**Status:** Schema exists, UI missing

**Issue:** `donations` table has `type: 'independent'` but there's no UI to make standalone donations (only subscription-based donations work).

**Action needed:**
1. Add "Make a Donation" button on charity profile pages
2. Create donation modal with amount input
3. Process via Stripe Payment Intent
4. Record in `donations` table with `type: 'independent'`

---

## 2. Critical Issues & Bugs

### 🔴 High Priority

#### 1. Admin Score Editing State Conflict
**File:** `src/pages/admin/AdminUsers.tsx`  
**Issue:** Single `newScore`/`newDate` state shared across all expanded users. If two user rows are expanded, inputs conflict.

**Fix:**
```typescript
// Change from:
const [newScore, setNewScore] = useState('')
const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))

// To:
const [scoreInputs, setScoreInputs] = useState<Record<string, { score: string; date: string }>>({})

// Then use:
scoreInputs[userId]?.score || ''
```

---

#### 2. Winner Verification No Eligibility Check
**File:** `src/pages/WinnerVerify.tsx`  
**Issue:** Always shows upload form even if user has no pending wins.

**Fix:** Add query to check for pending wins before rendering upload UI.

---

#### 3. Draw Entry Requires Pre-existing Draw Row
**File:** `src/pages/Scores.tsx` → `ensureDrawEntry()`  
**Issue:** If admin hasn't created current month's draw row, users can't be entered.

**Fix:** Auto-create draw row if missing, or add scheduled function to pre-create monthly draws.

---

#### 4. Email Notification Function Naming
**File:** `supabase/functions/send-otp/index.ts`  
**Issue:** Function is named `send-otp` but used for draw results broadcast and winner notifications (not just OTP).

**Fix:** Rename to `send-email` and refactor to handle multiple email types.

---

### 🟡 Medium Priority

#### 5. Charity Breakdown Fallback Data
**File:** `src/pages/admin/AdminReports.tsx`  
**Issue:** Falls back to hardcoded seed data when no donations exist, which could mislead admins.

**Fix:** Show "No donations yet" message instead of fake data.

---

#### 6. Mock User Cleanup on Sign Out
**File:** `src/store/useAuthStore.ts` → `signOut()`  
**Issue:** Mock user data persists in localStorage after sign out if created via rate limit bypass.

**Fix:** Already handled correctly — `localStorage.removeItem('golff_mock_user')` is present.

---

#### 7. Landing Page Truncation
**File:** `src/pages/Landing.tsx`  
**Issue:** File was truncated in initial read (1 line shown). Need to verify complete implementation.

**Fix:** File is complete (verified in subsequent reads). No action needed.

---

### 🟢 Low Priority / Polish

#### 8. Test Mode Banner Everywhere
**Issue:** "Stripe Test Mode" banner appears on every admin page.

**Suggestion:** Move to a global notification bar or only show on payment-related pages.

---

#### 9. Charity Total Raised Calculation
**File:** `src/pages/admin/AdminCharities.tsx`  
**Issue:** Displays `(c.total_raised || 0) + 84200` — hardcoded offset for demo purposes.

**Fix:** Remove hardcoded offset in production, or clarify it's a "lifetime total" vs "platform total".

---

#### 10. Plan Files in Root
**Files:** `plan.md`, `manual_test.md`  
**Issue:** Development files in root directory.

**Fix:** Move to `/docs` folder or add to `.gitignore` for production builds.

---

## 3. Security Review

### ✅ Strong Security Practices

1. **RLS Policies:** Comprehensive row-level security on all tables
2. **Role Injection Prevention:** `handle_new_user()` trigger hardcodes `role = 'user'`
3. **Admin Function:** `is_admin()` uses `SECURITY DEFINER` to avoid recursive RLS
4. **Storage Policies:** Winner proofs restricted to owner + admin
5. **Password Validation:** Client-side validation (8+ chars, uppercase, number)
6. **Auth State Management:** Proper session handling with refresh logic

### ⚠️ Security Concerns

#### 1. No Email Verification
**Risk:** Users can create accounts with fake emails and access platform.

**Mitigation:** Enable Supabase email confirmation.

---

#### 2. Client-Side Subscription Status Check
**Risk:** Malicious user could manipulate local state to bypass subscription checks.

**Mitigation:** Already handled — RLS policies enforce subscription status at database level. Client checks are just UX.

---

#### 3. Mock User Bypass
**Risk:** `localStorage` mock user can bypass auth entirely.

**Mitigation:** This is intentional for development/demo. Remove in production or add environment check:
```typescript
if (import.meta.env.PROD && userId.startsWith('mock_')) {
  throw new Error('Mock users not allowed in production')
}
```

---

## 4. Performance & Scalability

### ✅ Good Practices

1. **Optimistic UI Updates:** User cache in localStorage for instant loads
2. **Batch Queries:** `AdminDraws.tsx` fetches all scores in one query
3. **Indexed Queries:** Database queries use indexed columns (user_id, draw_id)
4. **Lazy Loading:** Framer Motion animations use `viewport={{ once: true }}`
5. **Image Optimization:** Unsplash URLs with size parameters

### ⚠️ Potential Bottlenecks

#### 1. N+1 Query in AdminWinners
**File:** `src/pages/admin/AdminWinners.tsx`  
**Issue:** Fetches profile for each winner in a loop.

**Fix:**
```typescript
// Instead of:
data.map(async w => {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', w.user_id).single()
  return { ...w, profile }
})

// Use JOIN:
const { data } = await supabase
  .from('winners')
  .select('*, profiles(*)')
  .order('created_at', { ascending: false })
```

---

#### 2. Draw Entry Creation Loop
**File:** `src/pages/admin/AdminDraws.tsx` → `publishDraw()`  
**Issue:** Inserts draw entries one-by-one in a loop.

**Fix:** Use batch insert:
```typescript
const entries = allProfiles.map(profile => ({
  draw_id: simulation.draw.id,
  user_id: profile.id,
  user_numbers: userScoresMap[profile.id] || [],
  match_count: matchCount,
  prize_tier: prizeTier,
  prize_amount: prizeAmount
}))

await supabase.from('draw_entries').insert(entries)
```

---

#### 3. Real-time Subscription Checks
**Issue:** Every protected route checks subscription status on mount.

**Optimization:** Cache subscription status in Zustand store with TTL, only refresh on critical actions.

---

## 5. Code Quality Assessment

### ✅ Strengths

1. **TypeScript Usage:** Proper types for all entities (`Profile`, `Score`, `Draw`, etc.)
2. **Component Structure:** Clean separation of concerns (pages, components, hooks, store)
3. **State Management:** Zustand for global auth state, React state for local UI
4. **Error Handling:** Try-catch blocks with user-friendly toast messages
5. **Code Comments:** Critical sections have explanatory comments
6. **Consistent Naming:** camelCase for variables, PascalCase for components
7. **Reusable Components:** `SkeletonLoader`, `ProtectedRoute`, `AdminRoute`

### ⚠️ Areas for Improvement

#### 1. Magic Numbers
**Issue:** Hardcoded values scattered throughout (e.g., `499`, `4999`, `0.5`, `0.4`).

**Fix:** Extract to constants:
```typescript
// src/lib/constants.ts
export const PRICING = {
  MONTHLY: 499,
  YEARLY: 4999,
  PRIZE_POOL_PCT: 0.5,
  JACKPOT_PCT: 0.4,
  FOUR_MATCH_PCT: 0.35,
  THREE_MATCH_PCT: 0.25,
  MIN_CHARITY_PCT: 10,
  MAX_CHARITY_PCT: 50
}
```

---

#### 2. Duplicate Prize Calculation Logic
**Issue:** Prize pool math duplicated in `Dashboard.tsx`, `AdminDraws.tsx`, `Landing.tsx`.

**Fix:** Create utility function:
```typescript
// src/lib/utils.ts
export function calculatePrizePool(subscriptionCount: number, plan: 'monthly' | 'yearly') {
  const amount = plan === 'monthly' ? 499 : 4999 / 12
  return subscriptionCount * amount * 0.5
}
```

---

#### 3. Long Functions
**Issue:** `publishDraw()` in `AdminDraws.tsx` is 100+ lines.

**Fix:** Extract sub-functions:
```typescript
function calculateTierWinners(drawnNumbers, userScoresMap) { ... }
function calculatePrizeAmounts(tierResults, prizePool) { ... }
function createDrawEntries(tierResults, drawId) { ... }
```

---

#### 4. Inconsistent Error Messages
**Issue:** Some errors show technical messages, others show user-friendly messages.

**Fix:** Create error message mapper:
```typescript
function getUserFriendlyError(error: any): string {
  if (error.code === '23505') return 'This record already exists'
  if (error.message.includes('rate limit')) return 'Too many requests. Please try again later.'
  return 'Something went wrong. Please try again.'
}
```

---

## 6. Testing Recommendations

### Unit Tests Needed

1. **Prize Pool Calculation**
   - Test 40/35/25% split
   - Test equal division among multiple winners
   - Test jackpot rollover logic

2. **Score Validation**
   - Test 1-45 range enforcement
   - Test future date rejection
   - Test 5-score rolling logic

3. **Draw Number Matching**
   - Test match count calculation
   - Test algorithmic vs random mode
   - Test edge case: no winners

### Integration Tests Needed

1. **Signup Flow**
   - Test account creation
   - Test subscription activation
   - Test charity selection
   - Test draw entry creation

2. **Draw Publishing**
   - Test simulation
   - Test winner identification
   - Test prize distribution
   - Test jackpot rollover

3. **Winner Verification**
   - Test proof upload
   - Test admin approval/rejection
   - Test payout marking

### E2E Tests Needed

1. **Complete User Journey**
   - Signup → Add scores → Enter draw → Win → Verify → Get paid

2. **Admin Workflow**
   - Create draw → Simulate → Publish → Verify winners → Mark paid

---

## 7. Deployment Checklist

### Pre-Production Tasks

- [ ] Remove mock payment gateway (or hide behind feature flag)
- [ ] Implement real Stripe Checkout integration
- [ ] Set up Stripe webhook endpoint
- [ ] Enable email verification in Supabase Auth
- [ ] Create email templates for all notification types
- [ ] Set up scheduled function for monthly draw creation
- [ ] Remove hardcoded test data from reports
- [ ] Add environment variable validation
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Create admin user management docs
- [ ] Add terms of service and privacy policy pages
- [ ] Implement rate limiting on API endpoints
- [ ] Add CAPTCHA to signup form
- [ ] Set up monitoring and alerts

### Environment Variables Required

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Stripe
VITE_STRIPE_PUBLIC_KEY=
VITE_STRIPE_MONTHLY_PRICE_ID=
VITE_STRIPE_YEARLY_PRICE_ID=
STRIPE_SECRET_KEY= # Backend only
STRIPE_WEBHOOK_SECRET= # Backend only

# Email (if using Resend)
RESEND_API_KEY= # Backend only

# Optional
VITE_APP_URL=
VITE_ENABLE_MOCK_PAYMENTS=false
```

---

## 8. Documentation Gaps

### Missing Documentation

1. **Setup Instructions**
   - How to run locally
   - How to seed database
   - How to create admin user
   - How to configure Stripe test mode

2. **API Documentation**
   - Supabase Edge Functions
   - Database schema diagram
   - RLS policy explanations

3. **User Guides**
   - How to enter scores
   - How to claim prizes
   - How to change charity

4. **Admin Guides**
   - How to run monthly draws
   - How to verify winners
   - How to manage charities

---

## 9. Recommended Action Plan

### Phase 1: Critical Fixes (1-2 days)

**Priority:** Fix bugs that break core functionality

1. ✅ Fix admin score editing state conflict
2. ✅ Add winner eligibility check to `WinnerVerify.tsx`
3. ✅ Fix draw entry sync (auto-create draw row if missing)
4. ✅ Optimize N+1 queries in `AdminWinners.tsx`
5. ✅ Batch insert draw entries in `publishDraw()`

### Phase 2: Production Readiness (3-5 days)

**Priority:** Make it deployable to real users

1. ✅ Implement real Stripe Checkout integration
2. ✅ Create Stripe webhook handler
3. ✅ Set up email notification system
4. ✅ Enable email verification
5. ✅ Add independent donation UI
6. ✅ Extract magic numbers to constants
7. ✅ Add environment variable validation
8. ✅ Write setup documentation

### Phase 3: Polish & Optimization (2-3 days)

**Priority:** Improve UX and performance

1. ✅ Refactor long functions
2. ✅ Add error message mapper
3. ✅ Implement caching for subscription checks
4. ✅ Add loading skeletons everywhere
5. ✅ Improve mobile responsiveness
6. ✅ Add accessibility improvements (ARIA labels, keyboard nav)
7. ✅ Write user and admin guides

### Phase 4: Testing & Monitoring (2-3 days)

**Priority:** Ensure reliability

1. ✅ Write unit tests for critical functions
2. ✅ Write integration tests for key flows
3. ✅ Set up error tracking
4. ✅ Configure monitoring and alerts
5. ✅ Perform security audit
6. ✅ Load testing with 1000+ concurrent users

---

## 10. Questions for Discussion

### Technical Decisions

1. **Stripe vs Mock Gateway:**
   - Should we keep mock gateway for demo purposes?
   - If yes, how do we toggle between mock and real Stripe?

2. **Email Service:**
   - Use Supabase Auth emails or external service (Resend, SendGrid)?
   - Do we need transactional email templates?

3. **Draw Scheduling:**
   - Should draws be fully automated (cron job) or admin-triggered?
   - What happens if admin forgets to run the draw?

4. **Charity Verification:**
   - How do we verify charities are legitimate?
   - Do we need charity approval workflow?

5. **Scalability:**
   - What's the expected user count at launch?
   - Do we need database sharding or read replicas?

### Business Logic

1. **Subscription Cancellation:**
   - Can users cancel mid-month and still participate in that month's draw?
   - Do they get a prorated refund?

2. **Winner Disputes:**
   - What if a user claims they won but admin rejects proof?
   - Is there an appeal process?

3. **Charity Changes:**
   - Can users change charity mid-month?
   - Does the change apply to current month or next month?

4. **Inactive Subscriptions:**
   - How long do we keep inactive user data?
   - Do we send re-engagement emails?

5. **Prize Payout:**
   - What's the maximum time between win and payout?
   - What if a winner never uploads proof?

---

## 11. Final Verdict

### Strengths

✅ Solid database design with proper RLS  
✅ Complete admin panel with all CRUD operations  
✅ Correct implementation of complex draw logic  
✅ Modern, polished UI with animations  
✅ Good TypeScript usage and type safety  
✅ Proper auth flow with route guards  
✅ Mobile-responsive design  
✅ Clear code structure and organization  

### Weaknesses

⚠️ Mock-only payment integration  
⚠️ Incomplete email notification system  
⚠️ Missing email verification  
⚠️ Some N+1 query patterns  
⚠️ Hardcoded values scattered throughout  
⚠️ Limited error handling in some areas  
⚠️ No automated tests  
⚠️ Missing production deployment docs  

### Overall Score: 8.5/10

**Breakdown:**
- PRD Coverage: 9/10
- Code Quality: 8/10
- Security: 8/10
- UI/UX: 9/10
- Performance: 7/10
- Documentation: 6/10

**Recommendation:** This is a strong trainee submission that demonstrates solid full-stack skills. With the Phase 1 and Phase 2 fixes, it would be production-ready. The core logic is sound, the UI is impressive, and the database design is robust.

---

## 12. Next Steps

1. **Review this document** with the team
2. **Prioritize fixes** based on launch timeline
3. **Assign tasks** from Phase 1 and Phase 2
4. **Set up staging environment** for testing
5. **Schedule code review** for critical sections
6. **Plan user acceptance testing** with real golfers
7. **Prepare launch checklist** based on deployment section

---

**Document prepared by:** Kiro AI  
**Date:** April 20, 2026  
**Version:** 1.0
