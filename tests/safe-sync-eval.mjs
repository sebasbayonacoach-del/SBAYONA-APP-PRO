// Regresión de integridad: evita restaurar accidentalmente el espejo destructivo.
// Pruebas estáticas de contrato + pruebas funcionales del dominio de payloads.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { payloadMedidas, payloadAsignaciones, payloadAvatar } from "../js/sync/mirror.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const account = read("js/sync/account.js");
const mirror = read("js/sync/mirror.js");
const setup = read("api/supabase/setup.sql");
const owner = read("api/supabase/migrations/0009_single_owner_google_auth.sql");
const migration = read("api/supabase/migrations/0010_safe_sync.sql");
const guard = read("api/supabase/migrations/0011_owner_guard.sql");

assert.doesNotMatch(account, /await\s+remove\s*\(/,
  "No volver a borrar datos remotos antes de una escritura");
assert.doesNotMatch(account, /const\s+stale\s*=|cloudRows/,
  "No interpretar registros ausentes localmente como bajas globales");
assert.match(account, /upsert\("workout_sessions",\s*sessions,\s*\{\s*on_conflict:\s*"id"/);
assert.match(account, /upsert\("sets_log",\s*sets,\s*\{\s*on_conflict:\s*"session_id,client_id"/);
assert.match(account, /upsert\(p.tabla,\s*p.filas,\s*\{\s*on_conflict:\s*"user_id,fecha"/);
assert.match(account, /upsert\(p.tabla,\s*p.filas,\s*\{\s*on_conflict:\s*"user_id,client_sync_id"/);
assert.match(account, /upsert\(p.tabla,\s*p.filas,\s*\{\s*on_conflict:\s*"user_id,provider"/);
assert.match(account, /if\s*\(identitiesChanged\s*&&\s*!S\.save\(\)\)/);
assert.match(account, /Array\.isArray\(h\.sets\)/);
assert.doesNotMatch(account, /role:\s*accountRole\(\)/,
  "El rol de coach no puede venir de escrituras del navegador");
assert.match(mirror, /client_sync_id:\s*String\(a\.id/);
assert.match(migration, /unique index if not exists sets_log_session_client_unique/i);
assert.match(migration, /unique index if not exists entrenamientos_asignados_client_sync_unique/i);
assert.match(owner, /create trigger bayona_owner_sync_role/i);
assert.match(setup, /create trigger bayona_owner_sync_role/i);
assert.match(setup, /sets_log_session_client_unique/);
assert.doesNotMatch(setup, /^\s*(?:as|do) \$\s*$/m);
assert.doesNotMatch(setup, /^\s*\$;\s*$/m);
assert.doesNotMatch(owner, /^\s*as \$\s*$/m);
assert.match(setup, /BAYONA 0011_owner_guard/);
assert.match(guard, /as restrictive for select to authenticated/g);
assert.match(guard, /create trigger bayona_owner_coach_clients/i);
assert.match(guard, /create trigger bayona_owner_coach_invites/i);
assert.match(guard, /create trigger bayona_owner_coach_routines/i);
assert.match(guard, /create trigger bayona_owner_coach_assignments/i);

const medidas = payloadMedidas("usuario", [
  { fecha: "2026-10-11", pesoKg: 70 },
  { fecha: "2026-10-11", cinturaCm: 80 },
]);
assert.equal(medidas.filas.length, 1);
assert.deepEqual(medidas.filas[0], { user_id: "usuario", fecha: "2026-10-11", peso_kg: 70, cintura_cm: 80 });
const assignments = payloadAsignaciones("usuario", [
  { id: "as_123", clienteId: "local", workoutId: "w1", dia: "2026-10-13" },
  { id: "demo", clienteId: "demo", workoutId: "w2", dia: "2026-10-13" },
]);
assert.equal(assignments.filas.length, 1);
assert.equal(assignments.filas[0].client_sync_id, "as_123");
assert.equal(payloadAvatar("usuario", {}).filas.length, 0);
console.log("safe-sync: 25 contratos de seguridad y payloads verificados");
