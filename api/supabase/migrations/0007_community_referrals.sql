-- =====================================================================
-- BAYONA — 0007_community_referrals.sql
-- Comunidad autenticada + reacciones + referidos verificados.
--
-- Alcance:
--   · posts de progreso compartidos por usuarios autenticados;
--   · reacciones simples;
--   · códigos de referido de un solo dueño;
--   · aceptación de referido anti-self y un único referrer por usuario.
--
-- Fuera de alcance aquí:
--   · saldo FitCoins autoritativo en servidor;
--   · compra de producto físico;
--   · facturación.
-- Esos dominios se endurecen en Production Hardening.
-- =====================================================================

create table if not exists community_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  author_name   text not null default 'Miembro BAYONA',
  type          text not null check (type in ('workout','pr','streak','milestone','progress')),
  evidence_id   text not null,
  title         text not null,
  subtitle      text not null default '',
  metric        text not null default '',
  caption       text not null default '',
  verification  text not null default 'client_registered'
                check (verification in ('client_registered','server_verified')),
  created_at    timestamptz not null default now(),
  unique(user_id,evidence_id)
);

create table if not exists community_reactions (
  post_id     uuid not null references community_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('respect','fire','strong')),
  created_at  timestamptz not null default now(),
  primary key(post_id,user_id)
);

create table if not exists user_referral_codes (
  code        text primary key,
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists user_referrals (
  id           uuid primary key default gen_random_uuid(),
  code         text not null references user_referral_codes(code) on delete restrict,
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  referred_id  uuid not null unique references auth.users(id) on delete cascade,
  status       text not null default 'verified' check (status in ('verified','revoked')),
  verified_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  check(referrer_id <> referred_id)
);

create index if not exists community_posts_created_idx
  on community_posts(created_at desc);
create index if not exists community_reactions_post_idx
  on community_reactions(post_id);
create index if not exists user_referrals_referrer_idx
  on user_referrals(referrer_id,verified_at desc);

alter table community_posts enable row level security;
alter table community_reactions enable row level security;
alter table user_referral_codes enable row level security;
alter table user_referrals enable row level security;

create or replace function community_set_author_name()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  select coalesce(nullif(trim(p.display_name),''),'Miembro BAYONA')
    into new.author_name
  from profiles p
  where p.id=new.user_id;

  if new.author_name is null then
    new.author_name := 'Miembro BAYONA';
  end if;

  new.verification := 'client_registered';
  return new;
end;
$$;

drop trigger if exists community_posts_author on community_posts;
create trigger community_posts_author
before insert on community_posts
for each row execute function community_set_author_name();

drop policy if exists "authenticated reads community posts" on community_posts;
create policy "authenticated reads community posts" on community_posts
for select to authenticated using (true);

drop policy if exists "user inserts own community posts" on community_posts;
create policy "user inserts own community posts" on community_posts
for insert to authenticated with check (
  auth.uid()=user_id
  and verification='client_registered'
);

drop policy if exists "user updates own community posts" on community_posts;
create policy "user updates own community posts" on community_posts
for update to authenticated using (auth.uid()=user_id)
with check (
  auth.uid()=user_id
  and verification in ('client_registered','server_verified')
);

drop policy if exists "user deletes own community posts" on community_posts;
create policy "user deletes own community posts" on community_posts
for delete to authenticated using (auth.uid()=user_id);

drop policy if exists "authenticated reads community reactions" on community_reactions;
create policy "authenticated reads community reactions" on community_reactions
for select to authenticated using (true);

drop policy if exists "user inserts own community reaction" on community_reactions;
create policy "user inserts own community reaction" on community_reactions
for insert to authenticated with check (auth.uid()=user_id);

drop policy if exists "user updates own community reaction" on community_reactions;
create policy "user updates own community reaction" on community_reactions
for update to authenticated using (auth.uid()=user_id)
with check (auth.uid()=user_id);

drop policy if exists "user deletes own community reaction" on community_reactions;
create policy "user deletes own community reaction" on community_reactions
for delete to authenticated using (auth.uid()=user_id);

drop policy if exists "user reads own referral code" on user_referral_codes;
create policy "user reads own referral code" on user_referral_codes
for select to authenticated using (auth.uid()=user_id);

drop policy if exists "user reads own referral relations" on user_referrals;
create policy "user reads own referral relations" on user_referrals
for select to authenticated using (
  auth.uid()=referrer_id or auth.uid()=referred_id
);

create or replace function create_user_referral_code()
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select code into v_code
  from user_referral_codes
  where user_id=auth.uid();

  if v_code is not null then return v_code; end if;

  loop
    v_code := 'BAY-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    begin
      insert into user_referral_codes(code,user_id)
      values(v_code,auth.uid());
      exit;
    exception when unique_violation then
    end;
  end loop;

  return v_code;
end;
$$;

create or replace function accept_user_referral_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_referrer uuid;
  v_code text := upper(trim(coalesce(p_code,'')));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select user_id into v_referrer
  from user_referral_codes
  where code=v_code;

  if v_referrer is null then
    raise exception 'invalid referral code';
  end if;

  if v_referrer=auth.uid() then
    raise exception 'self referral not allowed';
  end if;

  if exists(select 1 from user_referrals r where r.referred_id=auth.uid()) then
    return false;
  end if;

  insert into user_referrals(code,referrer_id,referred_id,status,verified_at)
  values(v_code,v_referrer,auth.uid(),'verified',now());

  return true;
end;
$$;

revoke all on function create_user_referral_code() from public;
grant execute on function create_user_referral_code() to authenticated;
revoke all on function accept_user_referral_code(text) from public;
grant execute on function accept_user_referral_code(text) to authenticated;

