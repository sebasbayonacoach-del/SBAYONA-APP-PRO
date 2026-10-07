# Sprint 05 · Nutrition Calendar

Fecha: 2026-10-07

## Objetivo

Convertir Nutrición en un sistema temporal y personal: qué hora es, cuándo fue la última comida, cuánto tiempo pasó, cómo se siente la persona, cuánto ha bebido y qué está previsto durante la semana.

La pantalla deja de estar dominada por recetas. Las recetas siguen disponibles, pero pasan detrás del contexto diario, el calendario y el registro real.

## Dominio

Nuevo `js/nutrition-calendar.js`:

- fecha y hora locales;
- semana lunes → domingo;
- última comida real;
- tiempo desde última comida;
- vasos de agua;
- sensación nutricional actual;
- objetivos nutricionales con fuente;
- preferencias declaradas;
- entradas de plan semanal;
- snapshot semanal;
- normalización y límites.

### Sensaciones

Valores cerrados:

- hungry;
- neutral;
- satisfied;
- heavy;
- low_energy.

No se convierten automáticamente en diagnóstico ni en una prescripción.

## Estado · schema 6

El estado incorpora:

- `today.nutritionFeeling`;
- `nutrition.goals`;
- `nutrition.preferences`;
- `nutrition.weeklyPlan`.

Las comidas guardan campos estructurados:

- nombre;
- cantidad;
- unidad;
- slot;
- hora real;
- kcal;
- proteína;
- carbohidratos;
- grasa;
- fibra;
- sensación;
- nota.

La hora, cantidad y slot ya no se incrustan dentro del nombre.

El rollover diario conserva un resumen nutricional suficiente para reconstruir el calendario semanal.

## Objetivos

Los valores base actuales se mantienen como referencia inicial:

- 2400 kcal;
- 150 g proteína;
- 240 g carbohidratos;
- 70 g grasa;
- 30 g fibra;
- 2500 ml agua.

Pero se marcan explícitamente como:

`configured: false` + `source: "base"`.

Por tanto, la UI no los presenta como prescripción personalizada.

Los objetivos editados guardan fuente:

- `user`;
- `coach`.

## Preferencias

El usuario puede declarar:

- alergias;
- intolerancias;
- alimentos que evita;
- alimentos preferidos;
- patrón alimentario;
- notas.

Estas preferencias son información declarada. BAYONA no infiere alergias ni intolerancias.

## Calendario semanal

Todos los planes pueden:

- ver la semana;
- ver comidas registradas;
- ver comidas previstas;
- registrar comida real;
- registrar agua;
- registrar sensación.

PERFORMANCE/ELITE pueden editar:

- objetivos;
- plan nutricional por día.

La puerta usa `nutrition.advanced` del Entitlement Engine.

## UI

Orden de la pantalla:

1. Comer hoy.
2. Hora actual.
3. Última comida.
4. Tiempo desde última comida.
5. Agua/vasos.
6. Sensación actual.
7. Semana.
8. Objetivos/macros.
9. Hidratación.
10. Preferencias declaradas.
11. Adherencia.
12. Registro real.
13. Comidas de hoy.
14. Recetas.

## Integridad

- No existe promesa de “nutrición genética”.
- No se inventa una última comida.
- No se inventan alergias/intolerancias.
- Una hora futura no puede registrarse como comida ya ingerida.
- Los objetivos base se identifican como referencia.
- La planificación avanzada respeta membresía.
- Los datos se mantienen estructurados para permitir aprendizaje futuro del Coach/IA.
- Día/Noche usan Brand System BAYONA.

## PWA

- `js/nutrition-calendar.js` precacheado.
- shell v37.

## Validación

Nuevas suites:

- `tests/nutrition-calendar-eval.mjs`
- `tests/nutrition-state-eval.mjs`
- `tests/nutrition-ui-eval.mjs`

Suite total esperada: **70 suites**.

Merge únicamente con `bateria` y `ci` verdes.
