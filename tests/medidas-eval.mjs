// medidas-eval.mjs — regresión de mediciones y evolución corporal
// (node tests/medidas-eval.mjs)
// Cubre: validación/rangos, deltas ANTES→AHORA, tendencia real, proyección
// honesta con tope de ritmo, calendario de medición y honestidad MEDIDO vs
// ESTIMACIÓN. Nada se inventa: sin datos → null.
import { S } from '../js/state.js';
import {
  CAMPOS, normalizaMedida, serie, deltas, tendencia, proyeccion,
  proximaMedicion, FRECUENCIA_DIAS,
} from '../js/medidas.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n📏 MEDICIONES · EVAL DE EVOLUCIÓN CORPORAL\n');

// ---------- honestidad de categorías ----------
{
  assert(CAMPOS.some((c) => c.k === 'grasaPct' && c.estimado), 'la grasa % va marcada como ESTIMACIÓN');
  assert(CAMPOS.filter((c) => !c.estimado).length >= 5, 'peso y perímetros son MEDIDOS');
}

// ---------- normalización: valida rangos, no maquilla ----------
{
  const m = normalizaMedida({ fecha: '2026-09-24', pesoKg: 74.44, cinturaCm: 86, grasaPct: 28.8 });
  assert(m.pesoKg === 74.4, 'redondeo a 1 decimal', JSON.stringify(m));
  assert(m.cinturaCm === 86 && m.grasaPct === 28.8, 'valores válidos pasan');
  const bad = normalizaMedida({ fecha: '2026-09-24', pesoKg: 900, cinturaCm: 3 });
  assert(bad === null, 'valores absurdos → medición entera descartada');
  const partial = normalizaMedida({ fecha: '2026-09-24', pesoKg: 70, cinturaCm: 5000 });
  assert(partial.pesoKg === 70 && partial.cinturaCm === undefined, 'lo válido sobrevive; lo absurdo se descarta');
}

// ---------- persistencia: mismo día = reemplazo (sin duplicar) ----------
{
  S.init(); S.reset(true);
  S.addMedida(normalizaMedida({ fecha: '2026-09-24', pesoKg: 80 }));
  S.addMedida(normalizaMedida({ fecha: '2026-09-24', pesoKg: 79.5 }));
  assert(S.data.medidas.length === 1, 'dos medidas el mismo día → una sola ficha');
  assert(S.data.medidas[0].pesoKg === 79.5, 'la del día se actualiza con la última');
  S.addMedida(normalizaMedida({ fecha: '2026-09-25', pesoKg: 79 }));
  assert(S.data.medidas.length === 2, 'días distintos acumulan (línea del tiempo)');
}

// ---------- ANTES → AHORA: deltas ----------
{
  const meds = [
    { fecha: '2026-09-01', pesoKg: 82, cinturaCm: 90 },
    { fecha: '2026-09-15', pesoKg: 80.5, cinturaCm: 88 },
    { fecha: '2026-09-24', pesoKg: 79, cinturaCm: 87 },
  ];
  const d = deltas(meds);
  assert(d.pesoKg.delta === -3 && d.pesoKg.inicio === 82 && d.pesoKg.actual === 79, 'delta de peso exacto', JSON.stringify(d.pesoKg));
  assert(d.cinturaCm.delta === -3, 'delta de perímetro exacto');
  assert(d.brazoCm === null, 'campo sin medir → null (no se inventa)');
  const solo1 = deltas([{ fecha: '2026-09-24', pesoKg: 70 }]);
  assert(solo1.pesoKg.delta === 0 && solo1.pesoKg.puntos === 1, 'una sola medición → delta 0 honesto');
}

// ---------- serie y tendencia ----------
{
  const meds = [
    { fecha: '2026-09-01', pesoKg: 82 },
    { fecha: '2026-09-08', pesoKg: 81 },
    { fecha: '2026-09-15', pesoKg: 80.4 },
    { fecha: '2026-09-24', pesoKg: 79 },
  ];
  assert(serie(meds, 'pesoKg').length === 4, 'serie completa por campo');
  const t = tendencia(meds, 'pesoKg');
  assert(t && t.dir === 'baja' && t.ritmo < 0, 'tendencia a la baja detectada', JSON.stringify(t));
  const plana = tendencia([{ fecha: '2026-09-01', pesoKg: 70 }, { fecha: '2026-09-08', pesoKg: 70 }, { fecha: '2026-09-15', pesoKg: 70.02 }], 'pesoKg');
  assert(plana && plana.dir === 'estable', 'serie plana → estable (sin drama)', JSON.stringify(plana));
  assert(tendencia([{ fecha: '2026-09-01', pesoKg: 70 }], 'pesoKg') === null, 'sin puntos suficientes → null');
}

// ---------- HACIA DÓNDE: proyección honesta y topeada ----------
{
  const meds = [
    { fecha: '2026-09-01', pesoKg: 82 },
    { fecha: '2026-09-08', pesoKg: 81 },
    { fecha: '2026-09-15', pesoKg: 80.4 },
    { fecha: '2026-09-24', pesoKg: 79 },
  ];
  const p = proyeccion(meds, 'pesoKg', 4);
  assert(p && p.semanas === 4 && /tendencia/.test(p.supuesto), 'proyección declara su supuesto', JSON.stringify(p));
  assert(p.ritmo >= -0.5, 'ritmo topeado a −0,5 kg/sem (sin milagros)', String(p.ritmo));
  assert(Math.abs(p.valor - (79 + p.ritmo * 4)) < 0.11, 'proyección coherente con el ritmo', String(p.valor));
  const caidaAbsurda = proyeccion([
    { fecha: '2026-09-01', pesoKg: 100 }, { fecha: '2026-09-08', pesoKg: 90 },
    { fecha: '2026-09-15', pesoKg: 80 }, { fecha: '2026-09-22', pesoKg: 70 },
  ], 'pesoKg', 4);
  assert(caidaAbsurda.ritmo === -0.5, 'caída de −10 kg/semana se topea a −0,5', String(caidaAbsurda.ritmo));
  assert(proyeccion([{ fecha: '2026-09-01', pesoKg: 70 }], 'pesoKg') === null, 'sin datos → sin proyección');
}

// ---------- calendario de medición ----------
{
  const a = proximaMedicion([], '2026-09-24');
  assert(a.falta && /ninguna medición/.test(a.motivo), 'sin medidas → toca medir (empty state útil)');
  const reciente = proximaMedicion([{ fecha: '2026-09-20', pesoKg: 70 }], '2026-09-24');
  assert(!reciente.falta && reciente.dias === 4, 'medida reciente → no toca (4 días)');
  const vencida = proximaMedicion([{ fecha: '2026-09-01', pesoKg: 70 }], '2026-09-24');
  assert(vencida.falta && vencida.dias === 23, `> ${FRECUENCIA_DIAS} días → toca medir`);
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ MEDICIONES: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
