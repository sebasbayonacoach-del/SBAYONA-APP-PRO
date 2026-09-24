-- =====================================================================
-- BAYONA — 0003_avatar_3d.sql
-- Avatar 3D (Avaturn): nuevo dominio de consentimiento 'avatar_3d'
-- (la selfie se procesa en servidores de Avaturn, revocable).
-- La tabla `avatars` ya existe en el esquema base: aquí solo se amplía
-- el CHECK de dominios. Idempotente: se puede aplicar dos veces.
-- =====================================================================

do $$
declare
  c record;
begin
  -- suelta cualquier CHECK antiguo sobre consents(domain) que no conozca avatar_3d
  for c in
    select conname
    from pg_constraint
    where conrelid = 'consents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%voice%'
      and pg_get_constraintdef(oid) not ilike '%avatar_3d%'
  loop
    execute format('alter table consents drop constraint %I', c.conname);
  end loop;

  -- añade el CHECK ampliado si aún no existe
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'consents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%avatar_3d%'
  ) then
    alter table consents add constraint consents_domain_check
      check (domain in ('vision','body_scan','health_wearables',
                        'health_clinical','nutrition_photo','voice','avatar_3d'));
  end if;
end $$;
