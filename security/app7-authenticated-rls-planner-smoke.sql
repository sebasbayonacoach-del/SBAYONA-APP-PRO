-- APP 7.0: authenticated RLS planner smoke test (read-only).
-- Uses SELECT 1 to avoid assuming a shared primary-key column.
-- Checks RLS policy compilation, not effective access or revocation.
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
EXPLAIN (COSTS OFF) SELECT 1 FROM public.coach_clients LIMIT 1;
EXPLAIN (COSTS OFF) SELECT 1 FROM public.coach_routines LIMIT 1;
ROLLBACK;
-- Expected: two plans without RLS recursion errors.
-- Does not establish OAuth, Coach/Atleta authorization, or two-device sync.
