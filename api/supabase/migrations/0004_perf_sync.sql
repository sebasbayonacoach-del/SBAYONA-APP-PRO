-- =====================================================================
-- BAYONA — 0004_perf_sync.sql · rendimiento, inmutabilidad del ledger y vistas
-- PostgreSQL 15 / Supabase. Idempotente (se puede ejecutar N veces).
-- Sobre 0001_core.sql y 0002_medidas_asignaciones.sql.
-- Incluye:
--   1. Índices para las consultas calientes del panel lateral (INICIO / HOY)
--   2. xp_ledger: clave de idempotencia + ledger realmente INMUTABLE
--   3. Vistas de tablero con security_invoker (heredan el RLS del usuario)
--   4. updated_at automático en planes (autoregulación versionada)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ÍNDICES · consultas del día a día
-- ---------------------------------------------------------------------
create index if not exists workout_sessions_user_start_idx
  on workout_sessions (user_id, started_at desc);          -- historial / reanudar
create index if not exists workout_sessions_user_status_idx
  on workout_sessions (user_id, status);                   -- sesión activa
create index if not exists sets_log_exercise_ts_idx
  on sets_log (exercise_id, created_at desc);              -- PRs y progresión
create index if not exists xp_ledger_user_ts_idx
  on xp_ledger (user_id, created_at desc);                 -- wallet / resumen
create index if not exists health_samples_user_kind_ts_idx
  on health_samples (user_id, kind, ts desc);              -- serie por métrica
create index if not exists red_flags_user_open_idx
  on red_flags (user_id, resolved_at) where resolved_at is null; -- alertas vivas
create index if not exists asignaciones_user_dia_idx
  on entrenamientos_asignados (user_id, dia, estado);      -- plan del día (COACH OS)

-- ---------------------------------------------------------------------
-- 2. XP_LEDGER · sin dobles XP y sin reescritura de la historia
-- ---------------------------------------------------------------------
-- clave de idempotencia del cliente (offline queue → reintentos seguros)
alter table xp_ledger add column if not exists idempotency_key text;
create unique index if not exists xp_ledger_idem_uidx
  on xp_ledger (user_id, kind, idempotency_key)
  where idempotency_key is not null;

-- ledger inmutable: ni UPDATE ni DELETE (solo se agregan hechos)
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

-- ---------------------------------------------------------------------
-- 3. VISTAS DE TABlero (security_invoker: respetan el RLS del usuario)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- 4. PLANES · updated_at automático (la autoregulación versiona el plan)
-- ---------------------------------------------------------------------
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
