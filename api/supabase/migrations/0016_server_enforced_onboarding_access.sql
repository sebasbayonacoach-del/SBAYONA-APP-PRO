-- BAYONA: server-enforced athlete onboarding for domain APIs, not only frontend.
CREATE OR REPLACE FUNCTION public.bayona_may_use_product()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.bayona_owner WHERE user_id = (SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND onboarding_version >= 5
      AND onboarding_completed_at IS NOT NULL
      AND privacy_notice_ack_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.bayona_may_use_product() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bayona_may_use_product() TO authenticated;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'consents','avatars','plans','workout_sessions','sets_log',
    'health_samples','readiness_daily','scans','red_flags','xp_ledger',
    'body_medidas','entrenamientos_asignados','coach_clients','coach_invites',
    'coach_routines','coach_assignments','planner_items','connected_sources'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS bayona_completed_onboarding_required ON public.%I',tbl);
    EXECUTE format(
      'CREATE POLICY bayona_completed_onboarding_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT public.bayona_may_use_product())) WITH CHECK ((SELECT public.bayona_may_use_product()))',
      tbl
    );
  END LOOP;
END $$;
