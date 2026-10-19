# BAYONA APP · 1.0.15-beta · Salida visible y regreso al acceso

## Entregable
- Acción «Cerrar sesión» visible en la barra superior de la APP para todos
  los perfiles autenticados y accesible desde el menú del Coach Studio.
- Usuarios invitados ven «Iniciar sesión».
- Confirmación al salir, guardado previo del progreso local (si falla, no sale).
- Logout real en Supabase y limpieza de la identidad activa y último contexto
  visual, preservando el namespace de entrenamiento de la cuenta anterior.
- Regreso explícito al Front Door ?source=pwa, con posibilidad de cambiar
  de usuario sin cambiar el rol privado del entrenador.
- En móvil, la barra superior conserva el control de salida sin desbordamiento;
  la navegación de cuatro destinos principales no añade un quinto elemento.

## QA
- 63 suites automáticas incluyendo las comprobaciones de logout.
- Prueba navegable aislada con token sintético y logout HTTP interceptado:
  navegador 1440 y 390 px, sin errores, token eliminado, rol visual eliminado,
  datos scoped del usuario conservados y retorno a source=pwa.
- No se ha cerrado la sesión real del propietario durante QA.
- Versión Android 1.0.15-beta / versionCode 16.

## Precauciones
La APP pública Vercel permanece sin cambios hasta revisión y despliegue
coordinado. APK pendiente de validación en móvil físico, OAuth e instalación
sobre versiones existentes con datos respaldados.
