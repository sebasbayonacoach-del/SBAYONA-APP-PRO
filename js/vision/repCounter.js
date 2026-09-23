// GEMELO-1 · repCounter.js — máquinas de estado por ejercicio (puro, testeable en Node).
// Regla del comité: SOLO cuenta el ciclo completo TOP→BOTTOM→TOP (sin micro-reps).

export const EXERCISE_SPECS = {
  // key: ángulo articular de control. top = extendido, bottom = flexionado.
  // minSpeedDegS se conserva solo para estadística de velocidad (no decide transiciones:
  // el ruido de pose finge velocidades enormes → las transiciones son por umbral + histéresis).
  squat:  { key: 'knee',  topThr: 160, botThr: 100, hyst: 10, minSpeedDegS: 8.6, minRepMs: 600 },
  press:  { key: 'elbow', topThr: 165, botThr: 70,  hyst: 10, minSpeedDegS: 8.6, minRepMs: 400 },
  pullup: { key: 'elbow', topThr: 165, botThr: 60,  hyst: 10, minSpeedDegS: 8.6, minRepMs: 500 },
};

const DISCARD_DROP_DEG = 15; // caída real desde el máximo para descartar parcial (inmune a ruido ±3°)

export class RepCounter {
  /** @param {'squat'|'press'|'pullup'} exerciseId */
  constructor(exerciseId) {
    const spec = EXERCISE_SPECS[exerciseId];
    if (!spec) throw new Error(`Ejercicio no soportado: ${exerciseId}`);
    this.exerciseId = exerciseId;
    this.spec = spec;
    this.phase = 'top';           // top | descending | bottom | ascending
    this.reps = [];
    this._last = null;            // { t, ang }
    this._minA = Infinity;
    this._maxA = -Infinity;
    this._repStartT = null;
    this._sawBottom = false;
    this._peakAscVel = 0;
  }

  get count() { return this.reps.length; }

  /** @param {number|null} ang ángulo articular en grados @param {number} tMs timestamp ms */
  push(ang, tMs) {
    const spec = this.spec;
    const out = { phase: this.phase, rep: null };
    if (ang == null || Number.isNaN(ang)) return out;

    let vel = 0; // deg/s — positivo = subiendo/extensión
    if (this._last) {
      const dt = Math.max(1, tMs - this._last.t);
      vel = ((ang - this._last.ang) / dt) * 1000;
    }

    switch (this.phase) {
      case 'top':
        this._maxA = Math.max(this._maxA, ang);
        this._minA = ang;
        if (ang < spec.topThr - spec.hyst) {
          this.phase = 'descending';
          this._repStartT = tMs;
          this._sawBottom = false;
          this._peakAscVel = 0;
        }
        break;

      case 'descending':
        this._minA = Math.min(this._minA, ang);
        if (ang <= spec.botThr) {
          this.phase = 'bottom';
          this._sawBottom = true;
        } else if (ang >= spec.topThr) {
          this.phase = 'top'; // reversión completa sin bajar: no era repetición
        }
        break;

      case 'bottom':
        this._minA = Math.min(this._minA, ang);
        if (ang > spec.botThr + 5) {
          this.phase = 'ascending';
          this._maxA = ang;
        }
        break;

      case 'ascending':
        this._maxA = Math.max(this._maxA, ang);
        this._peakAscVel = Math.max(this._peakAscVel, vel);
        if (ang >= spec.topThr) {
          const durMs = tMs - (this._repStartT ?? tMs);
          if (this._sawBottom && durMs >= spec.minRepMs) {
            const rep = {
              n: this.reps.length + 1,
              romDeg: Math.round(this._maxA - this._minA),
              durMs,
              peakVelDegS: Math.round(this._peakAscVel),
              velocityLossPct: 0,
            };
            const ref = this.reps[0]?.peakVelDegS || rep.peakVelDegS;
            rep.velocityLossPct = ref > 0
              ? Math.max(0, Math.round((1 - rep.peakVelDegS / ref) * 100))
              : 0;
            this.reps.push(rep);
            out.rep = rep;
          }
          this.phase = 'top';
        } else if (this._maxA - ang > DISCARD_DROP_DEG && ang < spec.botThr + 25) {
          // caída real desde el máximo sin tocar arriba → repetición parcial descartada
          this.phase = 'descending';
          this._sawBottom = false;
        }
        break;
    }

    this._last = { t: tMs, ang };
    out.phase = this.phase;
    return out;
  }

  /** Fatiga estimada: pérdida de velocidad concéntrica vs. primera rep. */
  get fatiguePct() {
    const last = this.reps.at(-1);
    return last?.velocityLossPct ?? 0;
  }

  /** RIR estimado a partir de la pérdida de velocidad (simple, educativo). */
  get rirEstimate() {
    const f = this.fatiguePct;
    if (f < 15) return 3;
    if (f < 30) return 2;
    if (f < 45) return 1;
    return 0;
  }
}
