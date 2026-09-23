// CORE→IA · coachStub.js — núcleo del coach: política clínica, red flags y auto-regulación.
// Puro y testeable en Node. La conexión al LLM (SSE + RAG) se enchufa encima de este núcleo.
// REGLA INAMOVIBLE (PLAN_NIVEL_3_PRO §5.2): el screening determinista corre ANTES que el modelo.

/** 1. POLÍTICA CLÍNICA — siempre primera en el prompt. */
export const CLINICAL_POLICY = `Eres CORE, coach de BAYONA. REGLAS CLÍNICAS (no negociables):
1. No diagnostiques ni trates enfermedades. Eres coach de fitness y hábitos.
2. Haces screening, priorizas, programas y acompañas; ante señales clínicas DERIVAS a un profesional humano.
3. Ante cualquier red flag: detén el entrenamiento, muestra aviso claro y ofrece derivación (telémedicina/urgencias).
4. Explica siempre el "por qué" con evidencia (ACSM/NSCA/ISSN/OMS) en lenguaje del usuario.
5. Nunca prometas "curar" ni "solucionar todos los problemas de salud".
6. Gamificación sin culpa: fallar no destruye al personaje ni a la persona.`;

/** 2. REGLAS DE RED FLAG — deterministas, independientes del LLM. */
export const RED_FLAG_RULES = [
  { re: /(dolor|duele|opresi[oó]n|presi[oó]n|ardor).{0,25}(pecho|tor[aá]x|coraz[oó]n)/i,
    severity: 'red', domain: 'cardio', action: 'stop_and_refer',
    msg: 'Detén el ejercicio AHORA. El dolor u opresión de pecho requiere valoración médica urgente.' },
  { re: /(falta de aire|ahogo|no puedo respirar|disnea)/i,
    severity: 'red', domain: 'cardio', action: 'stop_and_refer',
    msg: 'Detén el ejercicio y busca ayuda médica. La dificultad para respirar fuera de esfuerzo esperado es una señal de alarma.' },
  { re: /(desmay|me desmay[oó]|mareo intenso|v[oó]mitos? persistentes?)/i,
    severity: 'red', domain: 'cardio', action: 'stop_and_refer',
    msg: 'Detén el ejercicio. Desmayo, mareo intenso o vómitos persistentes requieren valoración médica.' },
  { re: /sangr/i,
    severity: 'red', domain: 'clinical', action: 'stop_and_refer',
    msg: 'Detén el ejercicio y busca atención médica si hay sangrado.' },
  { re: /(hacerme da[ñn]o|suicid|quitarme la vida|no quiero vivir|cortarme)/i,
    severity: 'red', domain: 'mental', action: 'stop_and_refer',
    msg: 'Tu seguridad es lo primero. Habla HOY con un profesional: línea de ayuda de crisis o urgencias. BAYONA está aquí para acompañarte, pero esto necesita ayuda humana.' },
  { re: /(dolor agudo|truena|bloquea|hinchad|hinchaz[oó]n|luxa)/i,
    severity: 'amber', domain: 'msk', action: 'modify_and_monitor',
    msg: 'Posible lesión musculoesquelética. Modifico tu sesión para proteger la zona y te recomiendo valoración de fisioterapia si persiste.' },
  { re: /(dolor|duele|lastima|mol[eé]sta).{0,25}(espalda|lumbar|hombro|rodilla|codo|tobillo|mu[ñn]eca|cadera|cuello)/i,
    severity: 'amber', domain: 'msk', action: 'modify_and_monitor',
    msg: 'Entrenaremos ALREDEDOR del dolor, nunca a través de él. Ajusto la sesión y monitorizo evolución.' },
];

/** 3. TOOLS del coach (function calling) — PLAN_NIVEL_3_PRO §5.1. */
export const COACH_TOOLS = [
  { name: 'get_plan_day', args: { date: 'string' } },
  { name: 'adjust_session', args: { sessionId: 'string', reason: 'string', change: 'deload|swap|skip|add|extend' } },
  { name: 'log_symptom', args: { bodyMap: 'string', severity: '0|1|2|3', note: 'string' } },
  { name: 'escalate_referral', args: { domain: 'string', urgency: 'amber|red' } },
  { name: 'explain_evidence', args: { topic: 'string' } },
  { name: 'nutrition_suggest', args: { kcalTarget: 'boolean?', prefs: 'string[]' } },
];

/**
 * Screening determinista del mensaje del usuario.
 * @returns {{risk:'none'|'amber'|'red', flags:Array, action:string, reply:string}}
 */
export function screenMessage(text) {
  const flags = RED_FLAG_RULES.filter((r) => r.re.test(text || ''));
  if (!flags.length) return { risk: 'none', flags: [], action: 'continue', reply: '' };
  const risk = flags.some((f) => f.severity === 'red') ? 'red' : 'amber';
  const action = risk === 'red' ? 'stop_and_refer' : 'modify_and_monitor';
  return {
    risk,
    flags: flags.map(({ severity, domain, action: a, msg }) => ({ severity, domain, action: a, msg })),
    action,
    reply: flags.map((f) => f.msg).join('\n'),
  };
}

/**
 * Auto-regulación por readiness (PLAN_NIVEL_3_PRO §3.4):
 * el plan se adapta al estado REAL del usuario y se explica siempre.
 * @param {{volume:number}} plan @param {number} readiness 0-100
 */
export function adjustPlanForReadiness(plan, readiness) {
  const vol = plan?.volume ?? 100;
  let pct = 0, label = 'mantener', rationale;
  if (readiness < 40) {
    pct = -40; label = 'deload fuerte';
    rationale = `Preparación ${readiness}% (baja). Hoy toca descargar: −40% de volumen. Mejor un paso atrás que una lesión.`;
  } else if (readiness < 60) {
    pct = -20; label = 'descarga ligera';
    rationale = `Preparación ${readiness}%. Reduzco −20% el volumen y evito series al fallo.`;
  } else if (readiness < 75) {
    pct = 0; label = 'mantener';
    rationale = `Preparación ${readiness}%. Sesión tal como estaba planeada, sin forzar máximos.`;
  } else {
    pct = 5; label = 'progresivo';
    rationale = `Preparación ${readiness}% (alta). Puedes empujar: +5% de estímulo si la técnica acompaña.`;
  }
  return {
    change: label,
    pctVolumen: pct,
    volume: Math.max(20, Math.round(vol * (1 + pct / 100))),
    rationale,
  };
}

/**
 * Ensambla el prompt por capas (§5.2): POLÍTICA → contexto → memoria → mensaje.
 * El RAG se inserta como capa 4 cuando el servicio esté conectado.
 */
export function buildMessages({ profile = {}, healthMap = {}, readiness = null, history = [], message = '' } = {}) {
  const context = [
    `USUARIO: ${profile.displayName || 'anónimo'} · objetivo: ${profile.goal || 'mejorar salud'}`,
    healthMap.priorities?.length ? `HEALTH MAP · prioridades: ${healthMap.priorities.join(', ')}` : 'HEALTH MAP: sin evaluar aún',
    healthMap.activePain?.length ? `DOLOR ACTIVO: ${healthMap.activePain.join(', ')}` : '',
    readiness != null ? `READINESS HOY: ${readiness}/100` : '',
  ].filter(Boolean).join('\n');

  return [
    { role: 'system', content: CLINICAL_POLICY },
    { role: 'system', content: `CONTEXTO DEL USUARIO:\n${context}` },
    ...history.slice(-8),
    { role: 'user', content: message },
  ];
}
