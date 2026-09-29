// ============================================================
// BAYONA — i18n (catálogo central de textos) + formato es-ES
// Idioma base: es-ES. Preparado para más idiomas: añade un catálogo
// y cambia `locale`. TODO lo visible al usuario pasa por aquí o por
// literales en español verificados (checklist de español).
// ============================================================

export const locale = "es-ES";

const es = {
  "measure.title": "MEDICIONES · OPCIONAL",
  "measure.note": "Registra solo lo que hayas medido hoy. La grasa corporal es una estimación. Deja vacíos los campos que no quieras registrar; actualizar el mismo día no duplica datos.",
  "measure.save": "GUARDAR MEDICIÓN DE HOY",
  "measure.empty": "Añade al menos una medición válida.",
  "measure.failed": "No se pudo guardar. Revisa el almacenamiento y reintenta.",
  "measure.saved": "MEDICIÓN GUARDADA",
  "measure.savedNote": "Tu evolución se ha actualizado con datos reales.",

  "personal.name": "¿Cómo te llamamos?",
  "personal.weekPreview": "Vista previa de la semana",
  "fitness.week": "Tu semana de entrenamiento",
  "fitness.dayAria": "{date}: {state}{today}",
  "fitness.dayDone": "entrenamiento registrado",
  "fitness.dayPlanned": "sesión programada",
  "fitness.dayRecovery": "recuperación",
  "fitness.todaySuffix": ", hoy",
  "fitness.tagline": "ENTRENA A TU RITMO",
  "training.personalPlan": "PLAN PERSONALIZADO · {goal}",
  "training.weekCalendar": "CALENDARIO DE LA SEMANA",
  "training.catalog": "EXPLORA TUS ENTRENAMIENTOS",
  "training.searchLabel": "Buscar por entrenamiento o músculo",
  "training.searchPlaceholder": "Pierna, fuerza, movilidad…",
  "training.searchEmpty": "No hay entrenamientos con ese nombre. Prueba con otro ejercicio o músculo.",
  "cycle.since": "DESDE EL INICIO REGISTRADO",
  "cycle.today": "¿CÓMO ESTÁS HOY?",
  "cycle.history": "TUS ÚLTIMOS REGISTROS",
  "cycle.start": "Inicio de la última menstruación · opcional",
  "cycle.saved": "Tu día está guardado. Puedes actualizarlo cuando quieras.",
  "cycle.deleteTitle": "DESACTIVAR Y BORRAR EL DIARIO",
  "cycle.deleteText": "Se eliminarán las fechas, sensaciones y preferencias de sesión del diario. El resto de tu progreso se conserva.",
  "cycle.deleteError": "NO SE PUDO BORRAR · REINTENTAR",

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
