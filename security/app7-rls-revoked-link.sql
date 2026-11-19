-- APP 7.0: revoked-link RLS regression. STAGING WITH SYNTHETIC DATA ONLY.
-- psql -X -v ON_ERROR_STOP=1 -v coach='<uuid>' -v athlete='<uuid>' -v routine='<uuid>' -f security/app7-rls-revoked-link.sql
-- Read-only. Requires pre-existing synthetic revoked link and its routine.
-- A failure may mean the RLS policy is unsafe OR the staging fixture is missing.
-- This test deliberately checks only revoked-coach denial. Athlete retention after
-- revocation is a separate product decision and must not be assumed here.
BEGIN READ ONLY;
SELECT set_config('app.test_coach', :'coach', true);
SELECT set_config('app.test_athlete', :'athlete', true);
SELECT set_config('app.test_routine', :'routine', true);
-- Preflight under migration/test administrator role, before impersonation.
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.coach_clients
   WHERE coach_id=current_setting('app.test_coach')::uuid
     AND client_id=current_setting('app.test_athlete')::uuid
     AND lower(status) = 'revoked'
 ) THEN RAISE EXCEPTION 'FIXTURE MISSING: explicitly revoked coach-client link'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_routine')::uuid
     AND coach_id=current_setting('app.test_coach')::uuid
     AND client_id=current_setting('app.test_athlete')::uuid
 ) THEN RAISE EXCEPTION 'FIXTURE MISSING: routine for revoked pair'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', :'coach', true);
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_routine')::uuid
 ) THEN RAISE EXCEPTION 'FAIL: revoked coach can still read athlete routine'; END IF;
END $$;
-- Athlete post-revocation access is intentionally NOT asserted: current policy
-- may require an active link. Define retention semantics before adding that test.
ROLLBACK;
-- Does not test writes, OAuth, or mobile. Never run with real identities.
