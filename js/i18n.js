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

  // ---------- CORE · coach conversacional ----------
  "coach.orbTitle": "Comprobar si el coach con IA está disponible",
  "coach.probing": "Preparando el coach…",
  "coach.youShort": "TÚ",
  "coach.tu": "atleta",
  "coach.engineLocal": "LOCAL",
  "coach.engineCloud": "IA",
  "coach.stateLocal": "Reglas en tu dispositivo · funciona sin conexión",
  "coach.stateLocalProbed": "Sin IA aquí · reglas en tu dispositivo",
  "coach.stateCloud": "IA en streaming · {name}",
  "coach.note": "CORE responde con las reglas de tu dispositivo. Con el coach con IA conectado, escribe y la respuesta llega token a token. En ambos casos: no diagnostica y ante señales de alarma deriva a un profesional.",
  "coach.personality": "PERSONALIDAD",
  "coach.conversation": "CONVERSACIÓN",
  "coach.placeholder": "Escribe a CORE…",
  "coach.inputLabel": "Mensaje para CORE",
  "coach.send": "Enviar a CORE",
  "coach.tool": "CORE HA HECHO",
  "coach.applySession": "ABRIR ESTA SESIÓN",
  "coach.viewMission": "VER MI MISIÓN",
  "coach.openPlan": "VER MI PLAN",
  "coach.saveSymptom": "REGISTRAR LA MOLESTIA",
  "coach.saved": "REGISTRADO",
  "coach.findHelp": "VER A QUIÉN ACUDIR",
  "coach.openKitchen": "IR A LA COCINA",
  "coach.hello": "Estoy contigo en el mundo BAYONA, {name}.",
  "coach.helloNoSleep": "Todavía no me has registrado sueño ni energía, así que hoy no voy a inventar cómo estás: dime cómo te sientes o pídeme la sesión y nos basamos solo en lo que hay.",
  "coach.empty": "No he conseguido formar una respuesta. Repite la pregunta, con otras palabras.",
  "coach.error": "Se me ha roto la conexión con el coach. Vuelve a intentarlo.",
  "coach.degraded": "El coach con IA no respondió, así que te contesta el motor local con tus mismos datos.",
  "coach.sug.noSleep": "Dormí mal, ¿entreno igual?",
  "coach.sug.tired": "Estoy cansado",
  "coach.sug.eat": "¿Qué como ahora?",
  "coach.sug.minutes": "Hoy tengo {m} minutos",
  "coach.sug.already": "Ya entrené, ¿qué hago el resto del día?",
  "coach.sug.why": "¿Por qué esta semana hay menos volumen?",
  "coach.toolShortSession": "Abrir sesión de {m} min",
  "coach.toolViewMission": "Ver tu misión recortada",

  // ---------- DASHBOARD DE ESCRITORIO ----------
  "dash.ariaLabel": "Resumen en vivo alrededor de tu personaje",
  "dash.prepLabel": "PREPARACIÓN",
  "dash.ready": "LISTO PARA ENTRENAR",
  "dash.prepNoData": "Registra sueño o energía para poder calcularlo. Sin datos no hay estimación.",
  "dash.prepEstimated": "Estimada con {n} registro(s). Cuantos más, más fiable.",
  "dash.levelLabel": "PROGRESO",
  "dash.sessionLabel": "TU SESIÓN DE HOY",
  "dash.recoveryDay": "DÍA DE RECUPERACIÓN",
  "dash.restSub": "La disciplina también es parar.",
  "dash.planned": "PROGRAMADA",
  "dash.resumed": "SESIÓN A MEDIAS",
  "dash.start": "EMPEZAR ENTRENAMIENTO",
  "dash.continue": "CONTINUAR SESIÓN",
  "dash.toProgress": "VER MI PROGRESO",
  "dash.macrosLabel": "NUTRICIÓN HOY",
  "dash.kcal": "Energía",
  "dash.protein": "Proteína",
  "dash.waterLabel": "HIDRATACIÓN",
  "dash.streakLabel": "CONSTANCIA",
  "dash.coachTitle": "CORE · TU COACH",
  "dash.askCoach": "PREGUNTAR",
  "dash.coachTip": "Pregúntale por tu plan, tu técnica o por qué cambia de volumen.",
  "dash.coachNoData": "Aún no has registrado cómo estás. Dímelo y te ayudo con lo que tengas.",

  // ---------- RECETAS CON FOTO ----------
  "nut.recetasLabel": "RECETAS · COMIDA REAL",
  "nut.recetasNote": "Sencillas, reales y con macros claros. La foto de cada una la genera la IA: tú decides cuándo pedirla y se guarda en tu dispositivo.",
  "nut.fotoPedir": "◈ VER LA FOTO",
  "nut.fotoGenerando": "GENERANDO…",
  "nut.fotoReintentar": "REINTENTAR",
  "nut.fotoListo": "Las fotos se generan bajo demanda y se guardan en tu dispositivo para que no se vuelvan a pedir.",
  "nut.fotosSinClave": "Ahora mismo se ven las ilustraciones. Con el servicio de imágenes conectado, cada receta tendrá su foto real.",
  "nut.verReceta": "VER LA RECETA",

  // ---------- RED DE SEGURIDAD DEL PROGRESO ----------
  "data.safetyLabel": "TUS DATOS Y RESPALDOS",
  "data.safetyTitle": "TU PROGRESO ESTÁ CUBIERTO",
  "data.safetyNote": "Cada vez que guardas, BAYONA deja una copia del estado. Si algo se corrompe, se recupera solo; y si quieres, puedes volver tú a un punto anterior.",
  "data.safetyState": "Partida principal",
  "data.safetyOk": "CORRECTA",
  "data.safetyBad": "NO SE PUEDE LEER",
  "data.safetyShots": "Copias de seguridad",
  "data.safetySize": "Tamaño",
  "data.safetyBroken": "La partida principal no se puede leer. Puedes recuperar la última copia válida desde aquí.",
  "data.safetyShotN": "{xp} XP · {w} entrenamientos · {sets} series",
  "data.safetyRestore": "VOLVER AQUÍ",
  "data.safetyRestoreTag": "REPARAR",
  "data.safetyRestoreTitle": "¿VOLVER A ESTE PUNTO?",
  "data.safetyRestoreText": "Se sustituirá tu partida por la de esa copia. Lo que hayas registrado después se perderá, así que exporta antes si te importa.",
  "data.safetyCancel": "CANCELAR",
  "data.safetyConfirm": "VOLVER AQUÍ",
  "data.safetyRestored": "PROGRESO RESTAURADO",
  "data.safetyRestoredNote": "Volvemos a ese punto. Ya puedes continuar.",
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
