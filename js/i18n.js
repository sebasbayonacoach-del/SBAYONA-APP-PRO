// ============================================================
// BAYONA — i18n (catálogo central de textos) + formato es-ES
// Idioma base: es-ES. Preparado para más idiomas: añade un catálogo
// y cambia `locale`. TODO lo visible al usuario pasa por aquí o por
// literales en español verificados (checklist de español).
// ============================================================

export const locale = "es-ES";

const es = {
  // navegación / secciones
  "nav.home": "INICIO",
  "nav.training": "ENTRENAMIENTO",
  "nav.nutrition": "NUTRICIÓN",
  "nav.recovery": "RECUPERACIÓN",
  "nav.mind": "MENTE",
  "nav.plan": "PLAN",
  "nav.armory": "ARMERÍA",
  "nav.progress": "PROGRESO",
  "nav.core": "CORE",
  "nav.more": "MÁS",
  "nav.social": "COMUNIDAD",
  // acciones
  "act.save": "GUARDAR",
  "act.cancel": "CANCELAR",
  "act.delete": "ELIMINAR",
  "act.continue": "CONTINUAR",
  "act.close": "CERRAR",
  "act.start": "COMENZAR",
  "act.retry": "REINTENTAR",
  "act.back": "ATRÁS",
  // estados
  "state.loading": "CARGANDO…",
  "state.error": "ERROR",
  "state.success": "HECHO",
  "state.empty": "TODAVÍA NO HAY DATOS",
  "state.offline": "SIN CONEXIÓN",
  "state.notLogged": "Todavía no lo has registrado",
  "state.comingSoon": "PRÓXIMAMENTE",
  "state.localOnly": "Datos guardados en este dispositivo",
  // economía
  "eco.level": "NIVEL",
  "eco.xp": "XP",
  "eco.points": "PUNTOS BAYONA",
  "eco.credits": "CRÉDITOS",
  // errores honestos
  "err.storage": "No pudimos guardar en este dispositivo. Tus datos viven solo en memoria hasta que haya espacio.",
  "err.saveSet": "No pudimos guardar la serie. Tus datos permanecen en este dispositivo y volveremos a intentarlo.",
};

const CATS = { "es-ES": es };

export function t(key, vars) {
  let s = CATS[locale]?.[key] ?? CATS["es-ES"][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Escape para cualquier texto de usuario que se inserte en HTML. */
export function esc(x) {
  return String(x ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// ---------- formato es-ES ----------
export function fmtDate(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(locale); // 22/09/2026
}
export function fmtDateLong(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}
export function fmtTime(d = new Date()) {
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: false }); // 18:30
}
/** Decimal español: 72,5 */
export function fmtDec(n, dec = 1) {
  return Number(n).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: dec });
}
/** Entero con miles: 1.200 */
export function fmtInt(n) {
  return Number(n).toLocaleString(locale, { maximumFractionDigits: 0 });
}
/** Duración: "7 h 24 min" */
export function fmtMin(min) {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + " min" : ""}`.trim();
}
