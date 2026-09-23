// hoy-eval.mjs — regresión del planificador del día «HOY» (node tests/hoy-eval.mjs)
// Cubre: jerarquía de prioridades, día real de descanso (sin sesión falsa),
// XP anunciado = fuente única (rewards), misiones deterministas por fecha,
// checks de misión e idempotencia del reclamo (sin doble XP).
import { S } from '../js/state.js';
import {
  planDelDia, misionesDelDia, checkInHecho, PRIORIDADES,
  AGUA_BASE, PASOS_META,
} from '../js/hoy.js';
import { previewWorkoutXP, workoutCompleteReward, missionReward, RULES } from '../js/rewards.js';
import { MISSIONS } from '../js/data.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🗓️  HOY · EVAL DEL PLANIFICADOR DIARIO\n');

// doble de estado inyectable (puro: sin depender del día real del reloj)
const fakeS = (over = {}, { workout = null, session = null } = {}) => ({
  data: {
    today: {
      date: '2026-09-24', water: 0, meals: [], steps: 0, trained: false, mobility: false,
      mind: 0, sleep: null, soreness: null, energy: null, stress: null,
      missionKeys: [], trainingSets: 0, ...over,
    },
  },
  todayWorkout: () => workout,
  getActiveSession: () => session,
});
const W = { id: 'op_upper', name: 'OPERACIÓN: POTENCIA SUPERIOR', min: 55, exercises: [{ ex: 'bench', sets: 4, reps: 8, kg: 60 }] };
const find = (plan, id) => plan.grupos.flatMap((g) => g.items).find((i) => i.id === id)
  || plan.grupos.find((g) => g.pri === 'COMPLETADO')?.items.find((i) => i.id === id);

// ---------- jerarquía ----------
{
  const p = planDelDia(fakeS({}, { workout: W }), { dateKey: '2026-09-24' });
  const orden = p.grupos.map((g) => g.pri);
  const idx = orden.map((x) => PRIORIDADES.indexOf(x));
  assert(idx.every((v, i, a) => i === 0 || a[i - 1] < v), 'grupos en orden de jerarquía', JSON.stringify(orden));
  assert(p.siguiente?.id === 'sesion', 'siguiente acción = entrenamiento del día', JSON.stringify(p.siguiente));
  assert(p.siguiente.pri === 'HOY', 'la sesión del día vive en prioridad HOY');
  assert(p.hechos === 0 && p.total >= 4, 'contadores de progreso coherentes', `${p.hechos}/${p.total}`);
}

// ---------- sesión en curso = CRÍTICO ----------
{
  const act = { name: 'OPERACIÓN: POTENCIA SUPERIOR', status: 'en curso', logged: 3, plannedSets: 14 };
  const p = planDelDia(fakeS({}, { workout: W, session: act }), { dateKey: '2026-09-24' });
  assert(p.siguiente?.pri === 'CRÍTICO', 'sesión sin cerrar → CRÍTICO (lo primero)');
  assert(p.siguiente?.cta === 'CONTINUAR SESIÓN', 'cta = reanudar sesión');
}

// ---------- XP anunciado = fuente única (sin cifras inventadas) ----------
{
  const p = planDelDia(fakeS({}, { workout: W }), { dateKey: '2026-09-24' });
  const esperado = previewWorkoutXP(W).xp + workoutCompleteReward({ minutes: W.min }).xp;
  assert(p.siguiente.sub.includes(String(esperado).replace(/\B(?=(\d{3})+(?!\d))/g, '.')),
    'XP anunciado = preview series + bono cierre (rewards)', `${p.siguiente.sub} ≠ ${esperado}`);
}

// ---------- día de descanso real: SIN sesión falsa ----------
{
  const p = planDelDia(fakeS({}, { workout: null }), { dateKey: '2026-09-24' });
  assert(!find(p, 'sesion'), 'sin sesión inventada en día de descanso');
  assert(find(p, 'recuperacion')?.pri === 'RECOMENDADO', 'se propone recuperación honesta');
}

// ---------- transiciones a COMPLETADO ----------
{
  const t = { trained: true, trainingSets: 9, water: AGUA_BASE, mobility: true, sleep: 7, energy: 6, stress: 3, soreness: 2 };
  const p = planDelDia(fakeS(t, { workout: W }), { dateKey: '2026-09-24' });
  const hechos = p.grupos.find((g) => g.pri === 'COMPLETADO');
  assert(hechos && hechos.items.length >= 4, 'lo hecho vive en COMPLETADO', JSON.stringify(hechos?.items.map((i) => i.id)));
  assert(!p.grupos.some((g) => g.pri === 'HOY'), 'nada pendiente en HOY cuando el núcleo está completo');
}

// ---------- hidratación: umbrales exactos ----------
{
  const p1 = planDelDia(fakeS({ water: AGUA_BASE - 1 }), { dateKey: '2026-09-24' });
  const p2 = planDelDia(fakeS({ water: AGUA_BASE }), { dateKey: '2026-09-24' });
  assert(find(p1, 'hidratacion').done === false, `${AGUA_BASE - 1} ml → pendiente`);
  assert(find(p2, 'hidratacion').done === true, `${AGUA_BASE} ml → cumplida`);
}

// ---------- check-in: 3 de 4 registros ----------
{
  assert(checkInHecho({ sleep: 7, energy: 5, stress: null, soreness: null }) === false, '2 registros → check-in NO suficiente');
  assert(checkInHecho({ sleep: 7, energy: 5, stress: 4, soreness: null }) === true, '3 registros → check-in suficiente');
  assert(checkInHecho({}) === false, 'sin registros → sin check-in (no se inventa)');
}

// ---------- misiones: deterministas y sin repetición ----------
{
  const a = misionesDelDia('2026-09-24');
  const b = misionesDelDia('2026-09-24');
  assert(JSON.stringify(a) === JSON.stringify(b), 'misma fecha → mismas misiones (estable)');
  assert(a[0].id !== a[1].id, 'nunca dos veces la misma misión en un día');
  const combos = new Set();
  for (let d = 1; d <= 60; d++) combos.add(misionesDelDia(`2026-10-${String(d).padStart(2, '0')}`).map((m) => m.id).sort().join('+'));
  assert(combos.size > 1, 'la selección varía entre fechas', `combinaciones: ${combos.size}`);
  assert(a.every((m) => MISSIONS.some((x) => x.id === m.id)), 'misiones siempre del catálogo');
}

// ---------- checks de misión (semántica real) ----------
{
  // busca una fecha en la que toque la misión de pasos y verifica el umbral
  let dia = null;
  for (let d = 1; d <= 60 && !dia; d++) {
    const k = `2026-11-${String(d).padStart(2, '0')}`;
    if (misionesDelDia(k).some((m) => m.id === 'm_pasos')) dia = k;
  }
  assert(dia != null, 'la misión de pasos aparece en algún día del calendario');
  const pBaja = planDelDia(fakeS({ steps: PASOS_META - 1 }), { dateKey: dia });
  const pAlta = planDelDia(fakeS({ steps: PASOS_META }), { dateKey: dia });
  assert(find(pBaja, 'm_pasos').done === false, `${PASOS_META - 1} pasos → misión pendiente`);
  assert(find(pAlta, 'm_pasos').done === true, `${PASOS_META} pasos → misión cumplida`);

  const p = planDelDia(fakeS({ meals: [{}, {}, {}] }), { dateKey: '2026-09-24' });
  for (const m of p.misiones) {
    const esp = m.id === 'm_comida';
    assert(m.done === esp, `check de ${m.id} con 3 comidas → ${esp}`, JSON.stringify(m));
  }
}

// ---------- medición: aparece cuando toca y se cierra al medir ----------
{
  const p = planDelDia(fakeS({}, { workout: W }), { dateKey: '2026-09-24' });
  const it = find(p, 'medicion');
  assert(it && it.done === false && it.pri === 'OPCIONAL', 'sin mediciones → toca medir (OPCIONAL)', JSON.stringify(it));
  const fx = fakeS({}, { workout: W });
  fx.data.medidas = [{ fecha: '2026-09-24', pesoKg: 70 }];
  const p2 = planDelDia(fx, { dateKey: '2026-09-24' });
  const it2 = find(p2, 'medicion');
  assert(it2 && it2.done === true, 'medida hoy → COMPLETADO');
}

// ---------- reclamo idempotente: sin doble XP ----------
{
  S.init(); S.reset(true);
  const xp0 = S.data.xp;
  const r1 = S.claimMission('m_pasos');
  const r2 = S.claimMission('m_pasos');
  assert(r1 && r1.xp === RULES.mission.m_pasos, 'primer reclamo premia con el bono del catálogo', JSON.stringify(r1));
  assert(r2 === null, 'segundo reclamo del mismo día → null');
  assert(S.data.xp === xp0 + r1.xp, 'XP concedido UNA sola vez');
  assert(S.data.today.missionKeys.includes('m_pasos'), 'la misión queda registrada en el día');
  // y al cambiar de día el bono vuelve a estar disponible (rollDay)
  S.data.today.date = '2000-01-01';
  S.rollDay();
  assert(!S.data.today.missionKeys.includes('m_pasos'), 'nuevo día → misiones libres de nuevo');
}

// ---------- bono de misión: fuente única ----------
{
  assert(missionReward('m_mente').xp === RULES.mission.m_mente, 'bono sale de RULES (fuente única)');
  assert(missionReward('desconocida').xp === RULES.mission.default, 'misión desconocida → bono por defecto');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ HOY: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
