// ============================================================
// BAYONA · CORE→IA — coach/ai.js
// ------------------------------------------------------------
// La capa de NAVEGADOR. Todo lo puro (seguridad, herramientas,
// prompt, parser SSE) vive en coach/ai-core.js, que también
// importa el proxy de Node. Aquí solo queda lo que necesita el
// dispositivo: leer el estado real, hablar con el endpoint y, si
// algo falla, mantener la conversación viva con el motor local.
//
// Reexporta el núcleo para que la interfaz importe desde un sitio.
// ============================================================
import { S, todayKey } from "../state.js";
import { t } from "../i18n.js";
import { WORKOUTS } from "../data.js";
import { coreReply, intencionAsignacion } from "./replies.js";
import { shortSession, todaysSession } from "../engine.js";
import { localDateKey, parsePlannerIntent, plannerItemsForDate } from "../planner.js";
import * as core from "./ai-core.js";

export {
  decideRoute, derivacionATexto, contextToPrompt, COACH_TOOLS, TOOL_NAMES,
  toolSchema, normalizeToolCall, TONE, HONESTY, buildSystemPrompt, trimHistory,
  createSseParser, SIN_REGISTRAR,
} from "./ai-core.js";
export { intencionAsignacion } from "./replies.js";

const val = (v, alt = core.SIN_REGISTRAR) => (v === null || v === undefined || v === "" ? alt : v);

/* ============================================================
   CONTEXTO REAL
   ============================================================ */

/**
 * Reúne el estado REAL del usuario para el prompt.
 * Regla del proyecto: lo que no se ha registrado no se inventa.
 * Cada ausente sale marcado con «sin registrar» para que el coach
 * lo diga en voz alta en vez de rellenarlo.
 */
export function buildCoachContext() {
  const d = S.data;
  if (!d) return null;
  const t = d.today || {};
  const p = d.profile || {};
  const w = S.todayWorkout();
  const sesion = todaysSession();
  const agendaHoy = plannerItemsForDate(d.life, localDateKey()).filter((x) => x.status !== "cancelled");

  return {
    perfil: {
      nombre: val(p.name, "sin nombre"),
      objetivo: val(p.goal),
      experiencia: val(p.experience),
      disponibilidad: val(p.availability),
      equipamiento: val(p.equipment),
      nivel: S.level()?.lvl ?? null,
      // OJO: rank() devuelve el NOMBRE (string), no un objeto.
      rango: S.rank() || null,
      diasEnLaApp: S.dayNumber(),
    },
    hoy: {
      sesionProgramada: w ? w.name : "día de recuperación programado",
      sesionEjecutada: sesion ? sesion.workout?.name || w?.name || null : "ninguna",
      seriesRegistradas: t.trainingSets || 0,
      entrenado: Boolean(t.trained),
      kcal: t.kcal || 0,
      proteina: t.p || 0,
      fibra: t.fib || 0,
      agua: `${t.water || 0} ml de 2500`,
      pasos: t.steps || 0,
      minutosMente: t.mind || 0,
    },
    registros: {
      sueno: val(t.sleep, null),
      energia: val(t.energy, null),
      estres: val(t.stress, null),
      agujetas: val(t.soreness, null),
      blocksFoco: t.workBlocks || 0,
      pausasActivas: t.activePauses || 0,
    },
    estado: {
      preparacion: S.readiness(),
      racha: d.streak || 0,
      xp: d.xp || 0,
      fase: S.phase()?.name || null,
      semana: d.plan?.week ?? null,
    },
    agenda: {
      pendientes: agendaHoy.filter((x) => x.status === "planned").length,
      bloques: agendaHoy.length
        ? agendaHoy.map((x) => `${x.id} | ${x.start || "todo el día"}${x.end ? "-" + x.end : ""} | ${x.title} | ${x.status}`).join(" ; ")
        : "sin bloques",
    },
    salud: {
      avisos: d.healthFlags?.redFlags || [],
      dolor: d.healthFlags?.pain || [],
    },
  };
}

/** Contexto plano que consume el motor de reglas local. */
export function localCtx(mins, extra = {}) {
  const t = S.data?.today || {};
  return {
    readiness: S.readiness(),
    streak: S.data?.streak || 0,
    water: t.water || 0,
    sleep: t.sleep ?? null,
    soreness: t.soreness ?? null,
    energy: t.energy ?? null,
    todayWorkout: S.todayWorkout()?.name || null,
    trained: Boolean(t.trained),
    level: S.level()?.lvl ?? 1,
    mins: Number.isFinite(mins) ? mins : null,
    phase: S.phase()?.name || "—",
    week: S.data?.plan?.week ?? 0,
    kcal: t.kcal || 0,
    p: t.p || 0,
    kcalGoal: 2400,
    pGoal: 150,
    missionNote: todaysSession()?.note || null,
    catalogo: WORKOUTS,
    hoy: todayKey(),
    ...extra,
  };
}

export function minutesIn(text) {
  return parseInt((String(text).match(/(\d{1,3})\s*(min|minuto|minutos)/i) || [])[1], 10);
}

/* ============================================================
   ENDPOINT
   ============================================================ */

/** Base de la API para contenedores nativos (APK/IPA), donde no hay servidor local. */
export const PUBLIC_API_BASE = "https://bayona-app-one.vercel.app";
export function apiBase() {
  if (typeof window !== "undefined" && window.BAYONA_API_BASE) return window.BAYONA_API_BASE;
  const native = Boolean(globalThis.Capacitor?.isNativePlatform?.());
  return native ? PUBLIC_API_BASE : "";
}

/** Dónde vive el proxy. Configurable por ventana para despliegues propios. */
export function coachEndpoint() {
  if (typeof window !== "undefined" && window.BAYONA_COACH_ENDPOINT) return window.BAYONA_COACH_ENDPOINT;
  return apiBase() + "/api/coach";
}

/**
 * Comprueba si el proxy está montado. Nunca lanza: si falla, el coach
 * se queda en modo LOCAL y la app sigue igual de útil.
 */
export async function probeCloud(timeoutMs = 2500) {
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(coachEndpoint(), {
      method: "GET",
      headers: { accept: "application/json" },
      signal: ctrl?.signal,
    });
    if (!res.ok) return false;
    return Boolean((await res.json())?.ok);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ============================================================
   MOTOR LOCAL con la MISMA interfaz que la nube
   ============================================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Emite deltas y herramientas exactamente igual que la nube, para que
 * la interfaz no sepa (ni necesite saber) dónde vino la respuesta.
 */
export async function runLocal(text, { onDelta, onTool, onDone, speed = 16 } = {}) {
  const mins = minutesIn(text);
  // Plan diario: solo extrae bloques cuando hay horas explícitas. Cero horas inventadas.
  const plannerProposals = parsePlannerIntent(text, {
    defaultDurationMin: S.data?.life?.planner?.defaultDurationMin || 60,
  });
  // intención de ASIGNAR RUTINA: se detecta antes de responder para que
  // el texto y la tarjeta hablen de lo mismo.
  const asignacionPropuesta = intencionAsignacion(text, WORKOUTS);
  const full = plannerProposals.length
    ? t("coach.localPlannerReply", { count: plannerProposals.length })
    : coreReply(text, localCtx(mins, { asignacionPropuesta }));

  for (const chunk of full.split(/(\s+)/)) {
    onDelta?.(chunk);
    if (chunk.trim()) await sleep(speed);
  }

  // adaptaciones REALES, igual que en el camino de la nube
  for (const proposal of plannerProposals) {
    onTool?.({
      name: "create_day_block",
      label: t("coach.toolCreateDayBlock"),
      args: proposal,
    });
  }
  if (plannerProposals.length) {
    onTool?.({ name: "open_day_planner", label: t("coach.toolOpenDayPlanner"), args: { date: plannerProposals[0].date } });
  }
  if (asignacionPropuesta) {
    onTool?.({
      name: "assign_routine",
      label: t("coach.toolAssignRoutine"),
      args: asignacionPropuesta,
    });
  }
  if (Number.isFinite(mins) && mins >= 10 && mins <= 45) {
    const s = shortSession(mins);
    onTool?.({
      name: "open_short_session",
      label: t("coach.toolShortSession", { m: mins }),
      args: { workout: s, mins },
    });
  }
  const auto = todaysSession();
  if (auto?.applied) {
    onTool?.({ name: "view_adjusted_session", label: t("coach.toolViewMission"), args: { note: auto.note } });
  }
  onDone?.();
  return full;
}

/* ============================================================
   ORQUESTACIÓN
   ============================================================ */

/**
 * Punto de entrada único del coach.
 * @param {string} text
 * @param {{history?:Array, cloud?:boolean, onDelta?:Function, onTool?:Function, onStatus?:Function}} opts
 * @returns {Promise<{mode:string, reason:string, text:string, tools:Array, derivacion?:object}>}
 */
export async function askCore(text, opts = {}) {
  const { history = [], cloud = false, onDelta, onTool, onStatus } = opts;
  const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
  const tools = [];
  const record = (t) => { if (t) { tools.push(t); onTool?.(t); } };

  // 1) seguridad — sin excepciones, antes de cualquier byte de red
  const route = core.decideRoute(text, { cloud, online });
  if (route.mode === "refer") {
    const msg = core.derivacionATexto(route.derivacion);
    onDelta?.(msg);
    onStatus?.({ mode: "refer", reason: route.reason });
    return { mode: "refer", reason: route.reason, text: msg, tools, derivacion: route.derivacion };
  }

  // 2) nube
  if (route.mode === "cloud") {
    onStatus?.({ mode: "cloud", reason: route.reason });
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 45000) : null;
    let acc = "";
    try {
      const res = await fetch(coachEndpoint(), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({
          message: text,
          history: core.trimHistory(history),
          context: buildCoachContext(),
          personality: S.data?.profile?.coach || "MENTOR",
        }),
        signal: ctrl?.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const parser = core.createSseParser({
        onDelta: (d) => { acc += d; onDelta?.(d); },
        onTool: record,
        onError: () => {},
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(dec.decode(value, { stream: true }));
      }
      parser.flush();
      if (acc.trim()) return { mode: "cloud", reason: route.reason, text: acc, tools };
      throw new Error("respuesta vacía");
    } catch (e) {
      // 3) cualquier fallo degrada a LOCAL sin romper la conversación
      onStatus?.({ mode: "local", reason: "fallo-red", error: e?.message });
      const out = await runLocal(text, { onDelta, onTool: record });
      return { mode: "local", reason: "fallo-red", text: out, tools };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // 4) local
  onStatus?.({ mode: "local", reason: route.reason });
  const out = await runLocal(text, { onDelta, onTool: record });
  return { mode: "local", reason: route.reason, text: out, tools };
}
