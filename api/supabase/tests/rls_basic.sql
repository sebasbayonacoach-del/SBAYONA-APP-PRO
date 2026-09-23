-- =====================================================================
-- BAYONA — rls_basic.sql · Pruebas básicas de RLS (Sprint 0, tarea 0.4 / DoD 0.4)
-- PostgreSQL 15 / Supabase. Estilo pgTAP/manual comentado.
--
-- QUÉ VERIFICA
--   1. Usuario A NO puede leer filas de usuario B en cada tabla del dominio.
--   2. Revocar el consentimiento bloquea INSERTs en health_samples.
--
-- CÓMO EJECUTAR (manual):
--   psql "$SUPABASE_DB_URL" -f api/supabase/tests/rls_basic.sql
--   El script lanza excepción (y por tanto falla) si detecta cualquier fuga.
--
-- EQUIVALENTE pgTAP: cada bloque documenta su aserción TAP correspondiente
-- (lives_ok / throws_ok / is_empty). Si se adopta pgtap, sustituir los
-- DO blocks por las llamadas indicadas y ejecutar con `pg_prove`.
--
-- PREPARACIÓN: sustituir UUIDs de prueba (o crearlos con auth.users de test):
-- =====================================================================

\set user_a '''11111111-1111-1111-1111-111111111111'''
\set user_b '''22222222-2222-2222-2222-222222222222'''

begin;

-- ---------------------------------------------------------------------
-- 0. Datos de prueba: usuarios A y B con una fila propia en cada tabla.
--    (En un entorno real insertar primero en auth.users.)
-- ---------------------------------------------------------------------
insert into auth.users (id) values (:'user_a'::uuid), (:'user_b'::uuid)
  on conflict (id) do nothing;

insert into profiles (id, display_name) values
  (:'user_a'::uuid, 'Usuario A'),
  (:'user_b'::uuid, 'Usuario B');

insert into consents (user_id, domain, granted) values
  (:'user_a'::uuid, 'health_wearables', true),
  (:'user_a'::uuid, 'health_clinical',  true),
  (:'user_b'::uuid, 'health_wearables', true),
  (:'user_b'::uuid, 'health_clinical',  true);

insert into avatars (user_id, provider, glb_path) values
  (:'user_a'::uuid, 'in3d', 'vault/a.glb'),
  (:'user_b'::uuid, 'in3d', 'vault/b.glb');

insert into plans (user_id, macrocycle) values
  (:'user_a'::uuid, '{"weeks":24}'),
  (:'user_b'::uuid, '{"weeks":24}');

insert into workout_sessions (user_id, status) values
  (:'user_a'::uuid, 'done'),
  (:'user_b'::uuid, 'done');

insert into sets_log (session_id, exercise_id, set_no, reps)
  select id, null, 1, 5 from workout_sessions;

insert into health_samples (user_id, source, kind, ts, value, unit) values
  (:'user_a'::uuid, 'manual', 'hr', now(), 60, 'bpm'),
  (:'user_b'::uuid, 'manual', 'hr', now(), 72, 'bpm');

insert into readiness_daily (user_id, day, score) values
  (:'user_a'::uuid, current_date, 80.0),
  (:'user_b'::uuid, current_date, 55.0);

insert into scans (user_id, kind, enc_path) values
  (:'user_a'::uuid, 'body_3d', 'enc/a.bin'),
  (:'user_b'::uuid, 'body_3d', 'enc/b.bin');

insert into red_flags (user_id, domain, severity, action_taken) values
  (:'user_a'::uuid, 'pain', 'amber', 'aviso mostrado'),
  (:'user_b'::uuid, 'pain', 'amber', 'aviso mostrado');

insert into xp_ledger (user_id, kind, amount, reason) values
  (:'user_a'::uuid, 'xp', 100, 'test'),
  (:'user_b'::uuid, 'xp', 100, 'test');

-- ---------------------------------------------------------------------
-- 1. AISLAMIENTO ENTRE USUARIOS
--    Como A, contar filas visibles de B en cada tabla ⇒ debe ser 0.
--    pgTAP equivalente:
--       select is( (select count(*) from profiles where id = :'user_b'::uuid), 0 );
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = json_build_object('sub', :'user_a'::uuid,
                                                 'role', 'authenticated')::text;

do $$
declare
  leaked int;
begin
  select count(*) into leaked from profiles         where id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: profiles expone filas de B'; end if;

  select count(*) into leaked from consents         where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: consents expone filas de B'; end if;

  select count(*) into leaked from avatars          where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: avatars expone filas de B'; end if;

  select count(*) into leaked from plans            where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: plans expone filas de B'; end if;

  select count(*) into leaked from workout_sessions where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: workout_sessions expone filas de B'; end if;

  -- sets_log se audita vía la sesión de B
  select count(*) into leaked from sets_log s
    join workout_sessions ws on ws.id = s.session_id
    where ws.user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: sets_log expone filas de B'; end if;

  select count(*) into leaked from health_samples   where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: health_samples expone filas de B'; end if;

  select count(*) into leaked from readiness_daily  where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: readiness_daily expone filas de B'; end if;

  select count(*) into leaked from scans            where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: scans expone filas de B'; end if;

  select count(*) into leaked from red_flags        where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: red_flags expone filas de B'; end if;

  select count(*) into leaked from xp_ledger        where user_id = '22222222-2222-2222-2222-222222222222';
  if leaked <> 0 then raise exception 'FUGA: xp_ledger expone filas de B'; end if;

  raise notice 'OK: A no lee ninguna fila de B';
end $$;

reset role;
reset request.jwt.claims;

-- ---------------------------------------------------------------------
-- 2. CONSENTIMIENTO: con consentimiento activo, A puede insertar
--    health_samples.  pgTAP: select lives_ok($$ insert ... $$);
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = json_build_object('sub', :'user_a'::uuid,
                                                 'role', 'authenticated')::text;

insert into health_samples (user_id, source, kind, ts, value, unit)
  values (:'user_a'::uuid, 'manual', 'hr', now(), 61, 'bpm');

reset role;
reset request.jwt.claims;

-- ---------------------------------------------------------------------
-- 3. CONSENTIMIENTO: revocar 'health_wearables' y 'health_clinical'
--    debe BLOQUEAR inserts de health_samples.
--    pgTAP: select throws_ok($$ insert ... $$, '42501');  -- insufficient_privilege
-- ---------------------------------------------------------------------
update consents
   set granted = false, revoked_at = now()
 where user_id = :'user_a'::uuid
   and domain in ('health_wearables','health_clinical');

set local role authenticated;
set local request.jwt.claims = json_build_object('sub', :'user_a'::uuid,
                                                 'role', 'authenticated')::text;

do $$
begin
  begin
    insert into health_samples (user_id, source, kind, ts, value, unit)
      values ('11111111-1111-1111-1111-111111111111', 'manual', 'hr', now(), 59, 'bpm');
    raise exception 'FUGA: insert en health_samples permitido SIN consentimiento';
  exception
    when insufficient_privilege or check_violation then
      raise notice 'OK: insert bloqueado tras revocar consentimiento';
  end;
end $$;

reset role;
reset request.jwt.claims;

-- ---------------------------------------------------------------------
-- 4. (Extra) Revocar no impide exportar los datos ya recogidos (GDPR):
--    A sigue viendo sus propias filas antiguas.
--    pgTAP: select isnt( (select count(*) from health_samples
--                         where user_id = :'user_a'::uuid), 0 );
-- ---------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = json_build_object('sub', :'user_a'::uuid,
                                                 'role', 'authenticated')::text;

do $$
declare
  mine int;
begin
  select count(*) into mine from health_samples
    where user_id = '11111111-1111-1111-1111-111111111111';
  if mine = 0 then
    raise exception 'FALLO: el usuario pierde acceso a sus propios datos al revocar (viola portabilidad)';
  end if;
  raise notice 'OK: A conserva lectura de sus datos (exportación posible)';
end $$;

reset role;
reset request.jwt.claims;

rollback;   -- los datos de prueba no se persisten
