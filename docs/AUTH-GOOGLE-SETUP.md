# BAYONA Auth 1.0.10 — Google y coach único

## Implementación
Registro público obligatorio como usuario: nombre, correo y contraseña, o Google. La app pide las preferencias personales después de autenticar. Nunca permite seleccionar Coach durante el registro. La autorización de Coach Studio procede de la función SQL is_bayona_coach(), no de un botón, metadatos ni un valor local.

## Proyecto correcto
La app usa actualmente: https://otkhozruunouimjgvvun.supabase.co
La conexión Supabase disponible en ChatGPT es otro proyecto: bppjzewgqdrghexazgcj (inactivo). NO ejecutar allí las migraciones de BAYONA.

## Activar Google
1. En Google Cloud Console > Google Auth Platform / Credentials, configura consentimiento OAuth y crea un Client ID de tipo Web application.
2. En Google Cloud incluye el redirect de Supabase: https://otkhozruunouimjgvvun.supabase.co/auth/v1/callback
3. En Supabase del proyecto correcto > Authentication > Providers > Google, activa Google y guarda Client ID y Client Secret exclusivamente allí.
4. En Supabase > Authentication > URL Configuration > Redirect URLs autoriza:
   - bayonafit://auth/callback**
   - https://bayona-app-one.vercel.app/**
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

No se ha configurado el proveedor de Google en el proyecto real ni se ha aplicado la migración allí. No considerar el acceso Google listo para usuarios hasta completar el checklist.
