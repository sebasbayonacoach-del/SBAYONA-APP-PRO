// progreso-eval.mjs — regresión de PROGRESO HONESTO (P14)
// (node tests/progreso-eval.mjs)
// Cubre las 3 series de gráfica con datos generados y coherentes
// (volumen · constancia · fuerza/e1RM), export con round-trip, borrado
// de cuenta con acuse, y las 2 reglas de oro:
//   · "lo que no se ha registrado no se inventa" → huecos en null, nunca 0
//   · "descansar es progreso" → la racha NO se rompe por descansar
import assert from 'node:assert/strict';
import {
  volumenPorSemana, constancia, progresoFuerza, e1RM,
  exportarDatos, borrarCuenta, HUECO_MAXIMO_DESCANSO,
} from '../js/progreso.js';

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n📈 PROGRESO HONESTO · EVAL DE GRÁFICAS REALES + GDPR\n');

// ============================================================
// DATOS GENERADOS (coherentes: sobrecarga progresiva real)
// Calendario 2026: 09-01 mar · 09-03 jue · 09-04 vie · 09-07 lun ·
// 09-15 mar · 09-17 jue · 09-22 mar (semanas desde el lunes)
// ============================================================
const REG_VOL = [
  // SEMANA 1 (lunes 2026-08-31): 5 series, 31 reps, 1540 kg de volumen
  { fecha: '2026-09-01', series: [
    { ejercicio: 'squat', kg: 60, reps: 5 }, { ejercicio: 'squat', kg: 60, reps: 5 },
    { ejercicio: 'squat', kg: 60, reps: 5 }, { ejercicio: 'pressBanca', kg: 40, reps: 8 },
    { ejercicio: 'pressBanca', kg: 40, reps: 8 },
  ] },
  // SEMANA 2 (lunes 2026-09-07): SIN REGISTROS → hueco honesto
  // SEMANA 3 (lunes 2026-09-14): 6 series, 39 reps, 1957.5 kg
  { fecha: '2026-09-15', series: [
    { ejercicio: 'squat', kg: 62.5, reps: 5 }, { ejercicio: 'squat', kg: 62.5, reps: 5 },
    { ejercicio: 'squat', kg: 62.5, reps: 5 }, { ejercicio: 'pressBanca', kg: 42.5, reps: 8 },
    { ejercicio: 'pressBanca', kg: 42.5, reps: 8 }, { ejercicio: 'pressBanca', kg: 42.5, reps: 8 },
  ] },
  // SEMANA 4 (lunes 2026-09-21): incluye una serie SIN kg (dominadas)
  { fecha: '2026-09-22', series: [
    { ejercicio: 'squat', kg: 65, reps: 5 }, { ejercicio: 'squat', kg: 65, reps: 5 },
    { ejercicio: 'dominadas', kg: null, reps: 8 },
  ] },
];

// ---------- GRÁFICA 1 · VOLUMEN SEMANAL ----------
console.log('· Gráfica 1 — volumen por semana (datos reales)');
{
  const v = volumenPorSemana(REG_VOL);
  ok(v.length === 4, '4 semanas en el rango (de la primera a la última con datos)', `length=${v.length}`);
  ok(v.map((x) => x.semana).join() === '2026-08-31,2026-09-07,2026-09-14,2026-09-21',
    'claves de semana = lunes correcto', JSON.stringify(v.map((x) => x.semana)));
  ok(v[0].series === 5 && v[0].reps === 31 && v[0].volumen_kg === 1540,
    'semana 1: 5 series · 31 reps · 1540 kg exactos', JSON.stringify(v[0]));
  ok(v[2].series === 6 && v[2].reps === 39 && v[2].volumen_kg === 1957.5,
    'semana 3: 6 series · 39 reps · 1957.5 kg exactos', JSON.stringify(v[2]));
  ok(v[1].series === null && v[1].volumen_kg === null && v[1].reps === null,
    'semana SIN registros → null,null,null (no se rellena con ceros)', JSON.stringify(v[1]));
  ok(v[3].series === 3 && v[3].reps === 18 && v[3].volumen_kg === null,
    'serie sin kg → el volumen se declara desconocido (null), las series/reps sí son reales', JSON.stringify(v[3]));
  ok(volumenPorSemana([]).length === 0, 'sin registros → sin filas (sin ejes inventados)');
  ok(volumenPorSemana([{ fecha: '2026-09-01', series: [] }]).length === 0,
    'registro sin series = sin dato (no genera semana con ceros)');
}

// ---------- GRÁFICA 2 · CONSTANCIA · "DESCANSAR ES PROGRESO" ----------
console.log('· Gráfica 2 — constancia y racha sin castigo por descansar');
{
  // 09-01 y 09-02 activos · 09-03 DESCANSO · 09-04 activo
  const c = constancia([
    { fecha: '2026-09-01', series: [{ ejercicio: 'squat', kg: 60, reps: 5 }] },
    { fecha: '2026-09-02', series: [{ ejercicio: 'pressBanca', kg: 40, reps: 8 }] },
    // 09-03: día de descanso planificado, sin registro
    { fecha: '2026-09-04', series: [{ ejercicio: 'squat', kg: 60, reps: 5 }] },
  ]);
  ok(c.diasActivos === 3, '3 días activos contados', JSON.stringify(c));
  ok(c.rachaActual === 3 && c.mejorRacha === 3,
    'REGLA DE ORO: el descanso del 09-03 NO resetea la racha (3 y no 1)', JSON.stringify(c));
}
{
  // fin de semana (2 días de descanso planificado) tampoco rompe
  const c = constancia([
    { fecha: '2026-09-04', series: [{ reps: 5, kg: 60 }] }, // viernes
    { fecha: '2026-09-07', series: [{ reps: 5, kg: 60 }] }, // lunes
  ]);
  ok(c.rachaActual === 2 && c.mejorRacha === 2,
    'el fin de semana (2 días de descanso) tampoco rompe la racha', JSON.stringify(c));
}
{
  // ausencia real: 3 días seguidos sin actividad → racha nueva
  const c = constancia([
    { fecha: '2026-09-01', series: [{ reps: 5, kg: 60 }] },
    { fecha: '2026-09-02', series: [{ reps: 5, kg: 60 }] },
    { fecha: '2026-09-06', series: [{ reps: 5, kg: 60 }] }, // hueco de 3 días
  ]);
  ok(c.rachaActual === 1 && c.mejorRacha === 2,
    `solo la AUSENCIA (> ${HUECO_MAXIMO_DESCANSO} días) empieza una racha nueva`, JSON.stringify(c));
}
{
  const vacio = constancia([]);
  ok(vacio.diasActivos === 0 && vacio.rachaActual === 0 && vacio.mejorRacha === 0,
    'sin datos → ceros honestos en contadores (aquí sí: 0 registrado = 0)', JSON.stringify(vacio));
  const sinSeries = constancia([{ fecha: '2026-09-01', series: [] }]);
  ok(sinSeries.diasActivos === 0, 'día sin series no cuenta como día activo');
}
{
  // la marca de actividad solo llega desde registros REALES (sesión, movilidad…)
  const c = constancia([
    { fecha: '2026-09-01', actividad: true },
    { fecha: '2026-09-02', actividad: true },
    // 09-03 descanso
    { fecha: '2026-09-04', actividad: true },
    { fecha: '2026-09-05', actividad: false }, // sin actividad = descanso, no racha
  ]);
  ok(c.diasActivos === 3 && c.rachaActual === 3,
    'marca actividad=true cuenta el día y el descanso sigue sin romper la racha', JSON.stringify(c));
}

// ---------- GRÁFICA 3 · FUERZA / e1RM ----------
console.log('· Gráfica 3 — progreso de fuerza (e1RM estimado, Epley)');
{
  ok(e1RM(60, 5) === 70, 'Epley: 60 kg × 5 → e1RM 70 kg', String(e1RM(60, 5)));
  ok(e1RM(0, 8) === null && e1RM(null, 5) === null,
    'sin carga registrada → sin estimación (no se inventa un 1RM)');
  const f = progresoFuerza(REG_VOL);
  const squat = f.find((x) => x.ejercicio === 'squat');
  ok(!!squat && squat.puntos.length === 3, 'squat: 3 puntos = 3 días con serie cargada', JSON.stringify(squat));
  const e1s = squat.puntos.map((p) => p.e1RM);
  ok(JSON.stringify(e1s) === '[70,73,76]', 'sobrecarga progresiva real: e1RM 70 → 73 → 76 kg', JSON.stringify(e1s));
  ok(squat.puntos[0].fecha === '2026-09-01' && squat.puntos[2].fecha === '2026-09-22',
    'puntos ordenados por fecha sin rellenar huecos');
  ok(!f.some((x) => x.ejercicio === 'dominadas'),
    'las dominadas sin kg NO generan e1RM (peso corporal no registrado)');
  const multi = progresoFuerza([
    { fecha: '2026-09-15', series: [
      { ejercicio: 'squat', kg: 62.5, reps: 5 }, // e1RM 73
      { ejercicio: 'squat', kg: 50, reps: 10 },  // e1RM 67
    ] },
  ]);
  ok(multi[0].puntos.length === 1 && multi[0].puntos[0].e1RM === 73,
    'varias series el mismo día → un punto con la MEJOR serie', JSON.stringify(multi));
  const prs = progresoFuerza([
    { fecha: '2026-09-20', series: [{ ejercicio: 'squat', e1RM: 100 }] }, // récord ya registrado
  ]);
  ok(prs[0].puntos[0].e1RM === 100,
    'el e1RM registrado por la app (récord real) se usa tal cual, sin recalcular', JSON.stringify(prs));
}

// ---------- EXPORTAR MIS DATOS (round-trip) ----------
console.log('· Export de datos (GDPR · portabilidad)');
{
  const estado = {
    schema: 3,
    profile: { name: 'Ada', goal: 'FUERZA', heightCm: 168, created: 1758000000000 },
    xp: 1840, points: 96, credits: 120,
    stats: { workouts: 12, sets: 96, prs: 3, sessionsMin: 420, km: 18.4 },
    streak: 5, history: [
      { date: '2026-09-22', xp: 120, workouts: 1, sets: 8, sleep: 7.5, soreness: null },
      { date: '2026-09-23', xp: 0, workouts: 0, sets: 0, sleep: null, soreness: 2 },
    ],
    medidas: [{ fecha: '2026-09-20', pesoKg: 74.4 }],
    prs: { squat: { kg: 65, reps: 5, date: '2026-09-22', e1: 76 } },
    settings: { sound: true, motion: false, quality: 'AUTO' },
  };
  const json = exportarDatos(estado);
  ok(typeof json === 'string' && json.includes('"profile"'), 'export = JSON string legible con los datos');
  assert.deepEqual(JSON.parse(json), estado); // round-trip exacto
  ok(true, 'round-trip: JSON.parse(exportarDatos(estado)) == estado original');
  assert.deepEqual(JSON.parse(exportarDatos(estado)), JSON.parse(exportarDatos(estado)));
  ok(true, 'export determinista (dos exportaciones idénticas)');
}

// ---------- BORRAR CUENTA CON ACUSE (GDPR · supresión) ----------
console.log('· Borrado de cuenta con acuse descargable');
{
  const estado = {
    profile: { name: 'Ada', goal: 'FUERZA' },
    history: [{ date: 'a' }, { date: 'b' }, { date: 'c' }],
    medidas: [{ fecha: 'm1' }, { fecha: 'm2' }],
    prs: { squat: {}, pressBanca: {} },
    photos: [],   // nunca hubo fotos
    diary: [],    // nunca hubo diario
  };
  const acuse = borrarCuenta(estado, 'cambio de app');
  ok(Number.isFinite(Date.parse(acuse.timestamp)), 'acuse con timestamp ISO válido', acuse.timestamp);
  ok(Array.isArray(acuse.queSeBorro) && acuse.queSeBorro.length === 4,
    'solo se declara borrado lo que EXISTÍA (4 categorías)', JSON.stringify(acuse.queSeBorro));
  const hist = acuse.queSeBorro.find((c) => c.que === 'historial diario');
  const med = acuse.queSeBorro.find((c) => c.que === 'medidas corporales');
  ok(!!hist && hist.registros === 3, 'acuse cuenta el historial borrado (3)', JSON.stringify(hist));
  ok(!!med && med.registros === 2, 'acuse cuenta las medidas borradas (2)', JSON.stringify(med));
  ok(!acuse.queSeBorro.some((c) => c.que === 'fotos privadas' || c.que === 'diario'),
    'no se presume borrado de lo que nunca estuvo (fotos/diario vacíos)');
  const total = acuse.queSeBorro.reduce((s, c) => s + c.registros, 0);
  ok(total === 8, 'total de registros borrados = 8', String(total));
  ok(acuse.confirmacion.includes(acuse.timestamp.slice(0, 10)) && acuse.confirmacion.includes('4 categorías'),
    'confirmación descargable: QUÉ (4 categorías / 8 registros) y CUÁNDO', acuse.confirmacion);
  ok(acuse.motivo === 'cambio de app' && acuse.confirmacion.includes('cambio de app'),
    'el motivo que da la persona queda registrado en el acuse');
  ok(borrarCuenta(estado).motivo === null, 'sin motivo → null (no se inventa)');
  ok(borrarCuenta({}).queSeBorro.length === 0, 'cuenta vacía → acuse sin categorías (honesto)');
  const redondo = JSON.parse(JSON.stringify(acuse));
  ok(!!redondo.confirmacion && Array.isArray(redondo.queSeBorro), 'el acuse es JSON descargable');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ PROGRESO: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📈 RESULTADO: ${pass} pass · 0 fail`);
