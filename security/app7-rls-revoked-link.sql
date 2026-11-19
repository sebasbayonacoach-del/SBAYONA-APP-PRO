-- APP 7.0: revoked-link RLS regression. STAGING WITH SYNTHETIC DATA ONLY.
-- psql -X -v ON_ERROR_STOP=1 -v coach='<uuid>' -v athlete='<uuid>' -v routine='<uuid>' -v active_coach='<uuid>' -v active_athlete='<uuid>' -v active_routine='<uuid>' -f security/app7-rls-revoked-link.sql
-- Read-only. Requires synthetic revoked and active links with distinct routine IDs.
-- Positive control prevents a false pass when ALL ordinary coaches are blocked.
-- A failure may mean the RLS policy is unsafe OR the staging fixture is missing.
-- This test deliberately checks only revoked-coach denial. Athlete retention after
-- revocation is a separate product decision and must not be assumed here.
BEGIN READ ONLY;
SELECT set_config('app.test_coach', :'coach', true);
SELECT set_config('app.test_athlete', :'athlete', true);
SELECT set_config('app.test_routine', :'routine', true);
SELECT set_config('app.test_active_coach', :'active_coach', true);
SELECT set_config('app.test_active_athlete', :'active_athlete', true);
SELECT set_config('app.test_active_routine', :'active_routine', true);
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
 IF NOT EXISTS (
   SELECT 1 FROM public.coach_clients
   WHERE coach_id=current_setting('app.test_active_coach')::uuid
     AND client_id=current_setting('app.test_active_athlete')::uuid
     AND status='active'
 ) THEN RAISE EXCEPTION 'FIXTURE MISSING: active coach-client link'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_active_routine')::uuid
     AND coach_id=current_setting('app.test_active_coach')::uuid
     AND client_id=current_setting('app.test_active_athlete')::uuid
 ) THEN RAISE EXCEPTION 'FIXTURE MISSING: routine for active pair'; END IF;
 IF current_setting('app.test_coach')::uuid = current_setting('app.test_active_coach')::uuid
 THEN RAISE EXCEPTION 'FIXTURE INVALID: use distinct coaches'; END IF;
 IF current_setting('app.test_routine')::uuid = current_setting('app.test_active_routine')::uuid
 THEN RAISE EXCEPTION 'FIXTURE INVALID: use distinct routine IDs'; END IF;
END $$;
-- Fail closed if RLS is disabled or test impersonation cannot be trusted.
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='coach_routines' AND c.relrowsecurity
 ) THEN RAISE EXCEPTION 'FAIL: RLS disabled on coach_routines'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', :'coach', true);
DO $$
BEGIN
 IF auth.uid() IS DISTINCT FROM current_setting('app.test_coach')::uuid
 THEN RAISE EXCEPTION 'FAIL: revoked coach JWT impersonation invalid'; END IF;
END $$;
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_routine')::uuid
 ) THEN RAISE EXCEPTION 'FAIL: revoked coach can still read athlete routine'; END IF;
END $$;
-- Negative cross-account control in the revoked-coach context: revocation must
-- not expose a different active coach's routine (independent of link status).
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_active_routine')::uuid
 ) THEN RAISE EXCEPTION 'FAIL: revoked coach can read active coach routine'; END IF;
END $$;
-- Positive authorization control: active coach MUST read their own routine.
SELECT set_config('request.jwt.claim.sub', :'active_coach', true);
DO $$
BEGIN
 IF auth.uid() IS DISTINCT FROM current_setting('app.test_active_coach')::uuid
 THEN RAISE EXCEPTION 'FAIL: active coach JWT impersonation invalid'; END IF;
END $$;
DO $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_active_routine')::uuid
 ) THEN RAISE EXCEPTION 'FAIL: active coach cannot read linked routine'; END IF;
END $$;
-- Negative cross-account control: an active coach must not see another coach's routine.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.coach_routines
   WHERE id=current_setting('app.test_routine')::uuid
 ) THEN RAISE EXCEPTION 'FAIL: active coach can read another coach routine'; END IF;
END $$;
-- Athlete post-revocation access is intentionally NOT asserted: current policy
-- may require an active link. Define retention semantics before adding that test.
ROLLBACK;
-- Does not test writes, OAuth, or mobile. Never run with real identities.
