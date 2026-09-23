// timeline-eval.mjs — regresión de la historia unificada (node tests/timeline-eval.mjs)
import { lineaDelTiempo, resumenEvolucion } from '../js/timeline.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🕰️ LÍNEA DEL TIEMPO · EVAL DE HISTORIA UNIFICADA\n');

// vacío honesto
assert(lineaDelTiempo({}).length === 0, 'sin datos → historia vacía (sin relleno)');

// mediciones: primera + solo cambios notables
{
  const ev = lineaDelTiempo({ medidas: [
    { fecha: '2026-09-01', pesoKg: 82 },
    { fecha: '2026-09-08', pesoKg: 81.8 },   // −0,2 → NO merece hito
    { fecha: '2026-09-15', pesoKg: 80.9 },   // −0,9 → hito
    { fecha: '2026-09-24', pesoKg: 81.0 },   // +0,1 → no
  ] });
  const meds = ev.filter((e) => e.tipo === 'medicion');
  assert(meds.length === 2, 'solo primera + cambio ≥ 0,5 kg', JSON.stringify(meds));
  assert(/Primera medición: 82 kg/.test(meds[meds.length - 1].texto), 'el primer hito es la primera medición');
  assert(/−0,9 kg/.test(meds[0].texto), 'el cambio notable se narra con coma es-ES', meds[0].texto);
}

// fuentes mixtas ordenadas de reciente a antiguo
{
  const ev = lineaDelTiempo({
    medidas: [{ fecha: '2026-09-20', pesoKg: 70 }],
    fotos: [{ at: '2026-09-22T10:00:00.000Z' }],
    history: [{ date: '2026-09-18', prPoints: [{ ex: 'squat', e1: 100 }] }],
    journey: [{ date: '2026-09-10', type: 'start', text: 'BAYONA iniciado.', xp: 0 }],
  });
  const fechas = ev.map((e) => e.fecha);
  assert(fechas.every((f, i, a) => i === 0 || a[i - 1] >= f), 'orden: más reciente primero', JSON.stringify(fechas));
  assert(ev.some((e) => e.tipo === 'foto'), 'las fotos dejan constancia');
  assert(ev.some((e) => e.tipo === 'pr' && /SENTADILLA/i.test(e.texto)), 'los récords nombran el ejercicio', JSON.stringify(ev.find((e) => e.tipo === 'pr')));
  assert(ev.some((e) => e.tipo === 'hito'), 'los hitos del journey se integran');
}

// tope de historia (ruido acotado)
{
  const journey = Array.from({ length: 200 }, (_, i) => ({ date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, type: 'hito', text: `hito ${i}` }));
  assert(lineaDelTiempo({ journey }).length === 60, 'historia topeada a 60 eventos');
}

// resumen ANTES → AHORA
{
  const r = resumenEvolucion([{ fecha: '2026-09-01', pesoKg: 82 }, { fecha: '2026-09-24', pesoKg: 79 }]);
  assert(r.antes === 82 && r.ahora === 79 && r.delta === -3, 'resumen ANTES→AHORA exacto', JSON.stringify(r));
  assert(resumenEvolucion([]) === null, 'sin mediciones → null (no se inventa)');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ TIMELINE: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
