// ============================================================
// BAYONA — CORE: respuestas locales por reglas (asistente LOCAL, sin nube).
// Reglas: nunca inventar datos (solo registros reales), nunca diagnosticar,
// y ofrecer adaptaciones REALES (js/engine.js) o decir honestamente que no.
// ============================================================

const noData = (what) => `No tengo suficiente información sobre ${what}. Regístralo en la app y te responderé con datos reales.`;

/* ============================================================
   ASIGNAR RUTINAS (motor local, sin nube)
   ------------------------------------------------------------
   El entrenador no necesita una nube para tellar a un alumno qué
   toca: escribe «asigname fuerza superior» y el coach propone la
   sesión del catálogo. Se propone con una tarjeta y un botón:
   NUNCA se escribe en el plan sin que alguien lo pulse.
   ============================================================ */

/** Palabras que piden una rutina (no una pregunta sobre ella). */
const PIDE_ASIGNAR = /\b(as[ií]gn\w*|program\w*|pon\w*|mete|coloca\w*|quiero (?:hacer|hacer|entrenar)|para (?:hoy|mañana|manana))\b/i;
/** Y que no sea una pregunta sobre el plan que ya existe. */
const ES_PREGUNTA = /\?$|\b(qu[eé]|por qu[eé]|quien|cu[aá]ndo|cu[aá]nto|como est[aá])\b/i;

/** Palabras clave → id del catálogo. Orden importa: la más específica gana. */
const CLAVES = [
  [/inferior|pierna|pierna|sentadilla|tir[oó]n|muslo|gl[uú]teo|femur/, "op_lower"],
  [/superior|empuje|tiraci[oó]n|torso|pecho|espalda|dominadas/, "op_upper"],
  [/cuerpo entero|full|completo|general|generalista/, "op_full"],
  [/peso corporal|sin equipado|sin material|casa/, "bodyweight"],
  [/movilidad|recuperaci[oó]n|descanso|flujo|respiraci[oó]n/, "mobility_flow"],
  [/fuerza|potencia|pesado|pesas|barra/, "op_upper"],
];

/** Fecha local AAAA-MM-DD (nunca UTC: el día del usuario es el suyo). */
const hoy = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/**
 * Detecta «asigname X» y devuelve la asignación propuesta.
 * Puro y testeable: el catálogo entra por parámetro.
 * @returns {{workoutId:string, dia:string, nota:string}|null}
 */
export function intencionAsignacion(text, catalogo) {
  const s = String(text || "");
  if (!catalogo || !PIDE_ASIGNAR.test(s) || ES_PREGUNTA.test(s.trim())) return null;
  const normal = s.toLowerCase();
  let workoutId = null;
  for (const [re, id] of CLAVES) {
    if (re.test(normal) && catalogo[id]) { workoutId = id; break; }
  }
  // sin clave reconocible pero con intención clara: cuerpo entero
  if (!workoutId) workoutId = catalogo.op_full ? "op_full" : Object.keys(catalogo)[0];
  if (!workoutId) return null;

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const dia = /mañana|manana/.test(normal) ? hoy(manana) : hoy();
  const m = s.match(/["«“]([^"»”]{3,120})["»”]/);
  return { workoutId, dia, nota: m ? m[1].trim() : "" };
}

export function coreReply(text, ctx) {
  const t = (text || "").toLowerCase();
  const { readiness, streak, water, sleep, todayWorkout, trained, level, mins, missionNote } = ctx;
  const readyTxt = readiness == null
    ? "preparación sin calcular (faltan registros de hoy)"
    : `preparación del ${readiness}%`;

  const T = {
    tired: /(cansad|fatig|sin energ|agotad|no puedo más)/,
    time:  /(minut|tiempo|rato|prisa|corriendo)/,
    why:   /(por ?qué|por que|explica|como funciona|macro|volumen)/,
    eat:   /(com|comer|comida|nutri|dieta|proteína|proteina|hambre)/,
    water: /(agua|hidrat|beber|bebo)/,
    sleep: /(dorm|sueño|sue no|descans)/,
    hurt:  /(dol|lesion|lesión|molest|rodilla|espalda)/,
    motivate: /(motiv|ánimo|animo|no me apetece|pereza|empezar)/,
    train: /(entren|sesión|sesion|gym|hoy qué|hoy que)/,
    assign: /(asign|programa|rutina)/,
    hi:    /^(hola|buenas|hey|holi|qué tal|que tal)/,
  };

  if (T.hi.test(t))
    return `Hola. Soy CORE, tu asistente local de BAYONA. Según tus registros: ${readyTxt}, racha de ${streak} días. ${todayWorkout ? `Hoy toca ${todayWorkout}.` : "Hoy es día de recuperación."} ¿Por dónde empezamos?`;

  if (T.tired.test(t)) {
    if (readiness == null)
      return `No tengo registros tuyos de hoy para confirmar tu estado. Si te sientes cansado, baja el objetivo: ${todayWorkout ? "empieza con el calentamiento y decide tras la primera serie" : "movilidad suave y respiración"}. Entrenar mal no suma; descansar bien sí.`;
    return readiness < 55
      ? `Tu preparación estimada es del ${readiness}% y encaja con lo que sientes. ${missionNote || "El plan de hoy ya viene ajustado a la baja."} Recuperar bien también es progreso.`
      : `Tus datos van bien: ${readyTxt}${sleep != null ? `, ${sleep} h de sueño registradas` : ""}. A veces el cuerpo miente por pereza: empieza con 5 minutos de calentamiento y decide después.`;
  }

  if (T.time.test(t)) {
    const m = mins || 20;
    return `Perfecto. Con ${m} minutos puedo abrirte una sesión corta real: se genera con el motor de entrenamiento y se guarda igual que cualquier otra (series, XP e historial incluidos). Púlsala aquí debajo si te encaja.`;
  }

  if (T.why.test(t))
    return `Estás en fase ${ctx.phase} (semana ${ctx.week}/24). El volumen obedece al macrociclo: se alternan fases de acumulación y descarga porque el fitness se expresa tras el desescalamiento. Abre PLAN → VISTA: LABORATORIO para la tabla completa (volumen, tonelaje, RIR y adherencia real).`;

  if (T.eat.test(t))
    return `Vas en ${ctx.kcal} kcal con ${ctx.p} g de proteína registrados hoy. Objetivo configurado: ${ctx.kcalGoal} kcal / ${ctx.pGoal} g. Prioriza proteína en la próxima comida y, si entrenas hoy, coloca carbohidratos alrededor de la sesión.`;

  if (T.water.test(t))
    return `Llevas ${water} ml registrados de 2.500 ml. Si acabas de beber, regístralo (+500 ml): tu avatar se hidrata contigo. Durante la sesión, unos 250 ml por bloque.`;

  if (T.sleep.test(t))
    return sleep == null
      ? noData("tu sueño de anoche")
      : `Registré ${sleep} h. ${sleep < 7 ? "Por debajo de 7 h la calidad de carga cae: hoy prioriza recuperación y movilidad." : "Es un buen cimiento. Mantén la misma hora de sueño también en fin de semana."}`;

  if (T.hurt.test(t))
    return `La seguridad primero: si hay dolor agudo, deja el ejercicio y consulta a un profesional. Dime qué zona molesta y te propongo alternativas sin esa carga. Yo no diagnostico.`;

  if (T.motivate.test(t))
    return `Llevas ${streak} días de constancia y ${trained ? "hoy ya cerraste tu sesión" : "hoy la sesión sigue pendiente"}. La regla: cuidar al personaje es cuidarte a ti. Empieza pequeño y deja constancia real. ¿Empezamos?`;

  if (T.assign.test(t) && ctx.asignacionPropuesta) {
    const a = ctx.asignacionPropuesta;
    const w = ctx.catalogo?.[a.workoutId];
    return `Te propongo ${w ? w.name : a.workoutId}${a.dia !== ctx.hoy ? ` para ${a.dia}` : " para hoy"}${w ? ` (${w.min} min)` : ""}. Revísalo en la tarjeta de abajo y, si te encaja, queda en tu plan y en tu HOY. Yo no lo escribo por ti sin que lo pulses.`;
  }

  if (T.train.test(t))
    return todayWorkout
      ? `Hoy toca ${todayWorkout}. Ábrela en el GIMNASIO: verás las series previstas y el XP real de cada serie antes de empezar.`
      : `Hoy es día de recuperación programada. La disciplina también es parar. Puedes hacer FLUJO DE RECUPERACIÓN si el cuerpo lo pide.`;

  return `Entendido. Con tus registros actuales (NIVEL ${level}, ${readyTxt}, racha ${streak}) te propongo: ${todayWorkout || "recuperación activa"}, hidratación hasta 2.500 ml${sleep != null ? ` y mantener tus ${sleep} h de sueño` : " y registrar tu sueño para calibrar la preparación"}. Pregúntame por entrenamiento, nutrición o recuperación.`;
}
