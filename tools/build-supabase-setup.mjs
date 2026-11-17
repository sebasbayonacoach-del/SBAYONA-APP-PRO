import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function buildSupabaseSetup({ base = root } = {}) {
  const dir = path.join(base, "api", "supabase", "migrations");
  const files = fs.readdirSync(dir).filter((name) => /^00(?:0[1-9]|10)_.+\.sql$/.test(name)).sort();
  if (files.length !== 10) throw new Error(`Se esperaban 10 migraciones numeradas; encontradas: ${files.length}`);
  const parts = files.map((name) => {
    const sql = fs.readFileSync(path.join(dir, name), "utf8").replace(/\r?\n/g, "\n").trimEnd();
    return `\n-- ============================================================\n-- MIGRACIÓN ${name}\n-- ============================================================\n${sql}\n`;
  });
  return [
    "-- GENERATED FILE: run `node tools/build-supabase-setup.mjs` to rebuild.",
    "-- Source of truth: api/supabase/migrations/0001_core.sql through 0010_app7_notification_preferences.sql.",
    "-- Fresh Supabase project only. Do not rerun on an existing database.",
    "-- For an existing project, inspect migration history and apply only pending migrations.",
    ...parts,
  ].join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = path.join(root, "api", "supabase", "setup.sql");
  fs.writeFileSync(output, buildSupabaseSetup());
  console.log(`Generated ${path.relative(root, output)} from 10 ordered migrations.`);
}
