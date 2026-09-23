// mirror-eval.mjs — regresión del espejo nube (payloads idempotentes)
// (node tests/mirror-eval.mjs) — sin DOM: solo planificación de subida.
import { payloadMedidas, payloadAsignaciones, payloadSesiones } from '../js/sync/mirror.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🪞 ESPEJO · EVAL DE PAYLOADS IDEMPOTENTES\n');

// medidas: snake_case, una fila por fecha, scope por usuario
{
  const p = payloadMedidas('u1', [
    { fecha: '2026-09-24', pesoKg: 74.4, cinturaCm: 86, grasaPct: 28.8 },
    { fecha: '2026-09-24', pesoKg: 74.0 },   // misma fecha → la última gana
    { fecha: '2026-09-10', pesoKg: 75 },
  ]);
  assert(p.tabla === 'body_medidas', 'tabla correcta');
  assert(p.del.user_id === 'eq.u1', 'borrado por scope de usuario (idempotente)');
  assert(p.filas.length === 2, 'una fila por fecha (sin duplicados)', JSON.stringify(p.filas));
  assert(p.filas.every((f) => f.user_id === 'u1'), 'toda fila lleva su dueño (RLS)');
  assert(p.filas.find((f) => f.fecha === '2026-09-24').peso_kg === 74, 'misma fecha → gana la última', JSON.stringify(p.filas));
  assert('grasa_pct' in p.filas.find((f) => f.fecha === '2026-09-24'), 'columnas snake_case completas');
  assert(payloadMedidas('u1', []).filas.length === 0, 'sin medidas → payload vacío');
}

// asignaciones: solo las reales (nunca la cartera demo)
{
  const p = payloadAsignaciones('u1', [
    { id: 'a1', clienteId: 'local', workoutId: 'op_upper', dia: '2026-09-25', nota: 'técnica', estado: 'pendiente', creada: '2026-09-24T10:00:00.000Z' },
    { id: 'a2', clienteId: 'demo_paola', workoutId: 'op_lower', dia: '2026-09-25', nota: '', estado: 'pendiente', creada: '2026-09-24T10:00:00.000Z' },
  ]);
  assert(p.tabla === 'entrenamientos_asignados', 'tabla correcta');
  assert(p.filas.length === 1 && p.filas[0].cliente_id === 'local', 'la demo NUNCA se sube (sin datos falsos)');
  assert(p.filas[0].workout_id === 'op_upper' && p.filas[0].dia === '2026-09-25', 'campos mapeados');
  assert(p.del.user_id === 'eq.u1', 'scope por usuario');
}

// sesiones: resumen numérico solo (ADR-003: cero vídeo/frames)
{
  const p = payloadSesiones('u1', [
    { workoutId: 'op_upper', date: '2026-09-24', sets: 12, minutes: 55, xp: 400 },
  ]);
  assert(p.filas.length === 1 && p.filas[0].user_id === 'u1', 'sesión mapeada con dueño');
  assert(!JSON.stringify(p).includes('video') && !JSON.stringify(p).includes('frame'), 'sin vídeo ni frames (ADR-003)');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ ESPEJO: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
