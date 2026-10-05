-- =====================================================================
-- BAYONA · SETUP SUPABASE (v1) — SCRIPT ÚNICO PARA EL SQL EDITOR
-- ---------------------------------------------------------------------
-- CÓMO USARLO:
--   1. Supabase Dashboard → tu proyecto → SQL Editor
--   2. New query → pega TODO este archivo → Run
--   3. Debe terminar con "Success. No rows returned"
--
-- Es IDEMPOTENTE: puedes ejecutarlo tantas veces como quieras
-- (create table if not exists / drop policy if exists).
-- Requiere: PostgreSQL 15 (el que trae Supabase) y auth.users ya creada
-- por Supabase Auth (viene por defecto en todo proyecto).
-- =====================================================================

-- =====================================================================
-- BAYONA — 0001_core.sql · Esquema de dominio completo (Sprint 0, tarea 0.4)
-- PostgreSQL 15 / Supabase. Basado en PLAN_NIVEL_3_PRO.md §3.
-- FASE 2 (comentario): la serie temporal `health_samples` migrará a
--   TimescaleDB: SELECT create_hypertable('health_samples','ts',
--   migrate_data => true); + política de retención (drop_chunks) y
--   compresión por segmento (user_id). Mantener id/bigserial y columnas
--   estables para que la conversión sea transparente para las consultas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- DOMINIO IDENTIDAD
-- ---------------------------------------------------------------------

create table if not exists profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  birth        date,
  sex          text check (sex in ('F','M','X')),
  height_cm    numeric(5,1),
  goals        jsonb default '[]',
  created_at   timestamptz default now()
);

-- GDPR art. 9: un consentimiento granular y revocable por dominio de salud.
create table if not exists consents (
  user_id    uuid references profiles (id) on delete cascade,
  domain     text not null check (domain in ('vision','body_scan','health_wearables',
                                             'health_clinical','nutrition_photo','voice','avatar_3d')),
  granted    boolean not null,
  granted_at timestamptz default now(),
  revoked_at timestamptz,
  primary key (user_id, domain)
);

create table if not exists avatars (
  user_id         uuid references profiles (id) on delete cascade,
  provider        text not null,
  glb_path        text,
  rig_profile     text,
  morphs          jsonb,
  fidelity_score  numeric(3,2),
  created_at      timestamptz default now(),
  primary key (user_id, provider)
);

-- ---------------------------------------------------------------------
-- DOMINIO ENTRENAMIENTO
-- ---------------------------------------------------------------------

create table if not exists exercises (
  id                 text primary key,
  name               text,
  pattern            text,                 -- squat/hinge/push/pull/...
  cues               jsonb,
  rom_targets        jsonb,
  contraindications  text[]
);

create table if not exists plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles (id) on delete cascade,
  macrocycle jsonb not null,               -- 24 semanas (formato de la app)
  version    int default 1,
  created_at timestamptz default now()
);

create table if not exists workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles (id) on delete cascade,
  plan_day_id    text,
  started_at     timestamptz,
  ended_at       timestamptz,
  readiness_in   numeric(4,1),
  rpe_out        numeric(3,1),
  status         text
);

create table if not exists sets_log (
  id                bigserial primary key,
  session_id        uuid references workout_sessions (id) on delete cascade,
  exercise_id       text references exercises (id),
  set_no            int,
  reps              int,
  load_kg           numeric(5,2),
  rir               numeric(3,1),
  form_score        numeric(4,1),
  rep_vel_loss      numeric(4,3),
  landmarks_summary jsonb,                -- resumen biomecánico. NUNCA vídeo/frames
  created_at        timestamptz default now()
);

-- ---------------------------------------------------------------------
-- DOMINIO SALUD (serie temporal → TimescaleDB en fase 2, ver cabecera)
-- ---------------------------------------------------------------------

create table if not exists health_samples (
  id      bigserial primary key,
  user_id uuid references profiles (id) on delete cascade,
  source  text not null,                  -- 'apple_watch','garmin','withings','manual','camera'...
  kind    text not null,                  -- 'hr','hrv','sleep_min','steps','weight_kg','glucose'...
  ts      timestamptz not null,
  value   numeric,
  unit    text,
  meta    jsonb
);

create table if not exists readiness_daily (
  user_id  uuid references profiles (id) on delete cascade,
  day      date not null,
  score    numeric(4,1),
  factors  jsonb,
  primary key (user_id, day)             -- el PK ya aporta el índice (user_id, day)
);

-- Progress Vault: escaneos cifrados por usuario (claves del usuario).
create table if not exists scans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles (id) on delete cascade,
  kind       text check (kind in ('body_3d','posture','face')),
  enc_path   text not null,
  meta       jsonb,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- SEGURIDAD / SALUD MENTAL — trazabilidad 100% (KPI del comité)
-- ---------------------------------------------------------------------

create table if not exists red_flags (
  id           bigserial primary key,
  user_id      uuid references profiles (id) on delete cascade,
  domain       text,
  severity     text check (severity in ('amber','red')),
  action_taken text,
  referral_url text,
  resolved_at  timestamptz,
  created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- GAMIFICACIÓN — ledger inmutable (sin saldo mutable)
-- ---------------------------------------------------------------------

create table if not exists xp_ledger (
  id         bigserial primary key,
  user_id    uuid references profiles (id) on delete cascade,
  kind       text check (kind in ('xp','skill_xp','credits','points')),
  amount     int not null,
  reason     text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------

create index if not exists health_samples_user_ts_idx on health_samples (user_id, ts);
create index if not exists sets_log_session_idx   on sets_log (session_id);
-- readiness_daily: el índice (user_id, day) lo aporta la primary key; no se duplica.

-- =====================================================================
-- ROW LEVEL SECURITY — cada usuario es dueño de lo suyo (auth.uid())
-- =====================================================================

alter table profiles        enable row level security;
alter table consents        enable row level security;
alter table avatars         enable row level security;
alter table exercises       enable row level security;
alter table plans           enable row level security;
alter table workout_sessions enable row level security;
alter table sets_log        enable row level security;
alter table health_samples  enable row level security;
alter table readiness_daily enable row level security;
alter table scans           enable row level security;
alter table red_flags       enable row level security;
alter table xp_ledger       enable row level security;

-- Patrón "own rows" (permissive) — tablas con user_id directo
drop policy if exists "own rows" on profiles;
create policy "own rows" on profiles
  for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own rows" on consents;
create policy "own rows" on consents
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on avatars;
create policy "own rows" on avatars
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on plans;
create policy "own rows" on plans
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on workout_sessions;
create policy "own rows" on workout_sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on readiness_daily;
create policy "own rows" on readiness_daily
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on scans;
create policy "own rows" on scans
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on red_flags;
create policy "own rows" on red_flags
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on xp_ledger;
create policy "own rows" on xp_ledger
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- sets_log: propiedad derivada de la sesión (no tiene user_id propio)
drop policy if exists "own rows" on sets_log;
create policy "own rows" on sets_log
  for all to authenticated
  using (exists (select 1 from workout_sessions ws
                 where ws.id = sets_log.session_id and ws.user_id = auth.uid()))
  with check (exists (select 1 from workout_sessions ws
                      where ws.id = sets_log.session_id and ws.user_id = auth.uid()));

-- exercises: catálogo público de solo lectura (el inserto un seed admin/service_role)
drop policy if exists "catalog read" on exercises;
create policy "catalog read" on exercises
  for select to authenticated
  using (true);

-- health_samples: "own rows" + política EXTRA restrictiva de consentimiento.
-- Nota: las policies permissive se combinan con OR; para EXIGIR consentimiento
-- hace falta una policy RESTRICTIVE (se combina con AND desde PG 10+).
drop policy if exists "own rows" on health_samples;
create policy "own rows" on health_samples
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Escritura de muestras de salud solo con consentimiento activo en
-- 'health_wearables' o 'health_clinical' (granted=true y sin revocar).
drop policy if exists "health ingest requires consent" on health_samples;
create policy "health ingest requires consent" on health_samples
  as restrictive
  for insert to authenticated
  with check (exists (
    select 1 from consents c
    where c.user_id = auth.uid()
      and c.domain in ('health_wearables','health_clinical')
      and c.granted = true
      and c.revoked_at is null
  ));

drop policy if exists "health update requires consent" on health_samples;
create policy "health update requires consent" on health_samples
  as restrictive
  for update to authenticated
  using (exists (
    select 1 from consents c
    where c.user_id = auth.uid()
      and c.domain in ('health_wearables','health_clinical')
      and c.granted = true
      and c.revoked_at is null
  ));

-- Lectura/exportación de datos propios siempre permitida (derecho de acceso
-- y portabilidad GDPR): revocar consentimiento corta la INGESTA, no el acceso
-- a los datos ya recogidos, que el usuario puede exportar o borrar.


-- =====================================================================
-- BAYONA — 0004_perf_sync.sql · rendimiento, inmutabilidad del ledger y vistas
-- (idempotente) — índices calientes · xp_ledger inmutable + idempotencia ·
-- vistas de tablero con security_invoker · updated_at en planes
-- =====================================================================

create index if not exists workout_sessions_user_start_idx
  on workout_sessions (user_id, started_at desc);
create index if not exists workout_sessions_user_status_idx
  on workout_sessions (user_id, status);
create index if not exists sets_log_exercise_ts_idx
  on sets_log (exercise_id, created_at desc);
create index if not exists xp_ledger_user_ts_idx
  on xp_ledger (user_id, created_at desc);
create index if not exists health_samples_user_kind_ts_idx
  on health_samples (user_id, kind, ts desc);
create index if not exists red_flags_user_open_idx
  on red_flags (user_id, resolved_at) where resolved_at is null;
create index if not exists asignaciones_user_dia_idx
  on entrenamientos_asignados (user_id, dia, estado);

alter table xp_ledger add column if not exists idempotency_key text;
create unique index if not exists xp_ledger_idem_uidx
  on xp_ledger (user_id, kind, idempotency_key)
  where idempotency_key is not null;

create or replace function xp_ledger_guard() returns trigger
language plpgsql as $$
begin
  raise exception 'xp_ledger es inmutable: % no permitido', tg_op;
end;
$$;

drop trigger if exists xp_ledger_no_update on xp_ledger;
create trigger xp_ledger_no_update
  before update or delete on xp_ledger
  for each row execute function xp_ledger_guard();

create or replace view v_hoy_resumen
with (security_invoker = true) as
select
  u.user_id,
  u.day,
  coalesce(r.score, 0)                                    as readiness,
  coalesce(x.xp_hoy, 0)                                   as xp_hoy,
  coalesce(s.series_hoy, 0)                               as series_hoy,
  coalesce(s.sesiones_hoy, 0)                             as sesiones_hoy
from (
  select p.id as user_id, current_date as day from profiles p
) u
left join readiness_daily r   on r.user_id = u.user_id and r.day = u.day
left join lateral (
  select sum(l.amount) as xp_hoy
  from xp_ledger l
  where l.user_id = u.user_id and l.kind = 'xp'
    and l.created_at >= u.day::timestamptz
) x on true
left join lateral (
  select count(*) as series_hoy, count(distinct ws.id) as sesiones_hoy
  from sets_log sl
  join workout_sessions ws on ws.id = sl.session_id
  where ws.user_id = u.user_id
    and sl.created_at >= u.day::timestamptz
) s on true;

create or replace view v_progreso_semanal
with (security_invoker = true) as
select
  ws.user_id,
  date_trunc('week', sl.created_at)::date as semana,
  sl.exercise_id,
  count(*)                                          as series,
  max(sl.load_kg)                                   as carga_max_kg,
  round(avg(sl.form_score)::numeric, 1)             as tecnica_media
from sets_log sl
join workout_sessions ws on ws.id = sl.session_id
group by 1, 2, 3;

create or replace view v_flags_activas
with (security_invoker = true) as
select id, user_id, domain, severity, action_taken, referral_url, created_at
from red_flags
where resolved_at is null;

alter table plans add column if not exists updated_at timestamptz default now();

create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists plans_touch on plans;
create trigger plans_touch
  before update on plans
  for each row execute function touch_updated_at();


-- =====================================================================
-- MIGRACIÓN 0005 · NÚCLEO DE LANZAMIENTO COACH ↔ CLIENTE
-- =====================================================================
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

do $
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
$;

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
language plpgsql as $
begin
  if new.coach_id <> old.coach_id or new.client_id <> old.client_id then
    raise exception 'coach_id/client_id son inmutables';
  end if;
  new.updated_at = now();
  return new;
end;
$;

drop trigger if exists coach_clients_immutable on coach_clients;
create trigger coach_clients_immutable
  before update on coach_clients
  for each row execute function coach_link_ids_immutable();

create or replace function coach_touch_updated_at() returns trigger
language plpgsql as $
begin
  new.updated_at = now();
  return new;
end;
$;

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
as $
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
$;

create or replace function accept_coach_invite(p_code text)
returns table (coach_id uuid, coach_name text)
language plpgsql
security definer
set search_path = public
as $
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
$;

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
as $
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
$;

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

-- =====================================================================
-- VERIFICACIÓN RÁPIDA (ejecuta esto después de Run)
-- =====================================================================
select table_name,
       (select count(*) from information_schema.columns c
         where c.table_schema='public' and c.table_name = t.table_name) as columnas
  from information_schema.tables t
 where table_schema = 'public'
 order by table_name;
-- Esperado: 18 filas —
--   profiles, consents, avatars, exercises, plans, workout_sessions, sets_log,
--   health_samples, readiness_daily, scans, red_flags, xp_ledger, body_medidas,
--   entrenamientos_asignados, coach_clients, coach_invites, coach_routines, coach_assignments
-- =====================================================================
