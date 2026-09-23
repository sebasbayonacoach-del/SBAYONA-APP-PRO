// GEMELO-1 · retarget.js — conduce al avatar con los landmarks del usuario.
// Integración de bajo acoplamiento: evento `bayona:pose` + binding best-effort por nombre.
import { LM, angleDeg, KeyEMA, mid, sub, angleVecDeg, clamp } from './angles.js';

export function computeJointAngles(lm) {
  const hip = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const sh = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  return {
    kneeL: angleDeg(lm[LM.L_HIP], lm[LM.L_KNEE], lm[LM.L_ANKLE]),
    kneeR: angleDeg(lm[LM.R_HIP], lm[LM.R_KNEE], lm[LM.R_ANKLE]),
    elbowL: angleDeg(lm[LM.L_SHOULDER], lm[LM.L_ELBOW], lm[LM.L_WRIST]),
    elbowR: angleDeg(lm[LM.R_SHOULDER], lm[LM.R_ELBOW], lm[LM.R_WRIST]),
    hipL: angleDeg(lm[LM.L_SHOULDER], lm[LM.L_HIP], lm[LM.L_KNEE]),
    hipR: angleDeg(lm[LM.R_SHOULDER], lm[LM.R_HIP], lm[LM.R_KNEE]),
    shoulderL: angleDeg(lm[LM.L_HIP], lm[LM.L_SHOULDER], lm[LM.L_ELBOW]),
    shoulderR: angleDeg(lm[LM.R_HIP], lm[LM.R_SHOULDER], lm[LM.R_ELBOW]),
    trunk: angleVecDeg(sub(sh, hip), { x: 0, y: -1, z: 0 }),
    leanFwd: angleVecDeg(sub(sh, hip), { x: 1, y: 0, z: 0 }),
  };
}

// Nombres del rig BAYONA (avatar.js) + fallback GLB/Mixamo
const BONE_PATTERNS = {
  hips: /^hips$|pelvis/i,
  spine: /^spine|torso/i,
  chest: /^chest/i,
  neck: /^neck/i,
  head: /^head/i,
  foreArmL: /^forearm.?l$|fore.?arm.*(left|_l\b)/i,
  foreArmR: /^forearm.?r$|fore.?arm.*(right|_r\b)/i,
  upArmL: /^uparm.?l$|(upper.?arm|arm).*(left|_l\b)/i,
  upArmR: /^uparm.?r$|(upper.?arm|arm).*(right|_r\b)/i,
  handL: /^hand.?l$/i, handR: /^hand.?r$/i,
  thighL: /^thigh.?l$|(upper.?leg|thigh).*(left|_l\b)/i,
  thighR: /^thigh.?r$|(upper.?leg|thigh).*(right|_r\b)/i,
  shinL: /^shin.?l$|(lower.?leg|shin|calf).*(left|_l\b)/i,
  shinR: /^shin.?r$|(lower.?leg|shin|calf).*(right|_r\b)/i,
  footL: /^foot.?l$/i, footR: /^foot.?r$/i,
};

export class AvatarRetarget {
  /** @param {object|null} rigRoot objeto THREE con .traverse (opcional) */
  constructor(rigRoot = null) {
    this.bones = {};
    this.smooth = new KeyEMA(0.35);
    if (rigRoot?.traverse) {
      rigRoot.traverse((o) => {
        for (const [key, re] of Object.entries(BONE_PATTERNS)) {
          if (!this.bones[key] && o.name && re.test(o.name)) this.bones[key] = o;
        }
      });
    }
  }

  /** @returns {object} ángulos suavizados — también se publican en `bayona:pose`. */
  apply(lm) {
    const angles = this.smooth.push(computeJointAngles(lm));

    // 1) Publicar SIEMPRE (acoplamiento cero con el motor actual)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bayona:pose', { detail: { angles, landmarks: lm } }));
    }

    // 2) Best-effort: conducir huesos si el rig expone nombres reconocibles
    const deg = Math.PI / 180;
    const set = (bone, axis, degVal) => {
      const b = this.bones[bone];
      if (b?.rotation) b.rotation[axis] = clamp(degVal * deg, -2.6, 2.6);
    };
    set('foreArmL', 'x', -(180 - angles.elbowL));
    set('foreArmR', 'x', -(180 - angles.elbowR));
    set('upArmL', 'z', (angles.shoulderL - 45) * 0.5);
    set('upArmR', 'z', -(angles.shoulderR - 45) * 0.5);
    set('shinL', 'x', (180 - angles.kneeL));
    set('shinR', 'x', (180 - angles.kneeR));
    set('thighL', 'x', -(180 - angles.hipL) * 0.5);
    set('thighR', 'x', -(180 - angles.hipR) * 0.5);
    set('spine', 'x', angles.trunk * 0.3 * deg);

    return angles;
  }
}
