-- APP 7.0 / #68: read-only revocation safety gate for proposed SELECT migration.
-- A coach must lose access to shared routines when coach_clients.status != 'active'.
-- Run against staging before applying app7-rls-linked-coach-read-candidate.sql.
-- No personal records are selected.
WITH policies AS (
 SELECT tablename, policyname, cmd, permissive, coalesce(qual,'') AS expression
 FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('coach_routines','coach_assignments','workout_sessions','sets_log')
), checks AS (
 SELECT 'coach_routines coach SELECT requires active link' AS check_name,
   EXISTS (SELECT 1 FROM policies WHERE tablename='coach_routines'
     AND cmd='SELECT' AND permissive='PERMISSIVE'
     AND expression ILIKE '%coach_id%' AND expression ILIKE '%coach_clients%'
     AND expression ILIKE '%active%') AS passed,
   'A permissive coach_id-only SELECT policy could leak revoked routines after owner gate removal' AS detail
 UNION ALL
 SELECT 'coach_routines has unsafe coach_id-only SELECT', NOT EXISTS (
   SELECT 1 FROM policies WHERE tablename='coach_routines' AND cmd='SELECT'
   AND permissive='PERMISSIVE' AND expression ILIKE '%(auth.uid() = coach_id) OR%'
 ), 'Do not drop owner SELECT gate until this is fixed'
 UNION ALL
 SELECT 'linked sessions SELECT uses active link', EXISTS (
   SELECT 1 FROM policies WHERE tablename='workout_sessions' AND cmd='SELECT'
   AND permissive='PERMISSIVE' AND expression ILIKE '%coach_clients%'
   AND expression ILIKE '%active%'
 ), 'Required for revoked-coach isolation'
 UNION ALL
 SELECT 'linked sets SELECT uses active link', EXISTS (
   SELECT 1 FROM policies WHERE tablename='sets_log' AND cmd='SELECT'
   AND permissive='PERMISSIVE' AND expression ILIKE '%coach_clients%'
   AND expression ILIKE '%active%'
 ), 'Required for revoked-coach isolation'
)
SELECT check_name, CASE WHEN passed THEN 'PASS' ELSE 'BLOCK' END AS result, detail
FROM checks ORDER BY check_name;
-- This static policy audit is NOT a substitute for authenticated, synthetic-user RLS tests.
