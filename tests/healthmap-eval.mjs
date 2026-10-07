// Salud · healthmap-eval.mjs — evaluación ejecutable (node tests/healthmap-eval.mjs)
import {
  PAR_Q_ITEMS, scoreParQ, contextualizeTrainingScreening,
  scorePhq2, scoreGad2, bodyMapPriorities, buildHealthMap,
} from '../js/health/healthMap.js';
import { formToInput, verdict, stepComplete } from '../js/health/healthUI.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🩺 HEALTH MAP · EVAL DE SCREENING\n');

console.log('— PAR-Q+ —');
assert(scoreParQ({}).clearance === 'cleared', 'sin síes → cleared');
assert(scoreParQ({ chest_pain: true }).clearance === 'refer_required', 'dolor torácico → refer_required');
assert(scoreParQ({ chest_pain: true }).redFlags.includes('chest_pain'), 'bandera roja expuesta');
assert(scoreParQ({ joint: true }).clearance === 'conditional', 'condición articular → conditional');
assert(scoreParQ({ meds_bp: true }).note.includes('modificaciones'), 'ámbar → nota de modificaciones');
const contextPain=contextualizeTrainingScreening(scoreParQ({}),{currentPain:'rodilla'});
assert(contextPain.clearance==='conditional'&&contextPain.contextFlags.includes('current_pain'),'dolor declarado → conditional, sin inventar diagnóstico');
const contextRestriction=contextualizeTrainingScreening(scoreParQ({}),{professionalRestrictions:'sin impacto'});
assert(contextRestriction.clearance==='conditional'&&contextRestriction.contextFlags.includes('professional_restriction'),'restricción profesional → conditional');
const nutritionOnly=contextualizeTrainingScreening(scoreParQ({}),{allergiesIntolerances:'lactosa'});
assert(nutritionOnly.clearance==='cleared'&&nutritionOnly.nutritionFlags.includes('allergies_intolerances'),'alergia/intolerancia sola no cambia clearance de ejercicio');
const redPlusContext=contextualizeTrainingScreening(scoreParQ({chest_pain:true}),{currentPain:'rodilla'});
assert(redPlusContext.clearance==='refer_required','contexto adicional nunca rebaja una bandera roja');

console.log('— PHQ-2 / GAD-2 (screening de ánimo/ansiedad) —');
assert(scorePhq2({ interest: 0, mood: 0 }).band === 'minimo', 'PHQ-2 0/6 → mínimo');
assert(scorePhq2({ interest: 2, mood: 2 }).band === 'moderado', 'PHQ-2 4/6 → moderado');
assert(scorePhq2({ interest: 3, mood: 3 }).band === 'probable', 'PHQ-2 6/6 → probable');
assert(scorePhq2({ interest: 2, mood: 2 }).needsProEval === true, 'PHQ-2 ≥3 → eval profesional');
assert(scorePhq2({ interest: 0, mood: 0, selfHarm: 1 }).redFlag === true, 'ideación autolesiva → RED inmediato');
assert(scoreGad2({ nervous: 0, worry: 0 }).needsProEval === false, 'GAD-2 0/6 → sin derivación');
assert(scoreGad2({ nervous: 2, worry: 2 }).needsProEval === true, 'GAD-2 4/6 → eval profesional');

console.log('— Body-map de dolor —');
const pains = bodyMapPriorities([{ zone: 'hombro', severity: 3 }, { zone: 'rodilla', severity: 1 }]);
assert(pains[0].zone === 'hombro' && pains[0].level === 'alta', 'dolor intenso primero, prioridad alta');
assert(pains[0].action.includes('Proteger hombro'), 'severidad 3 → proteger + fisio');
assert(pains[1].action.includes('Monitorizar'), 'severidad 1 → solo monitorizar');

console.log('— HEALTH MAP integrado —');
const hm = buildHealthMap({
  parq: { chest_pain: true },
  phq2: { interest: 1, mood: 1 },
  gad2: { nervous: 0, worry: 0 },
  pains: [{ zone: 'lumbar', severity: 2 }],
  goals: ['fuerza'],
});
assert(hm.clearance === 'refer_required', 'integrado: PAR-Q+ rojo manda');
assert(hm.redFlags.length >= 1, 'red flags consolidados');
assert(hm.priorities.some((p) => p.includes('lumbar')), 'prioridades incluyen el dolor activo');
assert(hm.priorities.some((p) => p.includes('Objetivo: fuerza')), 'prioridades incluyen objetivos');
assert(typeof hm.summary === 'string' && hm.summary.length > 20, 'resumen para el coach');

const clean = buildHealthMap({ parq: {}, phq2: { interest: 0, mood: 0 }, gad2: { nervous: 0, worry: 0 }, pains: [], goals: ['movilidad'] });
assert(clean.redFlags.length === 0 && clean.clearance === 'cleared', 'perfil sano → 0 banderas, cleared');

console.log('— Health Map UI (lógica pura) —');
const empty = formToInput();
assert(empty.pains.length === 0 && empty.goals.length === 0, 'formToInput: formulario vacío → defaults seguros');
assert(empty.phq2.selfHarm === 0 && empty.gad2.worry === 0, 'formToInput: escalas defaulteadas a 0');
const dirty = formToInput({ pains: [{ zone: ' hombro ', severity: 5 }, { zone: '', severity: 2 }, { zone: 'rodilla', severity: 0 }], goals: [' Fuerza ', ''] });
assert(dirty.pains.length === 1 && dirty.pains[0].severity === 3, 'formToInput: clampa severidad 0-3 y descarta zonas vacías/cero');
assert(dirty.pains[0].zone === 'hombro' && dirty.goals.length === 1, 'formToInput: trim de zona y objetivos');
assert(stepComplete(0, { parq: {} }) === false, 'stepComplete: PAR-Q+ sin responder → incompleto');
assert(stepComplete(0, { parq: Object.fromEntries(PAR_Q_ITEMS.map((i) => [i.id, false])) }) === true, 'stepComplete: PAR-Q+ completo → ok');
assert(stepComplete(1, { phq2: { interest: 1, mood: 2, selfHarm: 0 } }) === true, 'stepComplete: PHQ-2 completo → ok');
assert(stepComplete(1, { phq2: { interest: 1, mood: 2 } }) === false, 'stepComplete: PHQ-2 sin ítem seguridad → incompleto');
assert(stepComplete(3, {}) === true, 'stepComplete: body-map opcional');
const vStop = verdict(buildHealthMap({ parq: { chest_pain: true }, phq2: {}, gad2: {} }));
assert(vStop.tone === 'stop' && /MÉDICA/.test(vStop.title), 'verdict: PAR-Q+ rojo → stop, valoración médica');
const vCrisis = verdict(buildHealthMap({ parq: {}, phq2: { interest: 0, mood: 0, selfHarm: 1 }, gad2: {} }));
assert(vCrisis.crisis === true, 'verdict: ideación autolesiva → crisis = true (recursos 024/112)');
const vOk = verdict(buildHealthMap({ parq: {}, phq2: { interest: 0, mood: 0 }, gad2: { nervous: 0, worry: 0 }, pains: [], goals: [] }));
assert(vOk.tone === 'ok' && vOk.crisis === false, 'verdict: perfil sano → ok, sin crisis');
const vWarn = verdict(buildHealthMap({ parq: { joint: true }, phq2: {}, gad2: {} }));
assert(vWarn.tone === 'warn', 'verdict: PAR-Q+ ámbar → warn (modificaciones)');
assert(vOk.lines.length > 0, 'verdict: siempre explica (al menos la nota del PAR-Q+)');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
