# Sprint 10 · Planning Studio

Fecha: 2026-10-07

## Objetivo

Convertir la planificación del Coach en una jerarquía explícita y auditable:

- macrociclo;
- mesociclo;
- microciclo;
- sesión;
- tests;
- cargas;
- plantillas por deporte;
- buscador avanzado de ejercicios.

## Dominio

`js/coach-lab.js` contiene:

- `PROGRAM_LEVELS`;
- `PROGRAM_TEMPLATES`;
- `SPORT_TEMPLATES`;
- `PROGRAM_TEST_TYPES`;
- `searchExercises()`;
- `exerciseFacets()`;
- `recommendationGate()`;
- `buildProgramDraft()`;
- `validateProgram()`;
- `setMicrocycleLoad()`;
- `addProgramTest()`;
- `recordProgramTestResult()`;
- `addSessionToWeek()`;
- `programCalendar()`;
- `programStats()`.

## Catálogo real

Planning Studio usa `trainingym/catalog.json`.

Auditoría actual:

- 3.141 ejercicios;
- nombre;
- tipo;
- grupo muscular;
- nivel de esfuerzo;
- perfil de resistencia;
- etiquetas;
- estado de vídeo;
- vídeo local/CDN cuando existe.

La búsqueda soporta:

- texto multi-token;
- músculo;
- tipo;
- esfuerzo;
- resistencia;
- etiquetas;
- disponibilidad de vídeo.

## Plantillas deportivas

Incluye plantillas explícitas para:

- general;
- fútbol;
- running;
- parkour;
- ciclismo;
- natación;
- deportes de combate;
- deportes de raqueta.

Estas plantillas definen estructura y focos, pero no inventan cargas ni resultados.

## Seguridad

`recommendationGate()` diferencia:

- standard;
- transition_limited;
- development_aware;
- manual_review.

Dolor actual, condición médica declarada, post-lesión, post-cirugía y embarazo/posparto requieren revisión manual.

Planning Studio no diagnostica ni sustituye criterio clínico.

## Cargas

Cada microciclo nace con:

- volumen: null;
- intensidad: null;
- RPE: null.

Solo aparecen valores cuando el Coach los registra.

## Tests

Los tests nacen como:

- `planned`;
- resultado `null`.

Solo pasan a `completed` con un resultado explícito.

## Estado · schema 10

Nuevo:

- `coachPrograms`;
- `activeCoachProgramId`.

Operaciones:

- `saveCoachProgram()`;
- `coachProgram()`;
- `setActiveCoachProgram()`;
- `deleteCoachProgram()`.

Solo programas válidos sobreviven a migración.

## UI

Nueva `js/ui/planning-studio.js`.

Incluye:

- lista de programas;
- creación por cliente CRM;
- plantilla deportiva;
- objetivo general;
- contexto declarado;
- calendario Macro → Meso → Micro;
- carga semanal;
- tests;
- resultados;
- constructor de sesión;
- buscador real de ejercicios;
- filtro por vídeo;
- biblioteca completa.

## PWA

- `js/coach-lab.js` precacheado.
- `js/ui/planning-studio.js` precacheado.
- shell v42.

## Validación

Nuevas suites:

- `tests/coach-lab-eval.mjs`;
- `tests/planning-studio-state-eval.mjs`;
- `tests/planning-studio-ui-eval.mjs`;
- `tests/planning-catalog-eval.mjs`.

Suite total: **75 suites**.

Validación local:

- 70/75 suites verdes;
- golden biomecánica verde;
- catálogo real verificado;
- búsqueda multi-token verificada;
- cargas ausentes no inventadas;
- resultados de test no inventados.

Merge únicamente con `bateria` y `ci` verdes.
