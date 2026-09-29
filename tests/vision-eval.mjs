// GEMELO-1 · vision-eval.mjs — evaluación ejecutable (node tests/vision-eval.mjs)
// Fixtures sintéticos deterministas. Sale con código != 0 si algo falla.
import { RepCounter } from '../js/vision/repCounter.js';
import { scoreSquat, scorePress, scorePullup, jointAngles, cameraView } from '../js/vision/formScore.js';
import { angleDeg, LM } from '../js/vision/angles.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

/* ---------- generadores de flujo de ángulos ---------- */
function angleStream(cycles, { top, bot, periodMs = 3000, stepMs = 50 }) {
  const out = [];
  let t = 0;
  for (let c = 0; c < cycles; c++) {
    const n = Math.round(periodMs / stepMs);
    for (let i = 0; i < n; i++) {
      const ang = (top + bot) / 2 + ((top - bot) / 2) * Math.cos((2 * Math.PI * i) / n);
      out.push([ang, t]);
      t += stepMs;
    }
  }
  return out;
}

function run(exercise, stream) {
  const c = new RepCounter(exercise);
  for (const [ang, t] of stream) c.push(ang, t);
  return c;
}

/* ---------- fixtures de landmarks (Pose33) ---------- */
// Cadena de 3 puntos con ángulo EXACTO θ en el vértice: p1=(-s,0), p2=s·(−cosθ, senθ)
function chain(thetaDeg, s, ox, oy) {
  const th = (thetaDeg * Math.PI) / 180;
  return [
    { x: ox - s, y: oy },
    { x: ox, y: oy },
    { x: ox - s * Math.cos(th), y: oy + s * Math.sin(th) },
  ];
}

function mk33(patches) {
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  for (const [i, p] of Object.entries(patches)) lm[+i] = { x: p.x, y: p.y, z: 0, visibility: 1 };
  return lm;
}

/** Frame de squat lateral (pie plantado: tobillo fijo, cadera desciende). θ EXACTA en rodilla. */
function squatFrame(thetaKnee, { trunkDx = 0, ankleDx = 0, hipSep = 0 } = {}) {
  const s = 0.12, ox = 0.5, oy = 0.6;
  const th = (thetaKnee * Math.PI) / 180;
  const knee = { x: ox, y: oy };
  const ankle = { x: ox + ankleDx, y: oy + s };
  const hip = { x: ox + s * Math.sin(th), y: oy + s * Math.cos(th) };
  const patch = {
    [LM.L_HIP]: { x: hip.x - hipSep / 2, y: hip.y }, [LM.R_HIP]: { x: hip.x + hipSep / 2, y: hip.y },
    [LM.L_KNEE]: knee, [LM.R_KNEE]: { x: knee.x, y: knee.y },
    [LM.L_ANKLE]: { x: ankle.x + ankleDx, y: ankle.y }, [LM.R_ANKLE]: { x: ankle.x + ankleDx, y: ankle.y },
    [LM.L_SHOULDER]: { x: hip.x + trunkDx, y: hip.y - 0.28 }, [LM.R_SHOULDER]: { x: hip.x + trunkDx, y: hip.y - 0.28 },
  };
  return mk33(patch);
}

/** Frame frontal con valgo controlado (rodillas hacia adentro = desplazamiento valgo). */
function frontalSquatFrame(thetaKnee, kneeDx) {
  const s = 0.12, oy = 0.5;
  const patch = {};
  for (const [hipI, kneeI, ankI, sgn] of [[LM.L_HIP, LM.L_KNEE, LM.L_ANKLE, -1], [LM.R_HIP, LM.R_KNEE, LM.R_ANKLE, 1]]) {
    const ox = 0.5 + sgn * 0.05;
    patch[hipI] = { x: ox, y: oy };
    patch[kneeI] = { x: ox - sgn * kneeDx, y: oy + s };
    patch[ankI] = { x: ox, y: oy + 2 * s };
  }
  patch[LM.L_SHOULDER] = { x: 0.38, y: 0.22 };
  patch[LM.R_SHOULDER] = { x: 0.62, y: 0.22 };
  return mk33(patch);
}

console.log('\n🏋️ GEMELO-1 · EVAL DE VISIÓN\n');

console.log('— RepCounter —');
assert(run('squat', angleStream(5, { top: 165, bot: 95 })).count === 5, 'squat: 5 ciclos completos = 5 reps');
assert(run('squat', angleStream(10, { top: 150, bot: 125 })).count === 0, 'squat: micro-reps sin profundidad = 0');
assert(run('squat', angleStream(3, { top: 165, bot: 95, periodMs: 500 })).count === 0, 'squat: reps <600 ms rechazadas');
assert(run('press', angleStream(3, { top: 170, bot: 60, periodMs: 1500 })).count === 3, 'press: 3 ciclos = 3 reps');
assert(run('pullup', angleStream(4, { top: 170, bot: 55, periodMs: 2500 })).count === 4, 'pullup: 4 ciclos = 4 reps');
const fat = run('squat', angleStream(3, { top: 165, bot: 95 }));
assert(fat.reps[0].velocityLossPct === 0, 'fatiga: primera rep = referencia (0%)');

console.log('— scoreSquat —');
const goodSquat = [squatFrame(170), squatFrame(95), squatFrame(170)];
const gs = scoreSquat(goodSquat, { descentMs: 1500 });
assert(gs.score === 100, 'squat limpio = 100', `fue ${gs.score}`);
const badSquat = [squatFrame(170), squatFrame(125, { trunkDx: 0.36 }), squatFrame(170)];
const bs = scoreSquat(badSquat, { descentMs: 3500 });
assert(bs.deductions.some((d) => d.rule === 'profundidad' && d.points === 35), 'rodilla 125° → −35 profundidad');
assert(bs.deductions.some((d) => d.rule === 'lumbar'), 'tronco >50° → deducción lumbar');
assert(bs.deductions.some((d) => d.rule === 'tempo'), 'descenso >3 s → deducción tempo');
assert(bs.cues[0] === 'baja más profundo', 'cue prioritaria = la de más puntos');
const valgo = scoreSquat([frontalSquatFrame(170, 0.05), frontalSquatFrame(95, 0.05), frontalSquatFrame(170, 0.05)]);
assert(valgo.deductions.some((d) => d.rule === 'valgo' && d.cue === 'rodillas afuera'), 'valgo frontal → "rodillas afuera"');
assert(cameraView(frontalSquatFrame(95, 0.05)) === 'frontal' && cameraView(squatFrame(95)) === 'side', 'heurística de vista');

console.log('— scorePress / scorePullup —');
const pressFrames = [mk33(pressPatch(170, 0)), mk33(pressPatch(60, 0)), mk33(pressPatch(170, 0))];
assert(scorePress(pressFrames).score === 100, 'press limpio = 100');
const badPress = [mk33(pressPatch(150, 0)), mk33(pressPatch(80, 0)), mk33(pressPatch(150, 0.4))];
assert(scorePress(badPress).score <= 50, 'press con ROM corto + arqueo ≤ 50');
const pullFrames = [mk33(pullPatch(170, 0.42)), mk33(pullPatch(55, 0.22)), mk33(pullPatch(170, 0.42))];
assert(scorePullup(pullFrames).score === 100, 'pullup limpio = 100');
const badPull = [mk33(pullPatch(150, 0.32)), mk33(pullPatch(70, 0.32)), mk33(pullPatch(150, 0.32))];
const bp = scorePullup(badPull);
assert(bp.deductions.some((d) => d.rule === 'altura'), 'pullup sin barbilla → cue de altura');
assert(bp.deductions.some((d) => d.rule === 'rom'), 'pullup con ROM corto → deducción ROM');

console.log('— coherencia geométrica —');
const chk = chain(95, 1, 0, 0);
assert(Math.abs(angleDeg(chk[0], chk[1], chk[2]) - 95) < 0.5, 'constructor de cadenas mide θ exacto');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);

/* patches auxiliares (codo = vértice hombro-codo-muñeca; θ exacta) */
function pressPatch(thetaElbow, hipDx = 0) {
  const [sh, el, wr] = chain(thetaElbow, 0.1, 0.5, 0.4);
  return {
    [LM.L_SHOULDER]: sh, [LM.R_SHOULDER]: { x: sh.x, y: sh.y },
    [LM.L_HIP]: { x: sh.x + hipDx, y: sh.y + 0.34 }, [LM.R_HIP]: { x: sh.x + hipDx, y: sh.y + 0.34 },
    [LM.L_ELBOW]: el, [LM.R_ELBOW]: { x: el.x, y: el.y },
    [LM.L_WRIST]: wr, [LM.R_WRIST]: { x: wr.x, y: wr.y },
  };
}

function pullPatch(thetaElbow, noseY) {
  const wr = { x: 0.5, y: 0.25 };   // barra fija
  const el = { x: 0.5, y: 0.35 };
  const th = (thetaElbow * Math.PI) / 180;
  const sh = { x: el.x + 0.1 * Math.sin(th), y: el.y - 0.1 * Math.cos(th) };
  return {
    [LM.NOSE]: { x: sh.x, y: noseY },
    [LM.L_SHOULDER]: sh, [LM.R_SHOULDER]: { x: sh.x, y: sh.y },
    [LM.L_HIP]: { x: sh.x, y: sh.y + 0.34 }, [LM.R_HIP]: { x: sh.x, y: sh.y + 0.34 },
    [LM.L_ELBOW]: el, [LM.R_ELBOW]: { x: el.x, y: el.y },
    [LM.L_WRIST]: wr, [LM.R_WRIST]: { x: wr.x, y: wr.y },
  };
}
