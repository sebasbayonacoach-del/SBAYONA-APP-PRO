-- APP 7.0: read-only RLS write-gate preflight (no user data)
-- A RESTRICTIVE policy is ANDed with permissive policies.
-- A policy's WITH CHECK, not USING, controls INSERT authorization.
WITH target AS (
 SELECT tablename, cmd, policyname, permissive,
        coalesce(qual,'') AS using_expr,
        coalesce(with_check,'') AS check_expr
 FROM pg_policies
 WHERE schemaname='public'
   AND tablename IN ('coach_clients','coach_routines')
   AND roles @> ARRAY['authenticated']::name[]
), gates AS (
 SELECT tablename,
   bool_or(permissive='RESTRICTIVE' AND cmd='INSERT'
     AND policyname='bayona_owner_only_insert'
     AND check_expr ILIKE '%is_bayona_coach%') AS insert_owner_gate,
   bool_or(permissive='RESTRICTIVE' AND cmd='UPDATE'
     AND policyname='bayona_owner_only_update'
     AND using_expr ILIKE '%is_bayona_coach%') AS update_owner_gate,
   bool_or(permissive='RESTRICTIVE' AND cmd='DELETE'
     AND policyname='bayona_owner_only_delete'
     AND using_expr ILIKE '%is_bayona_coach%') AS delete_owner_gate
 FROM target GROUP BY tablename
)
SELECT tablename,
       coalesce(insert_owner_gate,false) AS insert_owner_gate,
       coalesce(update_owner_gate,false) AS update_owner_gate,
       coalesce(delete_owner_gate,false) AS delete_owner_gate,
       CASE WHEN coalesce(insert_owner_gate,false)
                  AND coalesce(update_owner_gate,false)
                  AND coalesce(delete_owner_gate,false)
            THEN 'OWNER_ONLY_WRITES'
            ELSE 'REVIEW_WRITE_PATHS'
       END AS result
FROM gates ORDER BY tablename;
-- Static catalog contract only; does not establish effective permissions.
