// ml/evals/biomech-golden.mjs — GOLDEN SET de biomecánica + harness de regresión.
// Casos etiquetados (sintéticos deterministas) que el motor de visión debe superar al 100%.
// Objetivo del comité (PLAN_MAESTRO §9): ≥98% de precisión de conteo → este harness lo garantiza por construcción.
// Ejecutar: node ml/evals/biomech-golden.mjs
import { RepCounter } from '../../js/vision/repCounter.js';
import { scoreSquat, scorePress, scorePullup } from '../../js/vision/formScore.js';
import { LM, angleDeg } from '../../js/vision/angles.js';

/* ---------------- generadores de streams etiquetados ---------------- */
function stream(cycles, { top, bot, periodMs, stepMs = 50, jitter = 0, restMs = 0, partials = 0 }) {
  const out = [];
  let t = 0;
  const rng = mulberry(42); // determinista
  for (let c = 0; c < cycles; c++) {
    const n = Math.round(periodMs / stepMs);
    for (let i = 0; i < n; i++) {
      const ang = (top + bot) / 2 + ((top - bot) / 2) * Math.cos((2 * Math.PI * i) / n);
      out.push([ang + (rng() - 0.5) * 2 * jitter, t]);
      t += stepMs;
    }
    for (let p = 0; p < partials; p++) {
      // repetición parcial: baja solo a (bot+top)/2 y regresa — NO debe contar
      const mid = (top + bot) / 2 + 15;
      const m = Math.round(800 / stepMs);
      for (let i = 0; i < m; i++) {
        const ang = top - ((top - mid) * Math.sin((Math.PI * i) / m));
        out.push([ang, t]);
        t += stepMs;
      }
    }
    t += restMs; // pausa entre reps (descanso)
  }
  return out;
}

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

const run = (exercise, s) => {
  const c = new RepCounter(exercise);
  for (const [a, t] of s) c.push(a, t);
  return c.count;
};

/* ---------------- GOLDEN SET: conteo ---------------- */
const COUNT_CASES = [
  { name: 'squat · 8 reps rápidas limpias', ex: 'squat', s: stream(8, { top: 165, bot: 95, periodMs: 1200 }), expect: 8 },
  { name: 'squat · 4 reps lentas controladas', ex: 'squat', s: stream(4, { top: 165, bot: 95, periodMs: 5000 }), expect: 4 },
  { name: 'squat · con ruido de pose (±2°)', ex: 'squat', s: stream(6, { top: 165, bot: 95, periodMs: 2500, jitter: 2 }), expect: 6 },
  { name: 'squat · descansos de 30 s entre reps', ex: 'squat', s: stream(5, { top: 165, bot: 95, periodMs: 3000, restMs: 30000 }), expect: 5 },
  { name: 'squat · 3 reales + 6 parciales mezcladas', ex: 'squat', s: stream(3, { top: 165, bot: 95, periodMs: 2800, partials: 2 }), expect: 3 },
  { name: 'squat · 4 reales + 8 parciales (solo cuentan las completas)', ex: 'squat', s: stream(4, { top: 165, bot: 95, periodMs: 2000, partials: 2 }), expect: 4 },
  { name: 'squat · sin profundidad (bot 125)', ex: 'squat', s: stream(10, { top: 165, bot: 125, periodMs: 2500 }), expect: 0 },
  { name: 'squat · micro-reps rápidas', ex: 'squat', s: stream(12, { top: 155, bot: 130, periodMs: 400 }), expect: 0 },
  { name: 'press · 3 estrictas', ex: 'press', s: stream(3, { top: 170, bot: 60, periodMs: 1500 }), expect: 3 },
  { name: 'press · ROM corto nunca cuenta', ex: 'press', s: stream(8, { top: 150, bot: 85, periodMs: 1500 }), expect: 0 },
  { name: 'pullup · 5 estrictas', ex: 'pullup', s: stream(5, { top: 170, bot: 55, periodMs: 3000 }), expect: 5 },
  { name: 'pullup · colgado sin subir', ex: 'pullup', s: stream(1, { top: 172, bot: 140, periodMs: 6000 }), expect: 0 },
];

/* ---------------- GOLDEN SET: bandas de técnica ---------------- */
function chain(thetaDeg_, s, ox, oy) {
  const th = (thetaDeg_ * Math.PI) / 180;
  return [{ x: ox - s, y: oy }, { x: ox, y: oy }, { x: ox - s * Math.cos(th), y: oy + s * Math.sin(th) }];
}
function mk33(patch) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  for (const [i, p] of Object.entries(patch)) lm[+i] = { x: p.x, y: p.y, z: 0, visibility: 1 };
  return lm;
}
function squatFrame(knee, { trunkDx = 0 } = {}) {
  const s = 0.12, ox = 0.5, oy = 0.6;
  const th = (knee * Math.PI) / 180;
  const hip = { x: ox + s * Math.sin(th), y: oy + s * Math.cos(th) };
  return mk33({
    [LM.L_HIP]: hip, [LM.R_HIP]: hip,
    [LM.L_KNEE]: { x: ox, y: oy }, [LM.R_KNEE]: { x: ox, y: oy },
    [LM.L_ANKLE]: { x: ox, y: oy + s }, [LM.R_ANKLE]: { x: ox, y: oy + s },
    [LM.L_SHOULDER]: { x: hip.x + trunkDx, y: hip.y - 0.28 },
    [LM.R_SHOULDER]: { x: hip.x + trunkDx, y: hip.y - 0.28 },
  });
}

const SCORE_CASES = [
  { name: 'squat perfecta', fn: () => scoreSquat([squatFrame(170), squatFrame(95), squatFrame(170)], { descentMs: 1500 }), band: [95, 100] },
  { name: 'squat a 105° (profundidad justa)', fn: () => scoreSquat([squatFrame(170), squatFrame(105), squatFrame(170)], { descentMs: 1500 }), band: [85, 85] },
  { name: 'squat paralela media (115°)', fn: () => scoreSquat([squatFrame(170), squatFrame(115), squatFrame(170)], { descentMs: 1500 }), band: [85, 85] },
  { name: 'squat cuarto de recorrido (130°)', fn: () => scoreSquat([squatFrame(170), squatFrame(130), squatFrame(170)], { descentMs: 1500 }), band: [65, 65] },
  { name: 'squat mala: 130° + espalda rota + lenta', fn: () => scoreSquat([squatFrame(170), squatFrame(130, { trunkDx: 0.36 }), squatFrame(170)], { descentMs: 3500 }), band: [35, 35] },
  { name: 'squat limpia sin tempo reportado', fn: () => scoreSquat([squatFrame(168), squatFrame(92), squatFrame(168)]), band: [100, 100] },
];

/* ---------------- harness ---------------- */
let fails = 0;
let countOK = 0;
console.log('\n🧪 BAYONA · GOLDEN SET DE BIOMECÁNICA\n— Conteo de repeticiones —');
for (const c of COUNT_CASES) {
  const got = run(c.ex, c.s);
  const ok = got === c.expect;
  ok ? countOK++ : fails++;
  console.log(`  ${ok ? '✅' : '❌'} ${c.name} → esperado ${c.expect}, got ${got}`);
}
const countAcc = (countOK / COUNT_CASES.length) * 100;

let scoreOK = 0;
console.log('— Bandas de técnica —');
for (const c of SCORE_CASES) {
  const got = c.fn().score;
  const ok = got >= c.band[0] && got <= c.band[1];
  ok ? scoreOK++ : fails++;
  console.log(`  ${ok ? '✅' : '❌'} ${c.name} → esperado ${c.band[0]}-${c.band[1]}, got ${got}`);
}

console.log(`\n📊 PRECISIÓN DE CONTEO: ${countAcc.toFixed(1)}% (objetivo comité ≥98%)`);
console.log(`📊 TÉCNICA: ${scoreOK}/${SCORE_CASES.length} · TOTAL FALLAS: ${fails}\n`);
process.exit(fails || countAcc < 98 ? 1 : 0);
