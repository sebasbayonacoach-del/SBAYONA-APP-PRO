// GEMELO-1 · angles.js — geometría de pose pura (sin DOM, testeable en Node)
// Índices BlazePose 33 landmarks
export const LM = {
  NOSE: 0,
  L_SHOULDER: 11, R_SHOULDER: 12,
  L_ELBOW: 13, R_ELBOW: 14,
  L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24,
  L_KNEE: 25, R_KNEE: 26,
  L_ANKLE: 27, R_ANKLE: 28,
};

export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: (a.z ?? 0) + (b.z ?? 0) });
export const mul = (a, s) => ({ x: a.x * s, y: a.y * s, z: (a.z ?? 0) * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y + (a.z ?? 0) * (b.z ?? 0);
export const len = (a) => Math.hypot(a.x, a.y, a.z ?? 0);
export const dist = (a, b) => len(sub(a, b));
export const mid = (a, b) => mul(add(a, b), 0.5);
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Ángulo en grados en el vértice b (segmentos b→a y b→c). */
export function angleDeg(a, b, c) {
  const v1 = sub(a, b), v2 = sub(c, b);
  const d = clamp(dot(v1, v2) / ((len(v1) * len(v2)) || 1), -1, 1);
  return (Math.acos(d) * 180) / Math.PI;
}

/** Ángulo entre dos vectores en grados. */
export function angleVecDeg(v1, v2) {
  const d = clamp(dot(v1, v2) / ((len(v1) * len(v2)) || 1), -1, 1);
  return (Math.acos(d) * 180) / Math.PI;
}

/** Distancia perpendicular punto→línea AB (2D plano x-y). */
export function distPointLine2D(p, a, b) {
  const ab = sub(b, a), ap = sub(p, a);
  const cross = ab.x * ap.y - ab.y * ap.x;
  return Math.abs(cross) / (len(ab) || 1);
}

/** Media móvil exponencial. */
export class EMA {
  constructor(alpha = 0.4) { this.alpha = alpha; this.value = null; }
  push(v) {
    if (v == null || Number.isNaN(v)) return this.value;
    this.value = this.value == null ? v : this.alpha * v + (1 - this.alpha) * this.value;
    return this.value;
  }
}

/** EMA por clave para objetos de ángulos. */
export class KeyEMA {
  constructor(alpha = 0.4) { this.alpha = alpha; this.emas = new Map(); }
  push(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!this.emas.has(k)) this.emas.set(k, new EMA(this.alpha));
      out[k] = this.emas.get(k).push(v);
    }
    return out;
  }
  reset() { this.emas.clear(); }
}

/** Visibilidad mínima de un landmark (gating de pose). */
export const visible = (p, thr = 0.6) => (p?.visibility ?? 1) >= thr;
