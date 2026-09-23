// GEMELO-1 · formScore.js — scoring biomecánico 0-100 + cues priorizadas (puro, testeable en Node).
// Reglas validadas con el comité (S&C). Ver PLAN_NIVEL_3_PRO §4.3.
import { LM, angleDeg, angleVecDeg, distPointLine2D, mid, sub, dist } from './angles.js';

/** Ángulos articulares medios por frame (usa L+R). */
export function jointAngles(lm) {
  const knee = (angleDeg(lm[LM.L_HIP], lm[LM.L_KNEE], lm[LM.L_ANKLE])
    + angleDeg(lm[LM.R_HIP], lm[LM.R_KNEE], lm[LM.R_ANKLE])) / 2;
  const elbow = (angleDeg(lm[LM.L_SHOULDER], lm[LM.L_ELBOW], lm[LM.L_WRIST])
    + angleDeg(lm[LM.R_SHOULDER], lm[LM.R_ELBOW], lm[LM.R_WRIST])) / 2;
  const trunk = trunkLeanDeg(lm);
  const valgus = valgusIndex(lm);
  return { knee, elbow, trunk, valgus };
}

/** Inclinación del tronco respecto a la vertical (grados). */
export function trunkLeanDeg(lm) {
  const hip = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const sh = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  return angleVecDeg(sub(sh, hip), { x: 0, y: -1, z: 0 });
}

/** Índice de valgo de rodilla (solo fiable en vista frontal) = desvío / altura cadera. */
export function valgusIndex(lm) {
  const torso = dist(mid(lm[LM.L_HIP], lm[LM.R_HIP]), mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER])) || 1;
  const devL = distPointLine2D(lm[LM.L_KNEE], lm[LM.L_HIP], lm[LM.L_ANKLE]);
  const devR = distPointLine2D(lm[LM.R_KNEE], lm[LM.R_HIP], lm[LM.R_ANKLE]);
  return Math.max(devL, devR) / torso;
}

/** Heurística de vista: frontal (caderas separadas en x) vs lateral. */
export function cameraView(lm) {
  return Math.abs(lm[LM.L_HIP].x - lm[LM.R_HIP].x) > 0.06 ? 'frontal' : 'side';
}

/**
 * Squat — tabla de deducciones del comité:
 *  −35 profundidad (rodilla_min > 120°) · −15 (> 100°)
 *  −25 valgo de rodilla (> 0.12 × altura cadera) [solo vista frontal]
 *  −20 inclinación lumbar en BOTTOM (tronco > 50°)
 *  −10 inestabilidad de tobillo (balanceo > 0.02 norm.)
 *  −10 tempo sin control (descenso > 3 s)
 * @param {Array<Array<{x,y,z,visibility}>>} frames Pose33 por frame
 * @param {{descentMs?:number}} opts
 */
export function scoreSquat(frames, opts = {}) {
  const deductions = [];
  const angs = frames.map(jointAngles);
  const kneeMin = Math.min(...angs.map((a) => a.knee));
  const view = cameraView(frames.at(-1));

  if (kneeMin > 120) deductions.push({ rule: 'profundidad', points: 35, cue: 'baja más profundo' });
  else if (kneeMin > 100) deductions.push({ rule: 'profundidad', points: 15, cue: 'un poco más de profundidad' });

  if (view === 'frontal') {
    const valgusMax = Math.max(...angs.map((a) => a.valgus));
    if (valgusMax > 0.12) deductions.push({ rule: 'valgo', points: 25, cue: 'rodillas afuera' });
  }

  const trunkAtBottom = Math.max(...angs.map((a) => a.trunk));
  if (trunkAtBottom > 50) deductions.push({ rule: 'lumbar', points: 20, cue: 'pecho arriba, espalda firme' });

  const ankleWobble = wobble2D(frames, LM.L_ANKLE);
  if (ankleWobble > 0.02) deductions.push({ rule: 'tobillos', points: 10, cue: 'talones al suelo' });

  if (opts.descentMs != null && opts.descentMs > 3000) {
    deductions.push({ rule: 'tempo', points: 10, cue: 'baja con más control' });
  }

  return finalize(deductions);
}

/** Press — ROM completo + sin arqueo lumbar. */
export function scorePress(frames, opts = {}) {
  const deductions = [];
  const angs = frames.map(jointAngles);
  const elbowMin = Math.min(...angs.map((a) => a.elbow));
  const elbowMax = Math.max(...angs.map((a) => a.elbow));
  if (elbowMin > 70 || elbowMax < 165) {
    deductions.push({ rule: 'rom', points: 30, cue: 'recorrido completo: codos flexionados y extiende arriba' });
  }
  if (Math.max(...angs.map((a) => a.trunk)) > 30) {
    deductions.push({ rule: 'lumbar', points: 20, cue: 'core firme, no arquees la espalda' });
  }
  return finalize(deductions);
}

/** Pull-up — ROM (barbilla) + sin balanceo (kipping no intencional). */
export function scorePullup(frames, opts = {}) {
  const deductions = [];
  const angs = frames.map(jointAngles);
  const elbowMin = Math.min(...angs.map((a) => a.elbow));
  const elbowMax = Math.max(...angs.map((a) => a.elbow));
  if (elbowMax - elbowMin < 105) {
    deductions.push({ rule: 'rom', points: 30, cue: 'sube hasta la barbilla' });
  }
  const trunks = angs.map((a) => a.trunk);
  if (Math.max(...trunks) - Math.min(...trunks) > 15) {
    deductions.push({ rule: 'balanceo', points: 20, cue: 'sin balanceo, controla la bajada' });
  }
  // barbilla sobre la barra: nariz por encima de muñecas en el punto más alto
  const wristY = Math.min(...frames.map((f) => (f[LM.L_WRIST].y + f[LM.R_WRIST].y) / 2));
  const noseY = Math.min(...frames.map((f) => f[LM.NOSE].y));
  if (!(noseY < wristY)) {
    deductions.push({ rule: 'altura', points: 25, cue: 'barbilla sobre la barra' });
  }
  return finalize(deductions);
}

export function scoreSet(exerciseId, frames, opts = {}) {
  if (exerciseId === 'squat') return scoreSquat(frames, opts);
  if (exerciseId === 'press') return scorePress(frames, opts);
  if (exerciseId === 'pullup') return scorePullup(frames, opts);
  throw new Error(`Sin scoring para: ${exerciseId}`);
}

function finalize(deductions) {
  const total = deductions.reduce((s, d) => s + d.points, 0);
  const score = Math.max(0, 100 - total);
  const cues = deductions.slice().sort((a, b) => b.points - a.points).map((d) => d.cue);
  return { score, deductions, cues };
}

/** Balanceo de un landmark (desviación típica de x, coords normalizadas). */
function wobble2D(frames, idx) {
  const xs = frames.map((f) => f[idx].x);
  const mu = xs.reduce((s, v) => s + v, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, v) => s + (v - mu) ** 2, 0) / xs.length);
}
