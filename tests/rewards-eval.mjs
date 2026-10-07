// rewards-eval.mjs — evaluación ejecutable (node tests/rewards-eval.mjs)
// Economía ÚNICA y ética: sin recompensa por fatiga extrema, previsto = recibido.
import {
  setReward, healthMapReward, prReward, workoutCompleteReward, previewWorkoutXP, RULES,
} from '../js/rewards.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🎁 REWARDS · EVAL DE ECONOMÍA ÉTICA (fuente única)\n');

const r1 = setReward({ reps: 10, formScore: 95, exercise: 'squat', fatiguePct: 10 });
assert(r1.xp === 8 + 40 + 6, '10 reps + técnica 95 = 54 XP', `fue ${r1.xp}`);
const r2 = setReward({ reps: 10, formScore: 60, exercise: 'squat', fatiguePct: 10 });
assert(r2.xp === 48, 'mala técnica NO se premia (48 XP)', `fue ${r2.xp}`);
const r3 = setReward({ reps: 6, formScore: 80, exercise: 'press', fatiguePct: 45 });
assert(r3.xp === 8 + 24 + 3, 'la fatiga alta NO da bonus (35 XP)', `fue ${r3.xp}`);
assert(setReward({ reps: 5, formScore: null, exercise: 'pullup' }).xp === 28, 'sin score = solo trabajo');
assert(setReward({ reps: 8, exercise: 'mobility' }).skill === 'mobility', 'movilidad → skill mobility');
assert(r1.text.includes('95/100'), 'el texto explica la técnica');

// ejercicios por tiempo: 45 s no son "45 repeticiones"
const rt = setReward({ seconds: 45, exercise: 'plank' });
assert(rt.xp === 8 + 18, 'plancha 45 s → 26 XP (tiempo, no reps)', `fue ${rt.xp}`);
assert(rt.text.includes('45 s'), 'el texto dice segundos');

// PR y finalización
const pr = prReward();
assert(pr.xp === 350 && pr.points === 60, 'PR = 350 XP + 60 puntos (lo anunciado)', `fue ${pr.xp}/${pr.points}`);
const wc = workoutCompleteReward({ minutes: 55, loggedSets: 18, plannedSets: 18 });
assert(wc.xp === 120 + 220 && wc.points === 180 + 220, 'bono de cierre 340 XP / 400 ◆', `fue ${wc.xp}/${wc.points}`);
assert(wc.fitcoins === 20, 'sesión completa = 20 FitCoins, una vez por cierre');
const wp = workoutCompleteReward({ minutes: 30, loggedSets: 5, plannedSets: 12 });
assert(wp.text.includes('antes de tiempo'), 'el cierre parcial se explica');
assert(wp.fitcoins === 20, 'la función de preview conserva el bono; el estado bloquea cierre parcial antes de premiarlo');

// previsto = recibido (misma fórmula, sin cifras inventadas)
const w = {
  exercises: [
    { ex: 'squat', sets: 4, reps: 8, kg: 60, rir: 2 },
    { ex: 'plank', sets: 3, reps: 45, kg: 0, rir: 1, timed: true },
  ],
};
const prev = previewWorkoutXP(w);
let manual = 0;
for (let i = 0; i < 4; i++) manual += setReward({ reps: 8, exercise: 'squat' }).xp;
for (let i = 0; i < 3; i++) manual += setReward({ seconds: 45, exercise: 'plank' }).xp;
assert(prev.xp === manual, 'el preview del catálogo = suma real de series', `${prev.xp} vs ${manual}`);

const hm = healthMapReward({ priorities: ['a', 'b', 'c'], redFlags: [] });
assert(hm.xp >= 40 && hm.xp <= 60, 'Mapa de Salud 40-60 XP', `fue ${hm.xp}`);
assert(healthMapReward({ priorities: new Array(10) }).xp === 60, 'bonificación por capas limitada a +20');
assert(hm.skill === 'discipline', 'Mapa de Salud → disciplina');
assert(RULES.set.tech.high === 90, 'reglas expuestas y auditables');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
