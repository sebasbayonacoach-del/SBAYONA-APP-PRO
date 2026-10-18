-- =====================================================================
-- BAYONA — 0006_life_os.sql
-- Planificador diario + metadatos de conectores externos.
-- PostgreSQL 15 / Supabase.
--
-- Principios:
--   1) cada usuario solo ve/modifica sus propios bloques
--   2) fuentes externas conservan provider + external_id
--   3) NUNCA se guardan access/refresh tokens en estas tablas
--   4) la autorización OAuth real vive en backend/vault del proveedor
-- =====================================================================

create table if not exists planner_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  client_id    text not null,
  day          date not null,
  start_time   time,
  end_time     time,
  all_day      boolean not null default false,
  title        text not null check (char_length(title) between 1 and 120),
  item_type    text not null default 'other'
               check (item_type in ('work','training','meal','recovery','personal','admin','focus','travel','other')),
  priority     text not null default 'normal'
               check (priority in ('low','normal','high','critical')),
  status       text not null default 'planned'
               check (status in ('planned','done','cancelled')),
  source       text not null default 'manual',
  external_id  text,
  location     text not null default '',
  notes        text not null default '',
  source_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (
    start_time is null
    or end_time is null
    or end_time > start_time
  )
);

create unique index if not exists planner_items_client_unique
  on planner_items (user_id, client_id);

create unique index if not exists planner_items_external_unique
  on planner_items (user_id, source, external_id)
  where external_id is not null;

create index if not exists planner_items_user_day_idx
  on planner_items (user_id, day, start_time);

create index if not exists planner_items_user_status_idx
  on planner_items (user_id, status, day);

create table if not exists connected_sources (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  provider       text not null,
  account_label  text not null default '',
  status         text not null default 'disconnected'
                 check (status in ('disconnected','connected','paused','error')),
  capabilities   text[] not null default '{}',
  metadata       jsonb not null default '{}'::jsonb,
  last_sync_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, provider, account_label),
  -- Defensa explícita: esta tabla es metadatos, no una caja de secretos.
  check (not (metadata ? 'access_token')),
  check (not (metadata ? 'refresh_token')),
  check (not (metadata ? 'client_secret')),
  check (not (metadata ? 'password'))
);

create index if not exists connected_sources_user_idx
  on connected_sources (user_id, provider, status);

alter table planner_items enable row level security;
alter table connected_sources enable row level security;

-- updated_at común
create or replace function life_os_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planner_items_touch on planner_items;
create trigger planner_items_touch
  before update on planner_items
  for each row execute function life_os_touch_updated_at();

drop trigger if exists connected_sources_touch on connected_sources;
create trigger connected_sources_touch
  before update on connected_sources
  for each row execute function life_os_touch_updated_at();

-- ---------------- RLS: planner_items ----------------
drop policy if exists "usuario ve sus bloques" on planner_items;
create policy "usuario ve sus bloques" on planner_items
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "usuario crea sus bloques" on planner_items;
create policy "usuario crea sus bloques" on planner_items
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "usuario actualiza sus bloques" on planner_items;
create policy "usuario actualiza sus bloques" on planner_items
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usuario elimina sus bloques" on planner_items;
create policy "usuario elimina sus bloques" on planner_items
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------- RLS: connected_sources ----------------
drop policy if exists "usuario ve sus conexiones" on connected_sources;
create policy "usuario ve sus conexiones" on connected_sources
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "usuario crea sus conexiones" on connected_sources;
create policy "usuario crea sus conexiones" on connected_sources
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "usuario actualiza sus conexiones" on connected_sources;
create policy "usuario actualiza sus conexiones" on connected_sources
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "usuario elimina sus conexiones" on connected_sources;
create policy "usuario elimina sus conexiones" on connected_sources
  for delete to authenticated
  using (auth.uid() = user_id);

-- Data API privileges are explicit; RLS decides which rows authenticated sees.
revoke all privileges on public.planner_items, public.connected_sources from anon;
grant select, insert, update, delete on public.planner_items, public.connected_sources
  to authenticated;
grant all privileges on public.planner_items, public.connected_sources
  to service_role;
