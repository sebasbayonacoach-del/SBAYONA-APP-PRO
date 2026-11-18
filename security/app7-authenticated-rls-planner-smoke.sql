-- APP 7.0: authenticated-role RLS planner smoke test (read-only).
-- Run in Supabase SQL editor with a role permitted to SET ROLE authenticated.
-- This checks policy compilation/recursion, NOT authorization correctness.
-- The synthetic UUID does not correspond to a real user.
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
EXPLAIN (COSTS OFF) SELECT id FROM public.coach_clients LIMIT 1;
EXPLAIN (COSTS OFF) SELECT id FROM public.coach_routines LIMIT 1;
ROLLBACK;
-- Expected: two query plans, no infinite recursion detected.
-- Not proven: coach/athlete active/revoked visibility, OAuth, multi-device sync.
-- Never use service_role for a positive RLS access assertion: it bypasses RLS.
