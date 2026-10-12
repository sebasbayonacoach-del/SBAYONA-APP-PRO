// BAYONA LIFE GAME · Cinco áreas de vida, UNA economía de XP.
// Puro: deriva misiones desde registros reales y tareas confirmadas por el usuario.
// Los eventos de calendarios externos nunca prueban misiones ni dan XP.
import { LIFE_AREAS } from "./areas.js";
import { plannerItemsForDate } from "../planner.js";
import { areaMissionReward } from "../rewards.js";

const tracked = Object.freeze({
  body: (t) => Boolean(t?.trained || t?.mobility),
  mind: (t) => Number(t?.mind || 0) >= 5,
  work: (t) => Number(t?.workBlocks || 0) >= 1,
});

/**
 * Misiones diarias, calculadas sin añadir tareas ficticias.
 * tracked = registro interno; confirmed = una tarea marcada por la persona.
 * Nunca asume que el calendario externo confirma una acción.
 */
export function lifeMissions({ life = {}, today = {}, date = today?.date, claimedKeys = today?.missionKeys || [] } = {}) {
  const items = plannerItemsForDate(life, date);
  const manual = items.filter((item) => item.source === "manual" && item.area && item.status !== "cancelled");
  const claimed = new Set(Array.isArray(claimedKeys) ? claimedKeys : []);
  const areas = LIFE_AREAS.map((area) => {
    const tasks = manual.filter((item) => item.area === area.id);
    const completed = tasks.filter((item) => item.status === "done");
    const hasRecord = Boolean(tracked[area.id]?.(today));
    const done = hasRecord || completed.length > 0;
    const source = hasRecord ? "tracked" : completed.length ? "confirmed" : "none";
    const pending = tasks.filter((item) => item.status === "planned");
    const missionId = "area_" + area.id;
    return {
      ...area, missionId, done, source,
      total: tasks.length, completed: completed.length,
      next: pending[0] || null,
      xp: areaMissionReward(area.id).xp,
      claimed: claimed.has(missionId),
    };
  });
  const done = areas.filter((x) => x.done).length;
  const claimedCount = areas.filter((x) => x.claimed).length;
  const priorities = { critical: 0, high: 1, normal: 2, low: 3 };
  const candidates = manual.filter((item) => item.status === "planned");
  candidates.sort((a, b) =>
    (priorities[a.priority] ?? 2) - (priorities[b.priority] ?? 2) ||
    (a.start || "99:99").localeCompare(b.start || "99:99")
  );
  return { date, areas, done, total: areas.length, claimedCount, next: candidates[0] || null };
}
