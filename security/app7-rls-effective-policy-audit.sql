-- APP 7.0 / read-only RLS effective-policy audit
-- Run against an isolated Supabase staging database using psql.
-- Reports metadata only: no athlete rows, credentials or JWTs.
-- This is NOT a substitute for the synthetic-identity regression.
BEGIN READ ONLY;
WITH targets(relname) AS (
  VALUES ('coach_clients'::name), ('coach_routines'::name)
),
tables AS (
  SELECT t.relname AS target, c.oid, c.relrowsecurity, c.relforcerowsecurity
  FROM targets t
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = t.relname
),
policies AS (
  SELECT tablename::name AS target, policyname, permissive, roles, cmd,
         qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('coach_clients','coach_routines')
)
SELECT t.target, (t.oid IS NOT NULL) AS table_exists,
       COALESCE(t.relrowsecurity,false) AS rls_enabled,
       COALESCE(t.relforcerowsecurity,false) AS force_rls,
       p.policyname, p.permissive, p.roles, p.cmd,
       p.qual AS using_expression, p.with_check AS check_expression
FROM tables t LEFT JOIN policies p ON p.target = t.target
ORDER BY t.target, p.cmd, p.permissive, p.policyname;
-- Fail fast if either table is missing or RLS is disabled.
DO $$
DECLARE bad text;
BEGIN
 SELECT string_agg(target::text, ', ') INTO bad
 FROM (
   SELECT x.relname AS target, c.oid, c.relrowsecurity
   FROM (VALUES ('coach_clients'::name),('coach_routines'::name)) x(relname)
   LEFT JOIN pg_namespace n ON n.nspname='public'
   LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=x.relname
 ) s WHERE oid IS NULL OR NOT relrowsecurity;
 IF bad IS NOT NULL THEN
   RAISE EXCEPTION 'APP7 RLS PREFLIGHT FAIL: missing table or RLS disabled: %', bad;
 END IF;
END $$;
-- Postgres combines permissive policies using OR and restrictive policies using AND.
-- This report does not establish effective authorization or revocation.
-- Execute security/app7-rls-revoked-link.sql with synthetic fixtures separately.
ROLLBACK;
