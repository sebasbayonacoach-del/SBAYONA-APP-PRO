-- APP 7.0 / #68. REVIEW CANDIDATE ONLY. NOT APPLIED.
-- Scope: coach_routines SELECT restrictive gate; requires isolated test and RLS identity matrix.
-- Current snapshot 2026-11-18:
-- bayona_owner_select_coach_routines RESTRICTIVE:
-- (client_id = (SELECT auth.uid())) OR (SELECT is_bayona_coach())
-- The restrictive gate blocks non-owner coaches even when linked.
-- This candidate permits linked, active coaches WITHOUT removing the restrictive gate.
-- It does not relax writes, and does not change coach_clients policies.
-- WARNING: SELECT from coach_clients is itself RLS-protected; coaches not recognized by
-- is_bayona_coach() may still be unable to see their link, so this may NOT unlock reads.
-- Validate recursion, linked/revoked/unrelated coach and athlete with synthetic JWTs.
-- Also validate the separate permissive coach_routines policy before using this.
BEGIN;
DROP POLICY IF EXISTS bayona_owner_select_coach_routines ON public.coach_routines;
CREATE POLICY bayona_owner_select_coach_routines
ON public.coach_routines AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  client_id = (SELECT auth.uid())
  OR (SELECT public.is_bayona_coach())
  OR (
    coach_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.coach_clients cc
      WHERE cc.coach_id = coach_routines.coach_id
        AND cc.client_id = coach_routines.client_id
        AND cc.status = 'active'
    )
  )
);
COMMIT;

-- ROLLBACK ONLY if original snapshot still matches:
-- BEGIN;
-- DROP POLICY IF EXISTS bayona_owner_select_coach_routines ON public.coach_routines;
-- CREATE POLICY bayona_owner_select_coach_routines
-- ON public.coach_routines AS RESTRICTIVE FOR SELECT TO authenticated
-- USING ((client_id = (SELECT auth.uid())) OR (SELECT public.is_bayona_coach()));
-- COMMIT;
--
-- Stop conditions before applying: verify public.is_bayona_coach() semantics,
-- confirm no RLS recursion, confirm revoked coach denied after both candidate policies,
-- and confirm existing coach_clients RLS does not block authorized link visibility.
-- This file is a review artifact, NOT a production migration.
