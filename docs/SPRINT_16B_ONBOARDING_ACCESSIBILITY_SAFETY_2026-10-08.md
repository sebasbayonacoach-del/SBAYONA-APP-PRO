# BAYONA App · Sprint 16B — Onboarding responsive, datos propios y seguridad

Fecha: 2026-10-08. Base: `bayona-one/visual-integration-v6` tras PR #32 (`7264f77`). Rama aislada: `bayona-one/sprint16b-onboarding-personalization-20261008`.

## Inspección previa en navegador

Se recorrieron las nueve etapas en 320, 390, 768 y 1440 px, ambos temas: **72 combinaciones**, cero errores JavaScript y cero desbordamientos horizontales. Hallazgos:

1. El onboarding ignoraba el **modo día** y siempre mostraba una interfaz negra.
2. `#ob-box` declaraba solo tres filas para cuatro elementos reales: la fila de crecimiento se asignaba por error a la barra de progreso y creaba un hueco enorme antes de las preguntas.
3. Etiquetas de 7–9 px y botones de salud de 30 px; dificultaban lectura y uso táctil.
4. La selección de objetivos, lugares, franjas, días, Coach y planes reconstruía toda la pantalla, devolviendo el foco al botón de avanzar y perdiendo posición de scroll.
5. El cribado PAR-Q+ inicializaba las siete respuestas con **NO** y podía declarar `cleared` sin que el usuario respondiese. Se corrigió para no convertir silencio en evidencia de salud.

## Cambios de interfaz y datos

- Maquetación corregida a cuatro filas `auto auto minmax(0,1fr) auto`; la zona central es la única que desplaza.
- Nueva presentación clara marfil + naranja BAYONA, respetando el contraste correcto frente a la capa legada `css/pro.css`; modo noche conservado.
- Tipografía secundaria de al menos 11px en los componentes principales, etiquetas de seguridad de 12px, botones de cribado de 44px, demás objetivos táctiles de al menos 44px.
- `refreshChoice()`: restaura foco de teclado y posición scroll después de una selección múltiple. Los textos escritos se conservan al alternar objetivos y entornos.
- Los campos escritos pueden vaciarse sin que un fallback vuelva a introducir el valor anterior; los objetivos y entornos personalizados se conservan al terminar en `profile.customGoals/customPlaces`.

## Cribado no asumido

- `st.safety` usa `null` para «no contestado»; los botones `NO/SÍ` aparecen inicialmente sin selección.
- El avance del paso 6 se muestra solo al responder explícitamente los siete ítems.
- `safetyResult()` devuelve `pending` cuando no hay respuesta completa; nunca presenta «sin alertas» por omisión. Las banderas rojas/ámbar presentes siguen comunicándose incluso si quedan respuestas.
- Se mantiene `scoreParQ` como motor clínico de cribado, sin modificarlo ni crear diagnósticos. No se otorga acceso premium ni se solicitan permisos del sistema durante el onboarding.
- Una vez respondidas las siete preguntas, las respuestas y el resultado se guardan en el perfil por la ruta existente.

## Evidencia

- Auditoría Playwright: **72 combinaciones** (9 pantallas × 4 anchos × 2 temas), cero errores y cero overflow.
- `npm run check:production`: **86/86 suites**, lint/seguridad y presupuesto PWA (2.07 MiB) correctos.
- `tests/e2e-production.mjs`: **122/122** comprobaciones, incluida conservación de objetivos propios, material escrito, selección con foco, cribado explícito y persistencia del perfil.
- `tests/onboarding-eval.mjs`: 41/41 aserciones.
- Nueva suite `tests/onboarding-ux-eval.mjs`: 14 verificaciones de transición de seguridad, contraste y presentación.
- `tests/i18n-eval.mjs`: 0 claves ausentes, 114 literales hardcodeados, sin regresión.
- PWA cache `v52` invalida CSS del onboarding que vive dentro de `js/onboarding.js`.
- El PR solo podrá fusionarse cuando las tres acciones GitHub `ci`, `bateria` y `e2e` estén en verde sobre el mismo commit.

## Protección del repositorio original

La carpeta `~/TRABAJO/02_DESARROLLO/SBAYONA-APP-PRO` conserva sus **40 modificaciones locales** intactas. No se usa stash destructivo, no se despliega en `main`, no se activa Stripe live ni cloud sin verificación.
