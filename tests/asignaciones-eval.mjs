// asignaciones-eval.mjs — regresión del loop Coach OS → app del cliente
// (node tests/asignaciones-eval.mjs) — «NÚCLEO 5» del PROMPT MAESTRO SUPREMO.
// Cubre: validación, idempotencia (sin duplicar), listado por cliente,
// prioridad sobre el plan automático en HOY y cierre del loop al completar.
import { S } from '../js/state.js';
import { validaAsignacion } from '../js/coachos.js';
import { planDelDia } from '../js/hoy.js';
import { WORKOUTS } from '../js/data.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🔗 ASIGNACIONES · EVAL DEL LOOP COACH ⇄ CLIENTE\n');

const fakeS = (asignaciones = [], { workout = null, over = {} } = {}) => ({
  data: {
    today: {
      date: '2026-09-24', water: 0, meals: [], steps: 0, trained: false, mobility: false,
      mind: 0, sleep: null, soreness: null, energy: null, stress: null,
      missionKeys: [], trainingSets: 0, activePauses: 0, ...over,
    },
    asignaciones,
  },
  todayWorkout: () => workout,
  getActiveSession: () => null,
});

// ---------- validación con reglas claras ----------
{
  assert(validaAsignacion({ clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-24' }).ok, 'asignación válida pasa');
  assert(!validaAsignacion({ clienteId: '', workoutId: 'op_upper', dia: '2026-09-24' }).ok, 'sin cliente → rechazada');
  assert(!validaAsignacion({ clienteId: 'local', workoutId: 'inventado', dia: '2026-09-24' }).ok, 'entrenamiento inexistente → rechazada');
  assert(!validaAsignacion({ clienteId: 'local', workoutId: 'op_upper', dia: 'mañana' }).ok, 'día con formato erróneo → rechazada');
  assert(!validaAsignacion({ clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-24', nota: 'x'.repeat(201) }).ok, 'nota > 200 → rechazada');
}

// ---------- persistencia idempotente ----------
{
  S.init(); S.reset(true);
  S.addAsignacion({ clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-24', nota: 'énfasis en técnica' });
  S.addAsignacion({ clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-24', nota: 'énfasis en carga' });
  assert(S.asignacionesDe('local').length === 1, 'mismo cliente/día/entrenamiento → no duplica');
  assert(S.asignacionesDe('local')[0].nota === 'énfasis en carga', 'la nota se actualiza con la última');
  S.addAsignacion({ clienteId: 'local', workoutId: 'op_lower', dia: '2026-09-25', nota: '' });
  assert(S.asignacionesDe('local').length === 2, 'días/entrenamientos distintos acumulan');
  assert(S.asignacionesDe('demo_paola').length === 0, 'cada cliente ve solo lo suyo');
}

// ---------- prioridad sobre el plan automático en HOY ----------
{
  const asign = [{ clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-24', estado: 'pendiente', nota: 'carga progresiva' }];
  const p = planDelDia(fakeS(asign, { workout: WORKOUTS.op_lower }), { dateKey: '2026-09-24' });
  assert(p.siguiente.asignada === true, 'la asignación del entrenador gana al plan automático');
  assert(p.siguiente.workoutId === 'op_upper', 'se ejecuta lo ASIGNADO, no lo automático', p.siguiente.workoutId);
  assert(/carga progresiva/.test(p.siguiente.sub), 'la nota del entrenador llega al cliente');
  // sin asignación → plan automático normal
  const p2 = planDelDia(fakeS([], { workout: WORKOUTS.op_lower }), { dateKey: '2026-09-24' });
  assert(!p2.siguiente.asignada && p2.siguiente.workoutId === undefined, 'sin asignación: plan automático sin adornos');
  // asignación de otro día NO interfiere
  const otro = [{ clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-30', estado: 'pendiente', nota: '' }];
  const p3 = planDelDia(fakeS(otro, { workout: WORKOUTS.op_lower }), { dateKey: '2026-09-24' });
  assert(!p3.siguiente.asignada, 'una asignación futura no pisa el día de hoy');
}

// ---------- cierre del loop: entrenar lo asignado lo completa ----------
{
  S.init(); S.reset(true);
  S.addAsignacion({ clienteId: 'local', workoutId: 'op_upper', dia: S.data.today.date, nota: '' });
  S.completeWorkout('op_upper', { loggedSets: 12, plannedSets: 14 });
  const lista = S.asignacionesDe('local');
  assert(lista[0].estado === 'completada', 'al cerrar la sesión, la asignación queda COMPLETADA', JSON.stringify(lista[0]));
  assert(lista[0].cerradaEn === S.data.today.date, 'se registra cuándo se cerró');
  const c2 = S.cerrarAsignacion('op_upper');
  assert(c2 === null, 'cerrar dos veces → sin cambios (idempotente)');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ ASIGNACIONES: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
