#!/usr/bin/env node
// tests/i18n-eval.mjs — P19 · integridad del catálogo i18n.
// Garantiza que NINGÚN t("clave") de la app cae al fallback (que mostraría la clave cruda
// en pantalla = pantalla rota). Si una clave usada no existe en el catálogo, este test falla.
// También fija el trinquete anti-regresión de cadenas hardcodeadas (audit-i18n).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const jsDir = join(here, '..', 'js');

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✅ ' + label); }
  else { fail++; console.log('  ❌ ' + label); }
}

// 1. extraer claves del catálogo
function catalogKeys(src) {
  const keys = new Set();
  const re = /"([a-z0-9_.]+)"\s*:\s*"/gi;
  let m;
  while ((m = re.exec(src))) keys.add(m[1]);
  return keys;
}
function listJs(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listJs(p));
    else if (f.endsWith('.js') && f !== 'i18n.js') out.push(p);
  }
  return out;
}

const i18nSrc = readFileSync(join(jsDir, 'i18n.js'), 'utf8');
const cat = catalogKeys(i18nSrc);

console.log('\n🧪 BAYONA · INTEGRIDAD i18n (t() nunca cae al fallback)');
console.log('— catálogo —');
ok(cat.size > 0, `catálogo cargado: ${cat.size} claves`);
ok(cat.has('nav.home'), 'claves base presentes (nav.home)');

// 2. recolectar t("clave") usadas en toda la app
const used = new Map(); // key -> fichero
for (const f of listJs(jsDir)) {
  const src = readFileSync(f, 'utf8');
  const re = /\bt\(\s*(["'])([a-z0-9_.]+)\1/gi;
  let m;
  while ((m = re.exec(src))) {
    const k = m[2];
    if (!used.has(k)) used.set(k, 'js/' + f.split('/js/')[1]);
  }
}

console.log('— cobertura —');
const missing = [...used.entries()].filter(([k]) => !cat.has(k));
ok(used.size > 0, `se usan ${used.size} claves t() en la app`);
ok(missing.length === 0, `todas las claves t() existen en el catálogo (faltan ${missing.length})`);
for (const [k, f] of missing.slice(0, 10)) console.log(`         · falta "${k}" (usada en ${f})`);

// 3. trinquete anti-regresión de cadenas hardcodeadas (vía audit-i18n)
console.log('— trinquete de migración —');
const r = spawnSync(process.execPath, [join(here, '..', 'tools', 'audit-i18n.mjs')], { encoding: 'utf8' });
ok(r.status === 0, 'audit-i18n sin regresión (≤ línea base)');
const m = (r.stdout || '').match(/Cadenas hardcodeadas detectadas: (\d+)/);
if (m) console.log(`         · hardcodeadas actuales: ${m[1]} (objetivo P19: 0)`);

console.log('────────────────────────────────────────────');
if (fail) { console.log(`❌ i18n-eval: ${fail} fallo(s) · ${pass} ok`); process.exit(1); }
console.log(`✅ i18n-eval: ${pass} ok · integridad de claves garantizada`);
process.exit(0);
