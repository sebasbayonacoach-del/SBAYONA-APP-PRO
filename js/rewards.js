// ============================================================
// BAYONA — RECOMPENSAS · FUENTE ÚNICA DE VERDAD
// Regla del README: "pagar no compra nivel" — el XP premia el trabajo REAL.
// TODA recompensa (preview en catálogo, registro en sesión, resumen final e
// historial) se calcula AQUÍ. Ningún otro módulo inventa cifras de XP.
// Ética: sin recompensa por fatiga extrema, dolor ni superar lo planificado.
// ============================================================

export const RULES = {
  set: { base: 8, perRep: 4, perSecond: 0.4, cap: 120, tech: { high: 90, highXP: 6, ok: 75, okXP: 3 } },
  pr: { xp: 350, points: 60, skill: "strength", skillGain: 2 },
  workout: { base: 120, perMin: 4, pointsBase: 180, pointsPerMin: 4, fitcoins: 20 },
  meal: { xp: 15, skill: "discipline" },
  water: { xp: 8, skill: "recovery" },
  steps: { perStepDiv: 12, skill: "cardio" },
  mind: { perMin: 6, skill: "mind" },
  mobility: { xp: 45, skill: "mobility" },
  healthMap: { base: 40, perLayer: 4, cap: 20, skill: "discipline" },
  // bonos de MISIÓN DIARIA (una sola vez por misión y por día; el trabajo
  // en sí ya se premia arriba — aquí solo el bono de cumplir la misión)
  mission: {
    m_pasos: 50,     // caminar 8.000 pasos
    m_comida: 25,    // registrar tus 3 comidas
    m_mente: 35,     // 5 min de mente
    m_agua: 30,      // meta alta de hidratación (2,5 L)
    default: 20,
  },
  // TRABAJO / PRODUCTIVIDAD SALUDABLE (con tope diario: sano ≠ compulsivo)
  work: {
    foco:  { xp: 30, cap: 6, skill: "discipline" },  // bloques de foco 25/5
    pausa: { xp: 25, cap: 8, skill: "mobility" },    // pausas activas de escritorio
  },
};

const SKILL_OF = {
  squat: "strength", bench: "strength", deadlift: "strength", ohp: "strength",
  pullup: "strength", row: "strength", pushup: "strength", hipthrust: "strength",
  burpee: "cardio", curl: "strength",
  lunge: "mobility", mobility: "mobility", plank: "recovery", breathing: "mind",
  // claves del GEMELO-1 (cámara)
  press: "strength",
};

/**
 * Recompensa de UNA serie registrada (manual o con cámara GEMELO-1).
 * Misma fórmula siempre: lo anunciado = lo recibido = lo guardado.
 * @param {{reps?:number, seconds?:number, formScore?:number|null, exercise?:string}} set
 * @returns {{xp:number, skill:string, skillGain:number, text:string}}
 */
export function setReward({ reps = 0, seconds = 0, formScore = null, exercise = "squat" } = {}) {
  const R = RULES.set;
  const work = seconds > 0 ? seconds * R.perSecond : reps * R.perRep;
  const base = Math.min(R.cap, Math.round(R.base + work));
  // la técnica SOLO puntúa si hay medida real (cámara); nunca se inventa
  const tech = formScore == null ? 0
    : formScore >= R.tech.high ? R.tech.highXP
      : formScore >= R.tech.ok ? R.tech.okXP
        : 0;
  const xp = base + tech;
  const skill = SKILL_OF[exercise] || "strength";

  const t = formScore == null
    ? seconds > 0 ? `${Math.round(seconds)} s registrados`
      : `${reps} reps registradas`
    : `${reps} reps · técnica ${formScore}/100`;
  return { xp, skill, skillGain: 1, text: t };
}

/** Récord personal (solo cuando el dominio confirma PR real). */
export function prReward() {
  const R = RULES.pr;
  return { xp: R.xp, points: R.points, skill: R.skill, skillGain: R.skillGain, text: "RÉCORD PERSONAL" };
}

/**
 * Bono de FINALIZACIÓN de sesión (las series ya se premiaron al registrarse:
 * aquí NO se vuelven a contar — doble XP eliminado).
 * Se concede una sola vez por sesión y por día.
 */
export function workoutCompleteReward({ minutes = 30, loggedSets = 0, plannedSets = 0 } = {}) {
  const R = RULES.workout;
  const xp = R.base + Math.round(minutes * R.perMin);
  const points = R.pointsBase + Math.round(minutes * R.pointsPerMin);
  const partial = plannedSets > 0 && loggedSets < plannedSets;
  return {
    xp, points, fitcoins: R.fitcoins, skill: "discipline", skillGain: 1,
    text: partial
      ? `Sesión cerrada antes de tiempo: ${loggedSets}/${plannedSets} series · se guarda lo registrado`
      : `Sesión completada · ${loggedSets} series`,
  };
}

/**
 * Preview de una sesión completa usando EXACTAMENTE la fórmula de setReward.
 * Es lo que se anuncia en el catálogo y en la tarjeta de misión.
 */
export function previewWorkoutXP(workout) {
  let xp = 0;
  const perExercise = [];
  for (const e of workout?.exercises || []) {
    const timed = e.timed || e.ex === "plank" || e.ex === "mobility" || e.ex === "breathing";
    let exXP = 0;
    for (let i = 0; i < e.sets; i++) {
      exXP += setReward({ reps: timed ? 0 : e.reps, seconds: timed ? e.reps : 0, exercise: e.ex }).xp;
    }
    perExercise.push({ ex: e.ex, xp: exXP });
    xp += exXP;
  }
  return { xp, perExercise };
}

export function mealReward() {
  return { xp: RULES.meal.xp, skill: RULES.meal.skill, skillGain: 1, text: "Comida registrada" };
}
export function waterReward(ml = 250) {
  return { xp: RULES.water.xp, skill: RULES.water.skill, skillGain: 1, text: `Hidratación +${ml} ml` };
}
export function stepsReward(n = 0) {
  return { xp: Math.max(1, Math.round(n / RULES.steps.perStepDiv)), skill: RULES.steps.skill, skillGain: 1, text: `${n} pasos` };
}
export function mindReward(min = 0) {
  return { xp: Math.round(min * RULES.mind.perMin), skill: RULES.mind.skill, skillGain: 1, text: `${min} min de mente` };
}
export function mobilityReward() {
  return { xp: RULES.mobility.xp, skill: RULES.mobility.skill, skillGain: 1, text: "Movilidad completada" };
}
/**
 * Bono de MISIÓN DIARIA reclamada. Idempotente por diseño: el estado solo
 * concede UNA vez por misión y por día (S.claimMission).
 */
export function missionReward(id = "") {
  const xp = RULES.mission[id] ?? RULES.mission.default;
  return { xp, skill: "discipline", skillGain: 1, text: "Misión del día cumplida" };
}

/** Bloque de foco completado (25 min de trabajo consciente). */
export function focusReward() {
  const R = RULES.work.foco;
  return { xp: R.xp, skill: R.skill, skillGain: 1, text: "Bloque de foco completado" };
}

/** Pausa activa de escritorio (movilidad mientras trabajas). */
export function activePauseReward() {
  const R = RULES.work.pausa;
  return { xp: R.xp, skill: R.skill, skillGain: 1, text: "Pausa activa completada" };
}

export function healthMapReward(hm = {}) {
  const R = RULES.healthMap;
  const layers = (hm.priorities || []).length;
  const xp = R.base + Math.min(R.cap, layers * R.perLayer);
  return { xp, skill: R.skill, skillGain: 1, text: "Mapa de salud completado" };
}
