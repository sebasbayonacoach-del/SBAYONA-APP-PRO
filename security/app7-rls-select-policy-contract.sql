-- APP 7.0: read-only RLS SELECT contract; run as privileged auditor.
-- BLOCK = review required; not proof of data exposure or denied authenticated request.
WITH p AS (
 SELECT tablename, policyname, permissive, cmd, coalesce(qual,'') AS predicate
 FROM pg_policies WHERE schemaname='public' AND tablename IN ('coach_clients','coach_routines')
), checks AS (
 SELECT 'coach_clients owner SELECT gate' AS check_name,
 EXISTS (SELECT 1 FROM p WHERE tablename='coach_clients' AND permissive='RESTRICTIVE' AND cmd='SELECT' AND policyname='bayona_owner_select_coach_clients') AS blocked
 UNION ALL
 SELECT 'coach_routines owner SELECT gate',
 EXISTS (SELECT 1 FROM p WHERE tablename='coach_routines' AND permissive='RESTRICTIVE' AND cmd='SELECT' AND policyname='bayona_owner_select_coach_routines')
 UNION ALL
 SELECT 'coach_routines permissive coach_id bypass',
 EXISTS (SELECT 1 FROM p WHERE tablename='coach_routines' AND permissive='PERMISSIVE' AND cmd='SELECT' AND policyname='coach/client lee rutina compartida' AND predicate LIKE '%auth.uid() = coach_id%' AND predicate NOT LIKE '%cc.status%active%') 
)
SELECT check_name, CASE WHEN blocked THEN 'BLOCK' ELSE 'REVIEW' END AS status FROM checks ORDER BY check_name;
-- Follow up with synthetic authenticated identities; this checks catalog definitions only.
