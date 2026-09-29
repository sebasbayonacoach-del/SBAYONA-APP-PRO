-- =====================================================================
-- BAYONA — 0002_medidas_asignaciones.sql
-- Ampliación del espejo: mediciones corporales y asignaciones del entrenador.
-- PostgreSQL 15 / Supabase. Mismo patrón que 0001_core.sql: RLS por usuario
-- (auth.uid()) y borrado-y-reinserción por scope (espejo idempotente).
-- ADR-003: solo datos numéricos y notas cortas. Sin fotos, sin vídeo.
-- =====================================================================

create table if not exists body_medidas (
  user_id     uuid not null references auth.users (id) on delete cascade,
  fecha       date not null,
  peso_kg     numeric(5,2),
  cintura_cm  numeric(5,2),
  cadera_cm   numeric(5,2),
  brazo_cm    numeric(5,2),
  muslo_cm    numeric(5,2),
  grasa_pct   numeric(4,1),        -- ESTIMACIÓN de balanza, nunca dato clínico
  primary key (user_id, fecha)     -- una medición por día: idempotente por diseño
);

create table if not exists entrenamientos_asignados (
  id          uuid not null default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  cliente_id  text not null,        -- 'local' (real). La cartera demo NUNCA se sube.
  workout_id  text not null,
  dia         date not null,
  nota        text not null default '',
  estado      text not null default 'pendiente',   -- pendiente | completada
  creada      timestamptz
);

-- ---------------------------------------------------------------------
-- RLS: cada fila es solo de su dueño (mismo patrón que 0001_core.sql)
-- ---------------------------------------------------------------------
alter table body_medidas enable row level security;
alter table entrenamientos_asignados enable row level security;

create policy "medidas propias: select"   on body_medidas for select using (auth.uid() = user_id);
create policy "medidas propias: insert"   on body_medidas for insert with check (auth.uid() = user_id);
create policy "medidas propias: update"   on body_medidas for update using (auth.uid() = user_id);
create policy "medidas propias: delete"   on body_medidas for delete using (auth.uid() = user_id);

create policy "asignaciones propias: select" on entrenamientos_asignados for select using (auth.uid() = user_id);
create policy "asignaciones propias: insert" on entrenamientos_asignados for insert with check (auth.uid() = user_id);
create policy "asignaciones propias: update" on entrenamientos_asignados for update using (auth.uid() = user_id);
create policy "asignaciones propias: delete" on entrenamientos_asignados for delete using (auth.uid() = user_id);
