// pipeline-real-eval.mjs — PRUEBAS REALISTAS del pipeline completo (como en el móvil de verdad).
// No son ángulos ideales: ruido de pose, FPS irregulares, cortes de cámara, personas que se salen
// del encuadre, fatiga progresiva. Camino REAL: jointAngles → KeyEMA → RepCounter.
// Ejecutar: node tests/pipeline-real-eval.mjs
import { RepCounter } from '../js/vision/repCounter.js';
import { KeyEMA, angleDeg, LM } from '../js/vision/angles.js';
import { jointAngles } from '../js/vision/formScore.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const rng = mulberry(20260923);
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pose33 realista de sentadilla lateral (pie plantado) con ruido gaussiano y visibilidad variable. */
function squatPose(thetaKnee, noiseDeg = 0) {
  const s = 0.12, ox = 0.5, oy = 0.6;
  const th = ((thetaKnee + (rng() - 0.5) * 2 * noiseDeg) * Math.PI) / 180;
  const hip = { x: ox + s * Math.sin(th), y: oy + s * Math.cos(th), z: 0 };
  const knee = { x: ox, y: oy, z: 0 };
  const ankle = { x: ox, y: oy + s, z: 0 };
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  for (const [i, p] of Object.entries({
    [LM.L_HIP]: hip, [LM.R_HIP]: hip, [LM.L_KNEE]: knee, [LM.R_KNEE]: knee,
    [LM.L_ANKLE]: ankle, [LM.R_ANKLE]: ankle,
    [LM.L_SHOULDER]: { x: hip.x, y: hip.y - 0.28, z: 0 }, [LM.R_SHOULDER]: { x: hip.x, y: hip.y - 0.28, z: 0 },
  })) lm[+i] = { ...p, visibility: 1 };
  return lm;
}

/** Corre el pipeline REAL: pose → ángulos → EMA → contador. Devuelve {count, reps}.
 *  opts: noise, fpsJitterMs, dropoutsMs (cortes de cámara), exitAt (índice de rep donde sales del encuadre) */
function runRealPipeline(cycles, opts = {}) {
  const { noise = 3, fpsJitterMs = 20, dropoutMs = 0, exitAt = null, repMs = 2800 } = opts;
  const counter = new RepCounter('squat');
  const smooth = new KeyEMA(0.4);
  let t = 0;
  for (let c = 0; c < cycles; c++) {
    const exitRep = exitAt === c;
    const n = Math.round(repMs / 40);
    const wave = (i) => {
      const theta = 130 + 35 * Math.cos((2 * Math.PI * i) / n);
      const a = smooth.push(jointAngles(squatPose(theta, noise)));
      counter.push(a.knee, t);
      t += 40 + Math.round((rng() - 0.5) * 2 * fpsJitterMs);
    };
    if (exitRep) {
      // sales a mitad del descenso… (profundidad sin verificar → esa rep NO contará)
      for (let i = 0; i < Math.round(n * 0.3); i++) wave(i);
      // …estás fuera de cuadro: MediaPipe no detecta → el pipeline manda null…
      for (let k = 0; k < 12; k++) { counter.push(null, t); t += 40 + fpsJitterMs; }
      // …vuelves al encuadre y REPITES la rep completa (escenario humano normal)
    }
    for (let i = 0; i < n; i++) wave(i);
    if (dropoutMs) t += dropoutMs;      // corte de cámara entre reps
  }
  return counter;
}

console.log('\n🎥 PIPELINE REAL — condiciones del mundo real\n');

console.log('— Ruido de pose + FPS irregulares —');
assert(runRealPipeline(5).count === 5, '5 reps con ruido ±3° y FPS 25-60 → 5 exactas');
assert(runRealPipeline(8, { noise: 5 }).count === 8, 'ruido fuerte ±5° → 8 exactas (EMA + histéresis)');
assert(runRealPipeline(4, { noise: 3, fpsJitterMs: 45 }).count === 4, 'FPS muy irregulares (±45 ms) → 4 exactas');

console.log('— Cortes de cámara —');
assert(runRealPipeline(4, { dropoutMs: 300 }).count === 4, 'corte de 300 ms entre reps → sin pérdidas ni fantasmas');
assert(runRealPipeline(3, { dropoutMs: 1500 }).count === 3, 'pausa de 1.5 s (descanso real) → sin pérdidas');

console.log('— Te sales del encuadre y vuelves —');
assert(runRealPipeline(5, { exitAt: 2 }).count === 5, 'sales a mitad de una rep y la repites → 5 cuentan, la cortada NO');
assert(runRealPipeline(4, { exitAt: 0 }).count === 4, 'sales en la primera rep → cero fantasmas');

console.log('— Fatiga progresiva realista —');
{
  // 8 reps cuya velocidad de subida cae ~50% (lo que pasa en una serie dura de verdad)
  const counter = new RepCounter('squat');
  const smooth = new KeyEMA(0.4);
  let t = 0;
  for (let c = 0; c < 8; c++) {
    const repMs = 2200 + c * 350;                 // cada rep más lenta
    const n = Math.round(repMs / 40);
    for (let i = 0; i < n; i++) {
      const theta = 130 + 35 * Math.cos((2 * Math.PI * i) / n);
      counter.push(smooth.push(jointAngles(squatPose(theta, 2))).knee, t);
      t += 40;
    }
  }
  const loss = counter.fatiguePct;
  assert(counter.count === 8, 'las 8 reps cuentan aunque llegue la fatiga');
  assert(loss >= 30 && loss <= 60, `pérdida de velocidad ~50% detectada (${loss}%)`, `fue ${loss}`);
  assert(counter.rirEstimate <= 1, `RIR estimado cae con la fatiga (≈${counter.rirEstimate})`);
  assert((counter.reps.at(-1)?.romDeg ?? 0) >= 60, 'el ROM se mantiene (sin recortar recorrido)');
}

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
