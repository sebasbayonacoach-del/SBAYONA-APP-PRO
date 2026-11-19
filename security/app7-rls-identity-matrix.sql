-- APP 7.0: RLS identity matrix (isolated staging ONLY).
-- Run using psql -X -v ON_ERROR_STOP=1 -v coach='<synthetic-uuid>'
--   -v athlete='<synthetic-uuid>' -v outsider='<synthetic-uuid>'
--   -v routine='<synthetic-routine-uuid>' -f security/app7-rls-identity-matrix.sql
-- Preconditions: synthetic coach_clients ACTIVE link and synthetic routine exist.
-- No fixtures are created or modified. This script fails closed if they are absent.
-- Do NOT use production identities or service_role for assertions.
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role','authenticated',true);
SELECT set_config('app.test_coach', :'coach', true), set_config('app.test_athlete', :'athlete', true), set_config('app.test_outsider', :'outsider', true), set_config('app.test_routine', :'routine', true);
SELECT set_config('request.jwt.claim.sub', :'coach', true);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.coach_clients WHERE coach_id=auth.uid() AND client_id=current_setting('app.test_athlete')::uuid) <> 1
 THEN RAISE EXCEPTION 'FAIL: active coach cannot read own link (or fixture missing)'; END IF;
 IF (SELECT count(*) FROM public.coach_routines WHERE id=current_setting('app.test_routine')::uuid AND coach_id=auth.uid() AND client_id=current_setting('app.test_athlete')::uuid) <> 1
 THEN RAISE EXCEPTION 'FAIL: linked coach cannot read routine'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', :'athlete', true);
DO $$
BEGIN
 IF (SELECT count(*) FROM public.coach_routines WHERE id=current_setting('app.test_routine')::uuid) <> 1
 THEN RAISE EXCEPTION 'FAIL: athlete cannot read own routine'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', :'outsider', true);
DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM public.coach_clients WHERE coach_id=current_setting('app.test_coach')::uuid AND client_id=current_setting('app.test_athlete')::uuid)
 OR EXISTS (SELECT 1 FROM public.coach_routines WHERE id=current_setting('app.test_routine')::uuid)
 THEN RAISE EXCEPTION 'FAIL: unrelated authenticated user sees protected rows'; END IF;
END $$;
ROLLBACK;
-- Revocation must be checked separately with a synthetic revoked fixture.
-- Never infer revocation success from an unrelated-user test.
