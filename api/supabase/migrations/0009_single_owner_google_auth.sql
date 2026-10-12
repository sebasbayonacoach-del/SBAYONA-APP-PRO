-- BAYONA Auth 1.0.10 · un único propietario puede ser Coach.
-- IMPORTANTE: ejecuta esta migración solo en el proyecto real de BAYONA.
-- Se crea vacía a propósito: el propietario se activa después desde el
-- SQL Editor con su UUID de auth.users (ver docs/AUTH-GOOGLE-SETUP.md).
-- Nunca permite que registro público, metadata o perfiles se autonombren coach.

create table if not exists public.bayona_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.bayona_owner enable row level security;
revoke all on public.bayona_owner from public, anon, authenticated;
-- Sin policies: no acceso directo desde el cliente ni usuarios registrados.

create or replace function public.is_bayona_coach()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bayona_owner
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_bayona_coach() from public, anon;
grant execute on function public.is_bayona_coach() to authenticated;

create or replace function public.enforce_bayona_profile_role()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.bayona_owner where user_id = new.id) then
    new.role := 'coach';
  else
    new.role := 'athlete';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_bayona_profile_role() from public, anon, authenticated;

drop trigger if exists bayona_single_owner_role on public.profiles;
create trigger bayona_single_owner_role
before insert or update on public.profiles
for each row execute function public.enforce_bayona_profile_role();

-- Sincroniza inmediatamente el rol al dar, cambiar o revocar el único dueño.
-- El rol se actualiza desde el servidor; nunca depende de metadata pública.
create or replace function public.sync_bayona_owner_role()
returns trigger
language plpgsql security definer
set search_path = ''
as $
begin
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    update public.profiles
    set role = 'athlete'
    where id = old.user_id
      and not exists (select 1 from public.bayona_owner where user_id = old.user_id);
  end if;

  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    update public.profiles
    set role = 'coach'
    where id = new.user_id;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$;
revoke all on function public.sync_bayona_owner_role() from public, anon, authenticated;

drop trigger if exists bayona_owner_sync_role on public.bayona_owner;
create trigger bayona_owner_sync_role
  after insert or update or delete on public.bayona_owner
  for each row execute function public.sync_bayona_owner_role();

-- Reconciliación defensiva de perfiles existentes. Si el propietario aún
-- no se ha configurado, todos pasan a athlete hasta que se le autorice.
update public.profiles p
set role = case when exists (
    select 1 from public.bayona_owner o where o.user_id = p.id
  ) then 'coach' else 'athlete' end
where role is distinct from case when exists (
    select 1 from public.bayona_owner o where o.user_id = p.id
  ) then 'coach' else 'athlete' end;

-- Mantener la RLS preexistente de Coach Studio.
-- Sus políticas ya consultan profiles.role, ahora validado por el trigger.

-- Cinturón adicional: escrituras Coach requieren ser propietario, incluso
-- si existen registros antiguos asociados a otro coach_id.
-- Las SELECT legítimas de clientes vinculados siguen funcionando.
do $$
declare tbl text;
begin
  foreach tbl in array array['coach_clients','coach_invites','coach_routines','coach_assignments']
  loop
    execute format('drop policy if exists bayona_owner_only_update on public.%I', tbl);
    execute format('create policy bayona_owner_only_update on public.%I as restrictive for update to authenticated using (public.is_bayona_coach()) with check (public.is_bayona_coach())', tbl);
    execute format('drop policy if exists bayona_owner_only_delete on public.%I', tbl);
    execute format('create policy bayona_owner_only_delete on public.%I as restrictive for delete to authenticated using (public.is_bayona_coach())', tbl);
  end loop;
end $$;

-- La inserción del vínculo, rutina o asignación requiere dueño. Invitaciones
-- se crean por RPC SECURITY DEFINER que ya verifica profiles.role.
do $$
declare tbl text;
begin
  foreach tbl in array array['coach_clients','coach_routines','coach_assignments']
  loop
    execute format('drop policy if exists bayona_owner_only_insert on public.%I', tbl);
    execute format('create policy bayona_owner_only_insert on public.%I as restrictive for insert to authenticated with check (public.is_bayona_coach())', tbl);
  end loop;
end $$;
