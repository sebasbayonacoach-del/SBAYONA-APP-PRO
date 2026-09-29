// diary-eval.mjs — evaluación ejecutable (node tests/diary-eval.mjs)
// Diario cinematográfico: consume resúmenes REALES del GEMELO-1 (formato de
// js/vision/boot.js → bayona:set-complete) y narra la sesión.
import {
  grade, escHtml, analyzeSet, narrateSet, buildDiary, DiaryStore,
  noteSet, resetSession, liveDiary, finishSession, liveSetCount,
} from '../js/diary/sessionDiary.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🎬 DIARIO DE SESIÓN CINEMATOGRAFICO · EVAL\n');

// ---- resumen realista con forma de boot.js ----
const mkRep = (n, score, romDeg = 112, velocityLossPct = 5) => ({ n, romDeg, durMs: 900 + n * 30, velocityLossPct, score });
const setA = {
  exercise: 'squat', ts: '2026-09-23T02:10:00.000Z', reps: 5,
  formScore: 92, fatiguePct: 22, rirEstimate: 3,
  repDetail: [mkRep(1, 90), mkRep(2, 95, 114, 4), mkRep(3, 93), mkRep(4, 91, 110, 18), mkRep(5, 91, 108, 30)],
};
const setB = {
  exercise: 'squat', ts: '2026-09-23T02:14:00.000Z', reps: 4,
  formScore: 78, fatiguePct: 55, rirEstimate: 1,
  repDetail: [mkRep(1, 82, 112, 10), mkRep(2, 80, 110, 16), mkRep(3, 76, 106, 24), mkRep(4, 74, 102, 38)],
};
const setC = { exercise: 'squat', ts: '2026-09-23T02:18:00.000Z', reps: 0, formScore: null, fatiguePct: 0, repDetail: [] };

// ---- 1) analyzeSet ----
const aA = analyzeSet(setA);
assert(aA.reps === 5 && aA.avgScore === 92, 'analyzeSet: reps 5 · score 92', `fue ${aA.reps}/${aA.avgScore}`);
assert(aA.grade === 'A', 'score 92 → banda A', `fue ${aA.grade}`);
assert(aA.hero && aA.hero.n === 2 && aA.hero.score === 95, 'rep héroe = #2 (95/100)', `fue ${aA.hero?.n}`);
assert(aA.hardest && aA.hardest.n === 5, 'la que costó = #5 (mayor pérdida de velocidad)', `fue ${aA.hardest?.n}`);
assert(aA.consistency === 100 || aA.consistency >= 80, 'consistencia alta con scores juntos', `fue ${aA.consistency}`);
assert(aA.romAvg === 111, 'recorrido medio 111°', `fue ${aA.romAvg}`);
assert(aA.rirEstimate === 3 && aA.fatiguePct === 22, 'RIR y fatiga pasan al análisis');
assert(aA.exName === 'SENTADILLA', 'ejercicio → nombre cinematográfico');

assert(grade(95) === 'S' && grade(85) === 'A' && grade(75) === 'B' && grade(60) === 'C' && grade(40) === 'D', 'bandas de nota completas');
assert(grade(null) === '—' && grade(NaN) === '—', 'sin score → banda —');

const aEmpty = analyzeSet(setC);
assert(aEmpty.empty === true && aEmpty.grade === '—', 'serie vacía marcada como empty');
assert(analyzeSet({}).reps === 0, 'summary sin campos no revienta');

const scattered = analyzeSet({ reps: 3, repDetail: [mkRep(1, 50), mkRep(2, 95), mkRep(3, 70)] });
assert(scattered.consistency !== null && scattered.consistency < 60, 'scores dispersos → consistencia baja', `fue ${scattered.consistency}`);
assert(analyzeSet({ reps: 2, repDetail: [mkRep(1, 88), mkRep(2, 88)] }).consistency === 100, 'scores idénticos → consistencia 100');
assert(analyzeSet({ reps: 2, repDetail: [mkRep(1, 80), mkRep(2, 80)] }).avgScore === 80, 'formScore ausente → media del repDetail');

// ---- 2) narrateSet ----
const scA = narrateSet(aA, 0);
assert(scA.chapter === 'EL PRIMER FUEGO' && scA.headline === 'SÓLIDO', 'capítulo I + titular por banda', `${scA.chapter}/${scA.headline}`);
assert(scA.lines.length >= 4, 'escena narrada (≥4 líneas)', `fueron ${scA.lines.length}`);
assert(scA.lines.some((l) => l.includes('la #2')), 'la narración menciona la rep héroe');
assert(scA.lines.some((l) => l.includes('#5') && l.includes('velocidad')), 'la narración menciona la que costó');
assert(scA.statLine.includes('REPS 5') && scA.statLine.includes('92/100') && scA.statLine.includes('RIR 3'), 'statLine con métricas reales', scA.statLine);
assert(scA.spotlight === 'REP HÉROE #2', 'spotlight de la rep héroe');

const scEmpty = narrateSet(aEmpty, 3);
assert(scEmpty.chapter === 'SILENCIO EN EL SET' && scEmpty.lines.length === 1, 'serie vacía → capítulo SILENCIO');
assert(narrateSet(analyzeSet(setB), 1).lines.some((l) => l.includes('55% de fatiga')), 'fatiga ≥40% se narra');
assert(narrateSet(analyzeSet(setA), 0).lines.join('|') === narrateSet(analyzeSet(setA), 0).lines.join('|'), 'narración determinista');

// ---- 3) buildDiary ----
const d = buildDiary([setB, setC, setA], { startedAt: '2026-09-23T02:10:00.000Z' }); // desordenados a propósito
assert(d.scenes.length === 3, 'una escena por serie', `fueron ${d.scenes.length}`);
assert(d.scenes[0].chapter === 'EL PRIMER FUEGO' && d.scenes[1].chapter === 'EL PULSO' && d.scenes[2].chapter === 'SILENCIO EN EL SET', 'escenas ordenadas por ts (A→B→C, vacía=SILENCIO)', d.scenes.map((s) => s.chapter).join(','));
assert(d.epilogue.totals.reps === 9, 'total de reps = 9 (5+4+0)', `fue ${d.epilogue.totals.reps}`);
assert(d.epilogue.totals.avgScore === 85, 'técnica media 85 ((92+78)/2)', `fue ${d.epilogue.totals.avgScore}`);
assert(d.epilogue.totals.maxFatigue === 55, 'pico de fatiga 55%');
assert(d.epilogue.mvp && d.epilogue.mvp.setIndex === 0 && d.epilogue.mvp.score === 92, 'MVP = escena de la serie A', JSON.stringify(d.epilogue.mvp));
assert(d.grade === 'A' && typeof d.epilogue.closing === 'string' && d.epilogue.closing.length > 10, 'nota global + cierre narrativo');
assert(d.date === '2026-09-23', 'fecha de la sesión', d.date);

const dS = buildDiary([{ ...setA, formScore: 97, repDetail: [mkRep(1, 97)] }]);
const dD = buildDiary([{ ...setA, formScore: 40, repDetail: [mkRep(1, 40)] }]);
assert(dS.grade === 'S' && dD.grade === 'D', 'bandas globales extremas S/D');
assert(dS.epilogue.closing !== dD.epilogue.closing, 'el cierre cambia con el veredicto');
assert(JSON.stringify(buildDiary([setA, setB])) === JSON.stringify(buildDiary([setB, setA])), 'buildDiary determinista aunque cambie el orden de entrada');
assert(buildDiary([]).scenes.length === 0 && buildDiary([]).epilogue.totals.reps === 0, 'diario vacío degradado');

// ---- 4) persistencia ----
const mem = (() => { const m = {}; return { getItem: (k) => m[k] ?? null, setItem: (k, v) => { m[k] = v; }, _m: m }; })();
const store = DiaryStore(mem);
store.save(d); store.save(dS);
assert(store.load().length === 2, 'dos diarios guardados');
assert(store.latest().grade === 'S', 'latest = el más reciente primero');
for (let i = 0; i < 40; i++) store.save(d);
assert(store.load().length === 30, 'historial acotado a 30 diarios', `fue ${store.load().length}`);
mem._m['bayona.diary.v1'] = '{corrupto';
assert(DiaryStore(mem).load().length === 0, 'storage corrupto → lista vacía sin excepción');

// ---- 5) sesión en vivo ----
globalThis.localStorage = mem; // finishSession persiste en localStorage inyectable
resetSession();
assert(liveSetCount() === 0, 'buffer vivo vacío al inicio');
noteSet(setA); noteSet(setB);
assert(liveSetCount() === 2, 'el diario recolecta series del GEMELO-1');
assert(liveDiary().scenes.length === 2, 'liveDiary narra lo recolectado');
const closed = finishSession();
assert(closed.epilogue.totals.reps === 9, 'finishSession cierra con las reps reales');
assert(liveSetCount() === 0, 'finishSession vacía el buffer');
assert(DiaryStore(mem).latest().epilogue.totals.reps === 9, 'diario de sesión persistido');

assert(escHtml('<script>x</script>') === '&lt;script&gt;x&lt;/script&gt;', 'escHtml neutraliza inyección');

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
