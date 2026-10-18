-- BAYONA 0018: coach invitations cannot outlive or bypass the verified
-- single owner; athletes must complete onboarding before accepting work.
CREATE OR REPLACE FUNCTION public.create_coach_invite(p_hours integer DEFAULT 72)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_hours integer := greatest(1, least(coalesce(p_hours, 72), 168));
BEGIN
  IF auth.uid() IS NULL OR NOT (SELECT public.is_bayona_coach()) THEN
    RAISE EXCEPTION 'Verified BAYONA owner required';
  END IF;
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    BEGIN
      INSERT INTO public.coach_invites(code, coach_id, expires_at)
      VALUES (v_code, auth.uid(), now() + make_interval(hours => v_hours));
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Generate a new code if a collision occurs.
    END;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_coach_invite(p_code text)
RETURNS TABLE(coach_id uuid, coach_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_inv public.coach_invites%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT (SELECT public.bayona_may_use_product()) THEN
    RAISE EXCEPTION 'Complete athlete onboarding before accepting a coach invitation';
  END IF;

  SELECT * INTO v_inv
  FROM public.coach_invites
  WHERE code = upper(trim(p_code)) AND used_by IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invite invalid or expired'; END IF;
  IF v_inv.coach_id = auth.uid() THEN RAISE EXCEPTION 'Coach cannot invite self'; END IF;

  -- Reject codes minted by a previous owner or a now-revoked coach.
  IF NOT EXISTS (
    SELECT 1 FROM public.bayona_owner o
      JOIN auth.users u ON u.id=o.user_id
    WHERE o.singleton = true AND o.user_id=v_inv.coach_id
      AND lower(u.email)='sevisionari@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Coach invitation is no longer valid';
  END IF;

  INSERT INTO public.coach_clients(coach_id, client_id, status, accepted_at)
  VALUES (v_inv.coach_id, auth.uid(), 'active', now())
  ON CONFLICT (coach_id, client_id)
  DO UPDATE SET status='active', accepted_at=now(), updated_at=now();

  UPDATE public.coach_invites
  SET used_by=auth.uid(), used_at=now()
  WHERE code=v_inv.code;

  RETURN QUERY SELECT p.id, coalesce(p.display_name,'Coach')
  FROM public.profiles p WHERE p.id=v_inv.coach_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_coach_assignment(p_assignment uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (SELECT public.bayona_may_use_product()) THEN
    RAISE EXCEPTION 'Complete athlete onboarding before completing assignments';
  END IF;
  UPDATE public.coach_assignments
  SET status='completed', completed_at=now(), updated_at=now()
  WHERE id=p_assignment AND client_id=auth.uid() AND status='pending';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows=1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_coach_invite(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_coach_invite(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_coach_assignment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_coach_invite(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_coach_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_coach_assignment(uuid) TO authenticated;
