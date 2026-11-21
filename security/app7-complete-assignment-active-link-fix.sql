-- BAYONA APP 7.0 — proposed revocation fix, NOT applied to production.
-- Preserve the RPC signature and return contract. Run in isolated staging first.
CREATE OR REPLACE FUNCTION public.complete_coach_assignment(p_assignment uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_rows integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (SELECT public.bayona_may_use_product()) THEN
    RAISE EXCEPTION 'Complete athlete onboarding before completing assignments';
  END IF;

  UPDATE public.coach_assignments AS a
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
   WHERE a.id = p_assignment
     AND a.client_id = auth.uid()
     AND a.status = 'pending'
     AND EXISTS (
       SELECT 1
         FROM public.coach_clients AS cc
        WHERE cc.coach_id = a.coach_id
          AND cc.client_id = a.client_id
          AND cc.status = 'active'
        FOR SHARE OF cc
     );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$function$;

-- Acceptance criteria in isolated staging:
-- active athlete completes own pending assignment -> true;
-- revoked link -> false, status remains pending;
-- unrelated athlete -> false; completed assignment -> false;
-- authorized completed history stays unchanged after revocation.
-- Validate actual authenticated JWT identities, RLS and concurrency before merge.
