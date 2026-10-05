-- =====================================================================
-- BAYONA — 0005_launch_coaching.sql
-- Núcleo de lanzamiento Coach <-> cliente.
-- PostgreSQL 15 / Supabase.
--
-- Objetivos:
--   1) rol de cuenta (athlete | coach)
--   2) vínculo explícito y revocable Coach <-> cliente
--   3) invitaciones de un solo uso
--   4) rutinas/assignaciones compartidas en nube
--   5) lectura de progreso del cliente SOLO por Coach vinculado
-- =====================================================================

alter table profiles add column if not exists role text not null default 'athlete';
alter table profiles add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'profiles'::regclass
  ) then
    alter table profiles
      add constraint profiles_role_check check (role in ('athlete','coach'));
  end if;
end
$$;

create table if not exists coach_clients (
  coach_id    uuid not null references auth.users (id) on delete cascade,
  client_id   uuid not null references auth.users (id) on delete cascade,
  status      text not null default 'pending'
              check (status in ('pending','active','paused','revoked')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (coach_id, client_id),
  check (coach_id <> client_id)
);

create table if not exists coach_invites (
  code        text primary key,
  coach_id    uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null,
  used_by     uuid references auth.users (id) on delete set null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists coach_routines (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users (id) on delete cascade,
  client_id    uuid references auth.users (id) on delete cascade,
  name         text not null,
  duration_min int check (duration_min between 5 and 180),
  exercises    jsonb not null default '[]'::jsonb,
  source       text not null default 'proplayer',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists coach_assignments (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users (id) on delete cascade,
  client_id     uuid not null references auth.users (id) on delete cascade,
  routine_id    uuid not null references coach_routines (id) on delete restrict,
  scheduled_for date not null,
  note          text not null default '',
  status        text not null default 'pending'
                check (status in ('pending','completed','skipped','cancelled')),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists coach_clients_client_idx
  on coach_clients (client_id, status);
create index if not exists coach_clients_coach_idx
  on coach_clients (coach_id, status);
create index if not exists coach_invites_coach_idx
  on coach_invites (coach_id, expires_at desc);
create index if not exists coach_routines_coach_idx
  on coach_routines (coach_id, updated_at desc);
create index if not exists coach_routines_client_idx
  on coach_routines (client_id, updated_at desc);
create index if not exists coach_assignments_client_day_idx
  on coach_assignments (client_id, scheduled_for desc);
create index if not exists coach_assignments_coach_day_idx
  on coach_assignments (coach_id, scheduled_for desc);

alter table coach_clients enable row level security;
alter table coach_invites enable row level security;
alter table coach_routines enable row level security;
alter table coach_assignments enable row level security;

-- IDs del vínculo son inmutables: evita convertir una relación autorizada
-- en otra relación distinta mediante UPDATE.
create or replace function coach_link_ids_immutable() returns trigger
language plpgsql as $$
begin
  if new.coach_id <> old.coach_id or new.client_id <> old.client_id then
    raise exception 'coach_id/client_id son inmutables';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coach_clients_immutable on coach_clients;
create trigger coach_clients_immutable
  before update on coach_clients
  for each row execute function coach_link_ids_immutable();

create or replace function coach_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coach_routines_touch on coach_routines;
create trigger coach_routines_touch
  before update on coach_routines
  for each row execute function coach_touch_updated_at();

drop trigger if exists coach_assignments_touch on coach_assignments;
create trigger coach_assignments_touch
  before update on coach_assignments
  for each row execute function coach_touch_updated_at();

-- ---------------- RLS: relaciones ----------------
drop policy if exists "coach/client ve su vinculo" on coach_clients;
create policy "coach/client ve su vinculo" on coach_clients
  for select to authenticated
  using (auth.uid() = coach_id or auth.uid() = client_id);

drop policy if exists "coach crea vinculo pendiente" on coach_clients;
create policy "coach crea vinculo pendiente" on coach_clients
  for insert to authenticated
  with check (
    auth.uid() = coach_id
    and status = 'pending'
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

drop policy if exists "coach administra vinculo" on coach_clients;
create policy "coach administra vinculo" on coach_clients
  for update to authenticated
  using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and status in ('pending','paused','revoked')
  );

drop policy if exists "coach elimina vinculo" on coach_clients;
create policy "coach elimina vinculo" on coach_clients
  for delete to authenticated
  using (auth.uid() = coach_id);

-- ---------------- RLS: invitaciones ----------------
drop policy if exists "coach ve invitaciones propias" on coach_invites;
create policy "coach ve invitaciones propias" on coach_invites
  for select to authenticated
  using (auth.uid() = coach_id);

drop policy if exists "coach elimina invitaciones propias" on coach_invites;
create policy "coach elimina invitaciones propias" on coach_invites
  for delete to authenticated
  using (auth.uid() = coach_id);

-- La creación/aceptación usa RPC SECURITY DEFINER para no exponer códigos
-- ajenos ni permitir aceptar invitaciones de otro usuario a mano.
create or replace function create_coach_invite(p_hours int default 72)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_hours int := greatest(1, least(coalesce(p_hours,72), 168));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'coach'
  ) then
    raise exception 'coach role required';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into coach_invites(code, coach_id, expires_at)
      values (v_code, auth.uid(), now() + make_interval(hours => v_hours));
      exit;
    exception when unique_violation then
      -- colisión extremadamente improbable: genera otro código
    end;
  end loop;

  return v_code;
end;
$$;

create or replace function accept_coach_invite(p_code text)
returns table (coach_id uuid, coach_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv coach_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_inv
  from coach_invites
  where code = upper(trim(p_code))
    and used_by is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'invite invalid or expired';
  end if;

  if v_inv.coach_id = auth.uid() then
    raise exception 'coach cannot invite self';
  end if;

  insert into coach_clients(coach_id, client_id, status, accepted_at)
  values (v_inv.coach_id, auth.uid(), 'active', now())
  on conflict (coach_id, client_id)
  do update set status='active', accepted_at=now(), updated_at=now();

  update coach_invites
  set used_by = auth.uid(), used_at = now()
  where code = v_inv.code;

  return query
  select p.id, coalesce(p.display_name, 'Coach')
  from profiles p
  where p.id = v_inv.coach_id;
end;
$$;

revoke all on function create_coach_invite(int) from public;
grant execute on function create_coach_invite(int) to authenticated;
revoke all on function accept_coach_invite(text) from public;
grant execute on function accept_coach_invite(text) to authenticated;

-- ---------------- RLS: rutinas ----------------
drop policy if exists "coach/client lee rutina compartida" on coach_routines;
create policy "coach/client lee rutina compartida" on coach_routines
  for select to authenticated
  using (
    auth.uid() = coach_id
    or (
      auth.uid() = client_id
      and exists (
        select 1 from coach_clients cc
        where cc.coach_id = coach_routines.coach_id
          and cc.client_id = auth.uid()
          and cc.status = 'active'
      )
    )
  );

drop policy if exists "coach crea rutina" on coach_routines;
create policy "coach crea rutina" on coach_routines
  for insert to authenticated
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
    and (
      client_id is null
      or exists (
        select 1 from coach_clients cc
        where cc.coach_id = auth.uid()
          and cc.client_id = coach_routines.client_id
          and cc.status = 'active'
      )
    )
  );

drop policy if exists "coach actualiza rutina" on coach_routines;
create policy "coach actualiza rutina" on coach_routines
  for update to authenticated
  using (auth.uid() = coach_id)
  with check (
    auth.uid() = coach_id
    and (
      client_id is null
      or exists (
        select 1 from coach_clients cc
        where cc.coach_id = auth.uid()
          and cc.client_id = coach_routines.client_id
          and cc.status = 'active'
      )
    )
  );

drop policy if exists "coach elimina rutina" on coach_routines;
create policy "coach elimina rutina" on coach_routines
  for delete to authenticated
  using (auth.uid() = coach_id);

-- ---------------- RLS: asignaciones ----------------
drop policy if exists "coach/client lee asignacion" on coach_assignments;
create policy "coach/client lee asignacion" on coach_assignments
  for select to authenticated
  using (
    (auth.uid() = coach_id or auth.uid() = client_id)
    and exists (
      select 1 from coach_clients cc
      where cc.coach_id = coach_assignments.coach_id
        and cc.client_id = coach_assignments.client_id
        and cc.status = 'active'
    )
  );

drop policy if exists "coach crea asignacion" on coach_assignments;
create policy "coach crea asignacion" on coach_assignments
  for insert to authenticated
  with check (
    auth.uid() = coach_id
    and exists (
      select 1 from coach_clients cc
      where cc.coach_id = auth.uid()
        and cc.client_id = coach_assignments.client_id
        and cc.status = 'active'
    )
    and exists (
      select 1 from coach_routines cr
      where cr.id = coach_assignments.routine_id
        and cr.coach_id = auth.uid()
        and (cr.client_id is null or cr.client_id = coach_assignments.client_id)
    )
  );

drop policy if exists "coach actualiza asignacion" on coach_assignments;
create policy "coach actualiza asignacion" on coach_assignments
  for update to authenticated
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "coach elimina asignacion" on coach_assignments;
create policy "coach elimina asignacion" on coach_assignments
  for delete to authenticated
  using (auth.uid() = coach_id);

create or replace function complete_coach_assignment(p_assignment uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows int;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update coach_assignments
  set status = 'completed', completed_at = now(), updated_at = now()
  where id = p_assignment
    and client_id = auth.uid()
    and status = 'pending';

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

revoke all on function complete_coach_assignment(uuid) from public;
grant execute on function complete_coach_assignment(uuid) to authenticated;

-- ---------------- Perfil / progreso visible al Coach activo ----------------
-- La policy original "own rows" continúa mandando para escritura propia.
drop policy if exists "linked parties read profiles" on profiles;
create policy "linked parties read profiles" on profiles
  for select to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1 from coach_clients cc
      where cc.status = 'active'
        and (
          (cc.coach_id = auth.uid() and cc.client_id = profiles.id)
          or (cc.client_id = auth.uid() and cc.coach_id = profiles.id)
        )
    )
  );

drop policy if exists "coach reads linked workout sessions" on workout_sessions;
create policy "coach reads linked workout sessions" on workout_sessions
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from coach_clients cc
      where cc.coach_id = auth.uid()
        and cc.client_id = workout_sessions.user_id
        and cc.status = 'active'
    )
  );

drop policy if exists "coach reads linked sets" on sets_log;
create policy "coach reads linked sets" on sets_log
  for select to authenticated
  using (
    exists (
      select 1
      from workout_sessions ws
      where ws.id = sets_log.session_id
        and (
          ws.user_id = auth.uid()
          or exists (
            select 1 from coach_clients cc
            where cc.coach_id = auth.uid()
              and cc.client_id = ws.user_id
              and cc.status = 'active'
          )
        )
    )
  );

-- No se abre readiness, health_samples ni medidas corporales al Coach en esta
-- migración: esos dominios requieren consentimiento explícito adicional.
