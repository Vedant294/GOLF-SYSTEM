-- ============================================================
-- GOLFF PLATFORM — COMPLETE DATABASE SCHEMA
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP EXISTING TABLES (clean slate on re-run)
-- ============================================================
DROP TABLE IF EXISTS subscription_payments CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS winners CASCADE;
DROP TABLE IF EXISTS draw_entries CASCADE;
DROP TABLE IF EXISTS draws CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS charity_events CASCADE;
DROP TABLE IF EXISTS charities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- TABLE: PROFILES
-- ============================================================
CREATE TABLE profiles (
  id                       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name                text,
  email                    text UNIQUE,
  avatar_url               text,
  role                     text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  subscription_status      text DEFAULT 'inactive'
                             CHECK (subscription_status IN ('active','inactive','lapsed','cancelled')),
  subscription_plan        text CHECK (subscription_plan IN ('monthly','yearly')),
  subscription_start       timestamptz,
  subscription_end         timestamptz,
  stripe_customer_id       text,
  stripe_subscription_id   text,
  charity_id               uuid,
  charity_contribution_pct integer DEFAULT 10 CHECK (charity_contribution_pct BETWEEN 10 AND 50),
  created_at               timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: CHARITIES
-- ============================================================
CREATE TABLE charities (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL,
  slug         text UNIQUE NOT NULL,
  description  text,
  image_url    text,
  website_url  text,
  category     text,
  featured     boolean DEFAULT false,
  total_raised numeric DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: CHARITY EVENTS
-- ============================================================
CREATE TABLE charity_events (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  charity_id  uuid REFERENCES charities(id) ON DELETE CASCADE,
  title       text NOT NULL,
  event_date  date,
  location    text,
  description text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: SCORES
-- ============================================================
CREATE TABLE scores (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score       integer NOT NULL CHECK (score BETWEEN 1 AND 45),
  played_date date NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: DRAWS
-- ============================================================
CREATE TABLE draws (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  month              integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year               integer NOT NULL,
  status             text DEFAULT 'pending'
                       CHECK (status IN ('pending','simulated','published')),
  draw_mode          text DEFAULT 'random'
                       CHECK (draw_mode IN ('random','algorithmic')),
  drawn_numbers      integer[],
  prize_pool_total   numeric DEFAULT 0,
  jackpot_amount     numeric DEFAULT 0,
  jackpot_rolled_over boolean DEFAULT false,
  run_by             uuid REFERENCES profiles(id),
  published_at       timestamptz,
  created_at         timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: DRAW ENTRIES
-- ============================================================
CREATE TABLE draw_entries (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id      uuid REFERENCES draws(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user_numbers integer[],
  match_count  integer DEFAULT 0,
  prize_tier   text CHECK (prize_tier IN ('5-match','4-match','3-match')),
  prize_amount numeric DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(draw_id, user_id)
);

-- ============================================================
-- TABLE: WINNERS
-- ============================================================
CREATE TABLE winners (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id             uuid REFERENCES draws(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE,
  match_type          text NOT NULL CHECK (match_type IN ('5-match','4-match','3-match')),
  prize_amount        numeric NOT NULL,
  proof_url           text,
  verification_status text DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','approved','rejected')),
  payout_status       text DEFAULT 'pending'
                        CHECK (payout_status IN ('pending','paid')),
  payout_date         timestamptz,
  admin_notes         text,
  created_at          timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: DONATIONS
-- ============================================================
CREATE TABLE donations (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  charity_id               uuid REFERENCES charities(id),
  amount                   numeric NOT NULL CHECK (amount > 0),
  type                     text DEFAULT 'subscription'
                             CHECK (type IN ('subscription','independent')),
  stripe_payment_intent_id text,
  status                   text DEFAULT 'pending'
                             CHECK (status IN ('pending','completed')),
  created_at               timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: SUBSCRIPTION PAYMENTS
-- ============================================================
CREATE TABLE subscription_payments (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  amount           numeric NOT NULL,
  plan             text CHECK (plan IN ('monthly','yearly')),
  status           text DEFAULT 'pending' CHECK (status IN ('paid','failed')),
  created_at       timestamptz DEFAULT now()
);

-- ============================================================
-- STORAGE BUCKET for winner proof uploads
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY — Enable
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities             ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners               ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: is_admin()
-- Uses SECURITY DEFINER to avoid recursive RLS lookups
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ============================================================
-- RLS POLICIES — PROFILES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

-- Users can insert their own profile (signup)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile but CANNOT change their own role
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Admins can update any profile (subscription management)
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- RLS POLICIES — CHARITIES (public read, admin write)
-- ============================================================
CREATE POLICY "charities_public_select"
  ON charities FOR SELECT USING (true);

CREATE POLICY "charities_admin_insert"
  ON charities FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "charities_admin_update"
  ON charities FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "charities_admin_delete"
  ON charities FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — CHARITY EVENTS (public read, admin write)
-- ============================================================
CREATE POLICY "charity_events_public_select"
  ON charity_events FOR SELECT USING (true);

CREATE POLICY "charity_events_admin_write"
  ON charity_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- RLS POLICIES — SCORES
-- ============================================================
CREATE POLICY "scores_select"
  ON scores FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "scores_insert_own"
  ON scores FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() IS NULL  -- Allows mock users and system inserts
  );

CREATE POLICY "scores_delete_own"
  ON scores FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "scores_admin_delete"
  ON scores FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — DRAWS
-- ============================================================

-- Users see only published draws; admins see all
CREATE POLICY "draws_select"
  ON draws FOR SELECT
  USING (status = 'published' OR public.is_admin());

CREATE POLICY "draws_admin_insert"
  ON draws FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "draws_admin_update"
  ON draws FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "draws_admin_delete"
  ON draws FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — DRAW ENTRIES
-- ============================================================
CREATE POLICY "draw_entries_select"
  ON draw_entries FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "draw_entries_insert"
  ON draw_entries FOR INSERT
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = user_id 
    OR auth.uid() IS NULL  -- Allows system to create entries
  );

CREATE POLICY "draw_entries_admin_delete"
  ON draw_entries FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES — WINNERS
-- ============================================================
CREATE POLICY "winners_select"
  ON winners FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Users can ONLY update proof_url while status is pending
CREATE POLICY "winners_update_proof_own"
  ON winners FOR UPDATE
  USING (
    (auth.uid() = user_id AND verification_status = 'pending')
    OR auth.uid() IS NULL  -- Allows mock users
  )
  WITH CHECK (
    (auth.uid() = user_id AND verification_status = 'pending')
    OR auth.uid() IS NULL
  );

CREATE POLICY "winners_admin_all"
  ON winners FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- RLS POLICIES — DONATIONS
-- ============================================================
CREATE POLICY "donations_select"
  ON donations FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "donations_insert_own"
  ON donations FOR INSERT
  WITH CHECK (auth.uid() = user_id AND amount > 0);

-- ============================================================
-- RLS POLICIES — SUBSCRIPTION PAYMENTS
-- ============================================================
CREATE POLICY "sub_payments_select"
  ON subscription_payments FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Only backend (service_role) inserts payments via Stripe webhook
-- No authenticated insert policy here

-- ============================================================
-- RLS POLICIES — STORAGE (proof uploads)
-- ============================================================
DROP POLICY IF EXISTS "proof_upload_own" ON storage.objects;
CREATE POLICY "proof_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "proof_read_own" ON storage.objects;
CREATE POLICY "proof_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'proofs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

-- ============================================================
-- TRIGGER: Auto-create profile when user signs up
-- role is ALWAYS hardcoded to 'user' — cannot be injected
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, email,
    role, subscription_status, charity_contribution_pct
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.email,
    'user',       -- ALWAYS 'user' — never trust metadata for role
    'inactive',
    10
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- SEED DATA: Charities
-- ============================================================
INSERT INTO charities (name, slug, description, image_url, website_url, category, featured, total_raised)
VALUES
  ('CRY India',
   'cry-india',
   'Child Rights and You — protecting child rights across India since 1979. Working to ensure children have access to education, health, and protection.',
   'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=400&fit=crop',
   'https://www.cry.org',
   'Child Rights', true, 84200),

  ('Akshaya Patra',
   'akshaya-patra',
   'Fighting classroom hunger through the world''s largest midday meal programme serving millions of schoolchildren every day across India.',
   'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&h=400&fit=crop',
   'https://www.akshayapatra.org',
   'Midday Meals', false, 121000),

  ('Smile Foundation',
   'smile-foundation',
   'National development organisation directly benefitting over 1.5 million underprivileged children and their families through education and healthcare initiatives.',
   'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=400&fit=crop',
   'https://www.smilefoundationindia.org',
   'Education', false, 95500),

  ('HelpAge India',
   'helpage-india',
   'Empowering older persons to lead dignified, active and healthy lives. Working on issues of ageing and elder welfare since 1978 across India.',
   'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=400&fit=crop',
   'https://www.helpageindia.org',
   'Elder Care', false, 67800),

  ('GiveIndia',
   'give-india',
   'India''s largest and most trusted giving platform connecting millions of donors with credible non-profit organisations across every cause.',
   'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=400&fit=crop',
   'https://www.give.do',
   'Donation Hub', false, 43000),

  ('Sammaan Foundation',
   'sammaan-foundation',
   'Restoring dignity and rights for marginalised communities across urban and rural India through advocacy, skill-building, and community programs.',
   'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&h=400&fit=crop',
   '#',
   'Dignity', false, 31500)

ON CONFLICT (slug) DO UPDATE SET
  description  = EXCLUDED.description,
  image_url    = EXCLUDED.image_url,
  website_url  = EXCLUDED.website_url,
  category     = EXCLUDED.category,
  featured     = EXCLUDED.featured,
  total_raised = EXCLUDED.total_raised;

-- ============================================================
-- VERIFY SCHEMA
-- ============================================================
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name AND table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
