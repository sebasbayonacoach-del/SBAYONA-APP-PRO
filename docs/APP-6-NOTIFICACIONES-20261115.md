# APP 6.0 — Avisos diarios útiles (15-11-2026)

## Incorporado en la rama de desarrollo
- Recordatorios vinculados a una acción **real** de `planDelDia`. No se inventan rutinas, sesiones ni logros.
- Opt-in; no se activa nada por defecto. Preferencias editables en **Perfil → Más → Recordatorios**, incluida hora de entrenamiento elegida por el usuario.
- Ventanas: inicio del día 08:00–11:30, entrenamiento en la hora elegida y durante 45 minutos, cierre 20:00–23:30.
- Solo un aviso por momento y fecha, por identidad local; nunca se envían avisos atrasados en bloque.
- Cuerpo genérico en pantalla bloqueada, sin datos de salud ni entrenamiento identificables.
- Clic abre una ruta interna de BAYONA. Permiso de notificaciones pedido solo desde una acción explícita.
- Módulo sin servicios nuevos, junto al service worker offline. Pruebas puras: `tests/notifications-eval.mjs`.

## Limitación imprescindible
Esta versión **no implementa Web Push remoto**. Los recordatorios requieren que la aplicación esté ejecutándose y que el navegador permita mostrarlos. El navegador puede suspender temporizadores en segundo plano. **No garantizan un aviso cada día con la app cerrada**. No anunciar esa capacidad como publicada.

Para completar los avisos con app cerrada hace falta: suscripciones Push por usuario y dispositivo, preferencias/husos horarios en Supabase protegidos por RLS, credenciales VAPID seguras en servidor, tarea programada para envíos por la zona horaria del atleta, revocación y bajas, control de frecuencia, pruebas reales en Android/iOS/PWA y despliegue monitorizado. No publicar un servicio push antes de comprobarlo.

## Biblioteca PROPLAYER
El catálogo existente lista 3.141 ejercicios, 2.255 fichas con referencia MP4 y 1.607 archivos MP4 únicos en Vercel Blob. El reproductor, las vistas previas y la asignación de rutinas ya están implementados en esta rama base. **No** se han incorporado nuevos vídeos ni copiado material de terceros. La documentación de Trainingym no acredita licencia para redistribuir, por lo que se requiere autorización escrita antes de su difusión comercial.

## Criterios de entrega final
1. `npm test` y smoke navegador pasan en vista atleta, coach, móvil y modo offline.
2. Acceso Google, sesión y datos persistidos entre dispositivos.
3. Cada vídeo autorizado reproduce de forma controlada y los fallidos muestran técnica alternativa.
4. Notificaciones push diarias a dispositivo cerrado solo tras opt-in y con cumplimiento de las preferencias.
5. A/B de funcionalidad y lanzamiento de producción verificados; no promover automáticamente esta rama.
