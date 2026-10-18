# Recuperación de Supabase y acceso — 15-10-2026

## Hallazgos y arreglos locales

- `0009_single_owner_google_auth.sql` tenía un cuerpo PL/pgSQL delimitado como `as $ ... $;`; se corrigió a `$$`. PostgreSQL rechazaba esa función y, por tanto, no podía completar esa migración.
- `0001`–`0006` dependían de privilegios predeterminados para que la Data API viera tablas/vistas. Ahora declaran grants de forma explícita a `authenticated` y `service_role`, manteniendo RLS. `anon` recibe solo `SELECT` sobre `profiles`, para que el probe de esquema no necesite sesión; las políticas de `profiles` son solo para `authenticated`, así que anon no ve filas.
- `api/supabase/setup.sql`, la ruta de instalación documentada, contenía cinco delimitadores `AS $` sin pareja, no tenía el trigger de sincronización del propietario y carecía de grants explícitos. El archivo se regeneró desde las nueve migraciones con `node tools/build-supabase-setup.mjs`; el generador también tiene prueba de igualdad para evitar que vuelva a divergir.
- `auth-readiness.mjs` ya no presenta callbacks OAuth incompletos, propietario, despliegue o hechos históricos como resultados actuales. Distingue `verified`, `blocked` y `unverified`; los checks OAuth/deployment opcionales necesitan URL por variables de entorno. La comprobación de inicio OAuth no se presenta como callback/login completo.

Supabase anunció que los grants automáticos de exposición dejan de ser predeterminados para proyectos nuevos desde el 30-05-2026 y alcanzan proyectos existentes el 30-10-2026. Las migraciones deben declarar cada grant con RLS, según [el changelog oficial](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) y [la guía actual de seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api).

## Verificación local

Se comprobó el camino de nueve migraciones y el `setup.sql` regenerado, cada uno en una base PGlite desechable con roles `anon`, `authenticated`, `service_role` y un esquema `auth` sintético, sin usuarios reales. Ambos completaron y mostraron 20/20 tablas con RLS. En ambos se comprobó que anon no lee perfiles, que el trigger sincroniza al propietario sintético y que una cuenta atleta no puede insertar vínculos Coach. También pasan `tests/backend-migrations-eval.mjs`, `tests/backend-readiness-eval.mjs` y `tests/auth-google-eval.mjs`.

La versión anterior de `setup.sql` falló en PGlite con `syntax error at or near "$"` y, al ejecutar el batch limpio, `public.profiles` no llegó a existir. Esto demuestra el fallo local del instalador anterior, **pero no confirma que fuera la causa del `PGRST205` remoto**. El diagnóstico remoto, que solo hizo GET y no modificó nada, verificó Auth HTTP 200, Google habilitado y altas por contraseña activas; `/rest/v1/profiles` devuelve HTTP 404 `PGRST205`. Puede faltar aplicar el esquema o exponer `public`. OAuth completo, propietario y despliegue siguen sin verificar.

Esto valida parseo y ejecución de esquema en un entorno local controlado. No verifica la configuración remota de Google OAuth, los grants efectivos del proyecto, sus tablas actuales, las allowlists ni un login de extremo a extremo.

## Orden y aplicación

En un proyecto vacío, aplica `0001_core.sql` → `0002_medidas_asignaciones.sql` → `0003_avatar_3d.sql` → `0004_perf_sync.sql` → `0005_launch_coaching.sql` → `0006_life_os.sql` → `0007_life_game_areas.sql` → `0008_planner_pro.sql` → `0009_single_owner_google_auth.sql`. Revisa primero el estado y la historia de migraciones del proyecto. Las modificaciones locales de migraciones ya marcadas como aplicadas no se ejecutan automáticamente en un proyecto existente.

`api/supabase/setup.sql` se genera desde las nueve migraciones ordenadas y ahora puede ejecutarse como batch limpio en un proyecto vacío. La guía [SETUP.md](../api/supabase/SETUP.md) lo marca como instalación de una sola vez y ya no lo describe como idempotente. En una base existente usa el historial y aplica solo cambios pendientes.

Para un proyecto existente, compara `supabase_migrations.schema_migrations` con estos archivos. Si faltan migraciones, aplica únicamente las pendientes en orden y en una transacción, después de respaldo. Si el historial dice que una migración está aplicada pero falta su efecto, no la marques ni la vuelvas a ejecutar a ciegas: revisa objetos/grants en el Dashboard y prepara una migración de reparación revisable. El síntoma `PGRST205` indica que PostgREST no ve la relación; puede faltar la tabla/migración o la exposición de `public`. `42501` indica privilegios insuficientes. El probe anon ahora distingue esos casos.

`0009` reconcilia `profiles.role` con `bayona_owner`: quien no figure como propietario queda como `athlete`; no borra filas. Revisa esa consecuencia y asigna el UUID real del propietario solo por el procedimiento de [AUTH-GOOGLE-SETUP.md](AUTH-GOOGLE-SETUP.md), nunca desde metadata pública.

## Reversión

No se recomienda `DROP TABLE`, borrar perfiles ni revertir datos de usuario. Los cambios de grants se revierten de forma explícita por privilegio (`REVOKE ... ON TABLE ... FROM ...`) si una revisión de acceso lo exige; restaurar grants retirados puede volver a exponer tablas y debe hacerse junto a una política RLS revisada. La corrección del delimitador es sintáctica. Para volver a impedir nuevas altas del propietario, revoca el propietario por el procedimiento documentado y confirma que el trigger devuelve su rol a `athlete`; no elimines perfiles.

## Ejecución remota pendiente

No se aplicó SQL remoto ni se modificaron usuarios, roles o proveedores. El backend solo quedará recuperado cuando el propietario aplique las migraciones pendientes en el proyecto correcto y se verifiquen desde allí Data API, Google Auth, callback real y permisos Coach con una cuenta de prueba autorizada.
