# BAYONA — Verificación de staging cloud
**8 de octubre de 2026** · Rama bayona-one/staging-readiness-v1

## Auditoría ejecutada
- Preview: responde HTTP 200; experiencia local disponible.
- API cloud: configurada=false, por lo tanto no hay base remota utilizable.
- Vercel tiene los nombres SUPABASE_URL y SUPABASE_ANON_KEY, pero la URL publicada no supera su validación; la clave pública podría no corresponder al mismo proyecto.
- No aparecieron SUPABASE_SERVICE_ROLE_KEY ni credenciales/precios de Stripe en la lista revisada.
- Sin sesión, el checkout está denegado; un webhook sin firma tampoco puede procesar pagos.
- Onboarding separado de los accesos premium, Stripe live bloqueado por defecto.
- Ocho migraciones SQL analizadas con parser PostgreSQL (sintaxis válida); todavía no aplicadas en staging.
- Revisar BLOB_READ_WRITE_TOKEN, que figura como tipo Config y merece tratamiento secreto.

## Orden de puesta en marcha (solo pruebas)
1. Crear/verificar proyecto Supabase de staging sin datos reales de clientes.
2. Configurar las variables SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY y BAYONA_ALLOWED_ORIGINS en Vercel, con URL HTTPS de la forma https://PROJECT.supabase.co. La service role se guarda exclusivamente en servidor.
3. Crear preview nueva y comprobar el endpoint /api/cloud-status (Auth, REST, esquema). No compartir claves en el chat.
4. Aplicar en staging las migraciones 0001–0008 en orden, con snapshot previo y plan de rollback. Nunca ejecutar directamente contra producción.
5. Crear cuentas ficticias A y B y una Coach. Confirmar RLS: ningún usuario puede consultar/modificar clientes, notas, planes, facturas, fotos o backups ajenos.
6. Configurar Stripe TEST: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET y STRIPE_PRICE_RAIZ/PERFORMANCE/ELITE. Mantener BAYONA_ALLOW_LIVE_PAYMENTS sin habilitar.
7. Probar checkout, rechazo, cancelación, portal, duplicados de webhook, expiraciones y cambio de plan. Ninguna pantalla o dato local concede permisos pagados sin validación.
8. Probar backup de una cuenta pagada de prueba en un segundo dispositivo, checksum incorrecto, restauración y aislamiento A/B.
9. Solo después, habilitar flags en cuentas de prueba (1–2 primero), mantener rollout gradual y hacer beta de 5–10 adultos.

## Pruebas automáticas
Comprobación HTTP sin credenciales: node tools/beta-staging-smoke.mjs https://TU-PREVIEW.vercel.app
Puerta estricta cloud: node tools/beta-staging-smoke.mjs https://TU-PREVIEW.vercel.app --require-cloud
El primer comando debe confirmar que recursos protegidos no están abiertos. El segundo falla mientras cloud no esté listo.

## Condiciones de salida
- CI, batería y E2E verdes en último commit.
- RLS validado con cuentas aisladas; Auth y refresh probado.
- Stripe test y backups probados de extremo a extremo, con flags inicialmente apagados.
- Exportación, eliminación, privacidad y consentimiento revisados.
- No se procesan cobros reales ni se afirma que exista un servicio cloud si falta su configuración.

**Estado actual:** candidato local/preview. Bloqueado para cuentas cloud y cobros reales hasta verificación externa.
