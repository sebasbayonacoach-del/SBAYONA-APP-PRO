-- BAYONA APP 7.0: READ-ONLY RLS authorization exposure audit.
-- Execute in Supabase SQL editor (production read-only is safe).
-- Expected result BEFORE accepting Coach–Athlete staging: zero rows.
-- A returned row is a potentially broad PERMISSIVE policy, not proof of exploitation.
-- PostgreSQL combines PERMISSIVE policies with OR. An ALL policy applies to
-- SELECT/INSERT/UPDATE/DELETE, and can bypass more specific permissive rules.
-- This audit deliberately does not mutate or reveal athlete data.
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('coach_clients', 'coach_assignments')
  AND permissive = 'PERMISSIVE'
  AND (
    -- Broad onboarding/product-access policy with no row ownership constraint.
    (cmd = 'ALL'
      AND (coalesce(qual, '') ~* 'bayona_may_use_product'
        OR coalesce(with_check, '') ~* 'bayona_may_use_product'))
    -- Global coach privilege is not a substitute for coach_id row ownership.
    OR (coalesce(qual, '') ~* 'is_bayona_coach\\s*\\('
      AND coalesce(qual, '') !~* 'coach_id')
    OR (coalesce(with_check, '') ~* 'is_bayona_coach\\s*\\('
      AND coalesce(with_check, '') !~* 'coach_id')
  )
ORDER BY tablename, policyname;

-- Acceptance gate: do not apply the RPC fix to production until the
-- returned policies are reviewed and replaced by row-scoped authorization,
-- and real authenticated staging tests verify revocation, CRUD and history.
