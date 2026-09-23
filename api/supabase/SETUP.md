# BAYONA · Guía completa para montar Supabase desde cero

> Objetivo: tener una cuenta nueva de Supabase con el esquema de BAYONA
> desplegado, Auth habilitada y las credenciales del cliente listas.
> **Tiempo estimado: 10–15 minutos.** Plan Free, sin tarjeta.

---

## 0. Qué vas a obtener al final

| Pieza | Valor |
|---|---|
| Base de datos PostgreSQL 15 | 12 tablas con RLS (aislamiento por usuario) |
| Auth | Magic link (email) + Google |
| API instantánea | REST + Realtime por tabla |
| Credenciales | `Project URL` + `anon key` (las que me pasas) |

---

## 1. Crear la cuenta

1. Entra en **<https://supabase.com>** → botón **Start your project**.
2. Regístrate con **GitHub** o **Google** (recomendado: GitHub, te sirve luego para CI).
3. Si te pide organización, crea una nueva (`bayona` o la que quieras). Plan **Free**.

## 2. Crear el proyecto

1. **New project**.
2. Rellena:
   - **Name**: `bayona` (es solo etiqueta).
   - **Database Password**: genera una fuerte y **guárdala en tu gestor de
     contraseñas**. Es la contraseña del Postgres "de administración" —
     **no la necesitas para la app**, pero sí para recuperar/conectar un cliente
     SQL externo algún día.
   - **Region**: elige la más cercana a tus usuarios.
     Para España/Europa → **Frankfurt (eu-central-1)**.
     Latencia lo manda todo: una región lejana se nota en cada scroll.
3. **Create new project**. Tarda **~2 minutos** en provisionar.

> 💡 No cierres la pestaña hasta ver el proyecto en verde (`Active`).

## 3. Copiar las credenciales (LO IMPORTANTE)

1. Menú lateral izquierdo → **Settings** (engranaje) → **API**.
   *(en la interfaz nueva: Project Settings → API)*
2. Ahí tienes dos bloques:

   | Dónde | Qué copiar |
   |---|---|
   | **Project URL** | `https://xxxxxxxxxxxxxxxx.supabase.co` |
   | **Project API keys** → `anon` `public` | un JWT que empieza por `eyJ...` |

3. **⚠️ REGLA DE SEGURIDAD — léela:**
   - La **`anon` public key** está **diseñada para ir en el cliente**. Es segura
     de usar siempre que RLS esté activo (y lo está).
   - La **`service_role` key** es un **SUPERPODER**: salta TODAS las políticas RLS.
     **Nunca** la copies en el chat, en el código, en un repo ni en la app.
     Si alguna vez la usas, que sea en un servidor que controles y en un `.env`
     que NO se suba a git.
   - La **Database password** del paso 2 tampoco sale nunca de tu gestor.

## 4. Desplegar el esquema de BAYONA

1. En el menú lateral → **SQL Editor**.
2. **New query**.
3. Abre el fichero **[`api/supabase/setup.sql`](./setup.sql)** de este repo,
   copia **todo** su contenido y pégalo en el editor.
4. Pulsa **Run** (⌘/Ctrl + Enter).
5. Debe salir: **`Success. No rows returned`**.

   Al final del mismo script hay una consulta de verificación; si la seleccionas
   y la ejecutas sola, debe devolverte **12 filas**:
   `profiles, consents, avatars, exercises, plans, workout_sessions, sets_log,
   health_samples, readiness_daily, scans, red_flags, xp_ledger`.

> El script es **idempotente**: `create table if not exists` + `drop policy if
> exists`. Puedes re-ejecutarlo sin miedo si algo falla a medias.

6. Comprueba también en **Table Editor** que las tablas aparecen y que el
   interruptor **RLS enabled** está en verde en todas.

## 5. Habilitar Auth (magic link)

1. Menú lateral → **Authentication** → **Sign In / Providers** → tab **Email**.
2. Deja **Email** activo y configura:
   - **Confirm email**: **OFF** para desarrollo (evita tener que confirmar cada
     cuenta de prueba). Para producción, ponlo **ON**.
   - **Secure email change**: ON.
3. **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:8080` (el `./run.sh` de BAYONA).
   - **Redirect URLs**: añade `http://localhost:8080/**` y, cuando lo publiques,
     `https://tu-dominio.com/**`.
   - *Si no rellenas esto, el email de acceso te llevará a una página rota.*

## 6. Habilitar Auth con Google (opcional pero recomendado)

1. En **Google Cloud Console** → <https://console.cloud.google.com/apis/credentials>
   - **Create credentials → OAuth client ID → Web application**.
   - **Authorized redirect URIs**: añade exactamente
     `https://xxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback`
     (tu Project URL + `/auth/v1/callback`).
2. Copia el **Client ID** y el **Client Secret**.
3. Vuelve a Supabase → **Authentication → Sign In / Providers → Google**:
   - Actívalo y pega Client ID + Client Secret.
   - En **Authorized Client IDs** pon el mismo Client ID.

## 7. Validar el aislamiento entre usuarios (RLS)

1. **SQL Editor** → **New query**.
2. Pega el contenido de [`api/supabase/tests/rls_basic.sql`](./tests/rls_basic.sql)
   y ejecuta. Es la batería que comprueba que un usuario **no** puede leer ni
   escribir filas de otro.
3. Todo debe salir `OK`. Si algo sale `FAIL`, mándame la salida y lo corrijo.

## 8. (Opcional) Datos de prueba

Para no empezar con el catálogo `exercises` vacío, pega esto en el SQL Editor
después del setup (es un seed mínimo):

```sql
insert into exercises (id, name, pattern) values
  ('squat',    'SENTADILLA',      'squat'),
  ('press',    'PRESS BANCA',     'push'),
  ('deadlift', 'PESO MUERTO',     'hinge'),
  ('row',      'REMADO',          'pull'),
  ('pullup',   'DOMINADAS',       'pull'),
  ('ohp',      'PRESS MILITAR',   'push'),
  ('hip_hinge','PUENTE DE GLÚTEO','hinge'),
  ('plancha',  'PLANCHA',         'core')
on conflict (id) do nothing;
```

---

## 9. Checklist final

- [ ] Proyecto en verde (`Active`)
- [ ] `Project URL` copiada
- [ ] `anon` `public` key copiada (**no** la `service_role`)
- [ ] `setup.sql` ejecutado → `Success`
- [ ] 12 tablas en Table Editor con RLS en verde
- [ ] Auth → Email activo, Site URL = `http://localhost:8080`
- [ ] `rls_basic.sql` → todo `OK`
- [ ] (opcional) Google OAuth configurado

## 10. Qué me pasas para seguir

Solo dos líneas (nada más, y **nunca** la `service_role`):

```
SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

Con eso te dejo hecho: adaptador `js/sync/`, login desde la app, migración del
estado local a la nube, cola offline → servidor y export/borrado GDPR.

---

## Si algo falla

| Síntoma | Causa típica | Solución |
|---|---|---|
| `relation "profiles" does not exist` | El script no terminó | Re-ejecuta `setup.sql` (es idempotente) |
| `permission denied for table ...` | RLS activo y sin policy | Re-ejecuta `setup.sql`; revisa que las 15 policies existen |
| `new row violates row-level security` | `user_id` no coincide con `auth.uid()` | En el insert, `user_id` debe ser el id del usuario autenticado |
| El email de login no lleva a la app | Redirect URL mal puesto | §5.3 — Site URL + `http://localhost:8080/**` |
| `401 Unauthorized` | anon key incorrecta/cortada | Copia la clave entera, es un JWT largo |
| Latencia alta | Región lejana | Recrea el proyecto en Frankfurt |
