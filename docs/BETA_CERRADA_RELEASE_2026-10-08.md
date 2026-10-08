# BAYONA ONE — Beta cerrada y criterios de lanzamiento
**Fecha:** 2026-10-08  
**Rama candidata:** bayona-one/production-hardening-v1  
**Estado:** candidato técnico; las integraciones externas requieren verificación independiente.

## Objetivo
Lanzar una beta privada para **5–10 adultos (18+)** durante una primera ronda de evaluación. Incluir principiantes, personas que entrenan regularmente y 1–2 entrenadores. No incorporar menores ni sujetos con situaciones médicas que necesiten supervisión clínica en esta ronda.

## Qué entra en la beta
- Entrada pública, selección Mi APP/Coach, onboarding de nueve pasos y guía inicial.
- Entrenamiento, nutrición, descanso y progreso con datos registrados, sin resultados simulados.
- Coach OS con CRM, agenda, planificación por etapas, tests y seguimiento.
- Comunidad y FitCoins, con la distinción entre puntos digitales, recompensas y pagos reales.
- Modo día/noche, soporte móvil, recorrido por teclado, funcionamiento local sin cuenta.
- Servicios cloud de pago, backup, IA y social solo si cada dependencia está realmente desplegada, autorizada y verificada.

## Bloqueos antes de dar acceso
- [ ] Pull request de Sprint 12 con **ci, bateria y e2e SUCCESS** sobre el último commit; sin cambios no evaluados.
- [ ] Revisión visual 320, 390, 430, 768 y 1440 px, modo claro y oscuro; ningún botón invisible ni texto bajo contraste.
- [ ] Probar la versión exacta aprobada en un despliegue de staging/preview.
- [ ] Dos usuarios de staging verifican aislamiento de RLS: fichas, notas, pagos, sesiones y backups de un usuario no aparecen en otro.
- [ ] Revisar/aplicar migraciones Supabase 0005–0008, respaldar la base y confirmar rollback antes de tocar producción.
- [ ] Stripe **solo modo prueba**: pago, fallo, cancelación, duplicado de webhook, portal, expiración y revocación real de membresía.
- [ ] Backup y restauración probados en segundo dispositivo con SHA-256 válido, rechazo de checksum alterado y límite de tamaño.
- [ ] Variables Vercel: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_RAIZ, STRIPE_PRICE_PERFORMANCE, STRIPE_PRICE_ELITE, BAYONA_PUBLIC_URL, BAYONA_ALLOWED_ORIGINS. OPENAI_API_KEY solo si Coach cloud se activa. Nunca guardar secretos en el repo.
- [ ] Mantener flags billing_checkout, cloud_backup y cloud_coach **apagados inicialmente**. No activar sin pruebas de extremo a extremo.
- [ ] Política de privacidad, consentimiento de cámaras/fotos/notificaciones/comunidad, exportación/borrado de datos y términos revisados.
- [ ] Accesos individuales de prueba; no reutilizar contraseña compartida.

## Guion mínimo para cada tester
1. Entrar sin ayuda desde la landing; registrar cualquier duda antes de llegar a Mi APP.
2. Completar el onboarding (nombre, objetivos, entorno, días, etapa, screening, Coach, plan y resumen); probar el tour.
3. Registrar serie, esfuerzo, entrenamiento parcial y completo; comprobar XP/FitCoins una sola vez.
4. Registrar comida, hidratación, descanso y progreso; verificar que datos ausentes no se presentan como diagnóstico.
5. Visitar Comunidad sin publicar un PR inventado, canjear solo recompensas realmente disponibles.
6. Cambiar día/noche, navegar con teclado y comprobar móvil sin scroll horizontal.
7. Comprobar que la telemetría está apagada por defecto; dar y revocar permiso explícitamente.
8. Cerrar/abrir y recuperar datos locales. Repetir con nube solo después de staging certificado.
9. En Coach, crear ficha, cita, programa, microciclo y test; verificar que cargas/resultados no aparecen hasta registrarlos.
10. Reportar la sección, expectativa, resultado observado, pasos para repetir y captura solo con autorización.

## Registro y decisión
Cada incidencia: ID, fecha, dispositivo, versión/commit, pasos, resultado, evidencia autorizada, severidad (P0 bloqueante, P1 grave, P2 moderada, P3 mejora) y estado.

La beta puede abrir si: **cero P0/P1**, 100% de los flujos críticos completables, sin exposición entre cuentas, sin cobros o backups ficticios, y controles de privacidad visibles. La beta no equivale a disponibilidad general ni a dispositivo médico.

## Límite de certificación
Los tests del repositorio certifican el código de la rama. No demuestran por sí solos pagos procesados, credenciales, migraciones activas, servicios cloud reales ni recuperación entre móviles. Si faltan verificaciones, esas funciones permanecen apagadas y la beta se limita al funcionamiento local o al staging seguro.
