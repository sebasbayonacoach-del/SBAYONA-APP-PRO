-- BAYONA APP 7.0: fail-closed regression for assignment completion after link revocation.
-- Read-only metadata check; run against an isolated Supabase staging database.
-- This is NOT an authenticated behavioral test or proof of authorization.
BEGIN READ ONLY;
DO $audit$
DECLARE
  body text;
  definition text;
  matching_count integer;
BEGIN
  SELECT count(*), max(pg_get_functiondef(p.oid))
    INTO matching_count, definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'complete_coach_assignment';
  IF matching_count <> 1 THEN
    RAISE EXCEPTION 'APP7 ASSIGNMENT CONTRACT: expected exactly one public.complete_coach_assignment overload; found %', matching_count;
  END IF;
  body := lower(definition);
  IF position('security definer' in body) = 0 THEN
    RAISE EXCEPTION 'APP7 ASSIGNMENT CONTRACT: SECURITY DEFINER changed; manual authorization review required';
  END IF;
  -- A revoked coach/athlete link must prevent completing a pending assignment.
  -- These tokens are conservative structural prerequisites, not sufficient proof.
  IF position('coach_clients' in body) = 0
     OR position('status' in body) = 0
     OR position('auth.uid()' in body) = 0 THEN
    RAISE EXCEPTION 'APP7 ASSIGNMENT CONTRACT: completion lacks explicit authenticated active-link check';
  END IF;
  RAISE NOTICE 'APP7 ASSIGNMENT CONTRACT: structural prerequisites present; verify revoked-link rejection with synthetic JWT identities';
END
$audit$;
ROLLBACK;
