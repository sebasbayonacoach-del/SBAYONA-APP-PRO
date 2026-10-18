# BAYONA Auth 1.0.10 — Google y coach único

## Implementación
Registro público obligatorio como usuario: nombre, correo y contraseña, o Google. La app pide las preferencias personales después de autenticar. Nunca permite seleccionar Coach durante el registro. La autorización de Coach Studio procede de la función SQL is_bayona_coach(), no de un botón, metadatos ni un valor local.

## Proyecto correcto
La app usa actualmente: https://otkhozruunouimjgvvun.supabase.co
El conector lista inicialmente bppjzewgqdrghexazgcj, pero también permite consultar por ID el proyecto correcto otkhozruunouimjgvvun. Consulta administrativa realizada el 12/10/2026; esquema público todavía ausente.

## Activar Google
1. El cliente Google OAuth existente BAYONA Web ya está asociado a Supabase. NO crear otro sin necesidad.
2. En Google Cloud incluye el redirect de Supabase: https://otkhozruunouimjgvvun.supabase.co/auth/v1/callback
3. El proveedor Google ya está habilitado en el Supabase correcto y coincide con el cliente BAYONA Web. Los secretos permanecen en los paneles privados.
4. En Supabase > Authentication > URL Configuration > Redirect URLs autoriza:
   - bayonafit://auth/callback**
   - https://bayona-app-one.vercel.app/**
   - https://bayona-jet.vercel.app/mi-app/**
5. Confirma en el panel los dominios de producción y las URLs de retorno. El callback Android contiene un auth_state vinculado al intento actual.

## Autorizar al único entrenador (acción administrativa)
1. Ejecuta api/supabase/migrations/0009_single_owner_google_auth.sql en el proyecto correcto.
   La migración deja temporalmente perfiles como usuario hasta autorizar un dueño.
2. Localiza el UUID de la cuenta correcta del propietario en Authentication > Users. No uses un UUID supuesto ni solo su nombre.
3. En SQL Editor del proyecto real, con ese UUID exacto:
   INSERT INTO public.bayona_owner(singleton,user_id)
   VALUES (true, 'UUID_REAL_DEL_PROPIETARIO')
   ON CONFLICT (singleton) DO NOTHING;
4. Comprueba que hay una sola fila y corresponde a la cuenta indicada. La migración sincroniza automáticamente `profiles.role` al asignar, actualizar o revocar el propietario.
5. Cierra y vuelve a iniciar sesión. La app solo permitirá Coach Studio si la RPC devuelve TRUE.

**Importante:** `ON CONFLICT (singleton) DO NOTHING` no cambia un propietario existente. Si ya existe uno distinto, revisar explícitamente quién debe ser el propietario antes de modificar ese registro.

## Pruebas antes de producción
- Email + nombre: alta como usuario.
- Google: abre cuenta, vuelve desde navegador a la app y completa perfil.
- Cuenta propietaria: Coach Studio habilitado solo tras RPC.
- Otras cuentas, incluso con metadata manipulada: nunca Coach Studio.
- Intento de cambiar profiles.role desde cliente: trigger fuerza athlete.
- RLS y aislamiento entre clientes.
- Google OAuth real, inicio/cierre de sesión y enlace de restablecimiento.

## DIAGNÓSTICO VERIFICADO · 12/10/2026
- Google habilitado (Supabase Auth HTTP 200; ajustes external.google=true).
- Los redirect a Google para Android y web responden HTTP 302 hacia accounts.google.com; el retorno final aún requiere prueba real.
- La tabla public.profiles no existe (HTTP 404, PGRST205), ni tampoco la función SQL is_bayona_coach; falta aplicar el esquema de BAYONA.
- Google Cloud permite el correo de prueba autorizado, pero sigue en modo Prueba. No hay consentimiento publicado para todos.
- bayona-app-one.vercel.app presenta el despliegue antiguo sin el Front Door nuevo.
- El intento de aplicar la migración base por el conector fue bloqueado por los controles de seguridad de la herramienta: no evadir ese bloqueo.
- NO se ha modificado el esquema de producción ni activado Coach Studio allí.
- Ejecutar node tools/auth-readiness.mjs para verificar el estado público sin credenciales secretas.

No se debe declarar listo para usuarios externos hasta que se validen las migraciones, RLS, OAuth completo y despliegue correcto.

## VERIFICACIONES ADICIONALES · 12/10/2026
- Una prueba interactiva del flujo OAuth web terminó en https://bayona-jet.vercel.app/ (marketing), no en bayona-app-one.vercel.app. El retorno debe corregirse y certificarse antes del lanzamiento.
- Vercel reconoce el proyecto bayona-app, pero rechaza la creación de una preview deployment con HTTP 403 por alcance/autorización de equipo. El CLI no está instalado y no hay sesión local autenticada disponible; no se ha desplegado nada.
- Nueva corrección ya guardada en la rama de desarrollo: si falla el espejo de cualquier dominio, la sincronización deja el outbox pendiente y muestra fallo parcial, sin borrar la cola ni afirmar éxito.
- Google solo tiene acceso de prueba para el correo verificado. El consentimiento general no está publicado.
- La beta de producción del móvil permanece sin sustituir. No dar acceso público hasta que pasen la base de datos y la RLS.

## 1.0.11-BETA · BLOQUEO SEGURO DE ALTAS
- El cliente compara el servicio Auth con la disponibilidad de public.profiles.
- Si falta profiles o no se pudo verificar RLS, se pausan los registros nuevos con correo y Google.
- El acceso de cuentas existentes y el progreso local no se borran por una ausencia del esquema.
- Las pruebas verifican Auth HTTP 200 + esquema HTTP 404, esquema HTTP 200 y fallo de red REST.
- Smoke móvil 390 px: advertencia visible, registro y Google desactivados, login activo, 0 errores JS y 0 scroll horizontal.
- Evitar desplegar a público hasta que el diagnóstico completo deje de bloquear el lanzamiento.

## Estado de despliegue · 12/10/2026, posterior a la primera vista previa
- Vercel CLI quedó autorizado para la cuenta del equipo y se publicó una **vista previa** desde el commit `7bb8323`.
- Vista previa comprobada: `https://bayona-c8jgypp80-sevisionari-3740s-projects.vercel.app/` (HTTP 200, pantalla de acceso correcta, 0 errores JS, registro público pausado).
- La vista previa no es producción. El dominio `bayona-app-one.vercel.app` y la instalación del móvil permanecen intactos.
- Nuevo cambio pendiente de probar e instalar: `0009_single_owner_google_auth.sql` sincroniza `profiles.role` mediante trigger en `bayona_owner`.
- La autorización interactiva de Supabase continúa fallando por CAPTCHA; no se han aplicado las migraciones.
- Una contraseña enviada por conversación no debe usarse para iniciar sesión; credenciales y CAPTCHA se gestionan exclusivamente en el panel seguro del servicio.


## ACTUALIZACIÓN VERIFICADA · 18/10/2026 — BASE DE DATOS OPERATIVA
Esta actualización prevalece sobre los diagnósticos del 12/10/2026 más arriba.

- La conexión de ChatGPT "Sebas" tiene permiso sobre la organización **BAYONA**, proyecto **otkhozruunouimjgvvun**; la conexión "Primary" apunta a otro proyecto inactivo y NO debe usarse.
- Instaladas exitosamente las migraciones **0001–0011** del repositorio en el proyecto real. Hay **21 tablas public** y **21/21 con RLS activo**, con **65 políticas**.
- Se aplicó adicionalmente `bayona_0012_harden_coach_rpc_permissions`: elimina permisos públicos/anónimos para RPC privilegiadas y fija el search_path de 5 funciones.
- Se confirmó exactamente una identidad autenticada y verificada que corresponde al propietario. Su perfil se creó con permisos mínimos y el registro exclusivo de `bayona_owner` se asignó **a partir del UUID obtenido de auth.users**, sin almacenar identificadores personales ni contraseñas en GitHub. Resultado: **1 coach**, **1 owner**, otras identidades no pueden obtener ese rol.
- Prueba SQL con impersonación de rol `authenticated`: el propietario verifica `is_bayona_coach() = true` y puede leer su perfil; una identidad ajena verifica `is_bayona_coach() = false` y no puede leer el perfil. Ninguna cuenta de prueba se creó.
- `profiles?select=id&limit=0` con clave pública responde **HTTP 200**; anteriormente era 404.
- La vista previa `https://bayona-hvmwfjwr3-sevisionari-3740s-projects.vercel.app/?source=pwa` habilita registro y Google al detectar el backend. Google devuelve **HTTP 302** hacia Google y conserva la URL de retorno de la APP. **No equivale a completar login interactivo y regreso al producto**.
- El linter de seguridad conserva avisos esperados por las RPC SECURITY DEFINER autenticadas y la tabla privada `bayona_owner` intencionadamente sin policies. Sigue pendiente configurar `Leaked Password Protection` desde Supabase Auth.
- NO se ha promovido la rama de GitHub a producción. La versión pública proviene de un despliegue CLI con ficheros propios más recientes; fusionar directamente sustituiría recursos no incluidos en esta rama. Pendiente fusionar/reconciliar y verificar en móvil físico.

Verificaciones recomendadas antes de apertura pública: OAuth completo en cuentas reales, flujos de confirmación/recovery, prueba end-to-end de RLS entre cuentas legítimas y publicación preservando la versión CLI del dominio oficial.
