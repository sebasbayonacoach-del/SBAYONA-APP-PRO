// Mutation-oriented SQL contract: rejects weakening of the UPDATE's link guard.
// Static only; this is NOT proof of RLS or concurrent revocation correctness.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(fileURLToPath(new URL('../security/app7-complete-assignment-active-link-fix.sql', import.meta.url)), 'utf8');
const strip = s => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').toLowerCase();
const update = s => {
  const match = strip(s).match(/update public\.coach_assignments as a\s+set\s+([\s\S]*?)\s*;\s*get diagnostics/);
  assert.ok(match, 'assignment UPDATE must precede ROW_COUNT diagnostics');
  return match[1];
};
const safe = s => {
  const body = update(s);
  assert.match(body, /where a\.id\s*=\s*p_assignment/);
  assert.match(body, /a\.client_id\s*=\s*auth\.uid\(\)/);
  assert.match(body, /a\.status\s*=\s*'pending'/);
  assert.match(body, /and exists\s*\(\s*select 1 from public\.coach_clients as cc/);
  assert.match(body, /cc\.coach_id\s*=\s*a\.coach_id/);
  assert.match(body, /cc\.client_id\s*=\s*a\.client_id/);
  assert.match(body, /cc\.status\s*=\s*'active'/);
  assert.match(body, /for share of cc\s*\)/);
};
safe(sql);
const mutations = [
  [/cc\.status = 'active'/, "cc.status = 'revoked'"],
  [/cc\.coach_id = a\.coach_id/, 'cc.coach_id = auth.uid()'],
  [/cc\.client_id = a\.client_id/, 'cc.client_id = auth.uid()'],
  [/FOR SHARE OF cc/, ''],
  [/a\.client_id = auth\.uid\(\)/, 'a.client_id = a.client_id'],
  [/a\.status = 'pending'/, "a.status = 'completed'"],
];
for (const [from, to] of mutations) {
  assert.match(sql, from, `mutation target missing: ${from}`);
  assert.throws(() => safe(sql.replace(from, to)), undefined, `unsafe mutation accepted: ${from}`);
}
console.log(`PASS: UPDATE guard contract and ${mutations.length} negative mutations (static only)`);
