-- ============================================================
-- MIGRATION 003: Stripe webhook helpers + independent donations
-- ============================================================

-- RPC: safely increment charity total_raised (used by stripe-webhook)
CREATE OR REPLACE FUNCTION public.increment_charity_raised(
  charity_id_input uuid,
  amount_input numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.charities
  SET total_raised = total_raised + amount_input
  WHERE id = charity_id_input;
END;
$$;

-- Allow authenticated users to insert independent donations
-- (subscription donations are inserted by service_role via webhook)
CREATE POLICY "donations_independent_insert"
  ON donations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND type = 'independent'
    AND amount > 0
  );
