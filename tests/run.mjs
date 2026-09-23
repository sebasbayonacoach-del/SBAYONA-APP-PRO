// run.mjs — batería de pruebas multiplataforma (Windows/macOS/Linux).
// Ejecuta CADA test en su proceso y falla (exit 1) si alguno falla.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(here)
  .filter((f) => f.endsWith('-eval.mjs') || f.endsWith('-test.mjs'))
  .sort();

let failed = [];
for (const f of files) {
  console.log(`\n▶ ${f}`);
  const r = spawnSync(process.execPath, [join(here, f)], { stdio: 'inherit' });
  if (r.status !== 0) failed.push(f);
}

// evaluación de biomecánica (golden set) fuera de tests/
const bio = spawnSync(process.execPath, [join(here, '..', 'ml', 'evals', 'biomech-golden.mjs')], { stdio: 'inherit' });
if (bio.status !== 0) failed.push('biomech-golden.mjs');

console.log('\n══════════════════════════════════');
if (failed.length) {
  console.log(`❌ FALLAN: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`✅ TODA LA BATERÍA PASA (${files.length + 1} suites)`);
process.exit(0);
