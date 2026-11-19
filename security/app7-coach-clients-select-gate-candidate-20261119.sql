-- APP 7.0: REVIEW CANDIDATE, NOT APPLIED TO SUPABASE.
-- Purpose: allow an authenticated coach to SELECT only their own coach_clients links.
-- Snapshot checked 2026-11-19: current RESTRICTIVE SELECT gate permits client_id=auth.uid()
-- or is_bayona_coach(), while the existing PERMISSIVE SELECT permits coach_id=auth.uid().
-- Both must pass, so ordinary coaches cannot read their own links.
-- This change does NOT grant INSERT/UPDATE/DELETE or bypass onboarding requirements.
-- Do not apply until synthetic active/revoked/unrelated identities pass functional RLS tests.
-- In particular, linked coaches may need to see a revoked link for audit/UI; routine access
-- must independently enforce active status. Never treat a visible link as authorization.
BEGIN;
DROP POLICY IF EXISTS bayona_owner_select_coach_clients ON public.coach_clients;
CREATE POLICY bayona_owner_select_coach_clients
ON public.coach_clients AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  client_id = (SELECT auth.uid())
  OR coach_id = (SELECT auth.uid())
  OR (SELECT public.is_bayona_coach())
);
COMMIT;

-- Manual rollback ONLY if baseline policies are unchanged:
-- BEGIN;
-- DROP POLICY IF EXISTS bayona_owner_select_coach_clients ON public.coach_clients;
-- CREATE POLICY bayona_owner_select_coach_clients
-- ON public.coach_clients AS RESTRICTIVE FOR SELECT TO authenticated
-- USING (client_id = (SELECT auth.uid()) OR (SELECT public.is_bayona_coach()));
-- COMMIT;
--
-- Acceptance matrix before deployment:
-- coach A sees only links where coach_id=A (including own revoked links)
-- athlete B sees only links where client_id=B
-- unrelated user C sees neither
-- coach A cannot SELECT another coach's link
-- revoked link does NOT authorize reading/writing assigned routines
-- ordinary coach INSERT/UPDATE/DELETE remain blocked pending separate scoped fixes
-- Verify actual onboarding and Google OAuth identity mapping; test in isolated DB first.
