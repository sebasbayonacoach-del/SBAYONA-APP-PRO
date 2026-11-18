-- APP 7.0: read-only RLS regression guard, run in Supabase SQL editor.
-- Fails when owner-only restrictive gates still prevent ordinary coaches
-- from writing routines/assignments or reading linked athlete history.
-- This checks policy configuration, NOT effective authorization with JWTs.
WITH expected(table_name, operation) AS (
 VALUES ('coach_assignments','INSERT'),('coach_assignments','UPDATE'),
        ('coach_assignments','DELETE'),('coach_assignments','SELECT'),
        ('coach_routines','INSERT'),('coach_routines','UPDATE'),
        ('coach_routines','DELETE'),('coach_routines','SELECT'),
        ('workout_sessions','SELECT'),('sets_log','SELECT')
), gates AS (
 SELECT e.table_name,e.operation,p.policyname,p.qual,p.with_check
 FROM expected e JOIN pg_policies p ON p.schemaname='public'
  AND p.tablename=e.table_name AND p.permissive='RESTRICTIVE'
  AND p.cmd IN ('ALL',e.operation)
 WHERE p.policyname LIKE 'bayona_owner_%'
), results AS (
 SELECT e.table_name,e.operation,
   COALESCE(string_agg(g.policyname, ', ' ORDER BY g.policyname),'') AS owner_gates,
   count(g.policyname) AS owner_gate_count
 FROM expected e LEFT JOIN gates g ON g.table_name=e.table_name
  AND g.operation=e.operation
 GROUP BY e.table_name,e.operation
)
SELECT *, CASE WHEN owner_gate_count=0 THEN 'PASS: no owner-named restrictive gate'
 ELSE 'FAIL: inspect restrictive owner gate' END AS verdict
FROM results ORDER BY table_name,operation;
-- Expected before fix: 10 FAIL rows (observed 2026-11-18).
-- Do not change production policies based solely on this diagnostic.
-- Follow with authenticated owner/coach/linked/unlinked athlete JWT tests.
