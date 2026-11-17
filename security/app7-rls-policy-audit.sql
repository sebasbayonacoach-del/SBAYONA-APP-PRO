-- APP 7.0 / read-only security gate for training RLS.
-- Run as an authorized database reviewer. Does not read user rows or mutate data.
-- A result row indicates a potentially unsafe permissive ALL policy that must
-- be reviewed before the Coach -> Athlete -> routine -> history flow is released.
-- Exit criterion: zero rows, followed by multi-identity RLS integration tests.
SELECT schemaname, tablename, policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('coach_assignments','coach_routines','workout_sessions','sets_log')
  AND permissive = 'PERMISSIVE'
  AND cmd = 'ALL'
  AND (
    coalesce(qual,'') ~* 'bayona_may_use_product[[:space:]]*\\('
    OR coalesce(with_check,'') ~* 'bayona_may_use_product[[:space:]]*\\('
  )
ORDER BY tablename, policyname;
