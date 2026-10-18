-- BAYONA: sole verified Auth identity may enter Coach Studio.
CREATE OR REPLACE FUNCTION public.is_bayona_coach()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bayona_owner o
    JOIN auth.users u ON u.id = o.user_id
    WHERE o.singleton = true
      AND o.user_id = (SELECT auth.uid())
      AND lower(u.email) = 'sevisionari@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.is_bayona_coach() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_bayona_coach() TO authenticated;

CREATE OR REPLACE FUNCTION public.bayona_guard_owner_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email
    AND lower(coalesce(NEW.email,'')) <> 'sevisionari@gmail.com'
    AND EXISTS (SELECT 1 FROM public.bayona_owner WHERE user_id=NEW.id)
  THEN
    DELETE FROM public.bayona_owner WHERE user_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bayona_guard_owner_email() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bayona_owner_auth_email_guard ON auth.users;
CREATE TRIGGER bayona_owner_auth_email_guard
AFTER UPDATE OF email ON auth.users
FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.bayona_guard_owner_email();

CREATE OR REPLACE FUNCTION public.bayona_may_use_product()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT (SELECT public.is_bayona_coach())
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND onboarding_version >= 5
      AND onboarding_completed_at IS NOT NULL
      AND privacy_notice_ack_at IS NOT NULL
  );
$$;
REVOKE ALL ON FUNCTION public.bayona_may_use_product() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bayona_may_use_product() TO authenticated;
