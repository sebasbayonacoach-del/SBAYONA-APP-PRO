# BAYONA · Visual World · 1.0.19-beta

## Experiencia
- 9 ilustraciones vectoriales originales, offline y muy ligeras:
  avatar, entrenamiento, nutrición, recetas, hábitos, progreso,
  comunidad/espacio, Coach Studio y exploración.
- El inicio muestra una galería visual con ocho puertas reales:
  entrenamiento, nutrición, recetas, mi imagen, progreso, bienestar,
  planificación y perfil. El entrenador ve además Coach Studio.
- Las secciones existentes muestran una portada editorial propia
  según su contexto, conservando debajo todos sus módulos y datos.
- No se simulan clientes, mediciones, XP ni recompensas. Las tarjetas
  navegan únicamente a secciones reales, con roles protegidos.
- Los archivos SVG no tienen JavaScript, enlaces externos, scripts
  incrustados ni datos personales de usuario.
- Accesibilidad: imágenes decorativas, botones accesibles por teclado,
  texto legible, contraste sobre fotografía, responsive y reducción
  de animaciones cuando el sistema lo solicita.
- No hay suscripciones, descargas de fotos ajenas ni dependencias en
  servicios de terceros. Todos los recursos se precachean para PWA.

## QA
- Tests/visual-world-eval.mjs: revisión de las nueve piezas, rutas,
  peso individual inferior a 10 KB, código seguro y roles.
- Chromium: tarjetas navegables y sin overflow en 1440, 390 y 320 px.
- Batería general 67 suites PASS. Auditoría de idiomas sin regresiones.
- APK Android 1.0.19-beta / versionCode 20: compilar y probar.
- Producción Vercel sigue en espera de conciliación con despliegue CLI.
