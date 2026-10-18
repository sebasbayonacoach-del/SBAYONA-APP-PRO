-- BAYONA 0012: permissions and function search-path hardening.
-- Applied to the verified BAYONA Supabase project on 2026-10-18.
-- This migration contains NO users, email addresses, service keys or secrets.
-- Admin/anonymous users must never invoke privileged coach RPCs.
REVOKE EXECUTE ON FUNCTION public.create_coach_invite(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_coach_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_coach_assignment(uuid) FROM PUBLIC, anon;
-- These functions perform their own auth.uid() and business authorization checks.
GRANT EXECUTE ON FUNCTION public.create_coach_invite(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_coach_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_coach_assignment(uuid) TO authenticated;

ALTER FUNCTION public.xp_ledger_guard() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.touch_updated_at() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.coach_link_ids_immutable() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.coach_touch_updated_at() SET search_path = 'public, pg_temp';
ALTER FUNCTION public.life_os_touch_updated_at() SET search_path = 'public, pg_temp';
