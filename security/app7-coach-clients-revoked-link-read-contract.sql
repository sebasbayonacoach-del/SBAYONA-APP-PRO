-- APP 7.0: read-only policy contract for revoked Coach-Atleta links.
-- Static inspection only; a PASS does not replace authenticated end-to-end RLS tests.
-- No user data, writes, or privileges changed.
WITH p AS (
 SELECT tablename, policyname, permissive, qual
 FROM pg_policies
 WHERE schemaname='public' AND cmd='SELECT'
   AND tablename='coach_clients'
), checks AS (
 SELECT
   count(*) FILTER (WHERE permissive='PERMISSIVE'
     AND policyname='coach/client ve su vinculo'
     AND qual LIKE '%coach_id%'
     AND qual LIKE '%client_id%') AS matching_policies,
   count(*) FILTER (WHERE permissive='PERMISSIVE'
     AND policyname='coach/client ve su vinculo'
     AND qual ~* 'status[^)]*active') AS active_guard_policies
 FROM p
)
SELECT 'coach_clients revoked-link visibility' AS test,
 CASE WHEN matching_policies=1 AND active_guard_policies=1
      THEN 'STATIC_PASS' ELSE 'BLOCK' END AS result,
 matching_policies, active_guard_policies,
 'Coach-side SELECT must enforce active link; also test effective access using synthetic JWTs' AS interpretation
FROM checks;
