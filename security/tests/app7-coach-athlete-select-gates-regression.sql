-- APP 7.0: regression gate for Coach -> Athlete routine SELECT.
-- Read-only: run on isolated test DB AFTER applying both candidate SELECT policies.
-- Raises an exception on unsafe/incomplete configuration; never alters rows or policies.
BEGIN READ ONLY;
DO $$
DECLARE
  t text;
  p record;
  predicate text;
BEGIN
  FOREACH t IN ARRAY ARRAY['coach_clients','coach_routines'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS disabled on public.%', t;
    END IF;
    SELECT string_agg(coalesce(qual,''), ' ') INTO predicate
    FROM pg_policies
    WHERE schemaname='public' AND tablename=t
      AND cmd IN ('SELECT','ALL') AND permissive='RESTRICTIVE'
      AND ('authenticated'=ANY(roles) OR 'public'=ANY(roles));
    IF predicate IS NULL THEN
      RAISE EXCEPTION 'Missing restrictive authenticated SELECT gate on %',t;
    END IF;
    IF position('is_bayona_coach' in predicate)=0 THEN
      RAISE EXCEPTION 'Owner fallback missing in %',t;
    END IF;
    IF t='coach_clients' AND position('coach_id' in predicate)=0 THEN
      RAISE EXCEPTION 'Linked coach cannot pass restrictive SELECT gate in %',t;
    END IF;
    IF t='coach_routines' AND
       (position('coach_id' in predicate)=0 OR
        position('coach_clients' in predicate)=0 OR
        position('active' in predicate)=0) THEN
      RAISE EXCEPTION 'Active link verification missing in %',t;
    END IF;
  END LOOP;
  RAISE NOTICE 'Structural SELECT gates passed; identity-based RLS tests are STILL REQUIRED.';
END $$;
ROLLBACK;

-- NOT an E2E test. Before merging, execute isolated identity matrix:
-- owner; linked active coach; revoked coach; unrelated coach; athlete.
-- Verify reads AND writes, invitation RPCs, and no recursive RLS failures.
-- Do not run synthetic identity fixtures against production user data.
