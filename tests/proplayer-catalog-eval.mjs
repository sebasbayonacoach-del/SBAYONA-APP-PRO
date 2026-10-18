import fs from "node:fs";
import { auditProplayerCatalog } from "../js/data/proplayer-catalog-audit.js";

const records = JSON.parse(fs.readFileSync(new URL("../trainingym/catalog.json", import.meta.url), "utf8"));
const audit = auditProplayerCatalog(records);
const checks = [
  [audit.errors.length === 0, "catálogo y referencias cumplen formato y HTTPS"],
  [audit.records === 3141, "3.141 fichas de ejercicios"],
  [audit.references === 2255, "2.255 fichas tienen referencia de vídeo"],
  [audit.uniqueAssets === 1607, "1.607 nombres de archivo distintos en el catálogo"],
  [audit.repeatedReferences === 648, "648 referencias reutilizan nombres de archivo"],
  [audit.states.no_video === 828 && audit.states.error === 58, "828 sin vídeo y 58 incidencias declaradas"],
];

const invalid = auditProplayerCatalog([
  { pos: 1, video_archivo_local: "a.mp4", video_url: "http://media.example/a.mp4" },
  { pos: 2, video_archivo_local: "b.mp4", video_url: "https://media.example/wrong.mp4" },
]);
checks.push([invalid.errors.includes("non_https_media_url:1"), "rechaza referencias HTTP" ]);
checks.push([invalid.errors.includes("media_url_filename_mismatch:2"), "detecta URL asignada a otro archivo"]);

for (const [ok, label] of checks) console.log(`${ok ? "✅" : "❌"} ${label}`);
console.log(`PROPLAYER audit: ${audit.records} fichas · ${audit.references} referencias · ${audit.uniqueAssets} nombres de archivo · ${audit.errors.length} errores`);
process.exit(checks.every(([ok]) => ok) ? 0 : 1);
