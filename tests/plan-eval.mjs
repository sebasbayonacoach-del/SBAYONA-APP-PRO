// plan-eval.mjs — regresión del plan semanal escribible (Coach OS → cliente)
// (node tests/plan-eval.mjs)
import { S } from '../js/state.js';
import { MACRO, WORKOUTS } from '../js/data.js';
import { todaysSession } from '../js/engine.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🗓️ PLAN SEMANAL · EVAL DEL PLAN ESCRIBIBLE\n');

S.init(); S.reset(true);
const dow = (new Date().getDay() + 6) % 7;

// plan estándar por defecto (macrociclo)
{
  const estandar = MACRO.dayPlan[dow];
  const w = S.todayWorkout();
  assert((w ? w.id : null) === (estandar || null), 'sin personalizar: manda el macrociclo', `${w?.id} vs ${estandar}`);
}

// el entrenador reescribe el día de HOY
{
  const objetivo = Object.keys(WORKOUTS).find((id) => id !== MACRO.dayPlan[dow]) || 'mobility_flow';
  S.setPlanDia(dow, objetivo);
  assert(S.todayWorkout()?.id === objetivo, 'el plan del entrenador gana al estándar', S.todayWorkout()?.id);
  const sesion = todaysSession();
  assert(sesion && sesion.workout.id === objetivo, 'la sesión de hoy ejecuta lo asignado');
}

// descanso explícito: respetado (la disciplina también es parar)
{
  S.setPlanDia(dow, null);
  assert(S.todayWorkout() === null, 'descanso explícito del entrenador → sin sesión');
  assert(todaysSession() === null, 'ni siquiera una sesión autoajustada');
}

// valor inválido → vuelve al estándar (nunca un entrenamiento fantasma)
{
  S.setPlanDia(dow, 'inventado');
  assert(S.todayWorkout()?.id === (MACRO.dayPlan[dow] ? MACRO.dayPlan[dow] : undefined) || S.todayWorkout() === null,
    'workoutId inválido → plan estándar', String(S.todayWorkout()?.id));
}

// restaurar la firma del macrociclo
{
  S.restaurarPlanEstandar();
  assert(Object.keys(S.data.plan.custom).length === 0, 'restaurar limpia todos los días personalizados');
  const estandar = MACRO.dayPlan[dow];
  assert((S.todayWorkout()?.id ?? null) === (estandar || null), 'vuelve el plan estándar del macrociclo');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ PLAN: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
