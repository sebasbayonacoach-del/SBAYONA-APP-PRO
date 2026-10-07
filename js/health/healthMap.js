// Salud integral · healthMap.js — evaluación de entrada y trimestral (puro, testeable).
// Screening, NUNCA diagnóstico (política clínica CLINICAL_POLICY). Derivación ante banderas.

/** PAR-Q+ (7 clásicos) — condicionantes para empezar a entrenar. */
export const PAR_Q_ITEMS = [
  { id: 'heart', q: '¿Algún médico te ha dicho que tienes un problema de corazón o que solo debes hacer ejercicio supervisado?', weight: 'red' },
  { id: 'chest_pain', q: '¿Tienes dolor u opresión en el pecho cuando haces actividad física o en reposo?', weight: 'red' },
  { id: 'balance', q: '¿Has perdido el conocimiento o el equilibrio por mareo en los últimos 12 meses?', weight: 'red' },
  { id: 'meds_bp', q: '¿Tomas medicación para tensión arterial o problemas de corazón (recetada por médico)?', weight: 'amber' },
  { id: 'joint', q: '¿Tienes alguna condición articular u ósea que empeore con el ejercicio?', weight: 'amber' },
  { id: 'other', q: '¿Hay alguna otra razón por la que no debas hacer ejercicio físico?', weight: 'amber' },
  { id: 'diabetes', q: '¿Tienes diabetes o problemas metabólicos que requieran cuidado con el ejercicio?', weight: 'amber' },
];

/** Etiquetas cortas en español para las banderas (los ids se conservan tal cual como contrato). */
const PAR_Q_LABELS = {
  heart: 'problema de corazón',
  chest_pain: 'dolor u opresión de pecho',
  balance: 'pérdida de conciencia o equilibrio',
  meds_bp: 'medicación para la tensión o el corazón',
  joint: 'condición articular u ósea',
  other: 'otra razón médica',
  diabetes: 'diabetes o problema metabólico',
};

/** Bandas internas → texto mostrado al usuario (los valores de banda no cambian). */
const BAND_ES = { minimo: 'mínimo', leve: 'leve', moderado: 'moderado', probable: 'probable' };

/** PHQ-2 (+ ítem 9 de seguridad de PHQ-9). */
export function scorePhq2({ interest = 0, mood = 0, selfHarm = 0 } = {}) {
  const score = interest + mood; // 0-6
  let band;
  if (score >= 5) band = 'probable';
  else if (score >= 3) band = 'moderado';
  else if (score >= 2) band = 'leve';
  else band = 'minimo';
  const redFlag = selfHarm > 0; // cualquier ideación → derivación inmediata
  const needsProEval = score >= 3 || redFlag;
  return { score, band, redFlag, needsProEval };
}

/** GAD-2 — ansiedad (screening). */
export function scoreGad2({ nervous = 0, worry = 0 } = {}) {
  const score = nervous + worry; // 0-6
  const band = score >= 5 ? 'probable' : score >= 3 ? 'moderado' : score >= 2 ? 'leve' : 'minimo';
  return { score, band, needsProEval: score >= 3 };
}

/**
 * Body-map de dolor → prioridades de protección.
 * @param {Array<{zone:string, severity:number, sinceDays?:number}>} pains
 */
export function bodyMapPriorities(pains = []) {
  return pains
    .filter((p) => p.zone && p.severity > 0)
    .map((p) => {
      const level = p.severity >= 3 ? 'alta' : p.severity === 2 ? 'media' : 'baja';
      const action = p.severity >= 3
        ? `Proteger ${p.zone}: sin carga directa + valoración de fisioterapia`
        : p.severity === 2
          ? `Modificar ejercicios que carguen ${p.zone} y monitorizar`
          : `Monitorizar ${p.zone}`;
      return { zone: p.zone, level, action, severity: p.severity };
    })
    .sort((a, b) => b.severity - a.severity);
}

/**
 * Evalúa el PAR-Q+ y decide el nivel de acceso al entrenamiento.
 * @param {Record<string, boolean>} answers id → true = sí
 */
export function scoreParQ(answers = {}) {
  const flagged = PAR_Q_ITEMS.filter((it) => answers[it.id] === true);
  const redFlags = flagged.filter((f) => f.weight === 'red').map((f) => f.id);
  const ambers = flagged.filter((f) => f.weight === 'amber').map((f) => f.id);
  const clearance = redFlags.length ? 'refer_required' : ambers.length ? 'conditional' : 'cleared';
  return {
    clearance, redFlags, ambers,
    note: redFlags.length
      ? 'Antes de entrenar necesitas valoración médica (respuestas de riesgo en PAR-Q+).'
      : ambers.length
        ? 'Puedes entrenar con modificaciones y seguimiento.'
        : 'Sin contraindicaciones detectadas para empezar a entrenar.',
  };
}

export function contextualizeTrainingScreening(screening = {}, context = {}) {
  const base = screening?.clearance ? screening : scoreParQ(screening);
  const text = (value) => String(value || "").trim();
  const contextFlags = [
    ...(text(context.currentInjuries) ? ["current_injury"] : []),
    ...(text(context.currentPain) ? ["current_pain"] : []),
    ...(text(context.conditions) ? ["known_condition"] : []),
    ...(text(context.medications) ? ["declared_medication"] : []),
    ...(text(context.professionalRestrictions) ? ["professional_restriction"] : []),
    ...(["pregnant", "postpartum"].includes(context.pregnancyPostpartum) ? [context.pregnancyPostpartum] : []),
  ];
  const nutritionFlags = text(context.allergiesIntolerances) ? ["allergies_intolerances"] : [];
  if (base.clearance === "refer_required") {
    return { ...base, contextFlags, nutritionFlags };
  }
  if (!contextFlags.length) {
    return { ...base, contextFlags, nutritionFlags };
  }
  return {
    ...base,
    clearance: "conditional",
    contextFlags,
    nutritionFlags,
    note: base.clearance === "conditional"
      ? `${base.note} Hay contexto adicional declarado que el plan debe respetar.`
      : "El PAR-Q+ no detectó una bandera de derivación, pero hay contexto declarado que requiere adaptar o revisar el plan antes de aumentar la exigencia.",
  };
}

/**
 * HEALTH MAP completo → prioridades del plan.
 * @param {{parq:Record<string,boolean>, phq2:object, gad2:object, pains:Array, goals:string[]}} input
 */
export function buildHealthMap({ parq = {}, phq2 = {}, gad2 = {}, pains = [], goals = [] } = {}) {
  const parqRes = scoreParQ(parq);
  const phq = scorePhq2(phq2);
  const gad = scoreGad2(gad2);
  const painPriorities = bodyMapPriorities(pains);

  const redFlags = [
    ...parqRes.redFlags.map((id) => ({ domain: 'cardio-metabolico', source: `PAR-Q+ · ${PAR_Q_LABELS[id] || id}` })),
    ...(phq.redFlag ? [{ domain: 'mental', source: 'ideación autolesiva' }] : []),
    ...(parqRes.redFlags.length === 0 && phq.needsProEval ? [{ domain: 'mental', source: `PHQ-2 ${phq.score}/6` }] : []),
    ...(parqRes.redFlags.length === 0 && gad.needsProEval ? [{ domain: 'ansiedad', source: `GAD-2 ${gad.score}/6` }] : []),
  ];

  const priorities = [
    ...painPriorities.map((p) => p.action),
    ...(parqRes.clearance === 'conditional' ? ['Entrenar con modificaciones y seguimiento (PAR-Q+ ámbar)'] : []),
    ...goals.map((g) => `Objetivo: ${g}`),
  ];

  return {
    clearance: parqRes.clearance,
    parq: parqRes,
    mental: { phq2: phq, gad2: gad },
    activePain: painPriorities,
    redFlags,
    priorities,
    summary: `${parqRes.note} Dolor activo: ${painPriorities.length} zona(s). Ánimo ${BAND_ES[phq.band] ?? phq.band}, ansiedad ${BAND_ES[gad.band] ?? gad.band}.`,
  };
}
