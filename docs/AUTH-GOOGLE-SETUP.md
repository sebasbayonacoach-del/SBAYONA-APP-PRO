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
4. Comprueba que hay una sola fila y corresponde a la cuenta indicada.
5. Si ya existe su perfil, actualízalo: UPDATE public.profiles SET role='coach' WHERE id=(SELECT user_id FROM public.bayona_owner WHERE singleton=true);
6. Cierra y vuelve a iniciar sesión. La app solo permitirá Coach Studio si la RPC devuelve TRUE.

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
