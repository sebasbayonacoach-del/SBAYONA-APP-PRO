#!/usr/bin/env node
// ============================================================
// tests/pro-ui-eval.mjs · el contrato de diseño de BAYONA PRO
// ------------------------------------------------------------
// «Esta versión está muy fea» es una opinión subjetiva: si no se
// convierte en reglas comprobables, vuelve a fea dos sprints después.
// Estas aserciones fallan si alguien reintroduce un botón gigante, un
// un color ajeno a la marca, una sombra difusa o un título de 40 px.
//
// Y la otra mitad del encargo: que la IA pueda ASIGNAR una rutina y
// que el atleta la vea con autor, fecha y nota.
// ============================================================
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { WORKOUTS } from "../js/data.js";
import { COACH_TOOLS, TOOL_NAMES } from "../js/coach/ai-core.js";
import { intencionAsignacion } from "../js/coach/replies.js";
import { validaAsignacion } from "../js/coachos.js";
import { t as cat } from "../js/i18n.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (p) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const fallos = [];
function assert(cond, label) {
  if (cond) { pass++; console.log("  ✅ " + label); }
  else { fail++; fallos.push(label); console.log("  ❌ " + label); }
}
console.log("\n🎨 BAYONA PRO · contrato de diseño\n");

/* ---------- helpers de CSS ---------- */
/** Texto de la primera declaración que abre `selector {` */
function bloque(css, selector) {
  const i = css.indexOf(selector);
  if (i < 0) return "";
  const a = css.indexOf("{", i);
  const b = css.indexOf("}", a);
  return css.slice(a + 1, b);
}
const num = (css, prop) => {
  const m = bloque(css, css.indexOf(prop) >= 0 ? prop : prop).match(new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*([0-9.]+)px"));
  return m ? Number(m[1]) : null;
};

/* ============================================================
   1 · LA CAPA EXISTE Y MANDA
   ============================================================ */
console.log("— la capa se carga y se sirve offline —");
const index = leer("index.html");
const css = existeCss();
function existeCss() {
  const p = join(root, "css", "pro.css");
  if (!existsSync(p)) return "";
  return readFileSync(p, "utf8");
}

assert(css.length > 0, "css/pro.css existe");
const hojas = [...index.matchAll(/<link[^>]+href="(css\/[^"]+)"/g)].map((m) => m[1].split("?")[0]);
assert(hojas[hojas.length - 1] === "css/pro.css",
  "pro.css es la ÚLTIMA hoja: es la que manda", hojas.join(" → "));
const sw = leer("sw.js");
assert(sw.includes("./css/pro.css"), "el service worker precachea pro.css (funciona sin red)");

/* ============================================================
   2 · FIRMA DE MARCA: negro + naranja BAYONA
   ============================================================ */
console.log("— firma negra + naranja —");
assert(css.includes("BLACK / ORANGE SIGNATURE"),
  "la capa PRO declara explícitamente la firma BAYONA BLACK / ORANGE");
assert(/--fit-bg:\s*#050505/i.test(css),
  "el fondo final de BAYONA ONE es negro profundo");
assert(/--fit-surface:\s*#0d0e10/i.test(css),
  "las superficies finales son grafito oscuro");
assert(/--fit-accent:\s*#ff6a00/i.test(css),
  "el acento final es naranja BAYONA");
assert(/--orange:\s*#ff6a00/i.test(css),
  "el alias naranja de la app apunta al naranja BAYONA");
assert(/color-scheme:\s*dark/i.test(css),
  "la interfaz final declara esquema oscuro");

/* ============================================================
   3 · DENSE: el botón no vuelve a ser un ladrillo
   ============================================================ */
console.log("— controles de 30 px, no de 48 —");
const btn = bloque(css, "body.fitness-app .btn {");
const alto = Number((btn.match(/(?:min-)?height:\s*(\d+)px/) || [])[1]);
assert(alto !== null && alto <= 32, `el botón mide ${btn.match(/(?:min-)?height:\s*(\d+)px/) ? alto + "px" : "?"} (máx. 32)`, btn);
assert(!/min-height:\s*(4[3-9]|[5-9]\d)px/.test(btn), "el botón no vuelve a los 48 px de la capa anterior");
const modal = bloque(css, "body.fitness-app #modal-box {");
assert(!/border-radius:\s*(1[6-9]|2\d)px/.test(modal), "el modal no es una caja redondeada gigante");

/* ============================================================
   4 · SIN SOMBRAS NI VIDRIO
   ============================================================ */
console.log("— planos: ni sombras ni desenfoque —");
assert(/body\.fitness-app \* \{[^}]*box-shadow:\s*none\s*!important/.test(css),
  "ningún elemento conserva sombra difusa (regla universal)");
assert(css.includes("backdrop-filter: none !important"), "nada de cristal esmerilado");
assert(!/linear-gradient/.test(bloque(css, "body.fitness-app .dash-card {")), "las tarjetas del tablero no llevan degradado");

/* ============================================================
   5 · CAJA ORACIONARIA
   ============================================================ */
console.log("— los títulos no gritan —");
const tit = bloque(css, "body.fitness-app #drawer-title,");
assert(/text-transform:\s*capitalize/.test(css), "los títulos en mayúsculas pasan a caja oracionaria");
const dt = bloque(css, "body.fitness-app #drawer-title {");
const tamTitulo = Number((dt.match(/font:[^;]*?(\d+)px/) || [])[1]);
assert(tamTitulo > 0 && tamTitulo <= 20, `el título del panel es de ${tamTitulo || "?"} px (máx. 20)`, dt);
assert(!/clamp\(4\dpx|clamp\(5\dpx|clamp\([6-9]\dpx/.test(css), "no quedan titulares de 48 px o más");
const entrada = bloque(css, "body.fitness-app #entry .e-title {");
const topePortada = Number((entrada.match(/font:[^;]*?(\d+)px/) || [])[1]);
assert(topePortada > 0 && topePortada <= 40, `la portada arranca en ${topePortada || "?"} px (no 100)`, entrada);

/* ============================================================
   6 · LA CAPA PRO MANDA DE VERDAD (no «creo que gana»)
   ------------------------------------------------------------
   Decir «mi selector es más específico» no es una prueba: si una
   capa anterior empatara, ganaría la ÚLTIMA hoja, y si alguien
   añadiera una regla más específica después, la nuestra dejaría de
   aplicarse sin que se enterase nadie. Aquí se resuelve la cascada
   a mano (especificidad + orden de carga) y se exige que, para las
   propiedades clave, gane pro.css.
   ============================================================ */
console.log("— la cascada la resuelve pro.css —");

/** Divide una lista de selectores por comas SIN partir dentro de :not(...). */
function partirSelectores(sel) {
  const out = [];
  let depth = 0, actual = "";
  for (const ch of sel) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(actual); actual = ""; continue; }
    actual += ch;
  }
  if (actual.trim()) out.push(actual);
  return out.map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
}

/** Reglas de una hoja: selector → mapa de propiedad→valor. */
function reglasDe(css) {
  // Se descartan los bloques @media: no añaden especificidad y aquí
  // solo necesitamos la declaración de la regla normal.
  const limpio = css.replace(/@media[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "");
  const out = [];
  for (const m of limpio.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith("@")) continue;
    const props = new Map();
    for (const d of m[2].split(";")) {
      const i = d.indexOf(":");
      if (i > 0) props.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
    }
    if (!props.size) continue;
    // una regla con «a, b, c» son TRES reglas para la cascada
    for (const uno of partirSelectores(sel)) out.push({ sel: uno, props });
  }
  return out;
}
const compFinal = (sel) => sel.trim().split(/[\s>+~]+/).pop();
function especificidad(sel) {
  const ids = (sel.match(/#[\w-]+/g) || []).length;
  const clases = (sel.match(/\.[\w-]+/g) || []).length;
  const pseudos = (sel.match(/:(?!:)[\w-]+/g) || []).length;
  const elementos = (sel.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
  return ids * 10000 + (clases + pseudos) * 100 + Math.min(99, elementos);
}
const hojasCargadas = hojas.map((nombre) => ({ nombre, reglas: reglasDe(leer(nombre)) }));

/** Qué declaración gana de verdad para un elemento y una propiedad. */
function ganaDe(elemento, propiedad) {
  let mejor = null;
  hojasCargadas.forEach((hoja, i) => {
    for (const r of hoja.reglas) {
      if (compFinal(r.sel) !== elemento || !r.props.has(propiedad)) continue;
      const sp = especificidad(r.sel);
      if (!mejor || sp > mejor.sp || (sp === mejor.sp && i > mejor.i)) mejor = { hoja: hoja.nombre, valor: r.props.get(propiedad), sp, i, sel: r.sel };
    }
  });
  return mejor;
}

const DEBE_GANAR_PRO = [
  [".btn", "min-height", "el botón"],
  [".btn", "height", "la altura del botón"],
  [".e-title", "font", "el titular de la portada"],
  ["h4", "font", "el título de las tarjetas"],
  ["#drawer-title", "font", "el título del panel"],
  [".rail-btn", "min-height", "los elementos del menú"],
  [".card", "border-radius", "el radio de las tarjetas"],
  [".pill", "border-radius", "el radio de las etiquetas"],
  ["#modal-box", "border-radius", "el modal"],
  [".dash-val", "font", "las cifras del tablero"],
  [".sec-label", "font", "las etiquetas de sección"],
  ["input:not([type=\"checkbox\"]):not([type=\"range\"])", "min-height", "los campos de texto"],
];
for (const [elemento, propiedad, que] of DEBE_GANAR_PRO) {
  const g = ganaDe(elemento, propiedad);
  assert(g && g.hoja === "css/pro.css",
    `${que}: gana ${g ? g.hoja + " (" + (g.valor || "").slice(0, 28) + ")" : "nadie"}`,
    g ? `gana ${g.hoja} con «${g.sel}»` : "no hay ninguna regla");
}

/* ============================================================
   7 · NO ROMPE LA CAPA ANTERIOR
   ============================================================ */
/* ============================================================
   8 · LA PUERTA ES UNA PANTALLA, NO UN CARTEL
   ============================================================ */
console.log("— la entrada: una acción y ya —");
const splash = (index.match(/<div id="entry"[\s\S]*?<\/div>\s*<!--/)?.[0]) || index;
assert(!/e-modes|class="e-mode"/.test(index), "la portada ya no ofrece el selector de luz");
assert(/id="entry-go"/.test(index), "la portada tiene su única acción: ENTRAR");
assert((splash.match(/<button/g) || []).length === 1, "la portada tiene UN botón, no una fila de opciones");
assert(/js\/ui\/appearance\.js/.test(leer("js/main.js")) === false,
  "main.js ya no arrastra el interruptor de la portada (vive en Apariencia y el HUD)");
const apariencia = leer("js/ui/appearance.js");
assert(/CINE . BLANCO|"cine"/.test(apariencia) && /noche/.test(apariencia),
  "el cambio de luz sigue disponible donde se decide: Apariencia");

/* ============================================================
   9 · NO ROMPE LA CAPA ANTERIOR
   ============================================================ */
const dash = leer("css/dashboard.css");
assert(/body\.fitness-app\.dash-pc #scene-wrap \{[\s\S]*?inset:\s*var\(--dash-top\)\s*var\(--dash-panel\)\s*0\s*var\(--dash-rail\)/.test(dash),
  "la rejilla del tablero sigue intacta (pro.css solo la pisa, no la rompe)");
assert(/--dash-top:\s*var\(--pro-top\)/.test(css) && /--dash-rail:\s*var\(--pro-rail\)/.test(css),
  "pro.css reutiliza las medidas del tablero en vez de duplicarlas");

/* ============================================================
   7 · LA IA ASIGNA RUTINAS
   ============================================================ */
console.log("— la IA propone la rutina y el usuario la confirma —");
assert("assign_routine" in COACH_TOOLS, "assign_routine está en la allowlist de herramientas");
assert(TOOL_NAMES.includes("assign_routine"), "assign_routine es ejecutable por el modelo");
const args = COACH_TOOLS.assign_routine.args;
const permitidos = args?.properties?.workoutId?.enum || [];
assert(permitidos.length > 0, `la herramienta declara el catálogo (${permitidos.length} sesiones)`);
assert(permitidos.every((id) => WORKOUTS[id]),
  "los ids de la herramienta son entrenamientos reales", permitidos.filter((id) => !WORKOUTS[id]).join(", "));
assert((args.required || []).includes("workoutId"), "no se puede asignar sin decir qué sesión");

const ui = leer("js/ui/core.js");
assert(/name === "assign_routine"/.test(ui), "la interfaz tiene la acción de la tarjeta");
assert(/S\.addAsignacion\(/.test(ui), "la tarjeta escribe la asignación de verdad en el estado");
assert(/validaAsignacion\(/.test(ui), "y la valida antes (nada de escribir basura en el plan)");

/* ============================================================
   8 · EL MOTOR LOCAL ALSO SUGIERE (sin nube)
   ============================================================ */
console.log("— también funciona sin conexión —");
const casos = [
  ["asigname fuerza superior", "op_upper"],
  ["asigna una rutina de pierna", "op_lower"],
  ["programa cuerpo entero", "op_full"],
  ["quiero hacer movilidad hoy", "mobility_flow"],
];
for (const [frase, esperado] of casos) {
  const a = intencionAsignacion(frase, WORKOUTS);
  assert(a && a.workoutId === esperado, `«${frase}» → ${esperado}`, a ? `salió ${a.workoutId}` : "no detectó intención");
}
assert(intencionAsignacion("asigname fuerza superior mañana", WORKOUTS).dia !== new Date().toISOString().slice(0, 10),
  "«mañana» se resuelve como mañana local (no UTC)");
assert(intencionAsignacion("¿por qué hoy toca pierna?", WORKOUTS) === null,
  "preguntar NO asigna: solo escribir «asigname» propone");
assert(intencionAsignacion("hola", WORKOUTS) === null, "un saludo no asigna nada");

/* ============================================================
   9 · EL ATLETA LO VE CON AUTOR, FECHA Y NOTA
   ============================================================ */
console.log("— el alumno ve lo que le han asignado —");
const hoy = leer("js/hoy.js");
assert(/asignada:\s*true/.test(hoy), "la asignación es un ítem propio del plan, no uno más");
assert(/origen:/.test(hoy) && /autor/.test(hoy), "viaja con autor y origen (nada de rutina anónima)");
const uiHoy = leer("js/ui/hoy.js");
assert(/asignacionCard/.test(uiHoy), "HOY la pinta como una orden de trabajo, no como un cartel");
assert(/RUTINA ASIGNADA/.test(uiHoy), "la tarjeta dice de dónde viene la rutina");
assert(/openTraining\?\.\(it\.workoutId\)/.test(uiHoy), "y abre la rutina que se asignó");

/* ============================================================
   10 · LA ASIGNACIÓN PASA LAS MISMAS REGLAS QUE SIEMPRE
   ============================================================ */
console.log("— una asignación es válida o no se escribe —");
const buena = validaAsignacion({ clienteId: "local", workoutId: "op_lower", dia: "2026-09-29", nota: "Énfasis en sentadilla" });
assert(buena.ok, "una asignación válida se acepta");
for (const mala of [
  { clienteId: "", workoutId: "op_lower", dia: "2026-09-29" },
  { clienteId: "local", workoutId: "no_existe", dia: "2026-09-29" },
  { clienteId: "local", workoutId: "op_lower", dia: "29/09/2026" },
  { clienteId: "local", workoutId: "op_lower", dia: "2026-09-29", nota: "x".repeat(201) },
]) {
  assert(!validaAsignacion(mala).ok, `se rechaza: ${JSON.stringify(mala).slice(0, 58)}`);
}

/* ============================================================
   11 · i18n: nada cae al fallback
   ============================================================ */
console.log("— los textos nuevos existen en el catálogo —");
for (const k of ["coach.toolAssignRoutine", "coach.assignToPlan", "coach.assigned", "coach.assignedNote"]) {
  assert(cat(k) !== k, `i18n: ${k} existe en el catálogo`);
}

/* ============================================================
   RESULTADO
   ============================================================ */
console.log(`\n  ${pass} ok · ${fail} fallos`);
if (fail) {
  console.log("\n  fallos:");
  fallos.forEach((f) => console.log("   ❌ " + f));
}
process.exit(fail ? 1 : 0);
