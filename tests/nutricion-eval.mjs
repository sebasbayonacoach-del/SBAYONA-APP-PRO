// nutricion-eval.mjs — regresión de recetas y adherencia al plan
// (node tests/nutricion-eval.mjs)
import { RECETAS, adherenciaPlan, PLAN_COMIDAS, receta } from '../js/nutricion.js';
import { MEALS } from '../js/data.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🥗 NUTRICIÓN · EVAL DE RECETAS Y ADHERENCIA\n');

// catálogo de recetas coherente
{
  assert(RECETAS.length >= 5, 'catálogo de recetas útil (≥ 5)');
  assert(new Set(RECETAS.map((r) => r.id)).size === RECETAS.length, 'ids únicos');
  assert(RECETAS.every((r) => r.ingredientes.length >= 3 && r.pasos.length >= 2), 'toda receta tiene ingredientes y pasos');
  // coherencia calórica: 4p + 4c + 9f ≈ kcal (±15 %)
  for (const r of RECETAS) {
    const calc = r.p * 4 + r.c * 4 + r.f * 9;
    assert(Math.abs(calc - r.kcal) <= r.kcal * 0.15, `macros coherentes en «${r.nombre}»`, `${calc} vs ${r.kcal}`);
  }
  assert(receta(RECETAS[0].id) === RECETAS[0], 'receta(id) resuelve');
  assert(receta('inventada') === null, 'receta desconocida → null');
}

// adherencia al plan diario (3 comidas principales)
{
  assert(PLAN_COMIDAS.length === 3, 'el plan son 3 comidas principales');
  const a = adherenciaPlan({ meals: [] });
  assert(a.pct === 0 && a.cumplidas === 0 && a.total === 3, 'sin registrar → 0 % (honesto)', JSON.stringify(a));
  const b = adherenciaPlan({ meals: [{ id: 'm_breakfast' }, { id: 'm_lunch' }] });
  assert(b.cumplidas === 2 && b.pct === Math.round((2 / 3) * 100), '2 de 3 → % exacto', JSON.stringify(b));
  const c = adherenciaPlan({ meals: [{ id: 'custom_1' }] });
  assert(c.cumplidas === 0, 'comida fuera del plan NO cuenta para adherencia');
  assert(c.extra === 1, 'pero se declara como extra (sin esconderla)', JSON.stringify(c));
  const full = adherenciaPlan({ meals: PLAN_COMIDAS.map((id) => ({ id })) });
  assert(full.pct === 100 && full.detalle.every((d) => d.hecha), 'plan completo → 100 % con detalle');
}

// MEALS sigue siendo la fuente del plan (sin duplicar catálogo)
{
  assert(PLAN_COMIDAS.every((id) => MEALS.some((m) => m.id === id)), 'las comidas del plan viven en MEALS');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ NUTRICIÓN: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
