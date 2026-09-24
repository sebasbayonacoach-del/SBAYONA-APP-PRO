#!/usr/bin/env node
// tests/syntax-eval.mjs — red de seguridad: TODO el JS de la app debe parsear.
// Un error de sintaxis = pantalla rota. Este test caza cualquier módulo mal escrito
// SIN ejecutarlo (node --check): 100% seguro, sin dependencias de navegador.
// Cubre js/**, tools/*.mjs y tests/*.mjs. Falla si algún fichero no parsea.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => f.endsWith(e))) out.push(p);
  }
  return out;
}

const targets = [
  ...walk(join(root, 'js'), ['.js']),
  ...walk(join(root, 'tools'), ['.mjs', '.js']),
  ...walk(join(root, 'tests'), ['.mjs', '.js']),
];

let bad = 0, ok = 0;
const failures = [];
for (const f of targets) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status === 0) ok++;
  else {
    bad++;
    failures.push({ file: f.replace(root + '/', ''), err: (r.stderr || '').trim().split('\n').slice(0, 3).join(' | ') });
  }
}

console.log('\n🧪 BAYONA · SMOKE DE SINTAXIS (todo el JS debe parsear)');
console.log(`Ficheros comprobados: ${targets.length}`);
if (failures.length) {
  console.log('— rotos —');
  for (const x of failures) console.log(`  ❌ ${x.file}: ${x.err}`);
}
console.log('────────────────────────────────────────────');
if (bad) { console.log(`❌ syntax-eval: ${bad} fichero(s) con error de sintaxis · ${ok} ok`); process.exit(1); }
console.log(`✅ syntax-eval: ${ok}/${targets.length} parsean · 0 errores de sintaxis`);
process.exit(0);
