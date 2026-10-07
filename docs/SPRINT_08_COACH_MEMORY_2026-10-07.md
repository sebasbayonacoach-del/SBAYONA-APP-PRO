# Sprint 08 · Coach Memory + IA adaptativa explicable

Fecha: 2026-10-07

## Objetivo

Hacer que el Coach pueda utilizar la historia real del usuario sin convertir el sistema en una caja negra.

La memoria diferencia de forma explícita:

- REGISTRADO: dato aportado o medido en la app.
- DERIVADO: inferencia calculada a partir de registros.
- COACH: propuesta o decisión anterior del Coach.

## Dominio

Nuevo `js/coach/memory.js`.

Tipos de memoria:
- observation;
- preference;
- decision;
- proposal;
- outcome;
- note.

Categorías:
- training;
- nutrition;
- recovery;
- progress;
- health;
- general.

Estados:
- active;
- pending;
- accepted;
- rejected;
- applied.

La memoria explícita se limita a 250 eventos.

## Datos derivados

El Coach puede construir hechos derivados como:

- sueño medio reciente;
- energía media reciente.

Pero esas líneas se etiquetan como `DERIVADO`.

Ausencias `null` no entran en las medias como cero.

## Datos registrados recuperados desde el estado real

La memoria contextual puede recuperar, sin duplicar la fuente:

- último feedback de serie;
- nota de recuperación;
- contexto de última comida;
- PR reciente.

Estas líneas se etiquetan como `REGISTRADO`.

## Prompt

`buildCoachContext()` incorpora memoria relevante etiquetada.

El prompt añade reglas no negociables:

- un dato derivado no puede presentarse como medición directa;
- una decisión previa del Coach no es un hecho del usuario;
- el Coach no puede afirmar que modificó un plan hasta confirmación explícita;
- las tools son propuestas visibles, no cambios silenciosos.

## Propuestas de herramienta

Tools accionables generan una memoria `proposal / pending`.

La UI muestra:

- propuesta pendiente;
- evidencia;
- origen de la evidencia;
- acción explícita;
- rechazo cuando corresponde.

Ejemplos:

### Asignar rutina
Solo pasa a `applied` después de que el usuario pulse asignar y la asignación se guarde.

### Registrar síntoma
Solo pasa a `applied` después de pulsar guardar.

### Nutrición
Abrir la cocina marca la propuesta como `accepted`, no como aplicada.

### Ajustar sesión
Se muestra:
- revisar propuesta;
- descartar.

Abrir la sesión no afirma que el plan haya sido modificado.

## Transparencia UI

El panel Coach muestra “Lo que tengo en cuenta” con badges:

- REGISTRADO;
- DERIVADO;
- COACH.

Las tarjetas de herramientas muestran “Por qué te lo propongo”.

## Estado · schema 8

Nuevo:
- `coachMemory.events`;
- `rememberCoachEvent()`;
- `updateCoachMemoryStatus()`.

Migración conservadora para saves anteriores.

## Seguridad

Se conservan todas las reglas previas:

- guion de riesgo antes de red;
- allowlist de herramientas;
- modelo local de fallback;
- derivación clínica;
- texto del modelo siempre por `textContent`;
- sin ejecución de herramienta fuera de allowlist;
- sin cambios silenciosos.

## PWA

- `js/coach/memory.js` precacheado.
- shell v40.

## Validación

Nuevas suites:
- `tests/coach-memory-eval.mjs`
- `tests/coach-memory-state-eval.mjs`
- `tests/coach-memory-ui-eval.mjs`

Suite total esperada: **62 suites**.

Merge únicamente con `bateria` y `ci` verdes.
