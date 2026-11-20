-- BAYONA APP 7.0 — read-only policy contract audit.
-- Run against isolated staging first: psql -X -v ON_ERROR_STOP=1 -f security/app7-rls-policy-contract.sql
-- No fixtures, impersonation, data writes or security-policy changes.
-- This is a policy-definition guard, NOT proof of effective JWT authorization.
BEGIN READ ONLY;
DO $audit$
DECLARE
  rls_enabled boolean;
  coach_read text;
  owner_guard text;
BEGIN
  SELECT c.relrowsecurity INTO rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='coach_routines';
  IF rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'APP7 RLS CONTRACT: coach_routines RLS is missing or disabled';
  END IF;

  SELECT qual INTO coach_read FROM pg_policies
  WHERE schemaname='public' AND tablename='coach_routines'
    AND policyname='coach/client lee rutina compartida'
    AND cmd='SELECT' AND permissive='PERMISSIVE';
  IF coach_read IS NULL THEN
    RAISE EXCEPTION 'APP7 RLS CONTRACT: expected shared-routine SELECT policy missing; review renamed policies';
  END IF;
  -- The existing policy allows auth.uid()=coach_id without checking an active link.
  -- Require an explicit link predicate before accepting owner access. This textual
  -- guard is intentionally conservative; policy refactors require manual review.
  IF position('coach_clients' in lower(coach_read)) = 0
     OR position('status' in lower(coach_read)) = 0 THEN
    RAISE EXCEPTION 'APP7 RLS CONTRACT: routine read policy lacks active-link guard';
  END IF;
  -- Merely having an EXISTS in the athlete OR branch does not protect coach owners.
  -- Reject the known unsafe owner-first pattern until a reviewed replacement exists.
  IF position('auth.uid() = coach_id) OR' in coach_read) > 0
     OR position('(auth.uid() = coach_id) OR' in coach_read) > 0 THEN
    RAISE EXCEPTION 'APP7 RLS CONTRACT: coach-owner read bypasses link revocation';
  END IF;

  SELECT qual INTO owner_guard FROM pg_policies
  WHERE schemaname='public' AND tablename='coach_routines'
    AND policyname='bayona_owner_select_coach_routines'
    AND cmd='SELECT' AND permissive='RESTRICTIVE';
  IF owner_guard IS NULL THEN
    RAISE EXCEPTION 'APP7 RLS CONTRACT: restrictive routine SELECT policy missing';
  END IF;
  RAISE NOTICE 'APP7 RLS policy-definition guard passed; run synthetic-identity RLS tests separately';
END
$audit$;
ROLLBACK;
