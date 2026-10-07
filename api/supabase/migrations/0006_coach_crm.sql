-- =====================================================================
-- BAYONA — 0006_coach_crm.sql
-- CRM privado del Coach: cartera, agenda, pagos administrativos,
-- referidos, compras y notas.
--
-- Seguridad:
--   · solo el coach propietario puede leer/escribir este CRM;
--   · un vínculo coach_clients NO abre notas/pagos al cliente;
--   · un cliente autenticado asociado debe pertenecer a un vínculo activo;
--   · importes en céntimos enteros + moneda ISO de 3 letras;
--   · estas tablas registran estado administrativo, NO procesan pagos.
-- =====================================================================

create table if not exists coach_crm_clients (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references auth.users(id) on delete cascade,
  client_id   uuid references auth.users(id) on delete set null,
  name        text not null,
  email       text,
  phone       text,
  status      text not null default 'active'
              check (status in ('lead','active','paused','archived')),
  source      text not null default 'manual'
              check (source in ('manual','cloud','local')),
  note        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (coach_id, client_id)
);

create table if not exists coach_crm_appointments (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references auth.users(id) on delete cascade,
  crm_client_id uuid not null references coach_crm_clients(id) on delete cascade,
  start_at     timestamptz not null,
  duration_min int not null default 60 check (duration_min between 5 and 480),
  kind         text not null default 'session'
               check (kind in ('session','checkin','review','call','other')),
  status       text not null default 'scheduled'
               check (status in ('scheduled','completed','cancelled','no_show')),
  note         text not null default '',
  source       text not null default 'manual'
               check (source in ('manual','cloud','calendar')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists coach_crm_payments (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,
  crm_client_id uuid not null references coach_crm_clients(id) on delete cascade,
  amount_cents  bigint not null check (amount_cents between 0 and 100000000),
  currency      text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status        text not null default 'due'
                check (status in ('due','paid','overdue','cancelled','refunded')),
  due_at        timestamptz,
  paid_at       timestamptz,
  method        text,
  reference     text,
  note          text not null default '',
  source        text not null default 'manual'
                check (source in ('manual','billing')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((status = 'paid' and paid_at is not null) or status <> 'paid')
);

create table if not exists coach_crm_referrals (
  id                     uuid primary key default gen_random_uuid(),
  coach_id               uuid not null references auth.users(id) on delete cascade,
  referrer_crm_client_id uuid not null references coach_crm_clients(id) on delete cascade,
  referred_name          text not null,
  contact                text,
  status                 text not null default 'lead'
                         check (status in ('lead','contacted','converted','lost')),
  note                   text not null default '',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists coach_crm_purchases (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,
  crm_client_id uuid not null references coach_crm_clients(id) on delete cascade,
  item          text not null,
  amount_cents  bigint not null check (amount_cents between 0 and 100000000),
  currency      text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  status        text not null default 'ordered'
                check (status in ('ordered','paid','fulfilled','refunded','cancelled')),
  reference     text,
  note          text not null default '',
  source        text not null default 'manual'
                check (source in ('manual','store')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists coach_crm_notes (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references auth.users(id) on delete cascade,
  crm_client_id uuid not null references coach_crm_clients(id) on delete cascade,
  text          text not null,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists coach_crm_clients_coach_idx
  on coach_crm_clients(coach_id, status, updated_at desc);
create index if not exists coach_crm_appointments_coach_time_idx
  on coach_crm_appointments(coach_id, start_at);
create index if not exists coach_crm_payments_coach_status_idx
  on coach_crm_payments(coach_id, status, due_at);
create index if not exists coach_crm_referrals_coach_status_idx
  on coach_crm_referrals(coach_id, status, updated_at desc);
create index if not exists coach_crm_purchases_coach_status_idx
  on coach_crm_purchases(coach_id, status, updated_at desc);
create index if not exists coach_crm_notes_client_idx
  on coach_crm_notes(coach_id, crm_client_id, created_at desc);

alter table coach_crm_clients enable row level security;
alter table coach_crm_appointments enable row level security;
alter table coach_crm_payments enable row level security;
alter table coach_crm_referrals enable row level security;
alter table coach_crm_purchases enable row level security;
alter table coach_crm_notes enable row level security;

-- El cliente autenticado asociado a una ficha debe ser un vínculo activo.
create or replace function coach_crm_client_link_valid(p_coach uuid, p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_client is null or exists (
    select 1 from coach_clients cc
    where cc.coach_id = p_coach
      and cc.client_id = p_client
      and cc.status = 'active'
  );
$$;

revoke all on function coach_crm_client_link_valid(uuid,uuid) from public;
grant execute on function coach_crm_client_link_valid(uuid,uuid) to authenticated;

-- Asegura que cada registro hijo apunte a una ficha del mismo coach.
create or replace function coach_crm_owns_client(p_coach uuid, p_crm_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from coach_crm_clients c
    where c.id = p_crm_client and c.coach_id = p_coach
  );
$$;

revoke all on function coach_crm_owns_client(uuid,uuid) from public;
grant execute on function coach_crm_owns_client(uuid,uuid) to authenticated;

-- updated_at uniforme.
create or replace function coach_crm_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coach_crm_clients_touch on coach_crm_clients;
create trigger coach_crm_clients_touch before update on coach_crm_clients
for each row execute function coach_crm_touch();

drop trigger if exists coach_crm_appointments_touch on coach_crm_appointments;
create trigger coach_crm_appointments_touch before update on coach_crm_appointments
for each row execute function coach_crm_touch();

drop trigger if exists coach_crm_payments_touch on coach_crm_payments;
create trigger coach_crm_payments_touch before update on coach_crm_payments
for each row execute function coach_crm_touch();

drop trigger if exists coach_crm_referrals_touch on coach_crm_referrals;
create trigger coach_crm_referrals_touch before update on coach_crm_referrals
for each row execute function coach_crm_touch();

drop trigger if exists coach_crm_purchases_touch on coach_crm_purchases;
create trigger coach_crm_purchases_touch before update on coach_crm_purchases
for each row execute function coach_crm_touch();

-- ---------------- CLIENTES CRM ----------------
drop policy if exists "coach reads own crm clients" on coach_crm_clients;
create policy "coach reads own crm clients" on coach_crm_clients
for select to authenticated using (auth.uid() = coach_id);

drop policy if exists "coach inserts own crm clients" on coach_crm_clients;
create policy "coach inserts own crm clients" on coach_crm_clients
for insert to authenticated with check (
  auth.uid() = coach_id
  and exists (select 1 from profiles p where p.id=auth.uid() and p.role='coach')
  and coach_crm_client_link_valid(coach_id,client_id)
);

drop policy if exists "coach updates own crm clients" on coach_crm_clients;
create policy "coach updates own crm clients" on coach_crm_clients
for update to authenticated
using (auth.uid() = coach_id)
with check (
  auth.uid() = coach_id
  and coach_crm_client_link_valid(coach_id,client_id)
);

drop policy if exists "coach deletes own crm clients" on coach_crm_clients;
create policy "coach deletes own crm clients" on coach_crm_clients
for delete to authenticated using (auth.uid() = coach_id);

-- ---------------- HIJOS: helper repeated intentionally for audit clarity ----------------
drop policy if exists "coach reads own crm appointments" on coach_crm_appointments;
create policy "coach reads own crm appointments" on coach_crm_appointments
for select to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach inserts own crm appointments" on coach_crm_appointments;
create policy "coach inserts own crm appointments" on coach_crm_appointments
for insert to authenticated with check (
  auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id)
);

drop policy if exists "coach updates own crm appointments" on coach_crm_appointments;
create policy "coach updates own crm appointments" on coach_crm_appointments
for update to authenticated using (auth.uid()=coach_id)
with check (auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id));

drop policy if exists "coach deletes own crm appointments" on coach_crm_appointments;
create policy "coach deletes own crm appointments" on coach_crm_appointments
for delete to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach reads own crm payments" on coach_crm_payments;
create policy "coach reads own crm payments" on coach_crm_payments
for select to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach inserts own crm payments" on coach_crm_payments;
create policy "coach inserts own crm payments" on coach_crm_payments
for insert to authenticated with check (
  auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id)
);

drop policy if exists "coach updates own crm payments" on coach_crm_payments;
create policy "coach updates own crm payments" on coach_crm_payments
for update to authenticated using (auth.uid()=coach_id)
with check (auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id));

drop policy if exists "coach deletes own crm payments" on coach_crm_payments;
create policy "coach deletes own crm payments" on coach_crm_payments
for delete to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach reads own crm referrals" on coach_crm_referrals;
create policy "coach reads own crm referrals" on coach_crm_referrals
for select to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach inserts own crm referrals" on coach_crm_referrals;
create policy "coach inserts own crm referrals" on coach_crm_referrals
for insert to authenticated with check (
  auth.uid()=coach_id and coach_crm_owns_client(coach_id,referrer_crm_client_id)
);

drop policy if exists "coach updates own crm referrals" on coach_crm_referrals;
create policy "coach updates own crm referrals" on coach_crm_referrals
for update to authenticated using (auth.uid()=coach_id)
with check (auth.uid()=coach_id and coach_crm_owns_client(coach_id,referrer_crm_client_id));

drop policy if exists "coach deletes own crm referrals" on coach_crm_referrals;
create policy "coach deletes own crm referrals" on coach_crm_referrals
for delete to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach reads own crm purchases" on coach_crm_purchases;
create policy "coach reads own crm purchases" on coach_crm_purchases
for select to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach inserts own crm purchases" on coach_crm_purchases;
create policy "coach inserts own crm purchases" on coach_crm_purchases
for insert to authenticated with check (
  auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id)
);

drop policy if exists "coach updates own crm purchases" on coach_crm_purchases;
create policy "coach updates own crm purchases" on coach_crm_purchases
for update to authenticated using (auth.uid()=coach_id)
with check (auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id));

drop policy if exists "coach deletes own crm purchases" on coach_crm_purchases;
create policy "coach deletes own crm purchases" on coach_crm_purchases
for delete to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach reads own crm notes" on coach_crm_notes;
create policy "coach reads own crm notes" on coach_crm_notes
for select to authenticated using (auth.uid()=coach_id);

drop policy if exists "coach inserts own crm notes" on coach_crm_notes;
create policy "coach inserts own crm notes" on coach_crm_notes
for insert to authenticated with check (
  auth.uid()=coach_id and coach_crm_owns_client(coach_id,crm_client_id)
);

drop policy if exists "coach deletes own crm notes" on coach_crm_notes;
create policy "coach deletes own crm notes" on coach_crm_notes
for delete to authenticated using (auth.uid()=coach_id);

-- No policy de UPDATE para notas: una nota se registra y, si hace falta,
-- se borra y crea otra. Evita alterar retrospectivamente el historial.
