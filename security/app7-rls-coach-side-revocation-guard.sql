-- APP 7.0 / #68: precise read-only policy guard.
-- Distinguishes coach-side revocation from client-side active-link checks.
-- Does not change RLS or inspect user records.
WITH p AS (
 SELECT policyname, cmd, permissive, coalesce(qual,'') AS q
 FROM pg_policies
 WHERE schemaname='public' AND tablename='coach_routines'
), checks AS (
 SELECT 'coach SELECT must not grant unconditional coach_id access' AS check_name,
 NOT EXISTS (
  SELECT 1 FROM p
  WHERE cmd IN ('SELECT','ALL') AND permissive='PERMISSIVE'
    AND q ~* 'auth[.]uid[(][)]\s*=\s*coach_id'
    AND q ~* '^\s*[(]+\s*[(]*auth[.]uid[(][)]\s*=\s*coach_id[)]*\s+OR'
 ) AS passed
 UNION ALL
 SELECT 'coach-side active relationship explicitly present',
 EXISTS (
  SELECT 1 FROM p
  WHERE cmd IN ('SELECT','ALL') AND permissive='PERMISSIVE'
    AND q ILIKE '%coach_clients%' AND q ILIKE '%active%'
    AND q ~* 'cc[.]coach_id\s*=\s*auth[.]uid[(][)]'
 ) AS passed
)
SELECT check_name, CASE WHEN passed THEN 'PASS' ELSE 'BLOCK' END AS result
FROM checks ORDER BY check_name;
-- This guard is intentionally conservative. A PASS does not prove isolation;
-- follow with synthetic identities, active/revoked links and RLS tests in staging.
