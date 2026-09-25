# EVAL-10 · loop de mejora de la app (fijo, no se cambia sin motivo)

10 tareas que miden si la app (y quien la toca) mejora de verdad.
Se corre con `node tests/eval-10.mjs`. Cada corrida añade una línea a
`tests/eval-history.log` (fecha + X/10 + commit). La meta: 10/10 siempre;
si baja, el cambio que lo bajó se revierte antes de seguir.

| # | Suite | Qué prueba |
|---|---|---|
| 1 | state-eval | estado, XP y rachas no se corrompen |
| 2 | avatar3d-eval | config demo, export válido, magia GLB, 18 acciones |
| 3 | avatar3d-consent-eval | permiso Selfie 3D: denegado→concedido→revocado |
| 4 | mirror-avatar3d-eval | espejo nube: 1 fila, cero fotos |
| 5 | consents-cache-eval | migrar no pierde consentimientos |
| 6 | coach-eval | el coach decide con datos, no inventa |
| 7 | plan-eval | el plan respeta disponibilidad y material |
| 8 | rewards-eval | XP sin dobles conteos |
| 9 | mirror-eval | espejo principal intacto |
| 10 | pipeline-real-eval | flujo real de punta a punta |
