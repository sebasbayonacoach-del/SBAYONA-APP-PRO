// BAYONA — Sesión viva domain model.
// Fases y resúmenes se derivan de trabajo registrado; no inventa progreso.

export const SESSION_PHASES = Object.freeze([
  { id:"initial", label:"FASE INICIAL", title:"Preparación" },
  { id:"central", label:"FASE CENTRAL", title:"Trabajo principal" },
  { id:"final", label:"FASE FINAL", title:"Cierre" },
]);

export const SET_FEELINGS = Object.freeze([
  { id:"smooth", label:"Fluida" },
  { id:"solid", label:"Sólida" },
  { id:"hard", label:"Me costó" },
  { id:"very_hard", label:"Muy dura" },
  { id:"pain", label:"Dolor / molestia" },
]);

export function normalizeSetFeedback(input = {}) {
  const feeling = SET_FEELINGS.some((x)=>x.id===input.feeling) ? input.feeling : null;
  const note = String(input.note || "").trim().replace(/\s+/g," ").slice(0,180);
  const effort = Number(input.effort);
  return {
    feeling,
    note,
    effort: Number.isFinite(effort) ? Math.max(1,Math.min(5,Math.round(effort))) : null,
  };
}

export function sessionPhase(session = {}) {
  const planned = Math.max(0,Number(session.plannedSets)||0);
  const logged = Math.max(0,Number(session.logged)||0);
  if (planned > 0 && logged >= planned) return SESSION_PHASES[2];
  if (logged <= 0) return SESSION_PHASES[0];
  return SESSION_PHASES[1];
}

export function sessionCompletion(session = {}) {
  const planned = Math.max(0,Number(session.plannedSets)||0);
  const logged = Math.max(0,Number(session.logged)||0);
  const complete = planned > 0 && logged >= planned;
  return {
    complete,
    logged,
    planned,
    pct: planned > 0 ? Math.min(100,Math.round((logged/planned)*100)) : 0,
  };
}

export function exerciseCheckpoint(session = {}) {
  const exercises = Array.isArray(session.exercises) ? session.exercises : [];
  const idx = Math.max(0,Math.min(exercises.length,Number(session.exIdx)||0));
  return {
    current: exercises.length ? Math.min(exercises.length,idx+1) : 0,
    total: exercises.length,
    done: idx >= exercises.length,
  };
}

export function completionDelta(before = {}, after = {}, reward = null) {
  const bLevel=Number(before.level)||1,aLevel=Number(after.level)||bLevel;
  const bCredits=Math.max(0,Number(before.credits)||0),aCredits=Math.max(0,Number(after.credits)||0);
  const bPoints=Math.max(0,Number(before.points)||0),aPoints=Math.max(0,Number(after.points)||0);
  return {
    levelBefore:bLevel,
    levelAfter:aLevel,
    leveledUp:aLevel>bLevel,
    fitCoinsGained:Math.max(0,aCredits-bCredits),
    fitCoinsTotal:aCredits,
    pointsGained:Math.max(0,aPoints-bPoints),
    pointsTotal:aPoints,
    completionXp:Math.max(0,Number(reward?.xp)||0),
  };
}

export function sessionPath(session = {}) {
  const completion=sessionCompletion(session);
  const ex=exerciseCheckpoint(session);
  return {
    phase:sessionPhase(session).id,
    progress:completion.pct,
    exercise:ex,
    canComplete:completion.complete,
  };
}
