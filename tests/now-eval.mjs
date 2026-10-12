import assert from "node:assert/strict";
import { decideNow, recentSummary } from "../js/now.js";

let n = 0;
const ok = (cond, msg) => { assert(cond, msg); n++; console.log("  ✅", msg); };

console.log("\n◈ BAYONA NOW · decisión única\n");

const base = {
  now: new Date("2026-10-10T10:00:00+02:00"),
  profile: { name: "Sebastián Bayona" },
  today: { date: "2026-10-10", trained: false, trainingSets: 0, energy: 7 },
  readinessDetail: { score: 76, known: 3 },
  activeSession: null,
  workout: { id: "op_upper", name: "OPERACIÓN: SUPERIOR", min: 45 },
  adjustedSession: { applied: false, note: "Carga estándar." },
  history: [],
};

let d = decideNow(base);
ok(d.action === "train" && d.actionLabel === "HACERLO", "con sesión y preparación buena da una sola acción: entrenar");
ok(/Sebastián/.test(d.title), "la decisión habla a la persona por su nombre");

d = decideNow({ ...base, readinessDetail: { score: 36 }, adjustedSession: { applied: true, note: "Preparación baja: misión recortada." } });
ok(d.action === "recover", "preparación muy baja prioriza recuperación");
ok(/bajar una marcha/i.test(d.title), "explica el cambio sin dramatizar");

d = decideNow({ ...base, activeSession: { status: "en curso", logged: 4, plannedSets: 12 } });
ok(d.action === "resume" && /4 de 12/.test(d.body), "si hay sesión abierta, retomar domina cualquier otra sugerencia");

d = decideNow({ ...base, today: { ...base.today, trained: true }, now: new Date("2026-10-10T22:00:00+02:00") });
ok(d.action === "recover" && /suficiente/i.test(d.title), "de noche y tras entrenar no empuja otra sesión");

d = decideNow({ ...base, workout: null, readinessDetail: { score: null } });
ok(d.action === "recover", "sin sesión programada no inventa entrenamiento");
ok(d.status.score === null && d.status.label === "SIN CALCULAR", "sin registros no inventa puntuación de preparación");

const s = recentSummary([
  { date: "2026-10-04", workouts: 1, sets: 9, sleep: 7, strain: 8, prPoints: [] },
  { date: "2026-10-05", workouts: 0, sets: 0, sleep: 6, strain: 0, prPoints: [] },
  { date: "2026-10-06", workouts: 1, sets: 10, sleep: 8, strain: 9, prPoints: [{ ex: "squat" }] },
], { date: "2026-10-10", trained: true, trainingSets: 8, sleep: 7, strain: 7, prPoints: [] });
ok(s.workouts7 === 3 && s.sets7 === 27, "resume los últimos 7 días con datos reales");
ok(s.sleep7 === 7, "media de sueño usa solo valores registrados");
ok(s.prs28 === 1, "el resumen mensual cuenta PRs registrados");

console.log("\n📊 RESULTADO: " + n + " comprobaciones · 0 fallos\n");
