-- ============================================================
-- UPDATE RLS POLICIES ONLY
-- Run this if you already ran 001_initial_schema.sql before
-- ============================================================

-- Fix Scores Policy
DROP POLICY IF EXISTS "scores_insert_own" ON scores;
CREATE POLICY "scores_insert_own"
  ON scores FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() IS NULL
  );

-- Fix Draw Entries Policy
DROP POLICY IF EXISTS "draw_entries_admin_insert" ON draw_entries;
DROP POLICY IF EXISTS "draw_entries_insert" ON draw_entries;
CREATE POLICY "draw_entries_insert"
  ON draw_entries FOR INSERT
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = user_id 
    OR auth.uid() IS NULL
  );

-- Fix Winners Policy
DROP POLICY IF EXISTS "winners_update_proof_own" ON winners;
CREATE POLICY "winners_update_proof_own"
  ON winners FOR UPDATE
  USING (
    (auth.uid() = user_id AND verification_status = 'pending')
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    (auth.uid() = user_id AND verification_status = 'pending')
    OR auth.uid() IS NULL
  );

-- Verify
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('scores', 'draw_entries', 'winners')
ORDER BY tablename, policyname;
