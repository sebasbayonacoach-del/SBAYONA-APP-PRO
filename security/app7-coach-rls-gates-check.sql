-- APP 7.0: read-only RLS policy regression probe.
-- Run in SQL editor on a disposable/staging database; no user rows accessed.
-- A "BLOCKED_BY_RESTRICTIVE" result indicates coach-specific permissive
-- policies cannot grant access to an ordinary linked coach.
WITH target AS (
  SELECT * FROM (VALUES
    ('coach_assignments','SELECT'),('coach_assignments','INSERT'),
    ('coach_assignments','UPDATE'),('coach_assignments','DELETE'),
    ('coach_routines','SELECT'),('coach_routines','INSERT'),
    ('coach_routines','UPDATE'),('coach_routines','DELETE'),
    ('workout_sessions','SELECT'),('sets_log','SELECT')
  ) AS t(table_name, operation)
), gates AS (
  SELECT t.table_name, t.operation,
    count(*) FILTER (WHERE p.permissive='RESTRICTIVE'
      AND p.policyname LIKE 'bayona_owner_%'
      AND (p.cmd=t.operation OR p.cmd='ALL')) AS owner_restrictive_gates,
    string_agg(p.policyname, ', ' ORDER BY p.policyname)
      FILTER (WHERE p.permissive='RESTRICTIVE'
      AND p.policyname LIKE 'bayona_owner_%'
      AND (p.cmd=t.operation OR p.cmd='ALL')) AS gate_names
  FROM target t
  LEFT JOIN pg_policies p ON p.schemaname='public'
    AND p.tablename=t.table_name AND 'authenticated'=ANY(p.roles)
  GROUP BY t.table_name,t.operation
)
SELECT table_name,operation,owner_restrictive_gates,gate_names,
  CASE WHEN owner_restrictive_gates>0 THEN 'REVIEW_OWNER_RESTRICTIVE_GATE'
       ELSE 'NO_OWNER_NAMED_RESTRICTIVE_GATE' END AS finding
FROM gates ORDER BY table_name,operation;
-- This is a configuration probe, NOT a two-identity authorization test.
-- Before any RLS migration: validate actual SELECT/INSERT/UPDATE/DELETE
-- with synthetic coach, linked athlete, unlinked athlete, and owner identities.
