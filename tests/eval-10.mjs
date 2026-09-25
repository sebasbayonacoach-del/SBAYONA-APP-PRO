// eval-10.mjs — corre el EVAL-10 y anota el marcador (node tests/eval-10.mjs)
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const SUITES = [
  'state-eval.mjs', 'avatar3d-eval.mjs', 'avatar3d-consent-eval.mjs',
  'mirror-avatar3d-eval.mjs', 'consents-cache-eval.mjs', 'coach-eval.mjs',
  'plan-eval.mjs', 'rewards-eval.mjs', 'mirror-eval.mjs', 'pipeline-real-eval.mjs',
];

let pass = 0;
const failed = [];
for (const s of SUITES) {
  try {
    execFileSync(process.execPath, [`tests/${s}`], { stdio: 'pipe', timeout: 120000 });
    pass++;
    console.log(`  ✅ ${s}`);
  } catch {
    failed.push(s);
    console.log(`  ❌ ${s}`);
  }
}
let commit = 'sin-git';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
const line = `${new Date().toISOString().slice(0, 16)}  ${pass}/10  ${commit}  ${failed.join(',') || 'todo-verde'}\n`;
appendFileSync('tests/eval-history.log', line);
console.log(`\nEVAL-10: ${pass}/10 → anotado en tests/eval-history.log`);
process.exit(failed.length ? 1 : 0);
