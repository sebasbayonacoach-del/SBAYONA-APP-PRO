-- BAYONA APP 7.0: read-only RPC exposure and authorization inventory.
-- Run against staging first; this does not invoke the function or access athlete rows.
-- PostgreSQL functions may be executable by PUBLIC by default; SECURITY DEFINER
-- must be paired with an explicit EXECUTE privilege review.
WITH rpc AS (
  SELECT p.oid, p.proname, p.prosecdef, p.provolatile,
         pg_get_function_identity_arguments(p.oid) AS signature,
         pg_get_functiondef(p.oid) AS definition,
         p.proowner::regrole::text AS owner
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'complete_coach_assignment'
)
SELECT proname, signature, owner, prosecdef AS security_definer,
       has_function_privilege('anon', oid, 'EXECUTE') AS anon_can_execute,
       has_function_privilege('authenticated', oid, 'EXECUTE') AS authenticated_can_execute,
       has_function_privilege('PUBLIC', oid, 'EXECUTE') AS public_can_execute,
       definition ~* 'auth\\.uid\\(\\)' AS checks_auth_uid,
       definition ~* 'coach_clients' AS references_coach_link,
       definition ~* 'status[[:space:]]*=[[:space:]]*''active''' AS checks_active_link,
       definition ~* 'FOR[[:space:]]+SHARE' AS locks_active_link
FROM rpc;
-- Acceptance: exactly one uuid signature; authenticated only as intended;
-- anonymous/PUBLIC execute must be explicitly reviewed, even if the function
-- also rejects unauthenticated callers. Text matches are diagnostic only.
-- This query is not proof of RLS, safe revocation, or concurrent correctness.
