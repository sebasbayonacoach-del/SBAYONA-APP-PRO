# APP 7.0 — receptor Web Push de la PWA (17/11/2026)

## Lo incorporado
- `sw.js` recibe eventos `push` aunque no haya pestaña activa, si previamente existe una suscripción Push válida y el sistema operativo entrega el mensaje.
- Contrato aceptado: `{ "source":"bayona", "version":1, "type":"morning|preTraining|evening", "day":"YYYY-MM-DD" }`.
- Títulos, cuerpos y enlaces están definidos **localmente** en el service worker, no se leen del contenido enviado por el servidor.
- Ningún dato clínico, nombre de ejercicio ni historial se muestra en la pantalla bloqueada.
- La etiqueta `bayona-push:<tipo>:<día>` permite agrupar duplicados del mismo aviso.
- Las notificaciones solo navegan a rutas del mismo origen cuando se pulsan.
- Los eventos sin esquema válido o con tipos desconocidos se ignoran.

## Límite de este cambio
**Esta entrega NO activa los envíos Web Push diarios:** recibir el evento no implica generar una suscripción ni configurar remitentes, VAPID, cron, reglas de frecuencia o consentimiento. El código no solicita permisos ni envía mensajes. Las preferencias locales existentes siguen siendo voluntarias y siguen funcionando con la aplicación abierta.

## Criterios para activar envíos reales
1. Identidad del usuario confirmada y suscripción por dispositivo vinculada a Auth con RLS.
2. Opt-in desde la UI, revocación y baja, preferencias con zona horaria y límites de frecuencia.
3. VAPID privada gestionada exclusivamente en secretos del servidor.
4. Plan diario genuino: nada de inventar entrenamientos ni disparar mensajes si la acción ya se completó.
5. Prueba de entrega real con app cerrada en Android y en iOS PWA instalada.
6. Monitorización, control de errores 404/410 de suscripciones caducadas, y exclusión de credenciales del repositorio.

Prueba regresión: `node tests/push-worker-eval.mjs`.
