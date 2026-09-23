// ============================================================
// BAYONA — CORE: respuestas locales por reglas (asistente LOCAL, sin nube).
// Reglas: nunca inventar datos (solo registros reales), nunca diagnosticar,
// y ofrecer adaptaciones REALES (js/engine.js) o decir honestamente que no.
// ============================================================

const noData = (what) => `No tengo suficiente información sobre ${what}. Regístralo en la app y te responderé con datos reales.`;

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

  if (T.train.test(t))
    return todayWorkout
      ? `Hoy toca ${todayWorkout}. Ábrela en el GIMNASIO: verás las series previstas y el XP real de cada serie antes de empezar.`
      : `Hoy es día de recuperación programada. La disciplina también es parar. Puedes hacer FLUJO DE RECUPERACIÓN si el cuerpo lo pide.`;

  return `Entendido. Con tus registros actuales (NIVEL ${level}, ${readyTxt}, racha ${streak}) te propongo: ${todayWorkout || "recuperación activa"}, hidratación hasta 2.500 ml${sleep != null ? ` y mantener tus ${sleep} h de sueño` : " y registrar tu sueño para calibrar la preparación"}. Pregúntame por entrenamiento, nutrición o recuperación.`;
}
