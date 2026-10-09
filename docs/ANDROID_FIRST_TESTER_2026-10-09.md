# BAYONA Android · Primera prueba del creador (9 octubre 2026)

## APK
- Versión: **1.0.1-beta** (`versionCode 2`).
- Identificador Android: `app.bayona.fit`.
- Archivo: `BAYONA-Android-1.0.1-beta.apk` (se publica como prerelease de prueba en GitHub).
- Tipo: **DEBUG firmada** por la clave de depuración de la máquina de compilación. No es una release de Google Play.
- Android mínimo: SDK 24 (Android 7.0), objetivo SDK 36.
- SHA-256 del binario validado: `789beb3c9b9ee0d4c536ea0d25d6d38793ed084ff58b2815aac3e25379481e2a`.
- AndroidManifest: permiso de Internet y permiso dinámico interno no exportado; no se solicita acceso a ubicación, contactos, SMS ni cámara en esta compilación.

## Integraciones
- El **Inicio del cliente** incluye la tarjeta «Misiones BAYONA» y un acceso a `./misiones.html`.
- La página del reto (7 acciones, progreso en el dispositivo) se empaqueta dentro de la APK mediante `mobile/pack-web.mjs`, con su CSS y JS. El sitio de marketing y esta misión son recursos locales, disponibles sin conexión.
- Es un reto gratuito diferente de las misiones diarias con FitCoins/XP; **no concede recompensas, accesos premium ni dinero**.
- Los botones de consulta abren la conversación en WhatsApp solo si hay conexión y la aplicación WhatsApp o un navegador capaz de abrirla.
- Coach OS sigue siendo una demostración/contexto local sin seguridad cloud/RLS certificada: no introducir datos reales de clientes ni activar pagos live.

## Verificaciones efectuadas
- `npm run check:production`: 92/92 suites, presupuesto PWA OK.
- `tests/android-missions-eval.mjs`: 14 comprobaciones estáticas de UI/rutas/pack/offline/versión.
- `npm run mobile:pack` empaqueta `misiones.html` y assets con hash coincidente.
- `npx cap sync android` copia contenido a `android/app/src/main/assets/public`.
- `./gradlew assembleDebug` con Java 21: BUILD SUCCESSFUL.
- `aapt dump badging`: paquete, versión, mínimo Android comprobados.
- `apksigner verify --verbose`: v2 verificada y un firmante.
- No hay teléfono o emulador Android conectado a ADB: **no se ha verificado instalación ni rendimiento en dispositivo físico**. Eso corresponde a la primera prueba del usuario.

## Instrucciones de instalación
1. Descarga el fichero `.apk` de la prerelease desde un teléfono Android.
2. Confirma que procede de la release del repositorio oficial BAYONA y, si puedes, compara el SHA-256 indicado.
3. Android puede solicitar activar temporalmente «Permitir instalación desde esta fuente» para tu navegador o Files; concede solo para esta instalación y vuelve a desactivarlo.
4. Instala y abre BAYONA. Entra como **Cliente**, completa el onboarding si es la primera vez, abre Inicio → «Misiones BAYONA» y marca la primera tarea.
5. Sin conexión: las misiones, tarjetas y progreso deben seguir disponibles. Con conexión: los botones de consulta abren WhatsApp.
6. Para volver a la app pulsa «EXPLORAR APP» en el reto. No uses datos reales de terceros.

## Límite
Si tienes una versión previa de BAYONA instalada y Android rechaza la actualización por firma distinta, **no desinstales sin exportar antes tus datos locales**. Desinstalar elimina los datos locales de la aplicación; sin backend no se pueden recuperar.

## Construcción reproducible
En Pop!_OS, el sistema disponía solo de runtime Java 17. Se extrajo Java 21 localmente a `/tmp/bayona-jdk21` sin reemplazar Java del equipo. El código fuente y proyecto Android se modificaron solo en el clon aislado, nunca en el working tree original con 40 archivos pendientes.
