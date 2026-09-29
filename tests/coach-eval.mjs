// Coach · coach-eval.mjs — evaluación ejecutable (node tests/coach-eval.mjs)
// Prioridad clínica: red flags SIEMPRE detectados. Objetivo del comité: 100% de derivación.
import {
  screenMessage, adjustPlanForReadiness, buildMessages, CLINICAL_POLICY, COACH_TOOLS,
} from '../js/coach/coachStub.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🧠 COACH · EVAL CLÍNICA\n');

console.log('— Red flags (rojos → detener y derivar) —');
const reds = [
  'me duele el pecho al hacer la última serie',
  'no puedo respirar bien desde hace rato',
  'casi me desmayo en el gimnasio',
  'estoy sangrando por la nariz',
  'a veces quiero quitarme la vida',
];
for (const t of reds) {
  const r = screenMessage(t);
  assert(r.risk === 'red' && r.action === 'stop_and_refer', `RED detectado: "${t.slice(0, 32)}…"`);
}

console.log('— Ámbar (modificar y monitorizar) —');
const ambers = [
  'me duele el hombro al hacer press militar',
  'al bajar la sentadilla se me bloquea la rodilla',
  'tengo la espalda hinchada después de peso muerto',
];
for (const t of ambers) {
  const r = screenMessage(t);
  assert(r.risk === 'amber' && r.action === 'modify_and_monitor', `ÁMBAR detectado: "${t.slice(0, 32)}…"`);
}

console.log('— Sin riesgo —');
for (const t of ['hoy tengo mucha energía, ¿subimos la carga?', '¿cuántas series de sentadilla me tocan?']) {
  assert(screenMessage(t).risk === 'none', `sin bandera: "${t.slice(0, 32)}…"`);
}

console.log('— Auto-regulación por readiness —');
assert(adjustPlanForReadiness({ volume: 100 }, 35).pctVolumen === -40, 'readiness 35 → −40% (deload fuerte)');
assert(adjustPlanForReadiness({ volume: 100 }, 50).pctVolumen === -20, 'readiness 50 → −20%');
assert(adjustPlanForReadiness({ volume: 100 }, 65).pctVolumen === 0, 'readiness 65 → mantener');
assert(adjustPlanForReadiness({ volume: 100 }, 85).pctVolumen === 5, 'readiness 85 → +5%');
assert(adjustPlanForReadiness({ volume: 100 }, 35).rationale.includes('Preparación'), 'toda decisión se explica (por qué)');

console.log('— Arquitectura del prompt (capas §5.2) —');
const msgs = buildMessages({
  profile: { displayName: 'Ana', goal: 'fuerza' },
  healthMap: { priorities: ['rodilla derecha'], activePain: ['hombro'] },
  readiness: 55,
  message: '¿cómo voy hoy?',
});
assert(msgs[0].content === CLINICAL_POLICY, 'capa 1 SIEMPRE = política clínica');
assert(msgs[1].content.includes('READINESS HOY: 55'), 'capa 2 = contexto del usuario');
assert(msgs.at(-1).role === 'user', 'último mensaje = el del usuario');

console.log('— Tools del coach —');
assert(COACH_TOOLS.length >= 6, '≥ 6 tools (§5.1)');
assert(COACH_TOOLS.some((t) => t.name === 'escalate_referral'), 'existe escalate_referral');
assert(COACH_TOOLS.some((t) => t.name === 'adjust_session'), 'existe adjust_session');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
