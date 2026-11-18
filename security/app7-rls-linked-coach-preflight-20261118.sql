-- APP 7.0: read-only RLS preflight for coach/athlete linking.
-- This inspects policy definitions, not effective authenticated access.
-- Expected on 2026-11-18: BLOCK until the linked-coach candidate is safely tested.
WITH policies AS (
 SELECT tablename, policyname, permissive, lower(coalesce(qual,'')) AS predicate
 FROM pg_policies
 WHERE schemaname='public' AND cmd='SELECT'
   AND tablename IN ('coach_clients','coach_routines')
), checks AS (
 SELECT 'coach_clients_restrictive_active_link' AS check_name,
        EXISTS(SELECT 1 FROM policies WHERE tablename='coach_clients'
          AND permissive='RESTRICTIVE' AND predicate LIKE '%coach_id%'
          AND predicate LIKE '%status%' AND predicate LIKE '%active%') AS passed
 UNION ALL
 SELECT 'coach_routines_restrictive_link_guard',
        EXISTS(SELECT 1 FROM policies WHERE tablename='coach_routines'
          AND permissive='RESTRICTIVE' AND predicate LIKE '%coach_id%'
          AND predicate LIKE '%coach_clients%' AND predicate LIKE '%active%')
 UNION ALL
 SELECT 'coach_routines_permissive_unconditional_coach',
        NOT EXISTS(SELECT 1 FROM policies WHERE tablename='coach_routines'
          AND permissive='PERMISSIVE' AND predicate ~ 'auth\\.uid\\(\\) = coach_id'
          AND predicate NOT LIKE '%active%')
)
SELECT check_name, CASE WHEN passed THEN 'PASS' ELSE 'BLOCK' END AS result
FROM checks ORDER BY check_name;
-- Static preflight only. Do not apply migrations based solely on PASS.
-- Next: isolated synthetic JWT/RLS test including active -> revoked -> denied.
