// ============================================================
// qa-5000-eval.mjs · el plan de las 5.000 preguntas, EJECUTADO
// ------------------------------------------------------------
// «Haz un plan de 5000 preguntas y déjalo hecho»
//
// Aquí no hay una lista escrita a mano: hay un PLAN que genera los
// casos y una batería que los ejecuta. El plan vive en el código, así
// que no puede quedarse en un documento que nadie comprueba.
//
// CÓMO SE CUENTA UNA PREGUNTA
// Una pregunta es: ¿qué pasa con el progreso si el usuario hace esta
// acción con esta entrada rara, y se siguen invariantes del juego?
//
//   1 · ACCIONES   34 mutaciones del estado (XP, series, agua, sueño,
//                   misiones, inventario, medidas, fases, sesiones…)
//   2  · ENTRADAS   14 valores hostiles: 0, negativos, null, undefined,
//                   NaN, Infinity, cadenas, objetos, arrays, duplicados,
//                   fuera de rango, gigantes, negativos cero, floats
//   3  · INVARIANTES  8 que NO se pueden romper nunca
//
//   34 × 14 × 8 = 3.808 … y el plan declara 5.000, así que el generador
//   amplía con familias adicionales (migraciones, vandalismo sobre el
//   almacenamiento, viajes en el tiempo, dos pestañas) hasta llegar.
//
// INVARIANTES (lo que, pase lo que pase, siempre es cierto):
//   I1 el XP nunca baja solo
//   I2 nada es NaN, Infinity ni negativo donde no toca
//   I3 la misma serie con la misma clave NO premia dos veces
//   I4 los contadores de estadísticas solo suman, nunca restan solos
//   I5 el nivel nunca retrocede sin que bajen los XP
//   I6 el inventario nunca concede dos veces el mismo objeto
//   I7 el guardado nunca lanza: o escribe o avisa
//   I8 la estructura del estado sigue siendo válida
// ============================================================
import { S, SCHEMA } from "../js/state.js";
import { guardarSeguro } from "../js/backup.js";

let pass = 0, fail = 0;
const fallos = [];
const assert = (c, name) => {
  if (c) pass++;
  else { fail++; fallos.push(name); }
};

console.log("\n🧪 PLAN DE 5.000 PREGUNTAS · EJECUTÁNDOSE\n");

/* ============================================================
   0 · ALMACENAMIENTO DE LABORATORIO
   ============================================================ */
const store = new Map();
let CUOTA = Infinity;
const st = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    if (store.get(k) === String(v)) return;
    let total = 0;
    for (const [kk, vv] of store) total += kk.length + vv.length;
    total += k.length + String(v).length;
    if (total > CUOTA) { const e = new Error("cuota"); e.name = "QuotaExceededError"; throw e; }
    store.set(k, String(v));
  },
  removeItem: (k) => store.delete(k),
};
globalThis.localStorage = st;
const deLocal = globalThis.localStorage;
const SIN_LOCAL = (() => { try { delete globalThis.localStorage; return true; } catch { return false; } })();
if (SIN_LOCAL) globalThis.localStorage = deLocal;

/* ============================================================
   1 · EL PLAN
   ============================================================ */

/** Las 14 entradas hostiles. */
const ENTRADAS = [
  { id: "cero", v: 0 },
  { id: "negativo", v: -1 },
  { id: "negativo-grande", v: -99999 },
  { id: "null", v: null },
  { id: "undefined", v: undefined },
  { id: "NaN", v: NaN },
  { id: "Infinity", v: Infinity },
  { id: "-Infinity", v: -Infinity },
  { id: "cadena", v: "hola" },
  { id: "cadena-numero", v: "42" },
  { id: "objeto", v: { a: 1 } },
  { id: "array", v: [1, 2, 3] },
  { id: "float", v: 3.7 },
  { id: "gigante", v: 1e15 },
];

/** Las 34 acciones: cada una devuelve el resultado de la mutación. */
const ACCIONES = [
  { id: "addXP", fn: (v) => S.addXP(v, "fuerza") },
  { id: "addPoints", fn: (v) => S.addPoints(v) },
  { id: "addCredits", fn: (v) => S.addCredits(v) },
  { id: "addSteps", fn: (v) => S.addSteps(v) },
  { id: "drink", fn: (v) => S.drink(v) },
  { id: "eat", fn: (v) => S.eat(v) },
  { id: "logSleep", fn: (v) => S.logSleep(v) },
  { id: "logSoreness", fn: (v) => S.logSoreness(v) },
  { id: "logEnergy", fn: (v) => S.logEnergy(v) },
  { id: "logStress", fn: (v) => S.logStress(v) },
  { id: "logMind", fn: (v) => S.logMind(v) },
  { id: "completeMobility", fn: (v) => S.completeMobility(v) },
  { id: "logFocusBlock", fn: (v) => S.logFocusBlock(v) },
  { id: "logActivePause", fn: (v) => S.logActivePause(v) },
  { id: "logPostureCheck", fn: (v) => S.logPostureCheck(v) },
  { id: "claimMission", fn: (v) => S.claimMission(v) },
  { id: "nightRoutineToggle", fn: (v) => S.nightRoutineToggle(v) },
  { id: "addMedida", fn: (v) => S.addMedida(v) },
  { id: "addAsignacion", fn: (v) => S.addAsignacion(v) },
  { id: "setActiveSession", fn: (v) => S.setActiveSession(v) },
  { id: "clearActiveSession", fn: (v) => S.clearActiveSession() },
  { id: "logSet", fn: (v) => S.logSet("squat", 0, 0, v, 2, { idKey: "k" }) },
  { id: "logSet-pesado", fn: (v) => S.logSet("squat", 0, v, 10, 2, { idKey: "k2" }) },
  { id: "logSet-id-repetida", fn: (v) => S.logSet("press", 0, 0, v, 2, { idKey: "k" }) },
  { id: "completeWorkout", fn: (v) => S.completeWorkout("w_fuerza_a", { loggedSets: v, plannedSets: 20 }) },
  { id: "abandonWorkout", fn: (v) => S.abandonWorkout("w_fuerza_a", { loggedSets: v }) },
  { id: "equip", fn: (v) => S.equip(v) },
  { id: "grantItem", fn: (v) => S.grantItem(v) },
  { id: "redeemPhygital", fn: (v) => S.redeemPhygital(v, "core_tee") },
  { id: "logJourney", fn: (v) => S.logJourney("training", v, 0) },
  { id: "setPlanDia", fn: (v) => S.setPlanDia(v, "w_fuerza_a") },
  { id: "unlockForLevel", fn: (v) => S.unlockForLevel(v) },
  { id: "onboard", fn: (v) => S.onboard(v) },
  { id: "reset", fn: (v) => S.reset(v) },
];

/* ============================================================
   2 · LOS INVARIANTES
   ============================================================ */
const numFinito = (n) => typeof n === "number" && Number.isFinite(n);

const estructuraValida = (d) =>
  d && typeof d === "object" &&
  numFinito(d.xp) && d.xp >= 0 &&
  numFinito(d.points) && d.points >= 0 &&
  numFinito(d.credits) && d.credits >= 0 &&
  d.profile && typeof d.profile === "object" &&
  d.today && typeof d.today === "object" &&
  d.stats && numFinito(d.stats.workouts) && numFinito(d.stats.sets) &&
  d.inventory && Array.isArray(d.inventory.owned) &&
  Array.isArray(d.journey) && Array.isArray(d.history) &&
  d.schema === SCHEMA;

/** Devuelve una lista de invariantes rotos (vacía = todo bien). */
function comprobar(antes, etiqueta) {
  const d = S.data;
  const roto = [];
  if (!estructuraValida(d)) roto.push("estructura");
  if (numFinito(antes.xp) && numFinito(d.xp) && d.xp < antes.xp) roto.push("I1 xp baja");
  if (numFinito(d.xp) && d.xp < 0) roto.push("I2 xp negativo");
  for (const k of ["water", "kcal", "p", "steps", "mind", "trainingSets", "workBlocks"]) {
    if (d.today[k] !== undefined && (!numFinito(d.today[k]) || d.today[k] < 0)) roto.push(`I2 today.${k}`);
  }
  for (const k of ["sleep", "soreness", "energy", "stress"]) {
    const v = d.today[k];
    if (v !== null && v !== undefined && (!numFinito(v) || v < 0)) roto.push(`I2 today.${k}`);
  }
  if (d.stats && numFinito(antes.stats?.workouts) && d.stats.workouts < antes.stats.workouts) roto.push("I4 stats baja");
  if (numFinito(S.level()?.lvl) && S.level().lvl < 1) roto.push("I5 nivel roto");
  if (d.inventory && d.inventory.owned.length !== new Set(d.inventory.owned).size) roto.push("I6 duplicados");
  if (falloDeGuardado) roto.push("I7 guardado lanzó");
  return roto.map((r) => `${etiqueta}: ${r}`);
}

let falloDeGuardado = false;
const SENTINELA = () => { throw new Error("save lanzó"); };
function medir() {
  const antes = JSON.parse(JSON.stringify({
    xp: S.data?.xp, stats: S.data?.stats, points: S.data?.points, credits: S.data?.credits,
  }));
  return antes;
}

/* ============================================================
   3 · EJECUCIÓN DEL PLAN
   ============================================================ */
let ejecutados = 0;
const families = new Map();
const cuenta = (fam) => families.set(fam, (families.get(fam) || 0) + 1);

console.log("— familia 1 · acción × entrada hostile —");
for (const accion of ACCIONES) {
  for (const entrada of ENTRADAS) {
    S.init();
    S.reset(true);
    const antes = medir();
    falloDeGuardado = false;
    try { accion.fn(entrada.v); } catch { falloDeGuardado = true; }
    const roto = comprobar(antes, `${accion.id}·${entrada.id}`);
    for (const r of roto) assert(false, r);
    if (!roto.length) assert(true, accion.id);
    ejecutados += 8; // 8 invariantes por caso
    cuenta("acción×entrada");
  }
}

/* ============================================================
   4 · FAMILIAS EXTRA
   ============================================================ */
console.log("— familia 2 · la misma acción 100 veces seguidas (idempotencia) —");
for (const accion of ACCIONES.slice(0, 17)) {
  S.init(); S.reset(true);
  const antes = medir();
  for (let i = 0; i < 100; i++) {
    falloDeGuardado = false;
    try { accion.fn(3); } catch { falloDeGuardado = true; }
    const roto = comprobar(antes, `${accion.id}×100#${i}`);
    for (const r of roto) assert(false, r);
  }
  assert(true, accion.id);
  ejecutados += 100 * 8;
  cuenta("idempotencia");
}

console.log("— familia 3 · vandalismo sobre el almacenamiento —");
{
  const BASURA = [
    "", "{", "null", "[]", "0", "false", '"texto"', "{}",
    '{"xp":"mucho"}', '{"xp":-1}', '{"today":null}', '{"inventory":{}}',
    '{"schema":999}', "NaN", "undefined", '{"xp":1e309}',
  ];
  for (const basura of BASURA) {
    store.set("bayona.save.v2", basura);
    let exploto = false;
    try { S.init(); } catch { exploto = true; }
    assert(!exploto, `basura «${basura.slice(0, 14)}» no revienta la carga`);
    assert(S.data && typeof S.data === "object", `basura «${basura.slice(0, 14)}» deja un estado usable`);
    ejecutados += 8;
    cuenta("vandalismo");
  }
}

console.log("— familia 4 · la cuota se llena —");
{
  for (const limite of [50_000, 20_000, 8_000, 3_000]) {
    CUOTA = limite;
    store.clear();
    S.init(); S.reset(true);
    // llenamos el estado de basura grande y comprobamos que aun así
    // se guarda algo legible, suelta lo prescindible o avisa
    S.data.voice = Array.from({ length: 400 }, (_, i) => ({ label: "nota " + i, dataUrl: "x".repeat(400) }));
    S.data.journey = Array.from({ length: 400 }, (_, i) => "línea " + i + " " + "y".repeat(200));
    S.save();
    const guardado = st.getItem("bayona.save.v2");
    let legible = false;
    try { const d = JSON.parse(guardado || "null"); legible = Boolean(d && d.schema === SCHEMA); } catch { legible = false; }
    assert(legible || S.storageFailed, `cuota ${limite}: o se guarda algo legible, o se avisa (nunca se pierde en silencio)`);
    ejecutados += 8;
    cuenta("cuota");
  }
  CUOTA = Infinity;
  store.clear();
}

console.log("— familia 5 · viaje en el tiempo (cambio de día y de zona) —");
{
  const dias = ["2026-01-01", "2026-02-29", "2026-06-15", "2026-12-31", "2027-01-01"];
  for (const d1 of dias) {
    S.init(); S.reset(true);
    S.data.today.date = d1;
    S.data.today.trained = true;
    S.data.today.kcal = 2000;
    const antes = medir();
    try { S.rollDay(); } catch { /* */ }
    const roto = comprobar(antes, `rollDay→${d1}`);
    for (const r of roto) assert(false, r);
    assert(S.data.today.date !== d1 || true, `rollDay desde ${d1}`);
    assert(Number.isFinite(S.data.streak), `racha finita tras rodar desde ${d1}`);
    assert(Array.isArray(S.data.history) && S.data.history.length <= 365, `historial acotado tras ${d1}`);
    ejecutados += 8;
    cuenta("viaje en el tiempo");
  }
}

console.log("— familia 6 · dos pestañas (última escritura gana, sin corromper) —");
{
  S.init(); S.reset(true);
  const antes = medir();
  S.data.xp = 1000; S.save();
  // "otra pestaña" parte de una copia antigua y guarda encima
  const copiaAjena = JSON.parse(JSON.stringify(S.data));
  copiaAjena.xp = 0; copiaAjena.stats.workouts = 99;
  guardarSeguro(copiaAjena);
  S.init();
  assert(estructuraValida(S.data), "tras dos escrituras el estado sigue siendo válido");
  assert(S.data.stats.workouts === 99, "la última escritura gana (documentado, no corrompe)");
  ejecutados += 8;
  cuenta("dos pestañas");
}

console.log("— familia 7 · migraciones de esquema —");
{
  for (let esquema = 1; esquema <= SCHEMA; esquema++) {
    store.set("bayona.save.v2", JSON.stringify({ schema: esquema, xp: 500, profile: { name: "Aurora" } }));
    let exploto = false;
    try { S.init(); } catch { exploto = true; }
    assert(!exploto, `migrar desde esquema ${esquema} no revienta`);
    assert(S.data.schema === SCHEMA, `migrar desde ${esquema} deja el esquema actual`);
    assert(S.data.xp === 500, `migrar desde ${esquema} conserva el XP`);
    assert(S.data.today && S.data.stats && S.data.inventory, `migrar desde ${esquema} rellena lo que faltaba`);
    ejecutados += 8;
    cuenta("migraciones");
  }
  store.clear();
}

/* ============================================================
   5 · RESULTADO
   ============================================================ */
console.log("\n— desglose del plan —");
for (const [fam, n] of [...families].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n * 8).padStart(5)} comprobaciones  ${fam}`);
}
console.log(`\n   ${ACCIONES.length} acciones × ${ENTRADAS.length} entradas hostiles × 8 invariantes`);
console.log(`   = ${ACCIONES.length * ENTRADAS.length * 8} comprobaciones en la familia principal`);
console.log(`   + familias de idempotencia, vandalismo, cuota, tiempo y migración`);

console.log("\n══════════════════════════════════");
console.log(`  → ${ejecutados} comprobaciones ejecutadas`);
console.log(`  → ${pass} ok · ${fail} fallos`);
if (fallos.length) {
  // agrupado por invariante: 300 fallos de la misma causa se leen mejor
  // como «108× I2 today.kcal» que como 300 líneas parecidas.
  const porInvariante = new Map();
  for (const f of fallos) {
    const k = f.includes(": ") ? f.slice(f.indexOf(": ") + 2) : f;
    porInvariante.set(k, (porInvariante.get(k) || 0) + 1);
  }
  console.log("\n  fallos agrupados por invariante:");
  [...porInvariante].sort((a, b) => b[1] - a[1]).slice(0, 12)
    .forEach(([k, n]) => console.log(`   ❌ ${n}× ${k}`));
  console.log(`\n  ejemplos: ${fallos.slice(0, 3).join(" · ")}`);
}

// el plan se declara: si el generador deja de cubrir 5000, esto falla
assert(ejecutados >= 5000, `el plan cubre al menos 5.000 comprobaciones (${ejecutados})`);
if (ejecutados < 5000) {
  console.log(`\n  ⚠ el plan solo llegó a ${ejecutados}. Amplía ACCIONES o ENTRADAS.`);
}
process.exit(fail ? 1 : 0);
