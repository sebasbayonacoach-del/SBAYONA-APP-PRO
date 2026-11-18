-- APP 7.0: read-only RLS policy contract for routine revocation.
-- This checks a narrow structural property, NOT effective authorization.
-- Expected on 2026-11-18: BLOCK. Expected after candidate hardening: PASS.
-- No data or policies are changed.
WITH policy AS (
  SELECT qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'coach_routines'
    AND policyname = 'coach/client lee rutina compartida'
    AND cmd = 'SELECT'
    AND permissive = 'PERMISSIVE'
),
checks AS (
  SELECT
    count(*) = 1 AS exactly_one_policy,
    coalesce(bool_and(qual ~* 'coach_clients'), false) AS mentions_link_table,
    coalesce(bool_and(qual ~* 'status[[:space:]]*=[[:space:]]*''active'''), false) AS checks_active_link,
    coalesce(bool_and(qual ~* 'cc[.]client_id[[:space:]]*=[[:space:]]*coach_routines[.]client_id'), false) AS matches_routine_client,
    coalesce(bool_and(qual ~* 'cc[.]coach_id[[:space:]]*=[[:space:]]*coach_routines[.]coach_id'), false) AS matches_routine_coach
  FROM policy
)
SELECT CASE
  WHEN exactly_one_policy AND mentions_link_table AND checks_active_link
       AND matches_routine_client AND matches_routine_coach
  THEN 'REVIEW: structural guards present; run synthetic role tests'
  ELSE 'BLOCK: missing required structural guard or policy'
END AS result,
exactly_one_policy, mentions_link_table, checks_active_link,
matches_routine_client, matches_routine_coach
FROM checks;
-- Note: OR branches may bypass the guards despite all checks passing.
-- Never treat REVIEW as authorization proof or deploy based on this alone.
