-- APP 7.0 · Preferencias de notificaciones y suscripciones Push por cuenta.
-- Sin envíos ni permisos automáticos: todo deshabilitado por defecto.
-- Tablas deliberadamente separadas del perfil y datos de salud.
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  asked boolean not null default false,
  morning boolean not null default false,
  pre_training boolean not null default false,
  evening boolean not null default false,
  pre_training_at varchar(5),
  timezone text not null default 'UTC',
  consent_enabled boolean not null default false,
  consented_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint notification_time_format check (
    pre_training_at is null or pre_training_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  constraint notification_time_when_enabled check (pre_training or pre_training_at is null),
  constraint notification_timezone_chars check (timezone ~ '^[A-Za-z0-9_+/-]{2,64}$'),
  constraint notification_enabled_requires_consent check (not consent_enabled or consented_at is not null)
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant all on public.notification_preferences to service_role;
drop policy if exists "notification_preferences_own" on public.notification_preferences;
create policy "notification_preferences_own" on public.notification_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id, device_id),
  constraint push_endpoint_https check (endpoint ~ '^https://[^[:space:]]+$' and length(endpoint) between 20 and 2048),
  constraint push_key_length check (length(p256dh) between 20 and 512 and length(auth_key) between 8 and 256)
);
create index if not exists push_subscriptions_user_active_idx on public.push_subscriptions (user_id, active);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
