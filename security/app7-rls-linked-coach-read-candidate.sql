-- APP 7.0 / issue #68: candidate migration, NOT applied.
-- Must be tested on isolated database with synthetic Coach/Atleta identities.
-- Existing PERMISSIVE policies still scope rows; onboarding RESTRICTIVE stays.
-- This removes owner-only SELECT gates that currently cancel linked-coach SELECT grants.
-- Do not deploy before validating all affected roles and revocation cases.
BEGIN;
DROP POLICY IF EXISTS "bayona_owner_select_coach_assignments" ON public.coach_assignments;
DROP POLICY IF EXISTS "bayona_owner_select_coach_routines" ON public.coach_routines;
DROP POLICY IF EXISTS "bayona_owner_select_sessions" ON public.workout_sessions;
DROP POLICY IF EXISTS "bayona_owner_select_sets" ON public.sets_log;
-- Intentionally retain restrictive onboarding and owner-only write policies.
COMMIT;

-- Rollback (separate transaction; original definitions captured 2026-11-18):
-- CREATE POLICY "bayona_owner_select_coach_assignments" ON public.coach_assignments AS RESTRICTIVE FOR SELECT TO authenticated USING ((client_id = (SELECT auth.uid())) OR (SELECT is_bayona_coach()));
-- CREATE POLICY "bayona_owner_select_coach_routines" ON public.coach_routines AS RESTRICTIVE FOR SELECT TO authenticated USING ((client_id = (SELECT auth.uid())) OR (SELECT is_bayona_coach()));
-- CREATE POLICY "bayona_owner_select_sessions" ON public.workout_sessions AS RESTRICTIVE FOR SELECT TO authenticated USING ((user_id = (SELECT auth.uid())) OR (SELECT is_bayona_coach()));
-- CREATE POLICY "bayona_owner_select_sets" ON public.sets_log AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT is_bayona_coach()) OR EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = sets_log.session_id AND ws.user_id = (SELECT auth.uid())));
-- WARNING: verify exact roles and original policy DDL via pg_policies before rollback.
