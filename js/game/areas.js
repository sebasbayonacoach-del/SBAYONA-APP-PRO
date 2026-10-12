import { t } from "../i18n.js";

// BAYONA LIFE GAME — Areas de vida, sin una segunda economía de XP.
// Un bloque puede pertenecer a un área; ni calendario ni datos sensibles
// se transforman automáticamente en misiones remuneradas.
export const LIFE_AREAS = Object.freeze([
  Object.freeze({ id: "body", name: "CUERPO", short: "Cuerpo", description: "Movimiento, alimentación y descanso" }),
  Object.freeze({ id: "mind", name: "MENTE", short: "Mente", description: "Aprender, pensar y concentrarse" }),
  Object.freeze({ id: "work", name: "TRABAJO", short: "Trabajo", description: "Crear, estudiar y sostener tus proyectos" }),
  Object.freeze({ id: "relationships", name: "RELACIONES", short: "Relaciones", description: "Conexiones y cuidado mutuo" }),
  Object.freeze({ id: "purpose", name: "PROPÓSITO", short: "Propósito", description: "Valores, reflexión y sentido personal" }),
]);
const IDS = new Set(LIFE_AREAS.map((a) => a.id));

export function normalizeLifeArea(value, fallback = null) {
  return IDS.has(value) ? value : fallback;
}

export function areaForPlannerType(type, title = "") {
  const text = String(title).toLocaleLowerCase("es");
  // Nunca deducir creencias religiosas; "propósito" solo por acción explícita.
  if (/\b(oraci[oó]n|gratitud|reflexi[oó]n personal|prop[oó]sito)\b/.test(text)) return "purpose";
  if (/\b(lectura|leer|medita|aprende|diario personal)\b/.test(text)) return "mind";
  if (/\b(llamar a|escribir a|familia|amistad|amig[oa]|pareja|mam[aá]|pap[aá])\b/.test(text)) return "relationships";
  if (["training", "meal", "recovery"].includes(type)) return "body";
  if (["work", "focus", "admin"].includes(type)) return "work";
  if (type === "personal") return "relationships";
  return null; // viajes y otros bloques no se clasifican por adivinación
}

export const GROWTH_LIBRARY = Object.freeze([
  Object.freeze({ id: "body_mobility", area: "body", title: t("growth.body.mobility"), type: "training", minutes: 10 }),
  Object.freeze({ id: "body_meal", area: "body", title: t("growth.body.meal"), type: "meal", minutes: 15 }),
  Object.freeze({ id: "mind_read", area: "mind", title: t("growth.mind.read"), type: "personal", minutes: 15 }),
  Object.freeze({ id: "mind_reflect", area: "mind", title: t("growth.mind.reflect"), type: "personal", minutes: 5 }),
  Object.freeze({ id: "work_priority", area: "work", title: t("growth.work.priority"), type: "focus", minutes: 25 }),
  Object.freeze({ id: "work_plan", area: "work", title: t("growth.work.plan"), type: "admin", minutes: 5 }),
  Object.freeze({ id: "relations_contact", area: "relationships", title: t("growth.relationships.contact"), type: "personal", minutes: 5 }),
  Object.freeze({ id: "relations_present", area: "relationships", title: t("growth.relationships.present"), type: "personal", minutes: 10 }),
  Object.freeze({ id: "purpose_values", area: "purpose", title: t("growth.purpose.values"), type: "personal", minutes: 5 }),
  Object.freeze({ id: "purpose_gratitude", area: "purpose", title: t("growth.purpose.gratitude"), type: "personal", minutes: 5 }),
]);

/** Dos propuestas por área, nunca 10 obligaciones automáticas. */
export function growthSuggestions({ life = {}, date, includedAreas = LIFE_AREAS.map((a) => a.id), visibleItems = null } = {}) {
  const saved = Array.isArray(visibleItems) ? visibleItems :
    (Array.isArray(life?.planner?.items) ? life.planner.items : []);
  const areas = new Set(includedAreas.filter((a) => IDS.has(a)));
  return GROWTH_LIBRARY
    .filter((entry) => areas.has(entry.area))
    .map((entry) => {
      const existing = saved.find((item) =>
        item.date === date && item.area === entry.area &&
        String(item.title || "").trim().toLocaleLowerCase("es") === entry.title.toLocaleLowerCase("es") &&
        item.status !== "cancelled"
      );
      return { ...entry, existingId: existing?.id || null, done: existing?.status === "done" };
    });
}

export function areaSummary(life, date, visibleItems = null) {
  const source = Array.isArray(visibleItems) ? visibleItems : (life?.planner?.items || []);
  const items = source.filter((i) => i.date === date && i.area && IDS.has(i.area) && i.status !== "cancelled");
  return LIFE_AREAS.map((a) => ({
    ...a,
    total: items.filter((i) => i.area === a.id).length,
    done: items.filter((i) => i.area === a.id && i.status === "done").length,
  }));
}
