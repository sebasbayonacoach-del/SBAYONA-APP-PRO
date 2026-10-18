-- BAYONA 0014: safe covering indexes for high-frequency relations.
-- Verified against Supabase performance advisor; RLS/rows unchanged.
CREATE INDEX IF NOT EXISTS coach_assignments_routine_id_idx
  ON public.coach_assignments (routine_id);
CREATE INDEX IF NOT EXISTS coach_invites_used_by_idx
  ON public.coach_invites (used_by)
  WHERE used_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS plans_user_id_idx
  ON public.plans (user_id);
CREATE INDEX IF NOT EXISTS scans_user_id_idx
  ON public.scans (user_id);
