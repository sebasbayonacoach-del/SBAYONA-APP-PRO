-- BAYONA onboarding v5: profile verified by server, minimal personal training fields.
-- Avoid asking clinical questions or treating privacy acknowledgement as health consent.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_notice_ack_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_goal text,
  ADD COLUMN IF NOT EXISTS onboarding_experience text,
  ADD COLUMN IF NOT EXISTS onboarding_place text,
  ADD COLUMN IF NOT EXISTS onboarding_frequency smallint,
  ADD COLUMN IF NOT EXISTS onboarding_minutes smallint;

ALTER TABLE public.profiles
  ADD CONSTRAINT bayona_profile_onboarding_complete_valid
  CHECK (
    onboarding_completed_at IS NULL
    OR (
      onboarding_version >= 5
      AND privacy_notice_ack_at IS NOT NULL
      AND nullif(btrim(display_name),'') IS NOT NULL
      AND char_length(btrim(display_name)) BETWEEN 2 AND 40
      AND onboarding_goal IN ('BIENESTAR Y ADHERENCIA','COMPOSICIÓN CORPORAL','HIPERTROFIA MUSCULAR','FUERZA Y POTENCIA','RENDIMIENTO DEPORTIVO','MOVILIDAD Y FUNCIÓN','VOLVER A ENTRENAR')
      AND onboarding_experience IN ('EMPIEZO AHORA','ALGO DE EXPERIENCIA','ENTRENO HACE AÑOS')
      AND onboarding_place IN ('CASA · SIN MATERIAL','CASA · CON MATERIAL','GIMNASIO','PARQUE / CALISTENIA','BOX / ESTUDIO','VIAJO MUCHO')
      AND onboarding_frequency BETWEEN 2 AND 5
      AND onboarding_minutes IN (15,30,45,60)
    )
  );

CREATE OR REPLACE FUNCTION public.bayona_create_profile_for_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  INSERT INTO public.profiles(id,display_name)
  VALUES (NEW.id, nullif(left(btrim(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name','')),40),''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bayona_create_profile_for_auth_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS bayona_auth_new_user_profile ON auth.users;
CREATE TRIGGER bayona_auth_new_user_profile
AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.bayona_create_profile_for_auth_user();
