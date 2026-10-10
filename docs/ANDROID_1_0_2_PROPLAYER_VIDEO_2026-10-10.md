# BAYONA Android · 1.0.2-beta.1 · Rutinas + vídeos PROPLAYER

Fecha: 10 de octubre de 2026.

## Alcance implementado

- Catálogo `trainingym/catalog.json` (**3.141 fichas**) incluido como asset en Capacitor por `mobile/pack-web.mjs`. Se valida el recuento durante el empaquetado. Antes, la APK carecía de este archivo: la biblioteca PROPLAYER no podía abrirse en Android.
- El catálogo completo puede consultarse **sin conexión** desde el APK. No se incrustan ni precachean los vídeos de PROPLAYER: sus **2.255 fichas con URL de vídeo** referencian **1.607 MP4 externos únicos**. La reproducción necesita Internet; 886 fichas tienen ausencia o incidencia. Los enlaces concretos pueden cambiar o dejar de funcionar.
- El cliente abre la biblioteca desde Entrenar; el modo Coach de demostración permite construir una rutina, añadir parámetros, asignarla a **cliente local del mismo dispositivo** y preservar enlaces remotos con `videoUrl`.
- Mensajes junto a los vídeos indican disponibilidad en línea y error de red; nunca se afirma sin prueba que todos los MP4 son propios, tienen licencia, están descargados o funcionan offline.
- 11/14 ejercicios base conservan las animaciones MP4 locales incluidas en el APK. Los tres sin demostración siguen siendo **flexiones, elevación de cadera y burpees**: se muestran instrucciones escritas, no el vídeo equivocado.
- Se localizaron tres clips coincidentes de Trainingym con marca de agua. **No se incorporaron** a una APK distribuible ni al repositorio: falta verificar derechos de reproducción, redistribución y publicación. El catálogo de URL ya existente se conserva sin duplicar los archivos.
- Android `versionCode 3`, `versionName 1.0.2-beta`; caché PWA `bayona-shell-v59`.
- Nuevo `tests/android-proplayer-catalog-eval.mjs`, prueba visual `tools/android-proplayer-browser.mjs` y validación CI en `.github/workflows/e2e.yml`.
- Workflow separado `.github/workflows/android-beta.yml` con Java 21, SDK36, Capacitor, Gradle, comprobación de catalogo dentro del APK, `apksigner` y artifact verificable.

## Evidencia

- `npm run check:production`: **93/93 suites** en local.
- Smoke de APK HTML empaquetada: **13/13** verificaciones. Se abrió Coach de demostración, el catálogo mostró 30 resultados por página, se abrió un enlace de vídeo, se bloqueó la conexión, apareció el mensaje de error, se añadió un ejercicio a la rutina, se asignó al perfil local y se confirmó persistencia tras recargar.
- Integridad de empaquetado: `mobile/web-build/trainingym/catalog.json` existe, conserva **1.346.398 bytes** y contiene **3.141 registros**; no se incluyó `trainingym/blob-manifest.json` ni ningún recurso `private-trainingym/`.
- Se mantienen las pruebas funcionales anteriores y la prueba E2E completa de GitHub.
- La compilación binaria se realiza desde GitHub Actions con Java 21 y se verifica antes de publicar el enlace final; no llamar 'APK lista' hasta comprobar firma y contenido real.

## No certificado para clientes reales

- El selector Coach actual **no es autenticación**. No se ha validado por servidor el acceso exclusivo del entrenador, Supabase Auth/RLS, la entrega entre dos dispositivos o la separación de datos entre clientes.
- La asignación probada se realiza en **un solo dispositivo en entorno demo/local**. El trayecto a un móvil diferente, la sincronización cloud y las notificaciones no se han validado.
- Stripe, pagos y membresías live siguen pendientes de validación.
- La reproducción de vídeos PROPLAYER de terceros queda condicionada a su licencia/derechos. Para los tres faltantes se necesitan demos propias o autorizadas, filmadas para enseñar técnica con calidad suficiente, no solo animaciones de pocos segundos.

## Cómo probar al recibir APK

1. Instalar **BAYONA 1.0.2-beta.1** sin borrar los datos de la versión anterior. Si hay conflicto de firma, conservar y exportar primero el estado local antes de reinstalar.
2. Abrir Entrenar → **Biblioteca PROPLAYER**. Confirmar que aparecen **3.141 ejercicios** con búsqueda y filtros, incluso en modo avión.
3. Con conexión, abrir un ejercicio con vídeo y comprobar reproducción. En modo avión, debe advertir del error y seguir accesible la ficha.
4. Abrir el acceso Coach *solo para ensayo sin datos de terceros*, añadir un ejercicio a una rutina y asignarlo a «Cliente local · este dispositivo». Verificar que persiste.
5. Comprobar Entrenar y los MP4 base descargados. Flexiones, hip thrust y burpees informan que no tienen vídeo.
6. Comunicar las incidencias de compatibilidad, reproducción, tamaño y navegación para una siguiente versión.

Proyecto original del usuario: **40 archivos modificados/sin registrar preservados**, trabajando exclusivamente en copia aislada. No modificar `main` ni producción sin superar los controles.
