-- BAYONA 0011_owner_guard: solo el propietario autorizado puede leer datos de clientes como coach.
-- Defense in depth sobre 0009. No elimina ni altera registros existentes.
-- 1) Cierra la lectura de relaciones heredadas para anteriores "coaches".
drop policy if exists bayona_owner_select_coach_clients on public.coach_clients;
create policy bayona_owner_select_coach_clients on public.coach_clients
  as restrictive for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_bayona_coach()));

drop policy if exists bayona_owner_select_coach_invites on public.coach_invites;
create policy bayona_owner_select_coach_invites on public.coach_invites
  as restrictive for select to authenticated using ((select public.is_bayona_coach()));

drop policy if exists bayona_owner_select_coach_routines on public.coach_routines;
create policy bayona_owner_select_coach_routines on public.coach_routines
  as restrictive for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_bayona_coach()));

drop policy if exists bayona_owner_select_coach_assignments on public.coach_assignments;
create policy bayona_owner_select_coach_assignments on public.coach_assignments
  as restrictive for select to authenticated
  using (client_id = (select auth.uid()) or (select public.is_bayona_coach()));

-- Perfil: el cliente solo ve su perfil y el del propietario con quien esté
-- vinculado. La política permisiva de vínculo existente sigue siendo necesaria.
drop policy if exists bayona_owner_select_profiles on public.profiles;
create policy bayona_owner_select_profiles on public.profiles
  as restrictive for select to authenticated
  using (id = (select auth.uid()) or role = 'coach' or (select public.is_bayona_coach()));

drop policy if exists bayona_owner_select_sessions on public.workout_sessions;
create policy bayona_owner_select_sessions on public.workout_sessions
  as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_bayona_coach()));

drop policy if exists bayona_owner_select_sets on public.sets_log;
create policy bayona_owner_select_sets on public.sets_log
  as restrictive for select to authenticated
  using (
    (select public.is_bayona_coach())
    or exists (
      select 1 from public.workout_sessions ws
      where ws.id = sets_log.session_id and ws.user_id = (select auth.uid())
    )
  );

-- 2) Las RPC SECURITY DEFINER tampoco pueden revivir vínculos de un antiguo
-- coach, porque los triggers se ejecutan incluso cuando la RPC elude RLS.
create or replace function public.enforce_bayona_owner_foreign_key()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bayona_owner o where o.user_id = new.coach_id
  ) then
    raise exception 'BAYONA: coach no autorizado';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_bayona_owner_foreign_key() from public, anon, authenticated;

drop trigger if exists bayona_owner_coach_clients on public.coach_clients;
create trigger bayona_owner_coach_clients
  before insert or update on public.coach_clients
  for each row execute function public.enforce_bayona_owner_foreign_key();

drop trigger if exists bayona_owner_coach_invites on public.coach_invites;
create trigger bayona_owner_coach_invites
  before insert or update on public.coach_invites
  for each row execute function public.enforce_bayona_owner_foreign_key();

drop trigger if exists bayona_owner_coach_routines on public.coach_routines;
create trigger bayona_owner_coach_routines
  before insert or update on public.coach_routines
  for each row execute function public.enforce_bayona_owner_foreign_key();

drop trigger if exists bayona_owner_coach_assignments on public.coach_assignments;
create trigger bayona_owner_coach_assignments
  before insert or update on public.coach_assignments
  for each row execute function public.enforce_bayona_owner_foreign_key();
