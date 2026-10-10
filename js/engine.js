// ============================================================
// BAYONA — MOTOR DE RENDIMIENTO
// Metodología: sobrecarga progresiva, autoregulación por preparación,
// series de calentamiento, cálculo de discos, landmarks de volumen
// (MEV/MAV/MRV) y 1RM estimado (Epley). Sin marcas de terceros.
// ============================================================
import { readCycle, cycleSummary } from "./cycle.js";
import { S } from "./state.js";
import { EXERCISES, WORKOUTS, MACRO, phaseOfWeek } from "./data.js";

const epley1RM = (kg, reps) => (kg <= 0 ? 0 : Math.round(kg * (1 + reps / 30)));
const round25 = (x) => Math.round(x / 2.5) * 2.5;

// ---------- CARGA AUTOREGULADA (Fitbod-style) ----------
// Propone la carga de hoy según: histórico, fase, readiness y RIR objetivo.
export function nextLoad(exKey, baseKg, reps, targetRIR = 2) {
  const hist = S.data.prs[exKey];
  // sin registros de preparación → factor neutro (no se inventa un estado)
  const rd = S.readiness() ?? 62;
  let kg = baseKg;
  if (hist && hist.e1) {
    // % de 1RM para el rango de reps objetivo, corregido por RIR
    const pct = Math.min(0.92, 0.97 - reps * 0.018 - targetRIR * 0.03);
    kg = hist.e1 * pct;
  }
  // autoregulación: readiness bajo → recorta carga, nunca volumen cero
  const factor = rd >= 75 ? 1.0 : rd >= 55 ? 0.95 : rd >= 40 ? 0.9 : 0.85;
  // fase del macrociclo
  const phase = phaseOfWeek(S.data.plan.week);
  kg *= factor * (0.85 + phase.int * 0.15);
  return round25(Math.max(baseKg * 0.5, kg));
}

// ---------- WARM-UP RAMPS ----------
export function warmupSets(workKg) {
  if (!workKg || workKg < 20) return [];
  const ramp = [
    { kg: round25(workKg * 0.4), reps: 10 },
    { kg: round25(workKg * 0.6), reps: 6 },
    { kg: round25(workKg * 0.8), reps: 3 },
  ];
  return ramp.filter((s, i, a) => s.kg > 0 && a.findIndex((x) => x.kg === s.kg) === i && s.kg < workKg);
}

// ---------- PLATE CALCULATOR ----------
export function plateMath(total, bar = 20) {
  const perSide = (total - bar) / 2;
  if (perSide <= 0) return [];
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const out = [];
  let rest = perSide;
  for (const p of plates) {
    while (rest >= p - 0.001) { out.push(p); rest = +(rest - p).toFixed(3); }
  }
  return out;
}

// ---------- CARGA (strain 0–21, escala de esfuerzo diario) ----------
// Carga de la sesión = series efectivas × intensidad relativa × RIR penalty
export function sessionStrain(sets) {
  // sets: [{kg, reps, rir, e1Base}]
  let load = 0;
  for (const s of sets) {
    const int = s.e1Base ? Math.min(1, epley1RM(s.kg, s.reps) / s.e1Base) : 0.7;
    load += (s.kg > 0 ? s.kg * s.reps : s.reps * 0.4) * int * (1 + (2 - (s.rir ?? 2)) * 0.08);
  }
  const strain = Math.min(21, +(Math.log10(1 + load) * 3.4).toFixed(1));
  return strain;
}

// ---------- RECUPERACIÓN (%) ----------
// Basado SOLO en datos registrados por el usuario (ver state.readinessDetail).
export function recoveryScore() {
  return S.readiness();
}

// ---------- LANDMARKS DE VOLUMEN (grupo muscular / semana) ----------
export const VOLUME_LANDMARKS = {
  PECHO:     { mev: 8,  mav: 16, mrv: 24 },
  ESPALDA:   { mev: 8,  mav: 18, mrv: 26 },
  PIERNA:    { mev: 8,  mav: 16, mrv: 24 },
  HOMBRO:    { mev: 6,  mav: 12, mrv: 18 },
  BRAZO:     { mev: 6,  mav: 14, mrv: 20 },
  CORE:      { mev: 4,  mav: 10, mrv: 16 },
  GLÚTEO:    { mev: 6,  mav: 14, mrv: 20 },
  FULL:      { mev: 4,  mav: 10, mrv: 16 },
  MOVILIDAD: { mev: 2,  mav: 6,  mrv: 12 },
  MIND:      { mev: 2,  mav: 6,  mrv: 12 },
  POSTERIOR: { mev: 6,  mav: 14, mrv: 20 },
};

// series efectivas por grupo en los últimos 7 días (datos reales por músculo)
export function weeklySetsByMuscle() {
  const out = {};
  for (const h of S.data.history.slice(-7)) {
    if (h.muscleSets) {
      Object.entries(h.muscleSets).forEach(([m, n]) => (out[m] = (out[m] || 0) + n));
    } else {
      (h.muscles || []).forEach((m) => (out[m] = (out[m] || 0) + (h.sets || 0)));
    }
  }
  // incluye hoy
  const t = S.data.today;
  if (t.muscleSets) Object.entries(t.muscleSets).forEach(([m, n]) => (out[m] = (out[m] || 0) + n));
  return out;
}

export function volumeStatus(muscle) {
  const n = weeklySetsByMuscle()[muscle] || 0;
  const L = VOLUME_LANDMARKS[muscle] || VOLUME_LANDMARKS.FULL;
  const zone = n < L.mev ? "BAJO · MED" : n <= L.mav ? "ÓPTIMO" : n <= L.mrv ? "ALTO" : "MRV · DESCARGA";
  const pct = Math.min(100, Math.round((n / L.mrv) * 100));
  return { sets: n, zone, pct, ...L };
}

// ---------- 1RM TREND ----------
export function trend1RM(exKey) {
  const pts = [];
  for (const h of S.data.history) {
    (h.prPoints || []).forEach((p) => {
      if (p.ex === exKey) pts.push({ date: h.date, e1: p.e1 });
    });
  }
  const cur = S.data.prs[exKey];
  if (cur) pts.push({ date: cur.date, e1: cur.e1, current: true });
  return pts;
}

// ---------- PROYECCIÓN ----------
// Si mantienes adherencia, ¿cuándo llegas a X kg? (lineal conservador)
export function project1RM(exKey, targetKg) {
  const pts = trend1RM(exKey).filter((p) => p.e1);
  if (pts.length < 2 || !targetKg) return null;
  const gain = pts[pts.length - 1].e1 - pts[0].e1;
  const weeks = Math.max(1, pts.length / 4);
  const rate = gain / weeks; // kg/semana
  const cur = pts[pts.length - 1].e1;
  if (rate <= 0 || cur >= targetKg) return null;
  const w = Math.ceil((targetKg - cur) / Math.min(rate, cur * 0.015)); // cap realista
  return { weeks: w, rate: +rate.toFixed(1) };
}

// ---------- SESIÓN DE HOY AUTOREGULADA ----------
// El volumen anunciado AQUÍ se aplica de verdad en la sesión (applyVolumeCap).
export function applyVolumeCap(workout, capSets) {
  const exs = workout.exercises.map((e) => ({ ...e }));
  const total = exs.reduce((a, e) => a + e.sets, 0);
  if (capSets >= total) return { workout, adjusted: total, applied: false };
  // recorte proporcional, nunca a cero: al menos 1 serie por ejercicio si había
  const scale = capSets / total;
  let used = 0;
  for (const e of exs) {
    e.sets = Math.max(1, Math.round(e.sets * scale));
    used += e.sets;
  }
  // ajuste fino por arriba si el redondeo se pasó
  for (let i = exs.length - 1; i >= 0 && used > capSets; i--) {
    if (exs[i].sets > 1) { exs[i].sets--; used--; }
  }
  return { workout: { ...workout, exercises: exs }, adjusted: used, applied: true };
}

export function todaysSession() {
  const w = S.todayWorkout();
  if (!w) return null;
  const rd = S.readiness();
  const phase = phaseOfWeek(S.data.plan.week);
  const original = w.exercises.reduce((a, e) => a + e.sets, 0);
  let setsCap = original;
  let note = "Carga estándar según tu macrociclo.";
  if (rd != null && rd < 40) { setsCap = Math.round(setsCap * 0.6); note = "Preparación baja: misión recortada al 60%. Entrenar mal no suma."; }
  else if (rd != null && rd < 55) { setsCap = Math.round(setsCap * 0.8); note = "Fatiga detectada: volumen al 80%. Cuidamos la técnica."; }
  else if (rd == null) note = "Sin registros de preparación hoy: misión estándar. Registra sueño y energía para adaptarla.";
  else if (rd > 80) note = "Estado óptimo según tus registros: reserva tu récord de la semana.";
  if (phase.code === "DESCARGA") { setsCap = Math.round(original * 0.5); note = "Semana de descarga: 50% de volumen para consolidar."; }
  const cycle = cycleSummary(readCycle());
  if (cycle.entry?.mode === "suave") {
    setsCap = Math.min(setsCap, Math.max(w.exercises.length, Math.floor(original * 0.7)));
    note += " Has elegido una sesión suave: máximo 70% de las series, con al menos una por ejercicio. No se cambia por una fase estimada.";
  }
  const capped = applyVolumeCap(w, setsCap);
  return {
    workout: capped.workout, // ← ESTE es el que se ejecuta (volumen aplicado de verdad)
    adjusted: capped.adjusted,
    original,
    applied: capped.applied,
    note,
  };
}

// ---------- SESIÓN CORTA (adaptación real a "tengo X minutos") ----------
export function shortSession(min = 20) {
  const m = Math.max(10, Math.min(45, Math.round(min)));
  const blocks = [
    { ex: "pushup", sets: 3, reps: 10, kg: 0, rir: 2 },
    { ex: "squat", sets: 3, reps: 12, kg: 0, rir: 2 },
    { ex: "row", sets: 3, reps: 10, kg: 20, rir: 2 },
    { ex: "plank", sets: 2, reps: 40, kg: 0, rir: 2, timed: true },
    { ex: "mobility", sets: 2, reps: 45, kg: 0, rir: 3, timed: true },
  ];
  const n = Math.max(2, Math.min(blocks.length, Math.round(m / 6)));
  return {
    id: `short_${m}`,
    name: `SESIÓN CORTA · ${m} MIN`,
    tag: "ADAPTADA · TIEMPO REAL",
    min: m,
    desc: `Generada para la ventana de ${m} minutos que has indicado. Se guarda igual que cualquier sesión.`,
    exercises: blocks.slice(0, n),
    generated: true,
  };
}

// registra la sesión en histórico (para tendencias)
export function archiveSet(exKey, kg, reps, rir, muscleOverride = null, meta = {}) {
  const t = S.data.today;
  t.muscleSets = t.muscleSets || {};
  const m = muscleOverride || EXERCISES[exKey]?.muscle || "FULL";
  t.muscleSets[m] = (t.muscleSets[m] || 0) + 1;
  t.prPoints = t.prPoints || [];
  const e1 = epley1RM(kg, reps);
  if (e1) t.prPoints.push({ ex: exKey, e1 });
  t.strain = sessionStrain(
    (t.setLog = t.setLog || []).concat([{ kg, reps, rir, e1Base: S.data.prs[exKey]?.e1 || e1 }])
  );
  const effort = ["easy", "ok", "hard"].includes(meta.effort) ? meta.effort : "ok";
  const note = String(meta.note || "").trim().replace(/\s+/g, " ").slice(0, 160);
  t.setLog.push({
    ex: exKey, kg, reps, rir,
    idKey: meta.idKey || null,
    effort,
    discomfort: Boolean(meta.discomfort),
    note,
  }); // datos reales + contexto subjetivo; no modifica XP/PR
}
