# BAYONA · Life RPG — versión 1.0.14-beta

## Propuesta de producto
«Tu vida. Tu aventura.» El usuario es protagonista. La app le guía a una
acción razonable, no a acumular tareas para prolongar su tiempo de pantalla.
BAYONA es útil también si alguien ignora completamente sus rangos y XP.

## Primera experiencia implementada
- Portada con misión del día sugerida por el motor existente decideNow.
- Rango, nivel y XP conectados directamente a S.level() y S.rank().
- Mapa con cinco áreas: cuerpo, mente, trabajo/estudio, relaciones y propósito.
- Áreas y recompensas calculadas con lifeMissions; XP SOLO desde
  S.claimAreaMission, que exige una acción registrada y evita duplicados.
- Navegación a entrenamiento, mente, trabajo, planificación y recuperación.
- Vistas Sencillo / Aventura / Detallado, elegidas por cada persona y
  persistidas en su perfil. No se solicita edad ni identidad adicional.
- Se conserva el entrenador contextual, las herramientas de salud y la
  biblioteca; no se crea una segunda economía ni compras de niveles.
- Ilustración CSS ligera, sin nuevos vídeos o WebGL en la pantalla principal;
  se respeta prefers-reduced-motion.
- La recomendación duplicada de la pantalla antigua se oculta en el inicio,
  sin alterar otras pantallas o acceso a las herramientas.

## Diseño inclusivo y comercialización responsable
Los modos son preferencias de presentación, NO certificación de
adecuación sanitaria o legal a todas las edades. Antes de ofrecer el producto
a menores: consentimiento y cuentas tuteladas cuando corresponda, revisión
de entrenamiento por desarrollo y supervisión, protección reforzada de datos,
cumplimiento de edad mínima de servicios externos y eliminación de métricas
compulsivas. Sin publicación orientada a niños antes de esa revisión.
Las recompensas no pueden comprarse y descansar no supone penalización.

## QA y lanzamiento
- Pruebas automáticas: 62 suites PASS en esta rama.
- QA de modo, XP y accesos en 1440/1024/390/320 px: 0 errores JS y 0 overflow.
- Renderización de la pantalla real, con cambio de modo persistido en el
  perfil, en 1440 y 390 px: PASS.
- APK 1.0.14-beta a compilar con JDK 21; instalación y Google OAuth en móvil
  real siguen sujetos a prueba.
- No reemplazar la versión pública Vercel con esta rama sin conciliar el
  código del despliegue CLI y completar pruebas de autenticación.
