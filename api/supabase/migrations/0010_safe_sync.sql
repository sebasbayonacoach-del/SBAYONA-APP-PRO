-- BAYONA 0010_safe_sync: claves de idempotencia, sin eliminar datos heredados.
-- Ejecutar después de 0001/0002 y antes de activar la sincronización incremental.
-- Los registros existentes quedan intactos. NULL mantiene compatibilidad con históricos.
alter table public.sets_log
  add column if not exists client_id uuid;
create unique index if not exists sets_log_session_client_unique
  on public.sets_log (session_id, client_id);

alter table public.entrenamientos_asignados
  add column if not exists client_sync_id text;
create unique index if not exists entrenamientos_asignados_client_sync_unique
  on public.entrenamientos_asignados (user_id, client_sync_id);

-- Importante: los registros anteriores carecen de clave y se conservan.
-- Revisar posibles duplicados históricos tras exportar una copia completa.
-- No ejecutar borrados automáticos ni conciliaciones destructivas.
