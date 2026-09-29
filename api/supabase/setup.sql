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
-- VERIFICACIÓN RÁPIDA (ejecuta esto después de Run)
-- =====================================================================
select table_name,
       (select count(*) from information_schema.columns c
         where c.table_schema='public' and c.table_name = t.table_name) as columnas
  from information_schema.tables t
 where table_schema = 'public'
 order by table_name;
-- Esperado: 12 filas —
--   profiles, consents, avatars, exercises, plans, workout_sessions,
--   sets_log, health_samples, readiness_daily, scans, red_flags, xp_ledger
-- =====================================================================
