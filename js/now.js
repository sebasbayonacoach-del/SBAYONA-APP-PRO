import { t } from "./i18n.js";

// ============================================================
// BAYONA NOW · motor de decisión de la pantalla "Ahora"
// ------------------------------------------------------------
// Puro: no toca DOM, red ni almacenamiento. Recibe solo datos ya
// registrados y devuelve UNA recomendación accionable.
// ============================================================

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const validNum = (v) => v == null || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null);

function dayPart(hour) {
  if (hour < 5) return "noche";
  if (hour < 12) return "mañana";
  if (hour < 18) return "tarde";
  return "noche";
}

export function recentSummary(history = [], today = {}) {
  const rows = [...(Array.isArray(history) ? history : []).slice(-27)];
  if (today && typeof today === "object") {
    rows.push({
      date: today.date || null,
      workouts: today.trained ? 1 : 0,
      sets: Number(today.trainingSets || 0),
      sleep: today.sleep ?? null,
      energy: today.energy ?? null,
      strain: Number(today.strain || 0),
      prPoints: Array.isArray(today.prPoints) ? today.prPoints : [],
    });
  }
  const last7 = rows.slice(-7);
  const last28 = rows.slice(-28);
  const sum = (arr, key) => arr.reduce((a, x) => a + Number(x?.[key] || 0), 0);
  const average = (arr, key) => {
    const vals = arr.map((x) => validNum(x?.[key])).filter((v) => v != null);
    return vals.length ? +(vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1) : null;
  };
  const prs = (arr) => arr.reduce((a, x) => a + (Array.isArray(x?.prPoints) ? x.prPoints.length : 0), 0);

  return {
    workouts7: sum(last7, "workouts"),
    sets7: sum(last7, "sets"),
    strain7: +sum(last7, "strain").toFixed(1),
    sleep7: average(last7, "sleep"),
    energy7: average(last7, "energy"),
    prs28: prs(last28),
    workouts28: sum(last28, "workouts"),
    daysTracked: rows.filter((x) => x?.date).length,
  };
}

function contextLine(summary) {
  if (summary.workouts7 > 0) return t("now.insight.workouts", { count: summary.workouts7 });
  if (summary.daysTracked > 0) return t("now.insight.open");
  return t("now.insight.learning");
}

function statusLabel(score) {
  if (score == null) return t("now.status.unknown");
  if (score >= 80) return t("now.status.high");
  if (score >= 60) return t("now.status.good");
  if (score >= 45) return t("now.status.moderate");
  return t("now.status.low");
}

/**
 * @returns {{
 *   kind:string,kicker:string,title:string,body:string,action:string,
 *   actionLabel:string,secondaryPrompt:string,status:{score:number|null,label:string},
 *   insight:string,dayPart:string
 * }}
 */
export function decideNow({
  now = new Date(),
  profile = {},
  today = {},
  readinessDetail = {},
  activeSession = null,
  workout = null,
  adjustedSession = null,
  plannerContext = null,
  missionContext = null,
  history = [],
} = {}) {
  const hour = typeof now?.getHours === "function" ? now.getHours() : 12;
  const part = dayPart(hour);
  const score = validNum(readinessDetail?.score);
  const summary = recentSummary(history, today);
  const firstName = String(profile?.name || "").trim().split(/\s+/)[0] || "";
  const hello = firstName ? `${firstName}, ` : "";

  const base = {
    kicker: t("now.kicker"),
    secondaryPrompt: t("now.changedPrompt"),
    status: { score: score == null ? null : clamp(Math.round(score), 0, 100), label: statusLabel(score) },
    insight: contextLine(summary),
    dayPart: part,
    summary,
  };

  const pending = activeSession && !["completada", "abandonada"].includes(activeSession.status);
  if (pending) {
    const done = Number(activeSession.logged || 0);
    const total = Number(activeSession.plannedSets || 0);
    return {
      ...base,
      kind: "resume",
      title: t("now.resume.title", { prefix: hello }),
      body: total > 0
        ? t("now.resume.body.progress", { done, total })
        : t("now.resume.body.simple"),
      action: "resume",
      actionLabel: t("now.resume.cta"),
    };
  }

  if (plannerContext?.item && plannerContext.state === "active") {
    const item = plannerContext.item;
    return {
      ...base,
      kind: "planner",
      title: t("now.planner.active.title", { prefix: hello, title: item.title }),
      body: t("now.planner.active.body", { start: item.start || "—", end: item.end || "—" }),
      action: "planner",
      actionLabel: t("now.planner.active.cta"),
    };
  }

  if (plannerContext?.item && plannerContext.state === "next" && plannerContext.minutesUntil != null && plannerContext.minutesUntil <= 45) {
    const item = plannerContext.item;
    return {
      ...base,
      kind: "planner",
      title: t("now.planner.next.title", { prefix: hello, title: item.title }),
      body: t("now.planner.next.body", { start: item.start || "—", minutes: plannerContext.minutesUntil }),
      action: "planner",
      actionLabel: t("now.planner.next.cta"),
    };
  }

  if (today?.trained) {
    if (part === "noche") {
      return {
        ...base,
        kind: "recover",
        title: t("now.trained.night.title", { prefix: hello }),
        body: t("now.trained.night.body"),
        action: "recover",
        actionLabel: t("now.trained.night.cta"),
      };
    }
    return {
      ...base,
      kind: "recover",
      title: t("now.trained.day.title", { prefix: hello }),
      body: t("now.trained.day.body"),
      action: "recover",
      actionLabel: t("now.trained.day.cta"),
    };
  }

  if (workout) {
    if (score != null && score < 40) {
      return {
        ...base,
        kind: "recover",
        title: t("now.low.title", { prefix: hello }),
        body: adjustedSession?.note
          || t("now.low.body"),
        action: "recover",
        actionLabel: t("now.low.cta"),
      };
    }

    if (score != null && score < 55) {
      return {
        ...base,
        kind: "train",
        title: t("now.moderate.title", { prefix: hello }),
        body: adjustedSession?.note
          || t("now.moderate.body"),
        action: "train",
        actionLabel: t("now.moderate.cta"),
      };
    }

    return {
      ...base,
      kind: "train",
      title: t("now.ready.title", { prefix: hello }),
      body: adjustedSession?.applied
        ? adjustedSession.note
        : t("now.ready.body", { workout: workout.name || "—", minutes: workout.min || "—" }),
      action: "train",
      actionLabel: t("now.ready.cta"),
    };
  }

  // En un día libre de entrenamiento y sin una cita urgente,
  // un compromiso de crecimiento elegido puede ser la siguiente acción.
  // Nunca se impone si los registros muestran baja preparación.
  if (missionContext?.next && part !== "noche" && (score == null || score >= 45)) {
    const task = missionContext.next;
    const area = missionContext.areas?.find((entry) => entry.id === task.area);
    return {
      ...base,
      kind: "life",
      title: t("now.life.title", { prefix: hello, title: task.title }),
      body: t("now.life.body", { area: area?.short || t("planner.area.none") }),
      action: "planner",
      actionLabel: t("now.life.cta"),
    };
  }

  return {
    ...base,
    kind: "recover",
    title: part === "noche"
      ? t("now.rest.night.title", { prefix: hello })
      : t("now.rest.day.title", { prefix: hello }),
    body: t("now.rest.body"),
    action: "recover",
    actionLabel: t("now.rest.cta"),
  };
}
