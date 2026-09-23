// ============================================================
// BAYONA — ESTADO: persistencia, economía, métricas derivadas
// Regla: el avatar progresa solo si la persona progresa.
// Todo XP sale de js/rewards.js (fuente única). Fechas LOCALES.
// Esquema versionado con migración conservadora (nunca reinicia una
// partida válida por añadir campos).
// ============================================================
import { RANKS, ITEMS, WORKOUTS, MACRO, MEALS, EXERCISES, phaseOfWeek } from "./data.js";
import { resetConsents } from "./consents.js";
import {
  setReward, prReward, workoutCompleteReward, mealReward, waterReward,
  stepsReward, mindReward, mobilityReward, healthMapReward,
} from "./rewards.js";

const KEY = "bayona.save.v2";
export const SCHEMA = 3;

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
    workoutDone: null,
    xpGained: 0,
  };
}

function freshProfile() {
  return {
    name: "", goal: "FUERZA", skin: 0, coach: "MENTOR", created: Date.now(),
    onboarded: false, experience: null, availability: null, equipment: null,
    heightCm: null, weightKg: null, age: null, face: null, skinHex: null,
  };
}

export const S = {
  data: null,
  storageFailed: false,

  init() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      this.data = null;
      // corrupción: conserva copia para recuperación, no pierda en silencio
      try {
        const bad = localStorage.getItem(KEY);
        if (bad) localStorage.setItem("bayona.save.corrupt", bad);
      } catch { /* sin storage */ }
      this.storageFailed = true;
      emit("storage-error", { where: "load", recoverable: true });
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
    d.settings = { sound: true, motion: true, haptics: true, quality: "AUTO", ...(d.settings || {}) };
    d.today = { ...freshToday(), ...(d.today || {}) };
    d.voice = Array.isArray(d.voice) ? d.voice : [];
    d.diary = Array.isArray(d.diary) ? d.diary : [];
    d.photos = Array.isArray(d.photos) ? d.photos : [];
    d.phygital = d.phygital || { redeemed: [], audit: [] };
    d.consents = d.consents || null; // espejo legado; la fuente vive en js/consents.js
    d.healthFlags = d.healthFlags || null;
    d.activeSession = d.activeSession || null;
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
      plan: { week: 1, sessionsDone: {} },
      history: [],
      settings: { sound: true, motion: true, haptics: true, quality: "AUTO" },
      voice: [],
      phygital: { redeemed: [], audit: [] },
      consents: null,
      healthFlags: null,
      activeSession: null,
    };
    if (!silent) this.save();
  },

  /** Guarda. Devuelve false y avisa si el almacenamiento falla (nunca en silencio). */
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
      if (this.storageFailed) { this.storageFailed = false; }
      return true;
    } catch (e) {
      this.storageFailed = true;
      emit("storage-error", { where: "save", recoverable: true });
      return false;
    }
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
      strain: d.today.strain || 0,
      sleep: d.today.sleep, soreness: d.today.soreness, energy: d.today.energy,
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
    let lvl = 1, need = 250, rem = this.data.xp;
    while (rem >= need) { rem -= need; lvl++; need = 250 + (lvl - 1) * 180; }
    return { lvl, cur: rem, need };
  },
  rank() {
    const lvl = this.level().lvl;
    let r = RANKS[0].name;
    for (const rk of RANKS) if (lvl >= rk.min) r = rk.name;
    return r;
  },
  addXP(amount, skill, skillGain = 1) {
    if (!amount) return false;
    const before = this.level().lvl;
    this.data.xp += amount;
    this.data.today.xpGained += amount;
    if (skill && this.data.skills[skill] !== undefined) {
      this.data.skills[skill] += Math.max(skillGain || 1, Math.round(amount / 80));
    }
    const after = this.level().lvl;
    this.save();
    emit("xp", { amount, skill });
    if (after > before) {
      // desbloqueos intermedios: NUNCA se pierden al subir varios niveles seguidos
      for (let l = before + 1; l <= after; l++) this.unlockForLevel(l);
      emit("levelup", { lvl: after });
    }
    return after > before;
  },
  addPoints(n) { this.data.points += n; this.save(); emit("wallet"); },
  addCredits(n) { this.data.credits += n; this.save(); emit("wallet"); },

  unlockForLevel(lvl) {
    const rewards = {
      2:  { credits: 80,  item: "ember_tee" },
      3:  { credits: 60,  item: "sprint_shorts" },
      5:  { credits: 120, item: "pulse_cans" },
      7:  { credits: 100, item: "focus_straps" },
      10: { credits: 200, item: "apex_jacket" },
      14: { credits: 150, item: "ghost_kicks" },
      20: { credits: 300, item: "titan_hoodie" },
    };
    const r = rewards[lvl];
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
    const r = waterReward(ml);
    this.data.today.water = Math.min(6000, this.data.today.water + ml);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return { total: this.data.today.water, ...r };
  },
  /** comida registrada: objeto completo (o id de MEALS). Los presets valen 1 vez/día. */
  eat(meal) {
    const m = typeof meal === "string" ? MEALS.find((x) => x.id === meal) : meal;
    if (!m) return null;
    const t = this.data.today;
    if (m.id && !m.custom && t.meals.some((x) => x.id === m.id)) return null; // sin doble premio
    t.meals.push({ id: m.id || `custom_${Date.now()}`, name: m.name, kcal: m.kcal, p: m.p, c: m.c, f: m.f, at: new Date().toISOString() });
    t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f; t.fib += m.fib || 0;
    const r = mealReward();
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },
  addSteps(n) {
    const r = stepsReward(n);
    this.data.today.steps += n;
    this.data.stats.km = +(this.data.stats.km + n / 1300).toFixed(1);
    this.addXP(r.xp, r.skill, r.skillGain);
    this.save(); emit("today");
    return r;
  },
  logSleep(h) { this.data.today.sleep = h; this.save(); emit("today"); },
  logSoreness(v) { this.data.today.soreness = v; this.save(); emit("today"); },
  logEnergy(v) { this.data.today.energy = v; this.save(); emit("today"); },
  logStress(v) { this.data.today.stress = v; this.save(); emit("today"); },
  logMind(min) {
    const r = mindReward(min);
    this.data.today.mind += min;
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
    const t = this.data.today;
    if (t.workoutDone === workoutId) return null; // sin dobles recompensas
    t.trained = true;
    t.workoutDone = workoutId;
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

  /** Abandono: conserva lo registrado y marca el estado sin premiar finalización. */
  abandonWorkout(workoutId, { loggedSets = 0 } = {}) {
    const t = this.data.today;
    t.startedWorkout = true;
    this.data.activeSession = null;
    this.logJourney("workout", `Sesión ${WORKOUTS[workoutId]?.name || workoutId} abandonada · ${loggedSets} series conservadas`, 0);
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
    const strain7 = this.data.history.slice(-7).reduce((a, h) => a + (h.strain || 0), 0) + (t.strain || 0);
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

  todayWorkout() {
    const dow = (new Date().getDay() + 6) % 7;
    const id = MACRO.dayPlan[dow];
    return id ? WORKOUTS[id] : null;
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
    this.logJourney("start", "BAYONA iniciado. La historia empieza aquí.", 0);
    this.save();
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
  redeemPhygital({ code, itemId, source = "qr" }) {
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
    return { exportedAt: new Date().toISOString(), schema: SCHEMA, save: this.data };
  },
  deleteAll() {
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
    resetConsents(); // la clave de consents solo la toca consents.js
    this.reset(false);
  },
};
