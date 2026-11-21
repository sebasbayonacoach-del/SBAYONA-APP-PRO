// Static regression guard for the proposed Coach–Athlete revocation RPC.
// This checks the migration text only; authenticated staging tests are still required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = readFileSync(fileURLToPath(new URL('../security/app7-complete-assignment-active-link-fix.sql', import.meta.url)), 'utf8');
const normalized = sql.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ').toLowerCase();

assert.match(normalized, /create or replace function public\.complete_coach_assignment\s*\(p_assignment uuid\)/);
assert.match(normalized, /security definer/);
assert.match(normalized, /set search_path to ''/);
assert.match(normalized, /auth\.uid\(\) is null/);
assert.match(normalized, /a\.client_id\s*=\s*auth\.uid\(\)/);
assert.match(normalized, /a\.status\s*=\s*'pending'/);
assert.match(normalized, /exists\s*\(\s*select 1 from public\.coach_clients as cc/);
assert.match(normalized, /cc\.coach_id\s*=\s*a\.coach_id/);
assert.match(normalized, /cc\.client_id\s*=\s*a\.client_id/);
assert.match(normalized, /cc\.status\s*=\s*'active'/);
assert.match(normalized, /for share of cc/);
assert.match(normalized, /return v_rows\s*=\s*1/);
console.log('PASS: static revocation RPC migration contract (not an authenticated RLS test)');
