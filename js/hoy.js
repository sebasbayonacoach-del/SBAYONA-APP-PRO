// ============================================================
// BAYONA — HOY · planificador del día (dominio puro, sin DOM)
// ------------------------------------------------------------
// Responde UNA pregunta: «¿Qué tengo que hacer hoy?»
//
// Jerarquía (sin saturar: se prioriza, no se acumula ruido):
//   CRÍTICO    → algo empezado y sin cerrar (sesión en curso)
//   HOY        → el núcleo del día (entrenamiento asignado, hidratación base)
//   RECOMENDADO→ completa tu día (check-in, movilidad)
//   OPCIONAL   → extra con bono (misiones del día)
//   COMPLETADO → lo ya hecho hoy (la recompensa se ve: progreso real)
//
// Reglas de honestidad (Principios BAYONA):
//   · El XP anunciado sale SIEMPRE de js/rewards.js (fuente única).
//   · Sin datos → «Todavía no lo has registrado»; nunca se inventa estado.
//   · Día de descanso real: NO se ofrece una sesión falsa; se propone
//     recuperación (la disciplina también es parar).
//   · Las misiones del día son EXTRA sobre el núcleo (sin duplicar tareas).
//     Su bono se reclama UNA vez por día (S.claimMission, idempotente).
//
// Este módulo es puro: recibe el estado por parámetro y se prueba en Node.
// La interfaz que lo consume vive en js/ui/hoy.js.
// ============================================================
import { MISSIONS, WORKOUTS } from "./data.js";
import { proximaMedicion } from "./medidas.js";
import { previewWorkoutXP, workoutCompleteReward, missionReward } from "./rewards.js";

export const PRIORIDADES = ["CRÍTICO", "HOY", "RECOMENDADO", "OPCIONAL", "COMPLETADO"];
export const AGUA_BASE = 1500;   // ml — base diaria (hidratación)
export const PASOS_META = 8000;

/** Check-in suficiente: 3 de los 4 registros rápidos del día. */
export function checkInHecho(t) {
  const n = [t.sleep != null, t.energy != null, t.stress != null, t.soreness != null]
    .filter(Boolean).length;
  return n >= 3;
}

// checks de misión (los datos viven en data.js; la semántica, aquí)
const CHECKS = {
  m_pasos:  (t) => (t.steps || 0) >= PASOS_META,
  m_comida: (t) => (t.meals || []).length >= 3,
  m_mente:  (t) => (t.mind || 0) >= 5,
  m_agua:   (t) => (t.water || 0) >= 2500,
};

/** hash estable por fecha → misma fecha, mismas misiones (siempre). */
function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Selección diaria DETERMINISTA de 2 misiones extra (sin repetir). */
export function misionesDelDia(dateKey) {
  const h = seed(String(dateKey));
  const a = MISSIONS[h % MISSIONS.length];
  let b = MISSIONS[(h >> 3) % MISSIONS.length];
  if (b.id === a.id) b = MISSIONS[(MISSIONS.indexOf(a) + 1) % MISSIONS.length];
  return [a, b];
}

/**
 * Plan del día. Recibe el estado por inyección (puro y testeable).
 * @param {{data:object, todayWorkout:Function, getActiveSession?:Function}} Sx estado
 * @param {{dateKey?:string, session?:object|null}} [opts] overrides para pruebas
 * @returns {{grupos:Array, siguiente:object|null, hechos:number, total:number, misiones:Array}}
 */
export function planDelDia(Sx, opts = {}) {
  const t = Sx.data.today;
  const dateKey = opts.dateKey || t.date;
  const act = opts.session !== undefined ? opts.session : (Sx.getActiveSession?.() ?? null);
  const enCurso = act && act.status !== "completada" && act.status !== "abandonada";
  const w = Sx.todayWorkout();
  const items = [];

  // ---------- 1. SESIÓN ----------
  // La asignación del ENTRENADOR manda sobre el plan automático (Núcleo 5)
  const asign = (Sx.data.asignaciones || []).find((a) =>
    a.clienteId === "local" && a.dia === dateKey && a.estado === "pendiente");
  if (enCurso) {
    items.push({
      id: "sesion", pri: "CRÍTICO", done: false,
      titulo: `Continuar: ${act.name}`,
      sub: `Sesión ${act.status} · ${act.logged}/${act.plannedSets} series registradas`,
      cta: "CONTINUAR SESIÓN", go: "training",
    });
  } else if (asign && WORKOUTS[asign.workoutId] && !t.trained) {
    const aw = WORKOUTS[asign.workoutId];
    items.push({
      id: "sesion", pri: "HOY", done: false, asignada: true,
      titulo: `Plan de tu entrenador · ${aw.name}`,
      sub: asign.nota ? `NOTA DEL ENTRENADOR: ${asign.nota}` : `Sesión asignada por tu entrenador · ${aw.min} min`,
      cta: "COMENZAR LO ASIGNADO", go: "training", workoutId: asign.workoutId,
    });
  } else if (w && !t.trained) {
    const bonus = workoutCompleteReward({ minutes: w.min, loggedSets: 0, plannedSets: 0 });
    items.push({
      id: "sesion", pri: "HOY", done: false,
      titulo: `Entrenamiento · ${w.name}`,
      sub: `${w.min} min · ~${(previewWorkoutXP(w).xp + bonus.xp).toLocaleString("es-ES")} XP si la completas`,
      cta: "COMENZAR ENTRENAMIENTO", go: "training",
    });
  } else if (t.trained) {
    items.push({
      id: "sesion", pri: "HOY", done: true,
      titulo: "Entrenamiento completado",
      sub: `Sesión cerrada · ${t.trainingSets || 0} series registradas hoy`,
      cta: null, go: "training",
    });
  } else if (!w) {
    // día de descanso REAL: nunca una sesión falsa
    items.push({
      id: "recuperacion", pri: "RECOMENDADO", done: false,
      titulo: "Día de recuperación",
      sub: "Hoy no toca sesión. Movilidad + respiración: la disciplina también es parar.",
      cta: "FLUJO DE RECUPERACIÓN", go: "recovery",
    });
  }

  // ---------- 2. HIDRATACIÓN (base diaria) ----------
  const agua = t.water || 0;
  items.push({
    id: "hidratacion", pri: "HOY", done: agua >= AGUA_BASE,
    titulo: "Hidratación",
    sub: agua >= AGUA_BASE
      ? `${(agua / 1000).toLocaleString("es-ES")} L registrados · meta base cumplida`
      : `${(agua / 1000).toLocaleString("es-ES")} / ${(AGUA_BASE / 1000).toLocaleString("es-ES")} L · registra lo que bebes de verdad`,
    cta: agua >= AGUA_BASE ? null : "+250 ML", action: "drink",
  });

  // ---------- 3. CHECK-IN ----------
  items.push({
    id: "checkin", pri: "RECOMENDADO", done: checkInHecho(t),
    titulo: "Check-in del día",
    sub: checkInHecho(t)
      ? "Registrado hoy · BAYONA adapta tu misión con tus datos"
      : "Energía, sueño, estrés y molestia · 15 segundos",
    cta: checkInHecho(t) ? null : "HACER CHECK-IN", action: "checkin",
  });

  // ---------- 4. MOVILIDAD ----------
  items.push({
    id: "movilidad", pri: "RECOMENDADO", done: !!t.mobility,
    titulo: "Movilidad · 10 min",
    sub: t.mobility ? "Completada hoy ✓" : "Cuida el rango: previene y mejora la técnica",
    cta: t.mobility ? null : "EMPEZAR", go: "training", workoutId: "mobility_flow",
  });

  // ---------- 5. TRABAJO SALUDABLE (pausa activa: la espalda también cuenta) ----------
  items.push({
    id: "pausa", pri: "OPCIONAL", done: (t.activePauses || 0) > 0,
    titulo: "Pausa activa en el trabajo",
    sub: (t.activePauses || 0) > 0
      ? `${t.activePauses} pausa(s) hoy ✓ · tu espalda lo nota`
      : "3 min de movilidad de escritorio · BAYONA te cuida mientras trabajas",
    cta: (t.activePauses || 0) > 0 ? null : "IR A TRABAJO", go: "trabajo",
  });

  // ---------- 6. MEDICIÓN (evolución: solo si toca o si se hizo hoy) ----------
  const medidasHoy = (Sx.data.medidas || []).some((m) => m && m.fecha === dateKey);
  const prox = proximaMedicion(Sx.data.medidas || [], dateKey);
  if (medidasHoy || prox.falta) {
    items.push({
      id: "medicion", pri: "OPCIONAL", done: medidasHoy,
      titulo: "Medición corporal",
      sub: medidasHoy ? "Medida hoy ✓ · tu evolución está al día" : prox.motivo,
      cta: medidasHoy ? null : "MEDIR AHORA", go: "progress",
    });
  }

  // ---------- 7. MISIONES DEL DÍA (extra, con bono reclamable) ----------
  const claves = t.missionKeys || [];
  const misiones = misionesDelDia(dateKey).map((m) => {
    const done = !!(CHECKS[m.id]?.(t));
    const claimed = claves.includes(m.id);
    return {
      ...m, kind: "mision", pri: "OPCIONAL", done, claimed,
      xp: missionReward(m.id).xp,
    };
  });
  for (const m of misiones) {
    items.push({
      id: m.id, pri: "OPCIONAL", done: m.done, mision: true, claimed: m.claimed,
      titulo: m.name,
      sub: m.claimed ? `Bono +${m.xp} XP reclamado ✓`
        : m.done ? `Cumplida · reclama tu bono de +${m.xp} XP`
          : `${m.hint} · bono +${m.xp} XP`,
      cta: m.done && !m.claimed ? `RECLAMAR +${m.xp} XP` : null,
      action: m.done && !m.claimed ? "claim" : null, missionId: m.id,
    });
  }

  // ---------- agrupación por jerarquía ----------
  const grupos = PRIORIDADES.map((pri) => ({
    pri,
    items: pri === "COMPLETADO"
      ? items.filter((i) => i.done)
      : items.filter((i) => !i.done && i.pri === pri),
  })).filter((g) => g.items.length);

  const siguiente = items.find((i) => !i.done) || null;
  const hechos = items.filter((i) => i.done).length;
  return { grupos, siguiente, hechos, total: items.length, misiones, dateKey };
}
