// state-eval.mjs — regresión de estado/economía (node tests/state-eval.mjs)
// Cubre defectos corregidos: fechas locales, doble XP, desbloqueos intermedios
// perdidos, serie parcia ≠ día entrenado, readiness sin datos inventados.
import { S, todayKey } from '../js/state.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🧱 ESTADO · EVAL DE REGRESIÓN\n');

S.init();
S.reset(true);

// fechas LOCALES (antes: UTC → el día cambiaba a las 02:00 en España)
{
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const manual = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  assert(todayKey() === manual, 'todayKey usa fecha LOCAL', `${todayKey()} vs ${manual}`);
}

// idempotencia: la misma serie nunca premia dos veces (doble clic / reintentos)
{
  const before = S.data.xp;
  const r1 = S.logSet('squat', 0, 60, 8, 2, { idKey: 'set-1' });
  const r2 = S.logSet('squat', 0, 60, 8, 2, { idKey: 'set-1' });
  assert(r1 && r1.xp > 0, 'primera serie premiada', JSON.stringify(r1));
  assert(r2 === null, 'segunda vez con misma clave → sin XP extra');
  assert(S.data.xp === before + r1.xp, 'XP concedido UNA sola vez');
  assert(S.data.today.trained === false, 'una serie parcia NO marca el día como entrenado');
  assert(S.data.today.startedWorkout === true, 'pero deja constancia de sesión iniciada');
}

// corrección de serie: deshace XP, PR y contadores
{
  const xpBefore = S.data.xp;
  const r = S.logSet('bench', 0, 80, 3, 0, { idKey: 'set-pr' }); // casi seguro PR
  assert(S.data.prs.bench, 'PR registrado con e1');
  S.undoSet({ ...r, idKey: 'set-pr', exKey: 'bench', kg: 80, reps: 3 });
  assert(!S.data.prs.bench, 'al corregir la serie, el PR de esa serie se retira');
  assert(S.data.xp === xpBefore, 'XP revertido al corregir', `${S.data.xp} vs ${xpBefore}`);
}

// finalización honesta + idempotente: parcial ≠ completada
{
  S.reset(true);
  const partial = S.completeWorkout('op_upper', { loggedSets: 10, plannedSets: 14, minutes: 55 });
  assert(partial && partial.completed === false, 'cierre parcial se desvía sin bono');
  assert(S.data.today.trained === false, '10/14 series NO marca el día como entrenado');

  const pointsBefore = S.data.points;
  const w1 = S.completeWorkout('op_upper', { loggedSets: 14, plannedSets: 14, minutes: 55 });
  const w2 = S.completeWorkout('op_upper', { loggedSets: 14, plannedSets: 14, minutes: 55 });
  assert(w1 && w1.points > 0, '100% previsto concede bono final');
  assert(S.data.points === pointsBefore + w1.points, 'el bono se suma una sola vez');
  assert(w2 === null, 'segundo cierre de la misma sesión → sin bono doble');
  assert(S.data.today.trained === true, 'el día queda COMPLETADO solo con 100% previsto');
}

// desbloqueos intermedios al subir varios niveles de golpe
{
  S.reset(true);
  S.data.xp = 0;
  S.addXP(680, 'strength'); // 250 (→N2) + 430 (→N3)
  const owned = S.data.inventory.owned;
  assert(S.level().lvl >= 3, 'salto de niveles calculado', `nivel ${S.level().lvl}`);
  assert(owned.includes('ember_tee'), 'desbloqueo de N2 NO se pierde');
  assert(owned.includes('sprint_shorts'), 'desbloqueo de N3 concedido');
}

// preparación honesta: sin registros no hay puntuación inventada
{
  S.reset(true);
  const d0 = S.readinessDetail();
  assert(d0.score === null, 'sin registros → score null (la UI muestra —)', `fue ${d0.score}`);
  S.logSleep(8);
  const d1 = S.readinessDetail();
  assert(typeof d1.score === 'number' && d1.estimated === true, 'con 1 registro → estimada y marcada');
  assert(d1.parts.some((p) => p.k === 'Sueño'), 'el desglose explica el sueño');
}

// comidas: los presets no se premian dos veces; las custom sí se acumulan
{
  S.reset(true);
  assert(S.eat('m_breakfast'), 'primera comida registrada');
  assert(S.eat('m_breakfast') === null, 'la misma comida preset no se premia dos veces');
  assert(S.eat({ custom: true, name: 'pollo con arroz', kcal: 420, p: 30, c: 45, f: 12 }), 'comida personalizada ok');
  assert(S.data.today.meals.length === 2, 'ambas comidas en el registro');
}



// Hub: la próxima revisión es un checkpoint de producto persistente, no una métrica inventada
{
  S.reset(true);
  assert(S.data.profile.nextProgressReviewAt === null, 'perfil nuevo sin onboarding no inventa revisión');
  S.onboard({ name:'TEST', goal:'BIENESTAR Y ADHERENCIA' });
  assert(typeof S.data.profile.nextProgressReviewAt === 'string', 'onboarding programa próxima revisión real');
  const first = S.data.profile.nextProgressReviewAt;
  const invalid = S.setProgressReviewAt('no-es-fecha');
  assert(invalid === false && S.data.profile.nextProgressReviewAt === first, 'fecha inválida no corrompe la revisión');
  const scheduled = S.scheduleProgressReview(14);
  assert(typeof scheduled === 'string' && new Date(scheduled).getTime() > Date.now(), 'revisión se puede reprogramar explícitamente');
}

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
