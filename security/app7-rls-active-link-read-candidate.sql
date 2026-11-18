-- APP 7.0 / #68: candidate read-policy hardening, NOT applied.
-- Run ONLY on an isolated test database after validating synthetic identities.
-- This closes coach_id-only SELECT after a coach_clients link is revoked.
-- It does NOT remove the existing restrictive owner SELECT gate;
-- therefore this file alone does NOT unlock ordinary coach reads.
-- Apply this candidate BEFORE testing/removing the restrictive read gate.
BEGIN;
DROP POLICY IF EXISTS "coach/client lee rutina compartida" ON public.coach_routines;
CREATE POLICY "coach/client lee rutina compartida"
ON public.coach_routines
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  (
    (SELECT auth.uid()) = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = coach_routines.coach_id
        AND cc.client_id = coach_routines.client_id
        AND cc.status = 'active'
    )
  )
  OR
  (
    (SELECT auth.uid()) = client_id
    AND EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = coach_routines.coach_id
        AND cc.client_id = coach_routines.client_id
        AND cc.status = 'active'
    )
  )
);
COMMIT;

-- Rollback candidate (execute separately, only if original policy matches
-- the 2026-11-18 read-only snapshot):
-- BEGIN;
-- DROP POLICY IF EXISTS "coach/client lee rutina compartida" ON public.coach_routines;
-- CREATE POLICY "coach/client lee rutina compartida"
-- ON public.coach_routines AS PERMISSIVE FOR SELECT TO authenticated
-- USING (
--   (auth.uid() = coach_id)
--   OR ((auth.uid() = client_id) AND EXISTS (
--     SELECT 1 FROM public.coach_clients cc
--     WHERE cc.coach_id = coach_routines.coach_id
--       AND cc.client_id = auth.uid() AND cc.status = 'active'
--   ))
-- );
-- COMMIT;
--
-- Required QA: linked coach can read; revoked coach cannot; unrelated coach
-- cannot; linked athlete can read; revoked athlete cannot; owner unaffected;
-- onboarding restrictive gate retained; check RLS on coach_clients and
-- query plans for recursion. Do not merge without these tests.
