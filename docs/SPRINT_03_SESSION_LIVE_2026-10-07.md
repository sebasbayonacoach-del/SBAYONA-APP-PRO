# Sprint 03 · Sesión Viva

Fecha: 2026-10-07

## Objetivo

Convertir Entrenamiento en una sesión viva, verificable y segura: preparación → trabajo principal → cierre, con progreso real, feedback por serie, vídeo local opcional y recompensa final únicamente cuando el trabajo previsto se completa.

## Implementado

- Dominio `js/session-live.js`:
  - fases inicial / central / final;
  - progreso real por series;
  - checkpoint de ejercicio;
  - feedback subjetivo normalizado;
  - deltas de nivel, FitCoins y puntos.
- Feedback por serie:
  - fluida;
  - sólida;
  - me costó;
  - muy dura;
  - dolor/molestia;
  - esfuerzo percibido 1–5;
  - nota opcional.
- Las notas se guardan junto al set real en `today.setLog`.
- Vídeo opcional por ejercicio:
  - consentimiento independiente `recordings`;
  - máximo 60 s;
  - máximo 12 MB;
  - IndexedDB local;
  - el último vídeo del ejercicio reemplaza al anterior;
  - no existe código de subida a red en el vault.
- El último vídeo personal reaparece en la ficha del ejercicio la próxima vez.
- La última serie ya no cierra automáticamente:
  - aparece FASE FINAL;
  - revisión de series / progreso / XP;
  - nota de cierre;
  - botón explícito de cierre.
- Cierre parcial:
  - conserva series y XP de series;
  - NO marca `trained`;
  - NO concede bono de finalización;
  - NO desbloquea celebración final.
- `completeWorkout()` está blindado en el dominio:
  - si `loggedSets < plannedSets`, deriva a `closePartialWorkout()`.
- Cierre completo:
  - cara del perfil;
  - nivel;
  - progreso XP;
  - FitCoins reales;
  - puntos reales;
  - XP de series;
  - XP de cierre;
  - celebración del personaje.
- PWA precache actualizado.

## Integridad

- No se premia dolor, sobreentrenamiento ni exceder lo planificado.
- Vídeo y análisis de movimiento tienen consentimientos distintos.
- Los blobs de vídeo no entran a localStorage.
- La UI no puede convertir una sesión parcial en completada.
- Las cifras del resumen se calculan por diferencia del estado real antes/después.

## Validación

Nuevas suites:
- `tests/session-live-eval.mjs`
- `tests/media-vault-eval.mjs`
- `tests/session-live-ui-eval.mjs`

Suite total esperada: **70 suites**.

Merge permitido únicamente con `bateria` y `ci` verdes.
