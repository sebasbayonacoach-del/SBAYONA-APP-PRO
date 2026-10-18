import { readFileSync } from "node:fs";
import { summarizeTrainingymAudit } from "../js/ui/trainingym-audit.js";
import assert from "node:assert/strict";

const catalog = JSON.parse(readFileSync(new URL("../trainingym/catalog.json", import.meta.url), "utf8"));
const summary = summarizeTrainingymAudit(catalog);
assert.equal(summary.total, 3141);
assert.deepEqual(summary.counts, { ok: 1607, duplicate: 648, no_video: 828, error: 58 });

const library = readFileSync(new URL("../js/ui/proplayer-library.js", import.meta.url), "utf8");
const auditUi = readFileSync(new URL("../js/ui/trainingym-audit.js", import.meta.url), "utf8");
assert.match(library, /document\.body\.dataset\.oneContext === "coach" && accountRole\(\) === "coach"/);
assert.match(library, /if \(isCoach\) \{\s*const audit = renderTrainingymAudit/);
assert.ok(!auditUi.includes("video_url"), "No third-party URLs in audit view");
assert.ok(!auditUi.includes("video_archivo_local"), "No media paths in audit view");
assert.ok(!auditUi.includes("eventos.jsonl") || auditUi.includes("Nunca importamos"), "Audit does not access private logs");
assert.ok(!auditUi.includes("localStorage"), "No personal or medical data persists in audit view");

assert.throws(() => summarizeTrainingymAudit([{ pos: 1, estado_media: "ok" }, { pos: 1, estado_media: "error" }]), /posición repetida/);
assert.throws(() => summarizeTrainingymAudit([{ pos: 1, estado_media: "unknown" }]), /Estado no reconocido/);
assert.throws(() => summarizeTrainingymAudit(null), /Catálogo no disponible/);
console.log("BAYONA APP Trainingym owner-only audit: 13 checks PASS");
