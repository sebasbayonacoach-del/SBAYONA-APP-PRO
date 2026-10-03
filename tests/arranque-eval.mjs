#!/usr/bin/env node
// ============================================================
// tests/arranque-eval.mjs · la app ARRANCA
// ------------------------------------------------------------
// No hay navegador en el entorno de CI, así que esta prueba hace
// lo que el navegador hace al abrir la app y nadie ha mirado: enlazar
// el grafo de módulos. Si un `import` apunta a un fichero que no
// existe, si un módulo exporta algo que ya no está, o si al importar
// algo se toca el DOM antes de tiempo, el error salta AQUÍ y no en
// la pantalla en blanco del usuario.
//
// Qué NO comprueba (y hay que decirlo): que se PINTE bien. Eso solo
// lo puede juzgar un navegador de verdad.
// ============================================================
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (p) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const fallos = [];
function assert(c, label, detalle) {
  if (c) { pass++; return true; }
  fail++; fallos.push(label);
  console.log("  ❌ " + label + (detalle ? `\n       → ${detalle}` : ""));
  return false;
}
console.log("\n🚀 BAYONA · ARRANQUE (enlace de módulos sin navegador)\n");

/* ============================================================
   1 · INDEX.HTML NO APUNTA A NADA ROTO
   ============================================================ */
console.log("— index.html —");
const html = leer("index.html");
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((r) => !/^(https?:|\/\/|data:|#|mailto:|tel:)/.test(r));
const rotos = refs.filter((r) => !existsSync(join(root, r.split(/[?#]/)[0])));
assert(rotos.length === 0, `los ${refs.length} recursos locales de index.html existen`, rotos.join(", "));

const modulos = refs
  .filter((r) => r.split(/[?#]/)[0].endsWith(".js"))
  .map((r) => r.split(/[?#]/)[0]);
assert(modulos.includes("js/main.js"), "index.html carga el arranque (js/main.js)");
assert(modulos.length > 0, `index.html carga ${modulos.length} módulo(s)`);

/* ============================================================
   2 · TODO IMPORT EXISTE Y APUNTA A ALGO REAL
   ============================================================ */
console.log("— el grafo de imports —");
function listJs(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    if (f === "node_modules" || f === "vendor" || f.startsWith(".")) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) listJs(p, acc);
    else if (f.endsWith(".js")) acc.push(p);
  }
  return acc;
}
const todosJs = listJs(join(root, "js"));
const imports = new Map();          // fichero → destinos
const sueltos = [];
for (const abs of todosJs) {
  const rel = relative(root, abs);
  const src = readFileSync(abs, "utf8");
  const destinos = new Set();
  for (const m of src.matchAll(/(?:^|\s)(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]/g)) {
    if (m[1].startsWith(".")) destinos.add(m[1]);
  }
  for (const m of src.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) destinos.add(m[1]);
  imports.set(rel, [...destinos]);
  for (const d of destinos) {
    const dest = resolve(dirname(abs), d);
    // `vendor/` es una copia local de librerías de terceros que se
    // cargan perezosamente y con CDN de reserva: que falten no rompe
    // nada. Fuera de ahí, un import a un fichero inexistente es un 404
    // garantizado en producción.
    if (existsSync(dest) || dest.includes(`${sep}vendor${sep}`)) continue;
    sueltos.push(`${rel} → ${d}`);
  }
}
assert(sueltos.length === 0, `los ${[...imports.values()].flat().length} imports relativos de ${todosJs.length} ficheros existen`, sueltos.join(", "));

// el importmap: lo que el navegador resuelve por su cuenta
const mapa = JSON.parse((html.match(/<script type="importmap">([\s\S]*?)<\/script>/) || [, "{}"])[1].replace(/^\s*\{/, "{").replace(/\}\s*$/, "}").trim() || "{}");
const alias = Object.keys(mapa?.imports || {});
const aliasRotos = alias.filter((a) => !existsSync(join(root, mapa.imports[a].replace(/^\.\//, ""))));
assert(aliasRotos.length === 0, `los ${alias.length} alias del importmap de index.html existen (${alias.join(", ") || "ninguno"})`, aliasRotos.join(", "));

/* ============================================================
   3 · EL PRECACHE DEL SERVICE WORKER EXISTE ENTERO
   ------------------------------------------------------------
   Esto ya ha roto de verdad: tres rutas del precache no existían y
   `cache.addAll()` es todo o nada, así que la instalación fallaba y
   la app se quedaba SIN OFFLINE sin avisar. Aquí se vigila.
   ============================================================ */
console.log("— precache del service worker —");
const sw = leer("sw.js");
const shell = [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ""])[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert(shell.length > 0, `el service worker precachea ${shell.length} recursos`);
const shellRotos = shell.filter((r) => !existsSync(join(root, r.replace(/^\.\//, ""))));
assert(shellRotos.length === 0, "y TODOS existen: uno que falte tumba el precache entero", shellRotos.join(", "));
// y el SW no puede volver a caer en el fallo de «todo o nada»
const swSinComentarios = sw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
assert(!/\.addAll\(/.test(swSinComentarios), "el SW cachea de uno en uno: un 404 suelto ya no puede dejarnos sin offline");

/* ============================================================
   4 · EL DOM MÍNIMO
   ------------------------------------------------------------
   No se simula la app: solo lo justo para que importar un módulo
   no reviente por tocar `document` antes de tiempo. Si un módulo
   necesita más que esto, es que hace trabajo en tiempo de carga, y
   eso también es un problema.
   ============================================================ */
const elemento = () => {
  const e = {
    tagName: "div", className: "", value: "", type: "", hidden: false, disabled: false,
    children: [], dataset: {}, style: {}, _html: "", _texto: "",
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : Boolean(f); on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    prepend(c) { this.children.unshift(c); },
    insertBefore(c) { this.children.unshift(c); return c; },
    replaceChildren() { this.children = []; },
    remove() {}, focus() {}, blur() {}, click() {}, closest() { return null; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    set innerHTML(v) { this._html = String(v); }, get innerHTML() { return this._html; },
    set textContent(v) { this._texto = String(v); }, get textContent() { return this._texto; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  return e;
};
const body = elemento();
globalThis.document = {
  body, documentElement: elemento(), head: elemento(),
  createElement: () => elemento(),
  createElementNS: () => elemento(),
  createTextNode: (t) => ({ text: t }),
  createDocumentFragment: () => elemento(),
  getElementById: () => elemento(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  createEvent: () => ({ initEvent() {} }),
};
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  location: { href: "http://localhost/", origin: "http://localhost", pathname: "/" },
  localStorage: null, requestAnimationFrame: (fn) => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout,
};
globalThis.self = globalThis.window;
globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, String(v)); },
  removeItem(k) { this._m.delete(k); },
  clear() { this._m.clear(); },
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.MutationObserver = class { observe() {} disconnect() {} takeRecords() { return []; } };
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
globalThis.Event = globalThis.CustomEvent;
globalThis.fetch = async () => { throw new Error("sin red en la prueba de arranque"); };
globalThis.XMLHttpRequest = class { open() {} send() {} setRequestHeader() {} abort() {} };
globalThis.Worker = class { constructor() {} postMessage() {} terminate() {} addEventListener() {} };
globalThis.WebGLRenderingContext = class {};
globalThis.matchMedia = globalThis.window.matchMedia;
globalThis.location = globalThis.window.location;
globalThis.performance = globalThis.performance || { now: () => 0 };
if (!globalThis.navigator) {
  try { globalThis.navigator = { vibrate() {}, mediaDevices: null, userAgent: "node", serviceWorker: null }; }
  catch { /* el runtime no deja tocarlo: da igual, no lo usa el arranque */ }
}

/* ============================================================
   5 · SE IMPORTA EL GRAFO ENTERO
   ------------------------------------------------------------
   Los módulos que el navegador carga al abrir, y todo lo que
   arrastran. Solo se reprocha lo que es un error de ENLACE: una
   ruta rota o un export que ya no existe. Tocar el DOM o pedir red
   al importar es otra cosa — el navegador sí tiene las dos — y aquí
   no, así que se permite y no se disimula.
   ============================================================ */
console.log("— enlazando módulos —");
const esErrorDeEnlace = (e) => {
  const msg = String(e?.message || "");
  // `three` lo resuelve el importmap del navegador; Node no lo tiene.
  const esAlias = /Cannot find package/.test(msg) && alias.some((a) => msg.includes(`'${a}'`));
  if (esAlias) return false;
  return /Cannot find (module|package)|Failed to resolve|does not provide an export|Unexpected token/.test(msg);
};
const errores = [];
const tolerados = [];
for (const m of modulos) {
  const url = pathToFileURL(join(root, m)).href;
  try {
    await import(url);
  } catch (e) {
    (esErrorDeEnlace(e) ? errores : tolerados).push(`${m}: ${String(e.message).split("\n")[0]}`);
  }
}
assert(errores.length === 0,
  `los ${modulos.length} módulos de index.html enlazan sin ruta rota ni export perdido`,
  errores.slice(0, 4).join(" | "));
if (tolerados.length) {
  console.log(`  ℹ️  ${tolerados.length} módulo(s) piden DOM o red al importar (el navegador sí los tiene):`);
  tolerados.slice(0, 3).forEach((x) => console.log("     · " + x.slice(0, 100)));
}

// y los del centro, que cuelgan de ui.js
for (const extra of ["./js/gym/store.js", "./js/gym/acceso.js", "./js/gym/informes.js", "./js/gym/pagos.js"]) {
  let msg = "";
  try { await import(pathToFileURL(join(root, extra)).href); } catch (e) { msg = String(e.message).split("\n")[0]; }
  assert(!msg, `${extra} carga`, msg);
}

/* ============================================================
   6 · CADA SECCIÓN DECLARADA TIENE PANTALLA
   ------------------------------------------------------------
   Una sección sin `BUILDERS` no es una sección rota: es la anterior
   por defecto, que enseña otra cosa sin avisar. Eso se comprueba.
   ============================================================ */
console.log("— secciones —");
await import(pathToFileURL(join(root, "js/ui.js")).href).catch(() => { /* el DOM ya no basta para world.js: se importa lo de abajo */ });
for (const m of readdirSync(join(root, "js/ui"))) {
  if (!m.endsWith(".js")) continue;
  await import(pathToFileURL(join(root, "js/ui", m)).href).catch((e) => {
    if (esErrorDeEnlace(e)) errores.push(`js/ui/${m}: ${String(e.message).split("\n")[0]}`);
  });
}
const { BUILDERS, TITLES, PLACES } = await import(pathToFileURL(join(root, "js/ui/shared.js")).href);
assert(!errores.length, "ningún módulo de la interfaz tiene una ruta rota", errores.slice(0, 3).join(" | "));
// `installFitnessUI` registra sus pantallas al instalarse, como en el navegador
try {
  const { installFitnessUI } = await import(pathToFileURL(join(root, "js/ui/fitness.js")).href);
  installFitnessUI();
} catch { /* si el DOM mínimo no da, se ve abajo */ }
const GRUPOS = ["wellbeing", "daily", "rhythm", "profile"];
const secciones = Object.keys(TITLES).filter((k) => k !== "more");
const sinPantalla = secciones.filter((k) => typeof BUILDERS[k] !== "function");
assert(sinPantalla.length === 0, `las ${secciones.length} secciones con título tienen pantalla`, sinPantalla.join(", "));
const sinLugar = secciones.filter((k) => !PLACES[k] && !GRUPOS.includes(k));
assert(sinLugar.length === 0, "y todas tienen un sitio donde el personaje puede estar", sinLugar.join(", "));
for (const k of ["centro", "socios", "cuotas", "agenda", "acceso", "portal", "informes"]) {
  assert(typeof BUILDERS[k] === "function" && Boolean(PLACES[k]) && Boolean(TITLES[k]), `«${k}» del centro está completa`);
}

/* ============================================================
   RESULTADO
   ============================================================ */
console.log(`\n  ${pass} ok · ${fail} fallos`);
if (fail) {
  console.log("\n  primeros fallos:");
  fallos.slice(0, 10).forEach((f) => console.log("   ❌ " + f));
  process.exit(1);
}
console.log("\n  (esto NO sustituye a mirar la app en un navegador)");
// Las importaciones exploratorias pueden dejar temporizadores activos.
// Tras emitir el resultado, el proceso de prueba debe terminar explícitamente.
process.exit(0);
