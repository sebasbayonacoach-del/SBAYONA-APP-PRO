-- APP 7.0 / #68: review-only candidate. DO NOT APPLY without authenticated synthetic tests.
-- Verified on 2026-11-18: is_bayona_coach() is a SECURITY DEFINER
-- singleton-owner check, NOT a general coach-role check.
-- Current restrictive coach_clients SELECT only allows client_id = auth.uid()
-- or is_bayona_coach(), preventing an ordinary linked coach from reading links.
-- Existing permissive SELECT: auth.uid() = coach_id OR auth.uid() = client_id.
-- This candidate keeps the owner path, adds active-link coach access, and
-- leaves athlete access unchanged. Revoked links are NOT readable by coaches.
-- Note: this is a proposal, not a tested migration. No data is modified here.
BEGIN;
DROP POLICY IF EXISTS bayona_owner_select_coach_clients ON public.coach_clients;
CREATE POLICY bayona_owner_select_coach_clients
ON public.coach_clients AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  client_id = (SELECT auth.uid())
  OR (SELECT public.is_bayona_coach())
  OR (coach_id = (SELECT auth.uid()) AND status = 'active')
);
COMMIT;

-- Manual rollback, only after checking live policy has not changed:
-- BEGIN;
-- DROP POLICY IF EXISTS bayona_owner_select_coach_clients ON public.coach_clients;
-- CREATE POLICY bayona_owner_select_coach_clients
-- ON public.coach_clients AS RESTRICTIVE FOR SELECT TO authenticated
-- USING ((client_id = (SELECT auth.uid())) OR (SELECT public.is_bayona_coach()));
-- COMMIT;

-- Required gates: use separate synthetic coach/client/unrelated identities;
-- test active -> revoked -> denied; ensure athlete visibility remains correct;
-- inspect other policies and foreign-key writes; test together with
-- app7-rls-restrictive-routines-gate-candidate.sql; no production promotion.
