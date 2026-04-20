-- ============================================================
-- GOLFF PLATFORM — USER SETUP & ADMIN CONFIGURATION
-- Run this AFTER 001_initial_schema.sql
-- AND after creating users in Supabase Auth Dashboard
-- ============================================================

-- ============================================================
-- STEP 1: Ensure profiles exist for both users
-- (Handles cases where the trigger didn't fire)
-- ============================================================
INSERT INTO public.profiles (
  id, full_name, email, role, subscription_status, charity_contribution_pct
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
  u.email,
  'user',
  'inactive',
  10
FROM auth.users u
WHERE u.email IN ('admin@golff.in', 'arjun@test.in')
ON CONFLICT (id) DO UPDATE SET
  email     = EXCLUDED.email,
  full_name = COALESCE(profiles.full_name, EXCLUDED.full_name);

-- ============================================================
-- STEP 2: Promote admin user
-- ============================================================
UPDATE public.profiles
SET
  role      = 'admin',
  full_name = COALESCE(full_name, 'Admin')
WHERE email = 'admin@golff.in';

-- ============================================================
-- STEP 3: Set test user full name
-- ============================================================
UPDATE public.profiles
SET full_name = COALESCE(full_name, 'Arjun Sharma')
WHERE email = 'arjun@test.in';

-- ============================================================
-- STEP 4: Activate test user subscription
-- (Lets you test the dashboard without Stripe)
-- ============================================================
UPDATE public.profiles
SET
  subscription_status      = 'active',
  subscription_plan        = 'monthly',
  subscription_start       = now(),
  subscription_end         = now() + INTERVAL '30 days',
  charity_id               = (SELECT id FROM charities WHERE slug = 'cry-india' LIMIT 1),
  charity_contribution_pct = 10
WHERE email = 'arjun@test.in';

-- ============================================================
-- STEP 5: Add some test scores for arjun@test.in
-- (So the dashboard shows actual data)
-- ============================================================
INSERT INTO public.scores (user_id, score, played_date)
SELECT
  p.id,
  score_val,
  CURRENT_DATE - (seq * INTERVAL '5 days')
FROM
  public.profiles p,
  (VALUES (32, 1), (28, 2), (35, 3), (41, 4), (27, 5)) AS s(score_val, seq)
WHERE p.email = 'arjun@test.in'
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 6: Add a sample published draw for testing
-- ============================================================
INSERT INTO public.draws (
  month, year, status, draw_mode,
  drawn_numbers, prize_pool_total, jackpot_amount,
  jackpot_rolled_over, published_at
)
VALUES (
  EXTRACT(MONTH FROM now())::integer,
  EXTRACT(YEAR FROM now())::integer,
  'published',
  'random',
  ARRAY[27, 28, 32, 35, 41],   -- matches all 5 test scores above!
  24950,
  9980,
  false,
  now()
)
ON CONFLICT DO NOTHING;

-- Add draw entry for the test user
INSERT INTO public.draw_entries (
  draw_id, user_id, user_numbers,
  match_count, prize_tier, prize_amount
)
SELECT
  d.id,
  p.id,
  ARRAY[27, 28, 32, 35, 41],
  5,
  '5-match',
  9980
FROM
  public.draws   d,
  public.profiles p
WHERE
  d.status = 'published'
  AND p.email = 'arjun@test.in'
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 7: Add a sample winner record for testing WinnerVerify
-- ============================================================
INSERT INTO public.winners (
  draw_id, user_id, match_type, prize_amount,
  verification_status, payout_status
)
SELECT
  d.id,
  p.id,
  '5-match',
  9980,
  'pending',
  'pending'
FROM
  public.draws   d,
  public.profiles p
WHERE
  d.status = 'published'
  AND p.email = 'arjun@test.in'
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICATION — Check everything was set correctly
-- ============================================================
SELECT
  p.email,
  p.full_name,
  p.role,
  p.subscription_status,
  p.subscription_plan,
  p.charity_contribution_pct,
  (SELECT COUNT(*) FROM scores WHERE user_id = p.id) AS score_count,
  (SELECT name FROM charities WHERE id = p.charity_id) AS charity_name
FROM public.profiles p
WHERE p.email IN ('admin@golff.in', 'arjun@test.in')
ORDER BY p.role DESC;
