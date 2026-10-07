// BAYONA — Personal Hub domain model.
// Datos reales primero: el Hub representa el estado; no inventa métricas.

export const DEFAULT_PROGRESS_REVIEW_DAYS = 28;

export const HUB_FOCUS = Object.freeze({
  hoy:       { env:"home", cam:[0,1.15,3.3],  tgt:[0,0.95,0], action:"idle" },
  training:  { env:"gym", cam:[1.15,1.32,3.25],tgt:[0,0.98,0], action:"idle" },
  nutrition: { env:"kitchen", cam:[-1.05,1.22,3.15],tgt:[0,0.92,0], action:"sit" },
  recovery:  { env:"recovery", cam:[-.72,1.3,3.3],tgt:[0,0.9,0], action:"stretch" },
  progress:  { env:"home", cam:[.82,1.18,3.0],tgt:[0,0.96,0], action:"idle" },
  core:      { env:"home", cam:[0,1.28,2.8],tgt:[0,1.0,0], action:"idle" },
  plan:      { env:"lab", cam:[-.55,1.36,3.5],tgt:[0,1.05,-.4], action:"idle" },
  armory:    { env:"locker", cam:[0,1.08,2.55],tgt:[0,0.96,0], action:"idle" },
});

const validDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function defaultProgressReviewAt(from = new Date(), days = DEFAULT_PROGRESS_REVIEW_DAYS) {
  const start = validDate(from) || new Date();
  const d = new Date(start);
  d.setDate(d.getDate() + Math.max(1, Number(days) || DEFAULT_PROGRESS_REVIEW_DAYS));
  return d.toISOString();
}

export function progressReviewStatus(profile = {}, now = new Date()) {
  const next = validDate(profile.nextProgressReviewAt);
  if (!next) return { status:"unscheduled", nextAt:null, days:null };
  const today = validDate(now) || new Date();
  const diff = Math.ceil((next.getTime() - today.getTime()) / 864e5);
  return {
    status: diff < 0 ? "overdue" : diff === 0 ? "today" : "scheduled",
    nextAt: next.toISOString(),
    days: diff,
  };
}

export function coachPulse({ profile = {}, today = {}, active = null, workout = null } = {}) {
  const coach = String(profile.coachPersona || "sebastian").toLowerCase();
  if (today.trained) return { coach, state:"recovery", key:"hub.coach.done" };
  if (active && !["completada","abandonada"].includes(active.status)) {
    return { coach, state:"resume", key:"hub.coach.resume" };
  }
  if (today.energy == null) return { coach, state:"checkin", key:"hub.coach.checkin" };
  if (!workout) return { coach, state:"rest", key:"hub.coach.rest" };
  if (today.energy <= 4) return { coach, state:"low-energy", key:"hub.coach.lowEnergy" };
  return { coach, state:"ready", key:"hub.coach.ready" };
}

export function sessionJourney({ today = {}, active = null, workout = null } = {}) {
  const checkinDone = [today.energy,today.sleep,today.soreness,today.stress].some((v)=>v != null);
  const sessionStarted = Boolean(today.startedWorkout || active);
  const logged = Math.max(0,Number(active?.logged || today.trainingSets || 0));
  const planned = Math.max(0,Number(active?.plannedSets || 0));
  const workDone = Boolean(today.trained) || (planned > 0 && logged >= planned);
  const finished = Boolean(today.trained);
  const pct = planned > 0 ? Math.min(100,Math.round((logged/planned)*100)) : (sessionStarted ? null : 0);

  return [
    { id:"checkin", state:checkinDone?"done":"current", progress:checkinDone?100:0 },
    { id:"session", state:finished?"done":sessionStarted?"current":checkinDone&&workout?"available":"locked", progress:finished?100:pct },
    { id:"close", state:finished?"done":sessionStarted?"available":"locked", progress:finished?100:0 },
    { id:"reward", state:finished?"claimable":"locked", progress:finished?100:0 },
  ];
}

export function hubSnapshot({ data = {}, level = null, rank = null, workout = null, active = null, now = new Date() } = {}) {
  const profile = data.profile || {};
  const today = data.today || {};
  const lvl = level || { lvl:1,cur:0,need:250 };
  const review = progressReviewStatus(profile,now);
  const journey = sessionJourney({today,active,workout});

  return {
    name: profile.name && profile.name !== "TÚ" ? profile.name : null,
    face: profile.face || null,
    coachPersona: profile.coachPersona || "sebastian",
    membershipPlan: profile.membershipPlan || "free",
    goal: profile.goalPrimary || profile.goal || null,
    level: Math.max(1,Number(lvl.lvl)||1),
    rank: rank || null,
    xp: {
      current: Math.max(0,Number(lvl.cur)||0),
      need: Math.max(1,Number(lvl.need)||250),
      pct: Math.min(100,Math.round(((Number(lvl.cur)||0)/(Number(lvl.need)||250))*100)),
    },
    fitCoins: Math.max(0,Number(data.credits)||0),
    points: Math.max(0,Number(data.points)||0),
    streak: Math.max(0,Number(data.streak)||0),
    workouts: Math.max(0,Number(data.stats?.workouts)||0),
    sets: Math.max(0,Number(data.stats?.sets)||0),
    prs: Math.max(0,Number(data.stats?.prs)||0),
    review,
    coachPulse: coachPulse({profile,today,active,workout}),
    journey,
    session: {
      hasWorkout:Boolean(workout),
      pending:Boolean(active && !["completada","abandonada"].includes(active.status)),
      trained:Boolean(today.trained),
      logged:Math.max(0,Number(active?.logged || today.trainingSets || 0)),
      planned:Math.max(0,Number(active?.plannedSets || 0)),
    },
  };
}

export function focusPreset(section) {
  return HUB_FOCUS[String(section || "hoy")] || HUB_FOCUS.hoy;
}
