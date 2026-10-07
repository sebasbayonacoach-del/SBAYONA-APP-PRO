# Sprint 02 · Hub Personal

Fecha: 2026-10-07

## Objetivo

Convertir Inicio en el centro operativo personal de BAYONA sin inventar métricas ni mezclar la experiencia Coach con la experiencia personal.

## Implementado

- Modelo canónico `js/hub.js` para:
  - nivel, XP, FitCoins, puntos y racha;
  - sesión real y progreso de series;
  - Coach contextual;
  - journey del día;
  - próxima revisión de progreso;
  - focos espaciales del mundo 3D.
- FitCoins reutiliza `credits`; no se crea una economía paralela.
- La revisión de progreso es un checkpoint de producto, no un acto médico.
- Perfiles nuevos reciben una revisión a 28 días al terminar onboarding.
- Perfiles antiguos conservan `nextProgressReviewAt = null` hasta que el usuario la programe.
- Estado persistente actualizado a schema 5.
- Inicio muestra:
  - personaje/identidad;
  - nivel + XP;
  - FitCoins + racha;
  - revisión de progreso;
  - Coach contextual;
  - journey Contexto → Sesión → Cierre → Recompensa;
  - historial real;
  - navegación espacial Centro / Entreno / Comer / Recuperar / Progreso.
- Navegación espacial reutiliza el mundo 3D real: `home`, `gym`, `kitchen`, `recovery`.
- Modo Día/Noche cubierto también en los componentes del Hub.
- `js/hub.js` incluido en precache PWA.

## Reglas de integridad

- Sin `Math.random` ni métricas sintéticas.
- Readiness sigue siendo `null` cuando faltan datos.
- FitCoins = `credits`; puntos siguen siendo otra métrica.
- La próxima revisión solo existe si fue programada.
- El Hub consume un snapshot canónico; no calcula reglas de negocio dispersas dentro del HTML.

## Validación

Nuevas suites:
- `tests/hub-eval.mjs`
- `tests/hub-ui-eval.mjs`

Suite total esperada: **70 suites**.

El merge a la rama oficial solo debe hacerse si GitHub Actions deja `bateria` y `ci` en verde.
