-- APP 7.0 / #68: read-only dependency preflight for candidate coach_routines SELECT.
-- Inspect coach_clients gate before running the candidate on an isolated DB.
-- BLOCK means review required; no changes are made by this script.
WITH p AS (
  SELECT tablename, policyname, permissive, cmd, lower(coalesce(qual,'')) AS expression
  FROM pg_policies
  WHERE schemaname='public' AND tablename IN ('coach_clients','coach_routines')
    AND cmd='SELECT'
), checks AS (
  SELECT 'coach_clients has owner/client restrictive gate' AS check_name,
    EXISTS (SELECT 1 FROM p WHERE tablename='coach_clients' AND permissive='RESTRICTIVE'
      AND expression LIKE '%is_bayona_coach()%'
      AND expression LIKE '%client_id%') AS blocked
  UNION ALL
  SELECT 'coach_routines has owner/client restrictive gate',
    EXISTS (SELECT 1 FROM p WHERE tablename='coach_routines' AND permissive='RESTRICTIVE'
      AND expression LIKE '%is_bayona_coach()%'
      AND expression LIKE '%client_id%')
  UNION ALL
  SELECT 'coach_routines still permits coach_id-only read',
    EXISTS (SELECT 1 FROM p WHERE tablename='coach_routines' AND permissive='PERMISSIVE'
      AND expression LIKE '%auth.uid() = coach_id%'
      AND expression NOT LIKE '%cc.client_id = coach_routines.client_id%')
)
SELECT check_name, CASE WHEN blocked THEN 'BLOCK' ELSE 'REVIEW' END AS result
FROM checks ORDER BY check_name;
-- Expected on 2026-11-18 snapshot: all BLOCK.
-- This is a static policy inspection, not an authenticated authorization test.
-- Do not drop restrictive policies based on this check alone.
