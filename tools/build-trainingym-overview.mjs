import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rows = JSON.parse(readFileSync(resolve(root, "trainingym/catalog.json"), "utf8"));
const count = key => rows.reduce((map, row) => {
  const value = String(row[key] || "Sin clasificar").trim() || "Sin clasificar";
  map[value] = (map[value] || 0) + 1;
  return map;
}, {});
const asList = obj => Object.entries(obj)
  .map(([name, count]) => ({name, count}))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"));
const status = count("estado_media");
const output = {
  total: rows.length,
  states: {
    ok: status.ok || 0,
    duplicate: status.duplicate || 0,
    no_video: status.no_video || 0,
    error: status.error || 0
  },
  muscles: asList(count("grupo_muscular")),
  types: asList(count("tipo")),
  provenance: "Agregados del catálogo existente, sin vídeos ni datos personales"
};
if (output.total !== 3141 ||
    Object.values(output.states).reduce((a,b) => a + b,0) !== output.total ||
    output.muscles.reduce((a,b) => a + b.count,0) !== output.total ||
    output.types.reduce((a,b) => a + b.count,0) !== output.total) {
  throw new Error("Trainingym aggregation inconsistent; refusing to write");
}
writeFileSync(resolve(root, "js/data/trainingym-overview.js"),
  "// Generated from existing catalog, no videos or personal information.\n" +
  "export const TRAININGYM_OVERVIEW = Object.freeze(" + JSON.stringify(output,null,2) + ");\n");
console.log("TRAININGYM_OVERALL_SUMMARY",output.total,"muscles",output.muscles.length);
