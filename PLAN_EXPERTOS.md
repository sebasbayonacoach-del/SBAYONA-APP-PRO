# PLAN MAESTRO DE EXPERTOS — BAYONA · sprint «PRODUCTO REAL»

> Creado y ejecutado por el equipo técnico en **loop**: cada vuelta es
> ANALIZAR → DECIDIR → IMPLEMENTAR → TESTEAR → CORREGIR → VERIFICAR → COMMIT.
> Priorización (en orden): identidad BAYONA · percepción premium · loop
> principal · claridad de producto · viabilidad futura · coste/beneficio.

## Estado del plan

| # | Iteración | Estado | Evidencia |
|---|---|---|---|
| 1 | **Mediciones «ANTES → AHORA → HACIA DÓNDE»** (ADN del Excel: peso, perímetros, evolución) | ✅ | `js/medidas.js` + `tests/medidas-eval.mjs` (25) |
| 2 | **Loop Coach OS ⇄ cliente** (asignar → ejecutar → observar · Núcleo 5) | ✅ | `tests/asignaciones-eval.mjs` (17) |
| 3 | **Integración HOY + QA global** (medición como tarea del día, barrido, docs) | ✅ | `tests/hoy-eval.mjs` (34) + batería |
| 4 | **Progreso emocional unificado** (todo en una línea ANTES→AHORA) | ✅ | `js/timeline.js` + `tests/timeline-eval.mjs` (11) |
| 5 | **Coach OS · laboratorio escribible** (reescribir la semana; el cliente la ejecuta) | ✅ | `tests/plan-eval.mjs` (8) |
| 6 | **Nutrición · recetas y adherencia al plan** | ✅ | `js/nutricion.js` + `tests/nutricion-eval.mjs` (18) |
| 7 | **Performance**: GEMELO-1 diferido al idle | ✅ | `index.html` (MediaPipe ya era lazy en `pose.js`) |
| 8 | **Backend**: espejo idempotente ampliado (medidas + asignaciones) | ✅ | `js/sync/mirror.js` + migración `0002` + `tests/mirror-eval.mjs` (13) |

## Reglas de calidad del plan
- Toda feature nueva entra CON tests (mínimo: dominio puro testeado en Node).
- Nada de mocks sin marcar: demo → `demo: true` + etiqueta visible.
- Sin datos → «Todavía no lo has registrado». Proyecciones declaran supuesto y ritmo topeado.
- Economía en fuente única (`js/rewards.js`): sin doble XP, con topes sanos.
- UI visible 100 % es-ES. Commits en castellano.

## Siguientes vueltas del loop (prioridad)
> Las 5 vueltas iniciales están EJECUTADAS (loop cerrado en 20 suites · 0 fallos).
1. **Progreso emocional**: narrativa ANTES→AHORA con fotos + mediciones unificadas en una sola línea de tiempo.
2. **Coach OS · laboratorio escribible**: editar macrociclo por cliente (hoy consulta + asignación puntual).
3. **Nutrición · recetas y adherencia al plan** (plan + registro + cumplimiento).
4. **Performance**: diferir MediaPipe/Three.js hasta que se usen (§33 del Prompt Supremo).
5. **Backend**: espejo Supabase idempotente (asignaciones + mediciones + sesiones).
