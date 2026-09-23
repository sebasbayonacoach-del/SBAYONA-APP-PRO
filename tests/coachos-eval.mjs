// coachos-eval.mjs — regresión de BAYONA COACH OS (node tests/coachos-eval.mjs)
// Cubre: ficha derivada de datos REALES, alertas por reglas explicables,
// KPIs de cartera, CORE Coach, planificación por fases y honestidad de la
// cartera de demostración (todo cliente demo viene marcado).
import { S } from '../js/state.js';
import {
  CLIENTES_DEMO, fichaLocal, alertasDe, resumenCartera, coreCoach, planificacion,
} from '../js/coachos.js';
import { MACRO } from '../js/data.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🧭 COACH OS · EVAL DEL COMMAND CENTER\n');

// ---------- honestidad: la demo SIEMPRE viene marcada ----------
{
  assert(CLIENTES_DEMO.length === 3, 'tres fichas de demostración');
  assert(CLIENTES_DEMO.every((c) => c.demo === true), 'toda la cartera demo viene marcada (sin mock sin avisar)');
  assert(new Set(CLIENTES_DEMO.map((c) => c.id)).size === 3, 'sin ids duplicados');
}

// ---------- ficha local derivada de datos REALES ----------
{
  S.init(); S.reset(true);
  S.data.profile.name = 'Sebastián';
  S.data.profile.weightKg = 74;
  let f = fichaLocal(S);
  assert(f.demo === false, 'tu ficha NO es demo: deriva del dispositivo');
  assert(f.nombre === 'Sebastián' && f.peso === 74, 'nombre y peso reales del perfil');
  assert(f.nivel === S.level().lvl && f.rango === S.rank(), 'nivel y rango derivados (no inventados)');
  assert(f.preparacion === null, 'preparación sin registros → null (no se inventa)');
  // adherencia con historial real
  S.data.history = Array.from({ length: 10 }, (_, i) => ({ date: `2026-09-${i + 1}`, workouts: i % 2 ? 1 : 0, sets: i % 2 ? 5 : 0 }));
  f = fichaLocal(S);
  assert(f.adherencia === 50, 'adherencia = días activos / días registrados', `got ${f.adherencia}`);
  assert(f.adherenciaDias === 10, 'se declara la ventana real de días');
}

// ---------- alertas por reglas explicables ----------
{
  assert(alertasDe({ adherencia: 91, sesionesFalladas: 0, semanasSinProgresion: 0, preparacion: 82 }).length === 0,
    'cliente sano → cero alertas');
  const a1 = alertasDe({ adherencia: 55 });
  assert(a1.some((a) => a.nivel === 'alta' && /55/.test(a.texto)), 'adherencia < 60 % → alerta ALTA');
  const a2 = alertasDe({ adherencia: 90, sesionesFalladas: 2 });
  assert(a2.some((a) => /falladas/.test(a.texto)), '2 sesiones falladas → alerta ALTA');
  const a3 = alertasDe({ adherencia: 90, semanasSinProgresion: 3 });
  assert(a3.some((a) => a.nivel === 'media' && /progresión/.test(a.texto)), '3 semanas sin progresión → alerta MEDIA');
  const a4 = alertasDe({ adherencia: 90, dolor: 'hombro derecho leve' });
  assert(a4.some((a) => a.nivel === 'alta' && /hombro/.test(a.texto)), 'molestia declarada → alerta ALTA (adapta carga)');
  const a5 = alertasDe({ adherencia: 90, preparacion: 35, dormir: 6 });
  assert(a5.length === 2, 'preparación baja + sueño corto = 2 alertas medias', JSON.stringify(a5));
}

// ---------- KPIs de cartera ----------
{
  const r = resumenCartera([...CLIENTES_DEMO]);
  assert(r.activos === 3, '3 clientes activos');
  assert(r.sesionesHoy === 3, '3 sesiones programadas hoy');
  assert(r.adherenciaMedia === Math.round((91 + 55 + 78) / 3), 'adherencia media exacta', `got ${r.adherenciaMedia}`);
  assert(r.alertas === resumenCartera(CLIENTES_DEMO).alertas, 'KPIs deterministas');
  assert(resumenCartera([]).activos === 0, 'cartera vacía → KPIs a cero');
}

// ---------- CORE Coach: mensajes por reglas, con nombres ----------
{
  const msgs = coreCoach(CLIENTES_DEMO, S);
  assert(msgs.some((m) => m.includes('Diego')), 'nombra al cliente con adherencia baja');
  assert(msgs.some((m) => m.includes('Carlos') && /progresión/.test(m)), 'nombra al cliente estancado');
  assert(msgs.some((m) => /preparada\(s\) para progresar/.test(m)), 'detecta a Paola lista para progresar');
  const quietos = coreCoach([{ ...CLIENTES_DEMO[0], id: 'x', nombre: 'Ana', dormir: 8, dolor: null, preparacion: 70 }], S);
  assert(quietos.length === 1 && /Sin alertas/.test(quietos[0]), 'sin alertas → mensaje honesto de calma', JSON.stringify(quietos));
}

// ---------- planificación por fases (CAPA 2 laboratorio) ----------
{
  S.data.plan.week = 5;
  const p = planificacion(S);
  assert(p.fase.name === 'HIPERTROFIA', 'fase de la semana 5 = hipertrofia', p.fase.name);
  assert(p.fases.length === MACRO.phases.length, 'todas las fases del macrociclo');
  assert(p.fases.filter((f) => f.estado === 'actual').length === 1, 'exactamente una fase actual');
  assert(p.fases.filter((f) => f.estado === 'pasada').length === 1, 'fase pasada marcada (ADAPT)');
  assert(p.hoy.volumenPct === Math.round(p.fase.vol * 100), 'volumen del día = fase (sin cifras inventadas)');
}

// ---------- rutina nocturna (registro honesto del cliente) ----------
{
  S.reset(true);
  assert((S.data.today.nightRoutine || []).length === 0, 'rutina nocturna empieza vacía');
  S.nightRoutineToggle('pantallas');
  assert(S.data.today.nightRoutine.length === 1, 'el paso se marca');
  S.nightRoutineToggle('pantallas');
  assert(S.data.today.nightRoutine.length === 0, 'el toggle es reversible (se desmarca sin duplicar)');
  S.nightRoutineToggle('respiracion');
  S.nightRoutineToggle('estiramiento');
  assert(S.data.today.nightRoutine.length === 2, 'varios pasos de rutina acumulables');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ COACH OS: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
