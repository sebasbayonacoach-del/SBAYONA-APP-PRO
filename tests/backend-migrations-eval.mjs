import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildSupabaseSetup } from "../tools/build-supabase-setup.mjs";

const dir = new URL("../api/supabase/migrations/", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, dir), "utf8");
const checks = [];
const check = (condition, label) => { assert.ok(condition, label); checks.push(label); };

const core = read("0001_core.sql");
const coach = read("0005_launch_coaching.sql");
const life = read("0006_life_os.sql");
const owner = read("0009_single_owner_google_auth.sql");
const setup = fs.readFileSync(new URL("../api/supabase/setup.sql", import.meta.url), "utf8");
check(core.includes("grant select on public.profiles to anon"), "anon solo obtiene permiso de ruta de perfiles para el probe");
check(core.includes("grant select, insert, update, delete on") && core.includes("to authenticated"), "dominios base exponen CRUD autenticado con RLS");
check(core.includes("grant usage, select on sequence") && core.includes("to authenticated, service_role"), "seriales pueden asignarse con roles permitidos");
check(coach.includes("grant select, delete on public.coach_invites to authenticated"), "invitaciones siguen escribiéndose por RPC");
check(life.includes("grant select, insert, update, delete on public.planner_items, public.connected_sources"), "Life OS tiene grants explícitos y RLS");
check(owner.includes("as $$\nbegin") && !/as \$(?!\$)/.test(owner), "cuerpo PL/pgSQL de sincronización usa delimitador válido");
check(owner.includes("revoke all on public.bayona_owner from public, anon, authenticated"), "tabla de propietario continúa privada");
check(setup === buildSupabaseSetup(), "setup.sql se puede regenerar y coincide con las nueve migraciones");
check(setup.includes("sync_bayona_owner_role") && !/as \$(?!\$)/.test(setup), "instalador contiene sync de propietario y ningún delimitador PL/pgSQL roto");
for (const name of ["0001_core.sql", "0002_medidas_asignaciones.sql", "0005_launch_coaching.sql", "0006_life_os.sql"]) {
  check(/enable row level security/i.test(read(name)), `${name} mantiene RLS`);
}

console.log(`✅ ${checks.length} comprobaciones estáticas de migraciones`);
