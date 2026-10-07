// ============================================================
// BAYONA — ESTADO: persistencia, economía, métricas derivadas
// Regla: el avatar progresa solo si la persona progresa.
// Todo XP sale de js/rewards.js (fuente única). Fechas LOCALES.
// Esquema versionado con migración conservadora (nunca reinicia una
// partida válida por añadir campos).
// ============================================================
import { RANKS, ITEMS, WORKOUTS, MACRO, MEALS, EXERCISES, phaseOfWeek } from "./data.js";
import { profileWeek, personalizeWorkout } from "./personalization.js";
import { deleteCycle, readCycle } from "./cycle.js";
import { resetConsents } from "./consents.js";
import { defaultProgressReviewAt } from "./hub.js";
import {
  nutritionDefaults, normalizeNutritionPreferences, normalizeNutritionGoals,
  normalizeWeeklyPlan, NUTRITION_FEELINGS,
} from "./nutrition-calendar.js";
import {
  recoveryDefaults, normalizeRecoveryPreferences, normalizeActivePause,
  normalizeRecoveryPractice, normalizeOtherActivity, wearableSnapshot,
} from "./recovery-sleep.js";
import {
  setReward, prReward, workoutCompleteReward, mealReward, waterReward,
  stepsReward, mindReward, mobilityReward, healthMapReward, missionReward,
  focusReward, activePauseReward,
} from "./rewards.js";
import { respaldar, guardarSeguro, recuperar } from "./backup.js";
import { memoryDefaults, addMemoryEvent, updateMemoryStatus } from "./coach/memory.js";
import {
  coachCrmDefaults, upsertCrmClient, addCrmRecord, updateCrmRecordStatus,
} from "./coach/crm.js";

const KEY = "bayona.save.v2";
export const SCHEMA = 9;

/**
 * Recompensa por nivel. Vive fuera del objeto S y en orden: se recorre
 * al subir de nivel, y recorrer 3.000.000 de enteros para encontrar 7
 * recompensas cuelga el navegador.
 */
const RECOMPENSA_NIVEL = {
  2:  { credits: 80,  item: "ember_tee" },
  3:  { credits: 60,  item: "sprint_shorts" },
  5:  { credits: 120, item: "pulse_cans" },
  7:  { credits: 100, item: "focus_straps" },
  10: { credits: 200, item: "apex_jacket" },
  14: { credits: 150, item: "ghost_kicks" },
  20: { credits: 300, item: "titan_hoodie" },
};
const NIVEL_RECOMPENSA = Object.keys(RECOMPENSA_NIVEL).map(Number).sort((a, b) => a - b);

/**
 * Curva de niveles. need(n) = 250 + (n-1)·180, y el total para llegar
 * al nivel L es 90·L² + 160·L.
 *
 * Antes de esto el nivel se buscaba restando 250 en bucle: con una
 * partida corrupta (xp = 1e30) eran 3·10¹⁴ vueltas y el navegador se
 * colgaba en blanco. Ahora se resuelve con la inversa de la cuadrática
 * y se corrige a lo sumo un par de pasos por error de coma flotante.
 */
const CURVA_A = 90;   // 180/2
const CURVA_B = 160;  // 250 - 90
/** Techo de seguridad: 1e9 XP ≈ nivel 3333. Nadie llega, pero un dato
 *  corrupto no puede colgarnos la app ni al calcularlo ni al guardarlo. */
const XP_TECHO = 1e9;
const SANA = (n, techo = XP_TECHO) =>
  (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.min(n, techo) : 0);
/**
 * Acepta un número real (o cadena numérica) y RECHAZA NaN, Infinity,
 * booleanos y null/undefined: si no es un número usable devuelve null.
 * Sin esto, un 0 pillado en un campo de texto envenenaba el contador
 * para siempre («NaN min de mente»).
 */
const numero = (n) => {
  if (n === null || n === undefined || n === "" || typeof n === "boolean") return null;
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : null;
};
/** Igual, pero recortado a un rango. null si no hay número usable. */
const enRango = (n, min, max) => {
  const v = numero(n);
  return v === null ? null : Math.min(max, Math.max(min, v));
};
/** Techo de la cartera: ni NaN ni «un millón de créditos» por error. */
const CARTERA_TECHO = 1e6;

const xpTotalHasta = (l) => CURVA_A * l * l + CURVA_B * l;
const nivelDeXp = (xp) => {
  if (!(xp > 0)) return 1;
  // Se limita al techo: sin esto, un Infinity (JSON.parse("1e400") lo
  // produce) hacía que lvl-- no progresara nunca y colgara en bucle.
  const x = Math.min(xp, XP_TECHO);
  const n = Math.floor((-CURVA_B + Math.sqrt(CURVA_B * CURVA_B + 4 * CURVA_A * x)) / (2 * CURVA_A));
  let lvl = Math.max(1, Math.min(n + 1, Math.ceil(Math.sqrt(XP_TECHO / CURVA_A)) + 2));
  // corrección: la raíz puede perderse un nivel por redondeo
  while (lvl > 1 && xpTotalHasta(lvl - 1) > x) lvl--;
  while (xpTotalHasta(lvl) <= x) lvl++;
  return lvl;
};

const listeners = {};
export function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
export function emit(evt, data) { (listeners[evt] || []).forEach((f) => f(data)); }

/** Fecha local (NUNCA UTC): el día del usuario cambia a medianoche local. */
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function freshToday() {
  return {
    date: todayKey(),
    water: 0,                 // ml registrados por el usuario
    meals: [],                // [{id, name, kcal, p, c, f, at}]
    kcal: 0, p: 0, c: 0, f: 0,
    steps: 0,
    trained: false,           // sesión COMPLETADA hoy
    startedWorkout: false,    // sesión iniciada (aunque quede parcial)
    trainingSets: 0,
    setKeys: [],              // idempotencia: claves de series ya premiadas
    mobility: false,
    mind: 0,                  // minutos
    fib: 0,                   // fibra (g)
    sleep: null,              // horas — null = sin registrar (no se inventa)
    soreness: null,           // 0-10 — null = sin registrar
    energy: null,             // 0-10 — null = sin registrar
    stress: null,             // 0-10 — null = sin registrar
    nutritionFeeling: null,   // contexto de comida — null = sin registrar
    workoutDone: null,
    xpGained: 0,
    missionKeys: [],       // idempotencia: misiones del día YA reclamadas
    workBlocks: 0,         // bloques de foco completados (con tope sano diario)
    activePauses: 0,       // pausas activas de escritorio
    postureChecks: 0,      // checklists de postura (registro, sin XP)
    nightRoutine: [],      // rutina nocturna cumplida (ids de pasos)
    sleepBedAt: null,
    sleepWakeAt: null,
    sleepSource: null,       // manual | wearable
    recoveryPractices: [],   // prácticas reales registradas hoy
    otherActivities: [],     // otros deportes/actividad fuera del plan
    recoveryNote: "",
  };
}

function freshProfile() {
  return {
    name: "",
    goal: "BIENESTAR Y ADHERENCIA",          // compatibilidad v2
    goalPrimary: "BIENESTAR Y ADHERENCIA",
    goals: ["BIENESTAR Y ADHERENCIA"],
    customGoals: [],
    skin: 0,
    coach: "MENTOR",                         // tono del asistente legado
    coachPersona: "sebastian",               // identidad visual/acompañamiento
    created: Date.now(),
    onboarded: false,
    onboardingVersion: 0,
    onboardingCompletedAt: null,
    experience: null,
    availability: null,                      // compatibilidad con planificador actual
    equipment: null,                         // compatibilidad con planificador actual
    trainingPlaces: [],
    customPlaces: [],
    weeklyAvailability: { days: [], preferredWindows: [], difficultDays: [] },
    preferredSessionRange: [],
    sessionMinutes: 30,
    birthDate: null,
    ageBand: null,
    developmentProfile: null,
    physiologySex: "unspecified",
    displayIdentity: null,
    membershipPlan: "free",
    healthScreening: null,
    notificationPreferences: { morning:false, preTraining:false, evening:false, asked:false },
    firstRunTour: { version: 0, completed:false, skipped:false, step:0 },
    nextProgressReviewAt: null,
    heightCm: null, weightKg: null, age: null, face: null, skinHex: null,
    avatar3d: null, // descriptor { provider, avatarId, urlType, cacheKey, httpUrl, at }
  };
}

export const S = {
  data: null,
  storageFailed: false,

  init() {
    let raw = null;
    let motivo = null;
    try {
      raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // Un save puede PARSEAR sin ser una partida: "texto", 0, [], 7.
      // Eso no son datos de juego: se trata como corrupción (se conserva
      // copia y se busca una instantánea) en vez de propagarlo a la UI.
      this.data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
      if (raw && !this.data) motivo = "forma";
    } catch (e) {
      this.data = null;
      motivo = "parseo";
    }
    if (motivo) {
      // corrupción: conserva copia para recuperación, no pierda en silencio
      try { if (raw) localStorage.setItem("bayona.save.corrupt", raw); } catch { /* sin storage */ }
      this.storageFailed = true;
      emit("storage-error", { where: "load", recoverable: true });
    }
    // RED DE SEGURIDAD · si la partida principal no se puede leer,
    // se busca la última instantánea válida antes de empezar de cero.
    if (!this.data) {
      const r = recuperar();
      if (r) {
        this.data = r.data;
        this.recoveredFrom = r.de;
        emit("storage-recovered", { de: r.de });
      }
    }
    if (!this.data) this.reset(true);
    this.migrate();
    this.rollDay();
    return this.data;
  },

  /** Migración conservadora: añade campos sin romper partidas existentes. */
  migrate() {
    const d = this.data;
    d.schema = d.schema || 2;
    d.profile = { ...freshProfile(), ...(d.profile || {}) };
    // Profile v4: conservar saves antiguos, añadir estructuras nuevas sin borrar nada.
    d.profile.goalPrimary = d.profile.goalPrimary || d.profile.goal || "BIENESTAR Y ADHERENCIA";
    d.profile.goals = Array.isArray(d.profile.goals) && d.profile.goals.length
      ? d.profile.goals
      : [d.profile.goalPrimary];
    d.profile.customGoals = Array.isArray(d.profile.customGoals) ? d.profile.customGoals : [];
    d.profile.trainingPlaces = Array.isArray(d.profile.trainingPlaces) ? d.profile.trainingPlaces : [];
    d.profile.customPlaces = Array.isArray(d.profile.customPlaces) ? d.profile.customPlaces : [];
    d.profile.weeklyAvailability = {
      days: [],
      preferredWindows: [],
      difficultDays: [],
      ...(d.profile.weeklyAvailability && typeof d.profile.weeklyAvailability === "object" ? d.profile.weeklyAvailability : {}),
    };
    d.profile.weeklyAvailability.days = Array.isArray(d.profile.weeklyAvailability.days) ? d.profile.weeklyAvailability.days : [];
    d.profile.weeklyAvailability.preferredWindows = Array.isArray(d.profile.weeklyAvailability.preferredWindows) ? d.profile.weeklyAvailability.preferredWindows : [];
    d.profile.weeklyAvailability.difficultDays = Array.isArray(d.profile.weeklyAvailability.difficultDays) ? d.profile.weeklyAvailability.difficultDays : [];
    d.profile.preferredSessionRange = Array.isArray(d.profile.preferredSessionRange) ? d.profile.preferredSessionRange : [];
    d.profile.membershipPlan = typeof d.profile.membershipPlan === "string" ? d.profile.membershipPlan : "free";
    d.profile.coachPersona = typeof d.profile.coachPersona === "string" ? d.profile.coachPersona : "sebastian";
    d.profile.notificationPreferences = {
      morning:false, preTraining:false, evening:false, asked:false,
      ...(d.profile.notificationPreferences && typeof d.profile.notificationPreferences === "object" ? d.profile.notificationPreferences : {}),
    };
    d.profile.firstRunTour = {
      version:0, completed:false, skipped:false, step:0,
      ...(d.profile.firstRunTour && typeof d.profile.firstRunTour === "object" ? d.profile.firstRunTour : {}),
    };
    d.profile.nextProgressReviewAt = typeof d.profile.nextProgressReviewAt === "string"
      ? d.profile.nextProgressReviewAt
      : null;
    const legacyGoal = {
      FUERZA: "FUERZA Y POTENCIA",
      HIPERTROFIA: "HIPERTROFIA MUSCULAR",
      RESISTENCIA: "RESISTENCIA Y CONDICIÓN FÍSICA",
      SALUD: "BIENESTAR Y ADHERENCIA",
    }[d.profile.goal];
    if (legacyGoal) {
      d.profile.goal = legacyGoal;
      if (!d.profile.goalPrimary || d.profile.goalPrimary === "FUERZA" || d.profile.goalPrimary === "HIPERTROFIA" || d.profile.goalPrimary === "RESISTENCIA" || d.profile.goalPrimary === "SALUD") {
        d.profile.goalPrimary = legacyGoal;
      }
      d.profile.goals = [...new Set([d.profile.goalPrimary, ...d.profile.goals.map((g) => ({
        FUERZA: "FUERZA Y POTENCIA",
        HIPERTROFIA: "HIPERTROFIA MUSCULAR",
        RESISTENCIA: "RESISTENCIA Y CONDICIÓN FÍSICA",
        SALUD: "BIENESTAR Y ADHERENCIA",
      }[g] || g))])];
    }
    d.settings = { sound: true, motion: true, haptics: true, quality: "AUTO", ...(d.settings || {}) };
    d.today = { ...freshToday(), ...(d.today || {}) };
    d.voice = Array.isArray(d.voice) ? d.voice : [];
    d.history = Array.isArray(d.history) ? d.history : [];
    d.medidas = Array.isArray(d.medidas) ? d.medidas : [];
    d.asignaciones = Array.isArray(d.asignaciones) ? d.asignaciones : [];
    d.customRoutines = Array.isArray(d.customRoutines) ? d.customRoutines : [];
    d.diary = Array.isArray(d.diary) ? d.diary : [];
    d.photos = Array.isArray(d.photos) ? d.photos : [];
    d.phygital = d.phygital || { redeemed: [], audit: [] };
    d.consents = d.consents || null; // espejo legado; la fuente vive en js/consents.js
    d.healthFlags = d.healthFlags || null;
    d.nutrition = nutritionDefaults(d.nutrition || {});
    d.recovery = recoveryDefaults(d.recovery || {});
    d.integrations = d.integrations && typeof d.integrations === "object" ? d.integrations : {};
    d.integrations.health = wearableSnapshot(d.integrations);
    d.coachMemory = memoryDefaults(d.coachMemory || {});
    d.coachCrm = coachCrmDefaults(d.coachCrm || {});
    d.today.recoveryPractices = Array.isArray(d.today.recoveryPractices) ? d.today.recoveryPractices : [];
    d.today.otherActivities = Array.isArray(d.today.otherActivities) ? d.today.otherActivities : [];
    d.today.recoveryNote = typeof d.today.recoveryNote === "string" ? d.today.recoveryNote.slice(0, 240) : "";
    d.today.sleepBedAt = typeof d.today.sleepBedAt === "string" ? d.today.sleepBedAt : null;
    d.today.sleepWakeAt = typeof d.today.sleepWakeAt === "string" ? d.today.sleepWakeAt : null;
    d.today.sleepSource = ["manual","wearable"].includes(d.today.sleepSource) ? d.today.sleepSource : null;
    d.plan = d.plan || { week: 1, sessionsDone: {}, custom: {} };
    d.plan.custom = d.plan.custom || {};
    d.activeSession = d.activeSession || null;
    // defensa TOTAL: saves antiguos/parciales obtienen SIEMPRE la forma canónica
    d.xp = Number.isFinite(d.xp) ? d.xp : 0;
    d.points = Number.isFinite(d.points) ? d.points : 0;
    d.credits = Number.isFinite(d.credits) ? d.credits : 120;
    d.skills = { strength: 0, cardio: 0, mobility: 0, recovery: 0, discipline: 0, mind: 0, ...(d.skills || {}) };
    d.stats = { workouts: 0, sets: 0, prs: 0, sessionsMin: 0, km: 0, ...(d.stats || {}) };
    d.streak = Number.isFinite(d.streak) ? d.streak : 0;
    d.freeze = Number.isFinite(d.freeze) ? d.freeze : 2;
    d.lastActiveDay = d.lastActiveDay || null;
    d.inventory = { ...(d.inventory || {}) };
    if (!Array.isArray(d.inventory.owned) || !d.inventory.owned.length) {
      d.inventory.owned = ["core_tee", "core_pants", "core_runners", "sage_wrap"];
    }
    d.inventory.equipped = {
      top: "core_tee", bottom: "core_pants", shoes: "core_runners",
      wrist: null, head: "sage_wrap", back: null, effects: null,
      ...(d.inventory.equipped || {}),
    };
    d.prs = d.prs && typeof d.prs === "object" ? d.prs : {};
    d.journey = Array.isArray(d.journey) ? d.journey : [];
    // comidas: en versiones antiguas eran ids sueltos → objetos completos
    d.today.meals = (d.today.meals || []).map((m) => {
      if (typeof m === "string") {
        const def = MEALS.find((x) => x.id === m);
        return def ? { id: def.id, name: def.name, kcal: def.kcal, p: def.p, c: def.c, f: def.f, at: null } : null;
      }
      return m;
    }).filter(Boolean);
    d.schema = SCHEMA;
  },

  reset(silent) {
    this.data = {
      schema: SCHEMA,
      profile: freshProfile(),
      xp: 0, points: 0, credits: 120,
      skills: { strength: 0, cardio: 0, mobility: 0, recovery: 0, discipline: 0, mind: 0 },
      stats: { workouts: 0, sets: 0, prs: 0, sessionsMin: 0, km: 0 },
      streak: 0, freeze: 2, lastActiveDay: null,
      today: freshToday(),
      inventory: {
        owned: ["core_tee", "core_pants", "core_runners", "sage_wrap"],
        equipped: { top: "core_tee", bottom: "core_pants", shoes: "core_runners", wrist: null, head: "sage_wrap", back: null, effects: null },
      },
      prs: {},
      journey: [],
      plan: { week: 1, sessionsDone: {}, custom: {} },
      history: [],
      settings: { sound: true, motion: true, haptics: true, quality: "AUTO" },
      voice: [],
      medidas: [],
      asignaciones: [],
      customRoutines: [],
      phygital: { redeemed: [], audit: [] },
      consents: null,
      healthFlags: null,
      nutrition: nutritionDefaults(),
      recovery: recoveryDefaults(),
      integrations: { health: wearableSnapshot({}) },
      coachMemory: memoryDefaults(),
      coachCrm: coachCrmDefaults(),
      activeSession: null,
    };
    if (!silent) this.save();
  },

  /** Guarda. Devuelve false y avisa si el almacenamiento falla (nunca en silencio).
   *  Si localStorage está lleno, suelta lo prescindible ANTES de rendirse:
   *  perder un mes de entrenamiento por una nota de voz sería absurdo. */
  save() {
    const r = guardarSeguro(this.data, undefined, KEY);
    if (r.ok) {
      if (this.storageFailed) { this.storageFailed = false; }
      if (r.soltado.length) emit("storage-trimmed", { soltado: r.soltado });
      // red de seguridad: una foto más del estado, solo si ha cambiado
      respaldar(this.data);
      return true;
    }
    this.storageFailed = true;
    emit("storage-error", { where: "save", recoverable: true, motivo: r.error, soltado: r.soltado });
    return false;
  },

  // day rollover + racha (sin castigo: freeze / recuperación)
  rollDay() {
    const d = this.data;
    const tk = todayKey();
    if (d.today.date === tk) return;
    d.history.push({
      date: d.today.date, xp: d.today.xpGained, workouts: d.today.trained ? 1 : 0,
      kcal: d.today.kcal, water: d.today.water,
      sets: d.today.trainingSets, muscles: Object.keys(d.today.muscleSets || {}),
      muscleSets: d.today.muscleSets || {}, prPoints: d.today.prPoints || [],
      setLog: (d.today.setLog || []).slice(-60), // series reales (kg/reps/ex) para las gráficas de progreso (P14)
      strain: d.today.strain || 0,
      sleep: d.today.sleep, soreness: d.today.soreness, energy: d.today.energy, stress: d.today.stress,
      sleepBedAt: d.today.sleepBedAt || null, sleepWakeAt: d.today.sleepWakeAt || null,
      sleepSource: d.today.sleepSource || null,
      recoveryPractices: (d.today.recoveryPractices || []).slice(-20),
      otherActivities: (d.today.otherActivities || []).slice(-20),
      activePauses: d.today.activePauses || 0,
      nightRoutine: (d.today.nightRoutine || []).slice(0, 20),
      recoveryNote: d.today.recoveryNote || "",
      nutritionFeeling: d.today.nutritionFeeling || null,
      meals: (d.today.meals || []).slice(-12).map((m) => ({
        id: m.id, name: m.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, fib: m.fib || 0,
        at: m.at || null, slot: m.slot || null, feeling: m.feeling || null,
      })),
    });
    if (d.history.length > 365) d.history.shift();
    const last = d.lastActiveDay;
    const productive = d.today.trained || d.today.mobility || d.today.mind > 0 || d.today.water >= 1500;
    if (productive) {
      const yesterday = todayKey(new Date(Date.now() - 864e5));
      d.streak = (last === yesterday || last === d.today.date) ? d.streak + 1 : 1;
      d.lastActiveDay = d.today.date;
    } else if (d.freeze > 0 && d.streak > 0) {
      d.freeze--; // congelar racha: un día duro no destruye tu historia
    } else if (last && (Date.now() - new Date(last).getTime()) > 3 * 864e5) {
      d.streak = 0;
    }
    if (d.streak > 0 && d.streak % 7 === 0 && d.plan.week < MACRO.totalWeeks) d.plan.week++;
    d.today = freshToday();
    this.save();
  },

  // ---------- ECONOMÍA ----------
  level() {
    // SANA en vez de una comprobación suelta: además de NaN y negativos,
    // recorta una partida corrupta al techo para que cur y need sean
    // coherentes con el nivel devuelto.
    const xp = SANA(this.data.xp);
    const lvl = nivelDeXp(xp);
    return { lvl, cur: xp - xpTotalHasta(lvl - 1), need: 250 + (lvl - 1) * 180 };
  },
  rank() {
    const lvl = this.level().lvl;
    let r = RANKS[0].name;
    for (const rk of RANKS) if (lvl >= rk.min) r = rk.name;
    return r;
  },
  addXP(amount, skill, skillGain = 1) {
    // Techo de seguridad: ni NaN, ni negativos, ni 1e30 entran en la partida.
    const xp = SANA(Number(amount));
    if (!xp) return false;
    const before = this.level().lvl;
    this.data.xp = Math.min(this.data.xp + xp, XP_TECHO);
    this.data.today.xpGained += xp;
    if (skill && this.data.skills[skill] !== undefined) {
      this.data.skills[skill] += Math.max(skillGain || 1, Math.round(xp / 80));
    }
    const after = this.level().lvl;
    this.save();
    emit("xp", { amount: xp, skill });
    if (after > before) {
      // Desbloqueos intermedios: NUNCA se pierden al subir varios niveles
      // seguidos. OJO: se recorren SOLO los niveles que tienen recompensa,
      // no todos los enteros entre before y after. Un salto enorme (una
      // partida corrupta, un error de cálculo) convertía esto en un bucle
      // de millones de vueltas que colgaba el navegador.
      for (const l of NIVEL_RECOMPENSA) {
        if (l > before && l <= after) this.unlockForLevel(l);
      }
      emit("levelup", { lvl: after });
    }
    return after > before;
  },
  addPoints(n) {
    const v = enRango(n, 0, CARTERA_TECHO);
    if (!v) return false;
    this.data.points = Math.min(this.data.points + v, CARTERA_TECHO);
    this.save(); emit("wallet");
    return true;
  },
  addCredits(n) {
    const v = enRango(n, 0, CARTERA_TECHO);
    if (!v) return false;
    this.data.credits = Math.min(this.data.credits + v, CARTERA_TECHO);
    this.save(); emit("wallet");
    return true;
  },

  unlockForLevel(lvl) {
    const r = RECOMPENSA_NIVEL[lvl];
    if (r) {
      if (r.credits) this.addCredits(r.credits);
      if (r.item && !this.data.inventory.owned.includes(r.item)) {
        this.data.inventory.owned.push(r.item);
        emit("itemUnlock", { id: r.item });
      }
      this.save();
    }
  },

  // ---------- HÁBITOS (todo es registro REAL del usuario) ----------
  drink(ml) {
    const v = enRango(ml, 1, 2000);
    if (v === null) return null;
    const r = waterReward(v);
    this.data.today.water = Math.min(6000, this.data.today.water + v);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return { total: this.data.today.water, ...r };
  },
  /** comida registrada: objeto completo (o id de MEALS). Los presets valen 1 vez/día. */
  eat(meal) {
    const m = typeof meal === "string" ? MEALS.find((x) => x.id === meal) : meal;
    if (!m || typeof m !== "object") return null;
    const t = this.data.today;
    const id = typeof m.id === "string" ? m.id : null;
    if (id && !m.custom && t.meals.some((x) => x.id === id)) return null; // sin doble premio

    const kcal = enRango(m.kcal, 0, 5000) ?? 0;
    const p = enRango(m.p, 0, 1000) ?? 0;
    const c = enRango(m.c, 0, 1500) ?? 0;
    const f = enRango(m.f, 0, 1000) ?? 0;
    const fib = enRango(m.fib, 0, 200) ?? 0;
    const name = typeof m.name === "string" && m.name.trim() ? m.name.slice(0, 120) : "Comida";

    // Se permite registrar la hora real de HOY; nunca una comida futura.
    let at = new Date();
    if (typeof m.at === "string") {
      const requested = new Date(m.at);
      if (!Number.isNaN(requested.getTime()) && todayKey(requested) === t.date && requested.getTime() <= Date.now() + 5 * 60_000) {
        at = requested;
      }
    }
    const slot = typeof m.slot === "string" ? m.slot.slice(0, 24) : null;
    const feeling = NUTRITION_FEELINGS.includes(m.feeling) ? m.feeling : null;
    const note = typeof m.note === "string" ? m.note.trim().slice(0, 180) : "";
    const qty = enRango(m.qty, 0, 10000);
    const unit = typeof m.unit === "string" ? m.unit.slice(0, 16) : null;

    t.meals.push({
      id: id || `custom_${Date.now()}`, name, kcal, p, c, f, fib,
      at: at.toISOString(), slot, feeling, note, qty, unit,
    });
    t.kcal += kcal; t.p += p; t.c += c; t.f += f; t.fib += fib;
    const r = mealReward();
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },

  setNutritionFeeling(value) {
    const next = NUTRITION_FEELINGS.includes(value) ? value : null;
    this.data.today.nutritionFeeling = next;
    this.save(); emit("today");
    return next;
  },

  updateNutritionPreferences(patch = {}) {
    const current = this.data.nutrition?.preferences || {};
    this.data.nutrition = nutritionDefaults(this.data.nutrition || {});
    this.data.nutrition.preferences = normalizeNutritionPreferences({ ...current, ...patch });
    this.save(); emit("nutrition");
    return this.data.nutrition.preferences;
  },

  updateNutritionGoals(patch = {}, source = "user") {
    const current = this.data.nutrition?.goals || {};
    this.data.nutrition = nutritionDefaults(this.data.nutrition || {});
    this.data.nutrition.goals = normalizeNutritionGoals({
      ...current, ...patch, configured: true,
      source: source === "coach" ? "coach" : "user",
    });
    this.save(); emit("nutrition");
    return this.data.nutrition.goals;
  },

  setNutritionDayPlan(dayIndex, entries = []) {
    const i = Math.trunc(Number(dayIndex));
    if (i < 0 || i > 6 || !Number.isFinite(i)) return false;
    this.data.nutrition = nutritionDefaults(this.data.nutrition || {});
    const normalized = normalizeWeeklyPlan({ [i]: entries })[i];
    this.data.nutrition.weeklyPlan[i] = normalized;
    this.save(); emit("nutrition");
    return normalized;
  },

  addSteps(n) {
    const v = enRango(n, 0, 100000);
    if (v === null) return null;
    const r = stepsReward(v);
    this.data.today.steps += v;
    this.data.stats.km = +(this.data.stats.km + v / 1300).toFixed(1);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },
  /* Registros subjetivos: null = SIN registrar (nunca se inventa un dato).
     Una entrada que no es número se ignora en vez de guardarse como NaN. */
  logSleep(h) { return this._registro("sleep", h, 0, 24, false); },
  logSoreness(v) { return this._registro("soreness", v, 0, 10, true); },
  logEnergy(v) { return this._registro("energy", v, 0, 10, true); },
  logStress(v) { return this._registro("stress", v, 0, 10, true); },

  setSleepSchedule(patch = {}) {
    this.data.recovery = recoveryDefaults(this.data.recovery || {});
    this.data.recovery.preferences = normalizeRecoveryPreferences({
      ...(this.data.recovery.preferences || {}),
      ...(patch || {}),
    });
    this.save(); emit("recovery");
    return this.data.recovery.preferences;
  },

  setActivePauseSchedule(patch = {}) {
    this.data.recovery = recoveryDefaults(this.data.recovery || {});
    this.data.recovery.activePause = normalizeActivePause({
      ...(this.data.recovery.activePause || {}),
      ...(patch || {}),
    });
    this.save(); emit("recovery");
    return this.data.recovery.activePause;
  },

  logSleepWindow({ hours, bedAt = null, wakeAt = null, source = "manual" } = {}) {
    const ok = this.logSleep(hours);
    if (!ok) return false;
    const parse = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    };
    this.data.today.sleepBedAt = parse(bedAt);
    this.data.today.sleepWakeAt = parse(wakeAt);
    this.data.today.sleepSource = source === "wearable" ? "wearable" : "manual";
    this.save(); emit("today");
    return {
      hours: this.data.today.sleep,
      bedAt: this.data.today.sleepBedAt,
      wakeAt: this.data.today.sleepWakeAt,
      source: this.data.today.sleepSource,
    };
  },

  addRecoveryPractice(input = {}) {
    const rec = normalizeRecoveryPractice(input);
    this.data.today.recoveryPractices = Array.isArray(this.data.today.recoveryPractices)
      ? this.data.today.recoveryPractices : [];
    if (!rec) return null;
    this.data.today.recoveryPractices.push(rec);
    this.data.today.recoveryPractices = this.data.today.recoveryPractices.slice(-20);
    this.save(); emit("today");
    return rec;
  },

  addOtherActivity(input = {}) {
    const rec = normalizeOtherActivity(input);
    this.data.today.otherActivities = Array.isArray(this.data.today.otherActivities)
      ? this.data.today.otherActivities : [];
    if (!rec) return null;
    this.data.today.otherActivities.push(rec);
    this.data.today.otherActivities = this.data.today.otherActivities.slice(-20);
    this.save(); emit("today");
    return rec;
  },

  setRecoveryNote(value = "") {
    this.data.today.recoveryNote = String(value || "").trim().replace(/\s+/g, " ").slice(0, 240);
    this.save(); emit("today");
    return this.data.today.recoveryNote;
  },

  /** Solo para una integración verificada: nunca se marca conectado desde la UI por sí sola. */
  setWearableState(input = {}) {
    const snap = wearableSnapshot({ health: input });
    this.data.integrations = this.data.integrations && typeof this.data.integrations === "object"
      ? this.data.integrations : {};
    this.data.integrations.health = {
      connected: snap.connected,
      provider: snap.provider,
      lastSyncAt: snap.lastSyncAt,
      metrics: { ...snap.metrics },
    };
    this.save(); emit("recovery");
    return this.data.integrations.health;
  },

  upsertCoachCrmClient(input = {}) {
    const before = this.data.coachCrm || coachCrmDefaults();
    const next = upsertCrmClient(before, input);
    if (JSON.stringify(before) === JSON.stringify(next)) return null;
    this.data.coachCrm = next;
    const rec = next.clients.find((x) => x.id === input.id) || next.clients.at(-1) || null;
    this.save(); emit("coach-crm", { kind: "clients", record: rec });
    return rec;
  },

  addCoachCrmRecord(kind, input = {}) {
    const before = this.data.coachCrm || coachCrmDefaults();
    const next = addCrmRecord(before, kind, input);
    if (JSON.stringify(before) === JSON.stringify(next)) return null;
    this.data.coachCrm = next;
    const list = next[kind] || [];
    const rec = input.id ? list.find((x) => x.id === input.id) : list.at(-1);
    this.save(); emit("coach-crm", { kind, record: rec || null });
    return rec || null;
  },

  updateCoachCrmStatus(kind, id, status) {
    const current = this.data.coachCrm || coachCrmDefaults();
    const result = updateCrmRecordStatus(current, kind, id, status);
    if (!result.changed) return false;
    this.data.coachCrm = result.crm;
    this.save(); emit("coach-crm", { kind, record: result.record });
    return true;
  },

  rememberCoachEvent(event = {}) {
    const before = this.data.coachMemory?.events?.length || 0;
    this.data.coachMemory = addMemoryEvent(this.data.coachMemory || {}, event);
    const rec = this.data.coachMemory.events.at(-1) || null;
    if ((this.data.coachMemory.events.length || 0) !== before || rec?.id === event.id) {
      this.save(); emit("coach-memory", rec);
    }
    return rec;
  },

  updateCoachMemoryStatus(id, status) {
    const current = this.data.coachMemory || memoryDefaults();
    const existing = current.events?.find((x) => x.id === id);
    if (!existing || existing.status === status) return false;
    const next = updateMemoryStatus(current, id, status);
    this.data.coachMemory = next;
    this.save(); emit("coach-memory", { id, status });
    return true;
  },

  /** Escala 0-10 redondeada; fuera de rango o no numérico → se ignora. */
  _registro(campo, valor, min, max, entero) {
    let v = enRango(valor, min, max);
    if (v === null) return false;
    if (entero) v = Math.round(v);
    this.data.today[campo] = v;
    this.save(); emit("today");
    return true;
  },
  logMind(min) {
    const v = enRango(min, 0, 600);
    if (v === null || v <= 0) return mindReward(0);
    const r = mindReward(v);
    this.data.today.mind = Math.min(1440, this.data.today.mind + v);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },

  /** Corrección de una serie registrada por error: deshace TODO lo que generó. */
  undoSet(r) {
    if (!r) return false;
    const t = this.data.today;
    t.setKeys = (t.setKeys || []).filter((k) => k !== r.idKey);
    t.trainingSets = Math.max(0, t.trainingSets - 1);
    this.data.stats.sets = Math.max(0, this.data.stats.sets - 1);
    this.data.xp = Math.max(0, this.data.xp - (r.xp || 0));
    t.xpGained = Math.max(0, t.xpGained - (r.xp || 0));
    if (r.skill && this.data.skills[r.skill]) this.data.skills[r.skill] = Math.max(0, this.data.skills[r.skill] - 1);
    if (r.pr) {
      const p = this.data.prs[r.exKey];
      if (p && p.kg === r.kg && p.reps === r.reps && p.date === todayKey()) {
        delete this.data.prs[r.exKey];
        this.data.stats.prs = Math.max(0, this.data.stats.prs - 1);
        this.data.points = Math.max(0, this.data.points - 60);
      }
    }
    if (t.muscleSets) {
      const muscle = EXERCISES[r.exKey]?.muscle;
      if (muscle && t.muscleSets[muscle]) {
        t.muscleSets[muscle] = Math.max(0, t.muscleSets[muscle] - 1);
        if (!t.muscleSets[muscle]) delete t.muscleSets[muscle];
      }
    }
    if (Array.isArray(t.setLog) && t.setLog.length) t.setLog.pop();
    this.save(); emit("today");
    return true;
  },
  completeMobility() {
    if (!this.data.today.mobility) {
      this.data.today.mobility = true;
      const r = mobilityReward();
      this.addXP(r.xp, r.skill, r.skillGain);
      this.save(); emit("today");
    }
  },

  /**
   * Reclama el bono de una misión del día cumplida. IDEMPOTENTE: cada misión
   * premia una sola vez por día (mismo patrón que las series: sin doble XP).
   * @returns {{xp:number, skill:string, text:string}|null} null si ya estaba reclamada
   */
  claimMission(id) {
    const t = this.data.today;
    t.missionKeys = t.missionKeys || [];
    if (t.missionKeys.includes(id)) return null;
    t.missionKeys.push(id);
    const r = missionReward(id);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },

  // ---------- TRABAJO / PRODUCTIVIDAD SALUDABLE ----------
  // Con TOPE diario (RULES.work): premia el equilibrio, nunca la compulsión.
  logFocusBlock() {
    const t = this.data.today;
    t.workBlocks = t.workBlocks || 0;
    if (t.workBlocks >= 6) return null; // ya vale por hoy: sigue trabajando, sin XP
    t.workBlocks++;
    const r = focusReward();
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },
  logActivePause() {
    const t = this.data.today;
    t.activePauses = t.activePauses || 0;
    if (t.activePauses >= 8) return null;
    t.activePauses++;
    const r = activePauseReward();
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },
  /** Checklist de postura de escritorio: registro honesto, sin XP. */
  logPostureCheck() {
    const t = this.data.today;
    t.postureChecks = (t.postureChecks || 0) + 1;
    this.save(); emit("today");
    return true;
  },
  /** Rutina nocturna: marca/desmarca un paso (reversible, sin duplicar). */
  nightRoutineToggle(id) {
    const t = this.data.today;
    t.nightRoutine = t.nightRoutine || [];
    t.nightRoutine = t.nightRoutine.includes(id)
      ? t.nightRoutine.filter((x) => x !== id)
      : t.nightRoutine.concat(id);
    this.save(); emit("today");
    return t.nightRoutine;
  },

  // ---------- MEDICIONES (evolución corporal · ANTES→AHORA→HACIA DÓNDE) ----------
  /** Una ficha por día: medir dos veces el mismo día ACTUALIZA, no duplica. */
  addMedida(m) {
    if (!m || !m.fecha) return null;
    this.data.medidas = this.data.medidas || [];
    const i = this.data.medidas.findIndex((x) => x.fecha === m.fecha);
    if (i >= 0) this.data.medidas[i] = { ...this.data.medidas[i], ...m };
    else this.data.medidas.push(m);
    this.data.medidas.sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    if (this.data.medidas.length > 365) this.data.medidas.shift();
    if (m.pesoKg != null) { this.data.profile.weightKg = m.pesoKg; }
    this.save(); emit("medidas");
    return m;
  },
  medidasList() { return this.data.medidas || []; },

  // ---------- ASIGNACIONES (Coach OS → app del cliente · Núcleo 5) ----------
  /**
   * El entrenador asigna una sesión. Idempotente: una asignación pendiente
   * por cliente/día/entrenamiento se ACTUALIZA; no se duplica.
   */
  addAsignacion(a) {
    this.data.asignaciones = this.data.asignaciones || [];
    const i = this.data.asignaciones.findIndex((x) =>
      x.clienteId === a.clienteId && x.dia === a.dia && x.workoutId === a.workoutId && x.estado === "pendiente");
    const rec = { id: `as_${Date.now()}`, estado: "pendiente", creada: new Date().toISOString(), origen: "core", ...a };
    if (i >= 0) this.data.asignaciones[i] = { ...this.data.asignaciones[i], ...a };
    else this.data.asignaciones.push(rec);
    this.save(); emit("asignaciones");
    return i >= 0 ? this.data.asignaciones[i] : rec;
  },
  asignacionesDe(clienteId) {
    return (this.data.asignaciones || []).filter((x) => x.clienteId === clienteId);
  },
  /** Cierra como completada la asignación pendiente que coincide con la sesión cerrada. */
  cerrarAsignacion(workoutId, dia = todayKey()) {
    let cerrada = null;
    this.data.asignaciones = (this.data.asignaciones || []).map((x) => {
      if (!cerrada && x.estado === "pendiente" && x.workoutId === workoutId && x.dia <= dia) {
        cerrada = { ...x, estado: "completada", cerradaEn: dia };
        return cerrada;
      }
      return x;
    });
    if (cerrada) { this.save(); emit("asignaciones"); }
    return cerrada;
  },

  // ---------- RUTINAS PERSONALIZADAS PROPLAYER ----------
  saveCustomRoutine(routine = {}) {
    this.data.customRoutines = Array.isArray(this.data.customRoutines) ? this.data.customRoutines : [];
    const rawExercises = Array.isArray(routine.exercises) ? routine.exercises : [];
    if (!rawExercises.length || rawExercises.length > 12) return null;
    const exercises = rawExercises.map((e, idx) => ({
      ex: String(e.ex || ("pp_" + (idx + 1))),
      sourceId: e.sourceId == null ? null : String(e.sourceId),
      pos: Number.isFinite(Number(e.pos)) ? Number(e.pos) : null,
      name: String(e.name || "EJERCICIO").slice(0, 140),
      muscle: String(e.muscle || "FULL").slice(0, 80),
      type: String(e.type || "Fuerza").slice(0, 40),
      sets: Math.max(1, Math.min(8, Math.round(Number(e.sets) || 3))),
      reps: Math.max(1, Math.min(600, Math.round(Number(e.reps) || 10))),
      kg: Math.max(0, Math.min(1000, Number(e.kg) || 0)),
      rir: Math.max(0, Math.min(4, Math.round(Number(e.rir) || 0))),
      rest: Math.max(0, Math.min(600, Math.round(Number(e.rest) || 90))),
      timed: !!e.timed,
      videoFile: e.videoFile ? String(e.videoFile).slice(0, 255) : null,
      videoUrl: e.videoUrl ? String(e.videoUrl).slice(0, 1200) : null,
    }));
    const now = new Date().toISOString();
    const id = String(routine.id || ("pp_routine_" + Date.now()));
    const rec = {
      id,
      name: String(routine.name || "RUTINA PROPLAYER").trim().slice(0, 80) || "RUTINA PROPLAYER",
      tag: "PROPLAYER · PERSONALIZADA",
      min: Math.max(5, Math.min(180, Math.round(Number(routine.min) || Math.max(15, exercises.length * 6)))),
      desc: String(routine.desc || "Rutina creada por el Coach desde la biblioteca PROPLAYER.").slice(0, 220),
      exercises,
      source: "proplayer",
      createdAt: routine.createdAt || now,
      updatedAt: now,
    };
    const i = this.data.customRoutines.findIndex((x) => x.id === id);
    if (i >= 0) this.data.customRoutines[i] = rec;
    else this.data.customRoutines.unshift(rec);
    this.data.customRoutines = this.data.customRoutines.slice(0, 100);
    this.save(); emit("custom-routines", rec);
    return rec;
  },
  customRoutine(id) { return (this.data.customRoutines || []).find((x) => x.id === id) || null; },
  customRoutinesList() { return [...(this.data.customRoutines || [])]; },
  deleteCustomRoutine(id) {
    const before = (this.data.customRoutines || []).length;
    this.data.customRoutines = (this.data.customRoutines || []).filter((x) => x.id !== id);
    if (this.data.customRoutines.length === before) return false;
    this.save(); emit("custom-routines", { id, deleted: true });
    return true;
  },

  // ---------- SESIÓN ACTIVA (persistente: sobrevive recargas) ----------
  setActiveSession(sess) { this.data.activeSession = sess; this.save(); emit("session", sess); },
  getActiveSession() { return this.data.activeSession; },
  clearActiveSession() { this.data.activeSession = null; this.save(); emit("session", null); },

  // ---------- ENTRENAMIENTO ----------
  /**
   * Registra UNA serie real. La recompensa sale de setReward (fuente única) y
   * se concede UNA sola vez por serie (idKey → idempotencia ante dobles clics
   * y reintentos). Una serie parcia NUNCA marca el día como entrenado.
   * @returns {{pr:object|null, xp:number, skill:string, text:string}|null} null si era duplicada
   */
  logSet(exKey, setIdx, kg, reps, rir, opts = {}) {
    const t = this.data.today;
    const idKey = opts.idKey || `${exKey}:${setIdx}:${t.trainingSets}`;
    if (t.setKeys.includes(idKey)) return null;
    t.setKeys.push(idKey);
    if (t.setKeys.length > 400) t.setKeys = t.setKeys.slice(-400);

    t.trainingSets++; t.startedWorkout = true;
    this.data.stats.sets++;
    let pr = null;
    const e1 = kg > 0 ? Math.round(kg * (1 + reps / 30)) : 0;
    const prev = this.data.prs[exKey];
    if (kg > 0 && (!prev || e1 > Math.round(prev.kg * (1 + prev.reps / 30)))) {
      this.data.prs[exKey] = { kg, reps, date: todayKey(), e1 };
      pr = { kg, reps, e1 };
      this.data.stats.prs++;
    }
    const rw = setReward({
      reps: opts.seconds ? 0 : reps,
      seconds: opts.seconds || 0,
      formScore: opts.formScore ?? null,
      exercise: exKey,
    });
    this.addXP(rw.xp + (pr ? prReward().xp : 0), rw.skill, pr ? prReward().skillGain : rw.skillGain);
    if (pr) this.addPoints(prReward().points);
    this.save();
    emit("set", { exKey, setIdx, kg, reps, rir, pr, xp: rw.xp + (pr ? prReward().xp : 0) });
    return { pr, xp: rw.xp + (pr ? prReward().xp : 0), skill: rw.skill, text: rw.text };
  },

  /**
   * Cierra la sesión del día. IDEMPOTENTE: una misma sesión no premia dos veces.
   * El bono es SOLO de finalización (las series ya se premiaron al registrarse).
   */
  completeWorkout(workoutId, { loggedSets = 0, plannedSets = 0, minutes = null } = {}) {
    if (plannedSets > 0 && loggedSets < plannedSets) {
      return this.closePartialWorkout(workoutId, { loggedSets, plannedSets, minutes });
    }
    const t = this.data.today;
    if (t.workoutDone === workoutId) return null; // sin dobles recompensas
    t.trained = true;
    t.workoutDone = workoutId;
    const closedAssignment = this.cerrarAsignacion(workoutId); // el loop cierra: lo asignado, cumplido
    if (closedAssignment?.cloudAssignmentId) emit("cloud-assignment-complete", closedAssignment);
    this.data.stats.workouts++;
    const mins = minutes ?? WORKOUTS[workoutId]?.min ?? 30;
    this.data.stats.sessionsMin += mins;
    this.data.plan.sessionsDone[this.data.plan.week + "-" + todayKey()] = workoutId;
    this.data.lastActiveDay = todayKey();
    const r = workoutCompleteReward({ minutes: mins, loggedSets, plannedSets });
    this.addPoints(r.points);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.data.activeSession = null;
    this.save();
    emit("today");
    return r;
  },

  /** Cierre parcial: conserva series/XP, pero NO marca trained ni entrega bono final. */
  closePartialWorkout(workoutId, { loggedSets = 0, plannedSets = 0, minutes = null } = {}) {
    const t = this.data.today;
    t.startedWorkout = loggedSets > 0 || t.startedWorkout;
    this.data.activeSession = null;
    const name = WORKOUTS[workoutId]?.name || this.customRoutine(workoutId)?.name || workoutId;
    this.logJourney("workout", `Sesión parcial · ${name} · ${loggedSets}/${plannedSets} series conservadas`, 0);
    this.save();
    emit("today");
    return { completed:false, loggedSets, plannedSets, minutes };
  },

  /** Abandono: conserva lo registrado y marca el estado sin premiar finalización. */
  abandonWorkout(workoutId, { loggedSets = 0 } = {}) {
    const t = this.data.today;
    t.startedWorkout = true;
    this.data.activeSession = null;
    this.logJourney("workout", `Sesión ${WORKOUTS[workoutId]?.name || this.customRoutine(workoutId)?.name || workoutId} abandonada · ${loggedSets} series conservadas`, 0);
    this.save();
    emit("today");
  },

  // ---------- PREPARACIÓN (solo datos registrados; nunca diagnóstico) ----------
  /**
   * Desglose transparente: ¿POR QUÉ este número?
   * Sin registros → score null (la UI muestra «Todavía no lo has registrado»).
   */
  readinessDetail() {
    const t = this.data.today;
    const parts = [];
    if (t.sleep != null) {
      const s = Math.max(0, Math.min(1, (t.sleep - 4) / 5));
      parts.push({ k: "Sueño", w: 0.40, s, note: `${t.sleep} h registradas` });
    }
    if (t.soreness != null) {
      parts.push({ k: "Molestia muscular", w: 0.25, s: 1 - t.soreness / 10, note: `${t.soreness}/10 registrado` });
    }
    if (t.energy != null) {
      parts.push({ k: "Energía percibida", w: 0.20, s: t.energy / 10, note: `${t.energy}/10 registrada` });
    }
    const strain7 = (this.data.history || []).slice(-7).reduce((a, h) => a + (h.strain || 0), 0) + (t.strain || 0);
    if (strain7 > 0) {
      const s = 1 - Math.min(1, strain7 / 60);
      parts.push({ k: "Carga reciente", w: 0.15, s, note: `${strain7.toFixed(1)} de carga en 7 días` });
    }
    if (!parts.length) return { score: null, parts, known: 0, estimated: true };
    const wSum = parts.reduce((a, p) => a + p.w, 0);
    const score = Math.round(Math.max(5, Math.min(100, (parts.reduce((a, p) => a + p.w * p.s, 0) / wSum) * 100)));
    const explained = parts.map((p) => ({
      k: p.k,
      pts: Math.round(p.w * p.s * 100),
      max: Math.round(p.w * 100),
      delta: Math.round(p.w * p.s * 100 - p.w * 50),
      note: p.note,
    }));
    return { score, parts: explained, known: parts.length, estimated: parts.length < 3 };
  },
  /** null si no hay datos suficientes (la UI muestra «—», nunca un número inventado). */
  readiness() { return this.readinessDetail().score; },

  hydrationPct() { return Math.min(100, Math.round((this.data.today.water / 2500) * 100)); },

  weekPlan() {
    const base = this.data.profile.onboarded ? profileWeek(this.data.profile) : MACRO.dayPlan;
    return base.map((id, day) => { const custom = this.data.plan.custom?.[day]; return custom === "-" ? null : custom || id; });
  },
  todayWorkout() {
    const assigned = (this.data.asignaciones || []).find((a) =>
      a.clienteId === "local" && a.estado === "pendiente" && a.customRoutineId && a.dia <= todayKey());
    if (assigned) {
      const custom = this.customRoutine(assigned.customRoutineId);
      if (custom) return custom;
    }
    const dow = (new Date().getDay() + 6) % 7;
    const id = this.weekPlan()[dow];
    const workout = id ? WORKOUTS[id] : null;
    return this.data.plan.custom?.[dow] ? workout : personalizeWorkout(workout, this.data.profile);
  },
  /** El entrenador reescribe el plan semanal (Coach OS → app del cliente). */
  setPlanDia(dow, workoutId) {
    const d = this.data.plan;
    d.custom = d.custom || {};
    d.custom[dow] = workoutId === null ? "-" : (WORKOUTS[workoutId] ? workoutId : "");
    this.save(); emit("plan");
    return d.custom[dow];
  },
  restaurarPlanEstandar() {
    this.data.plan.custom = {};
    this.save(); emit("plan");
  },
  phase() { return phaseOfWeek(this.data.plan.week); },
  dayNumber() { return Math.max(1, Math.floor((Date.now() - this.data.profile.created) / 864e5) + 1); },
  item(id) { return ITEMS.find((i) => i.id === id); },
  isOwned(id) { return this.data.inventory.owned.includes(id); },
  equip(id) {
    const it = this.item(id);
    if (!it || !this.isOwned(id)) return false;
    this.data.inventory.equipped[it.slot] = id;
    this.save(); emit("outfit");
    return true;
  },
  grantItem(id) {
    if (!this.isOwned(id)) {
      this.data.inventory.owned.push(id);
      this.save(); emit("itemUnlock", { id });
    }
  },
  logJourney(type, text, xp) {
    this.data.journey.unshift({ day: this.dayNumber(), date: todayKey(), type, text, xp: xp || 0 });
    if (this.data.journey.length > 200) this.data.journey.pop();
    this.save();
  },
  onboard(profile) {
    Object.assign(this.data.profile, profile, { onboarded: true });
    if (!this.data.profile.nextProgressReviewAt) {
      this.data.profile.nextProgressReviewAt = defaultProgressReviewAt(new Date());
    }
    this.logJourney("start", "BAYONA iniciado. La historia empieza aquí.", 0);
    this.save();
  },

  setProgressReviewAt(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    this.data.profile.nextProgressReviewAt = d.toISOString();
    this.save();
    emit("profile");
    return this.data.profile.nextProgressReviewAt;
  },

  scheduleProgressReview(days = 28) {
    this.data.profile.nextProgressReviewAt = defaultProgressReviewAt(new Date(), days);
    this.save();
    emit("profile");
    return this.data.profile.nextProgressReviewAt;
  },

  // ---------- VOZ PRIVADA (consentimiento explícito; solo en el dispositivo) ----------
  addVoiceNote({ label, dataUrl, pastMessage = false }) {
    if (!this.data.voice) this.data.voice = [];
    this.data.voice.unshift({ id: `v_${Date.now()}`, label, dataUrl, at: new Date().toISOString(), pastMessage });
    this.data.voice = this.data.voice.slice(0, 3); // límite: espacio local
    if (pastMessage) this.data.pastMessage = this.data.voice[0].id;
    this.save();
    return this.data.voice[0];
  },
  voiceNotes() { return this.data.voice || []; },

  // ---------- CÓDIGOS FÍSICOS → GEMELO DIGITAL (auditoría + uso único) ----------
  redeemPhygital(args) {
    // destructurar sin comprobar reventaba con null/undefined (I7: el
    // guardado y la redemption nunca lanzan por una entrada vacía).
    if (!args || typeof args !== "object") return null;
    const { code, itemId, source = "qr" } = args;
    if (typeof code !== "string" || !code || typeof itemId !== "string" || !itemId) return null;
    const rec = { code, itemId, source, at: new Date().toISOString() };
    this.data.phygital.redeemed.unshift(rec);
    this.data.phygital.audit.unshift({ ...rec, event: "redeem" });
    if (this.data.phygital.audit.length > 100) this.data.phygital.audit.pop();
    this.grantItem(itemId);
    this.save();
    return rec;
  },
  isCodeUsed(code) {
    return (this.data.phygital?.redeemed || []).some((r) => r.code === code);
  },
  /** Auditoría de intentos phygital (éxitos Y rechazos). */
  auditPhygital(rec) {
    if (!this.data.phygital) this.data.phygital = { redeemed: [], audit: [] };
    this.data.phygital.audit.unshift({ ...rec, at: new Date().toISOString() });
    if (this.data.phygital.audit.length > 100) this.data.phygital.audit.pop();
    this.save();
  },

  // ---------- PRIVACIDAD ----------
  exportAll() {
    return { exportedAt: new Date().toISOString(), schema: SCHEMA, save: this.data, cycle: readCycle() };
  },
  deleteAll() {
    // «borrar todo» tiene que borrar también las instantáneas, o el
    // botón de borrar datos sería una mentira.
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
    try { localStorage.removeItem("bayona.backup.v1"); } catch { /* nada */ }
    try { localStorage.removeItem("bayona.save.corrupt"); } catch { /* nada */ }
    deleteCycle();
    resetConsents(); // la clave de consents solo la toca consents.js
    this.reset(false);
  },
};
