#!/usr/bin/env node
// ============================================================
// tests/paleta-eval.mjs · la app se maneja con el teclado
// ------------------------------------------------------------
// «Se ve profesional» no es comprobable. «⌘K abre una paleta, las
// flechas la recorren, Enter ejecuta, Esc devuelve el foco a donde
// estaba y el atajo suelto «?» no salta mientras escribes» SÍ.
//
// Y el motivo de que el núcleo esté en `js/comandos.js` y no en el
// módulo de interfaz: con la lógica en un fichero puro se prueban
// aquí, en Node, sin navegador. Un criterio de búsqueda escrito
// dentro del DOM no lo puede comprobar nadie.
// ============================================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- banco de pruebas: DOM mínimo para poder importar ---------- */
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  clear: () => almacen.clear(),
};
globalThis.sessionStorage = globalThis.localStorage;
globalThis.CustomEvent = class { constructor(tipo, init) { this.type = tipo; this.detail = init?.detail; } };
globalThis.Event = globalThis.CustomEvent;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;

const elemento = () => {
  const e = {
    tagName: "div", className: "", value: "", id: "", type: "", hidden: false, disabled: false,
    children: [], dataset: {}, style: {}, _texto: "", _html: "", _attrs: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : Boolean(f); on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    set innerHTML(v) { this._html = String(v); this.children = []; },
    get innerHTML() { return this._html; },
    set textContent(v) { this._texto = String(v); this.children = []; },
    get textContent() { return this._texto; },
    querySelector: () => null,
    querySelectorAll: () => [],
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; },
    addEventListener() {}, removeEventListener() {},
    focus() {}, blur() {}, click() {}, contains: () => false,
    closest: () => null, getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
  return e;
};
globalThis.document = {
  body: elemento(), documentElement: elemento(), head: elemento(),
  createElement: () => elemento(), createElementNS: () => elemento(),
  createTextNode: (txt) => ({ text: txt }), createDocumentFragment: () => elemento(),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
  createEvent: () => ({ initEvent() {} }),
  activeElement: null,
};
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  matchMedia: globalThis.matchMedia, innerWidth: 1280, innerHeight: 800,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  location: { href: "http://localhost/", origin: "http://localhost", pathname: "/" },
  localStorage: globalThis.localStorage, requestAnimationFrame: globalThis.requestAnimationFrame,
};
globalThis.self = globalThis.window;
try {
  // en Node moderno `navigator` es solo de lectura: se define si hace falta
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "node", vibrate() {}, mediaDevices: null },
    configurable: true, writable: true,
  });
} catch { /* el runtime no lo deja tocar: da igual, solo se lee */ }
globalThis.location = globalThis.window.location;
globalThis.performance = globalThis.performance || { now: () => 0 };

const { t: cat } = await import("../js/i18n.js");
const {
  normaliza, puntua, resultados, mueve, coincideAtajo, descomponeAtajo,
  esAtajoSuelto, simbolosAtajo, MAX_CONSULTA, MAX_RESULTADOS,
} = await import("../js/comandos.js");
const { G } = await import("../js/gym/store.js");
const paleta = await import("../js/ui/command.js");
const { trapFoco, focalizables } = await import("../js/ui/shared.js");

let pass = 0, fail = 0;
const fallos = [];
function assert(c, label) {
  if (c) { pass++; console.log("  ✅ " + label); }
  else { fail++; fallos.push(label); console.log("  ❌ " + label); }
}
console.log("\n⌨️  BAYONA · teclado, paleta de comandos y foco\n");

/* ============================================================
   1 · LA BÚSQUEDA ENTIENDE A LA PERSONA
   ------------------------------------------------------------
   Se escribe con prisa, en minúsculas y sin tildes. Si «cuotas»
   no encuentra «Cuotas», la paleta es un adorno.
   ============================================================ */
console.log("— la búsqueda —");
assert(normaliza("  CuÓtas  ") === "cuotas", "los espacios sobrantes y las mayúsculas no estorban");
assert(normaliza("  ") === "", "una consulta en blanco no es una consulta");
assert(normaliza(undefined) === "", "y tampoco lo es un undefined");
assert(normaliza("p" + "a".repeat(300)).length === MAX_CONSULTA, "una consulta de 300 caracteres se acota");
assert(normaliza("Marta Ñuñez") === "marta nunez", "las tildes no son un obstáculo: ñ también se ignora");

const SECCIONES = [
  { id: "ir:cuotas", titulo: "Cuotas", grupo: "Centro" },
  { id: "ir:cuentas", titulo: "Cuentas", grupo: "Centro" },
  { id: "ir:centro", titulo: "Centro", grupo: "Ir a" },
  { id: "ir:informe", titulo: "Informe", grupo: "Centro" },
  { id: "ir:entrenar", titulo: "Entrenar", grupo: "Ir a" },
  { id: "ir:hoy", titulo: "Hoy", grupo: "Ir a" },
  { id: "ir:registro", titulo: "Registro", grupo: "Ayuda", destacado: true },
];
assert(puntua(SECCIONES[0], "cuotas") > puntua(SECCIONES[1], "cuotas"), "«cuotas» gana a «cuentas» aunque las dos contengan las letras");
assert(puntua(SECCIONES[0], "CUOTAS") > 0, "sin tildes y en mayúsculas también encuentra");
assert(puntua(SECCIONES[0], "cuo") > puntua(SECCIONES[0], "otas"), "un prefijo vale más que aparecer en medio");
assert(puntua(SECCIONES[2], "centro") === 900, "el título exacto es el mejor resultado");
assert(puntua(SECCIONES[2], "ir:centro") === 1000, "y el identificador exacto, todavía más");
assert(puntua(SECCIONES[6], "ayuda") > 0, "buscar por el grupo también vale (buscar «ayuda» encuentra lo de ayuda)");
assert(puntua(SECCIONES[0], "zzz") === null, "lo que no aparece, no se inventa: null y fuera de la lista");
assert(puntua({ ...SECCIONES[0], destacado: true }, "") > 0, "sin consulta, un comando destacado sale");
assert(puntua({ ...SECCIONES[0], destacado: false }, "") === null, "y uno que no está destacado, no");
assert(puntua({ titulo: "sin id" }, "x") === null, "un comando sin id no es un comando");
assert(puntua(null, "x") === null, "ni un undefined revienta la búsqueda");
assert(puntua({ id: "a", titulo: "Cuotas de septiembre" }, "sept") > 0, "una palabra suelta encuentra («sept» → «septiembre»)");
assert(puntua({ id: "a", titulo: "Compañeros" }, "cmpn") > 0, "y la búsqueda difusa perdona lo que falta («cmpn» → «compañeros»)");

const encontrados = resultados(SECCIONES, "o");
assert(encontrados.length <= MAX_RESULTADOS, `nunca más de ${MAX_RESULTADOS} filas a la vez`);
assert(encontrados[0].puntos >= encontrados[encontrados.length - 1].puntos, "ordenados de mejor a peor");
const sueltos = resultados(SECCIONES, "");
assert(sueltos.length === 1 && sueltos[0].comando.id === "ir:registro", "sin escribir nada solo sale lo destacado");
const conDuplicados = resultados([...SECCIONES, SECCIONES[0]], "cuotas");
assert(conDuplicados.filter((r) => r.comando.id === "ir:cuotas").length === 1, "un comando repetido se ve una vez");
assert(resultados(SECCIONES, "cuotas", { limite: 0 }).length <= 1, "el límite 0 no se cuela como «todos»");
assert(resultados(null, "x").length === 0 && resultados(undefined, "x").length === 0, "una lista que no existe no rompe nada");
const empate = resultados([
  { id: "x", titulo: "Portal del socio" }, { id: "y", titulo: "Portal del socio" },
], "portal");
assert(empate[0].comando.id === "x", "en un empate gana el que estaba antes en el registro (nunca «al azar»)");

assert(mueve(0, 1, 3) === 1 && mueve(2, 1, 3) === 0, "el cursor da la vuelta por el final");
assert(mueve(0, -1, 3) === 2, "y por el principio");
assert(mueve(5, 1, 0) === 0, "sin filas, el cursor es 0 y no se rompe");
assert(mueve(NaN, 1, 3) === 1, "ni una posición corrupta lanza");

/* ============================================================
   2 · LOS ATAJOS SON EXACTOS
   ------------------------------------------------------------
   Un atajo que salta de más es peor que no tener atajo: se
   pierde lo que se estaba escribiendo.
   ============================================================ */
console.log("— los atajos —");
const ev = (o) => ({ key: "", code: "", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...o });
assert(coincideAtajo(ev({ key: "k", metaKey: true }), "mod+k"), "⌘K abre la paleta");
assert(coincideAtajo(ev({ key: "k", ctrlKey: true }), "mod+k"), "y Ctrl+K también («mod» es el que toque)");
assert(!coincideAtajo(ev({ key: "k" }), "mod+k"), "pero una «k» suelta NO abre la paleta");
assert(!coincideAtajo(ev({ key: "K", metaKey: true }), "mod+j"), "ni una tecla distinta con el mismo modificador");
assert(descomponeAtajo("alt+3").key === "3" && descomponeAtajo("alt+3").alt === true, "«alt+3» se descompone bien");
assert(coincideAtajo(ev({ key: "¡", code: "Digit3", altKey: true }), "alt+3"),
  "Alt+3 en Mac (que entrega «¡», no «3») también salta al raíl");
assert(!coincideAtajo(ev({ key: "3" }), "alt+3"), "el 3 sin Alt no salta");
assert(coincideAtajo(ev({ key: "?", shiftKey: true }), "?"), "«?» es un atajo suelto y funciona");
assert(esAtajoSuelto("?") && esAtajoSuelto("escape") && !esAtajoSuelto("mod+k"), "«suelto» = sin modificadores (esos son los que interrumpen al teclear)");
assert(descomponeAtajo("").key === "" && descomponeAtajo(undefined).key === "", "un atajo vacío no se descompone: no es un atajo");
assert(!coincideAtajo(ev({ key: "k", metaKey: true }), ""), "y nunca coincide con nada");
assert(!coincideAtajo(null, "mod+k"), "ni con un evento inexistente");
assert(simbolosAtajo("mod+k", "meta").join("") === "⌘K", "en Mac se escribe ⌘K");
assert(simbolosAtajo("mod+k", "ctrl").join("") === "CtrlK", "en el resto, Ctrl K");
assert(simbolosAtajo("escape").join("") === "Esc", "Escape se escribe «Esc», no «Escape»");
assert(simbolosAtajo("alt+2").join("") === "Alt2", "Alt+2 se escribe tal cual");
assert(simbolosAtajo("").length === 0, "sin atajo no hay símbolos que pintar");

/* ============================================================
   3 · EL REGISTRO: TODO DESTINO TIENE SU COMANDO
   ============================================================ */
console.log("— el registro —");
const comandos = paleta.comandos();
const porId = (id) => comandos.find((c) => c.id === id);
assert(comandos.length >= 16, `hay ${comandos.length} comandos registrados`);
assert(comandos.every((c) => c.id && typeof c.titulo === "string" && c.titulo.length > 0),
  "ninguno sin identificador o sin título");
assert(comandos.every((c) => typeof c.ejecutar === "function"), "y todos hacen algo (un comando sin acción es un cartel)");
assert(new Set(comandos.map((c) => c.id)).size === comandos.length, "no hay dos comandos con el mismo id");
for (const clave of ["hoy", "training", "progress", "wellbeing", "profile", "centro", "socios", "cuotas", "agenda", "acceso", "portal", "informes"]) {
  assert(Boolean(porId(`ir:${clave}`)), `«ir:${clave}» está en la paleta`);
}
for (const accion of ["accion:alta", "accion:acceso", "accion:clase", "ayuda:atajos"]) {
  assert(Boolean(porId(accion)), `${accion} está registrada`);
}
const railed = comandos.filter((c) => /^alt\+[1-6]$/.test(c.atajo || ""));
assert(railed.length === 6, "el raíl tiene seis atajos directos (Alt+1…6)");
assert(railed.every((c) => c.destacado), "y los seis están destacados: son lo que se ve al abrir la paleta");
assert(porId("ir:hoy").atajo === "alt+1" && porId("ir:centro").atajo === "alt+6", "en el MISMO orden que el raíl");
assert(porId("ayuda:atajos").atajo === "?", "la hoja de atajos tiene su propia tecla");
assert(resultados(comandos, "").length === 8 || resultados(comandos, "").length <= MAX_RESULTADOS,
  "al abrir sin escribir, lo que sale cabe en una pantalla");
assert(paleta.registra({ id: "", ejecutar() {} }) === false, "un comando sin id no se registra");
assert(paleta.registra({ id: "x" }) === false, "ni uno sin acción");
const antes = paleta.comandos().length;
paleta.registra({ id: "prueba:1", titulo: "Prueba", grupo: "Test", ejecutar() {} });
assert(paleta.comandos().length === antes + 1, "uno válido sí se registra");
paleta.registra({ id: "prueba:1", titulo: "Prueba", grupo: "Test", ejecutar() {} });
assert(paleta.comandos().length === antes + 1, "y registrar dos veces el mismo id lo sustituye, no lo duplica");
assert(paleta.comando("prueba:1") && paleta.comando("no-existe") === null, "se puede leer un comando por su id… y lo que no existe, da null");

/* ============================================================
   4 · LOS SOCIOS TAMBIÉN SE BUSCAN
   ============================================================ */
console.log("— los socios —");
almacen.set("bayona.centro.v1", JSON.stringify({
  socios: [
    { id: "s1", nombre: "Paola Moreno", telefono: "600111222" },
    { id: "s2", nombre: "Diego Ruiz" },
  ],
}));
G.init();
assert(G.estado.socios.length === 2, "el banco tiene dos socios");
const porNombre = paleta.comandosDeSocios("paola");
assert(porNombre.length === 1 && porNombre[0].id === "socio:s1", "buscar «paola» devuelve a Paola");
assert(porNombre[0].ejecutar instanceof Function, "y el resultado trae la acción de abrir su ficha");
assert(paleta.comandosDeSocios("600111222").length === 1, "también se busca por teléfono");
assert(paleta.comandosDeSocios("moreno")[0]?.id === "socio:s1", "y por el apellido");
assert(paleta.comandosDeSocios("").length === 0, "sin escribir no se busca a nadie");
assert(paleta.comandosDeSocios("no-existe").length === 0, "y un nombre que no está no inventa socios");
const conSocios = resultados(paleta.comandos().concat(paleta.comandosDeSocios("paola")), "paola");
assert(conSocios.some((r) => r.comando.id === "socio:s1"), "el socio aparece junto a los comandos de la app");
assert(new Set(conSocios.map((r) => r.comando.id)).size === conSocios.length, "sin repetir el mismo id en la lista mixta");

/* ============================================================
   5 · LO QUE SE PINTA: una fila bien construida
   ------------------------------------------------------------
   Se comprueba el DOM que sale, no una captura: cada fila es una
   opción, solo una está marcada, y la marcada se distingue con un
   filete (no solo con el color).
   ============================================================ */
console.log("— las filas —");
const lista = elemento();
const filas = paleta.filasDe(resultados(comandos, "centro"), 1);
assert(filas.length >= 2, `la consulta «centro» devuelve ${filas.length} fila(s)`);
assert(filas[1].seleccionada === true && filas[0].seleccionada === false, "la fila activa es la que se pasa por parámetro");
assert(filas.every((f) => Array.isArray(f.atajo)), "cada fila sabe qué atajo pintar (o ninguno)");
assert(filas[0].atajo.length === 0 || filas[0].atajo.every((s) => typeof s === "string"), "los símbolos son texto, no objetos");

const pintadas = paleta.pintaLista(lista, filas, 1);
assert(pintadas === filas.length, `se pintan las ${filas.length} filas`);
assert(lista.children.length === filas.length, "y el contenedor tiene exactamente esas");
const primera = lista.children[0];
assert(primera.getAttribute("role") === "option", "cada fila es una opción de una lista de opciones (role=option)");
assert(primera.getAttribute("aria-selected") === "false", "la que no está activa se declara NO seleccionada");
assert(lista.children[1].getAttribute("aria-selected") === "true", "la activa se declara seleccionada");
assert(/activa/.test(lista.children[1].className) && !/activa/.test(primera.className), "y además se marca con su clase");
assert(lista.children[0].id === "cmd-op-0" && lista.children[1].id === "cmd-op-1", "cada fila tiene id estable: es lo que lee aria-activedescendant");
assert(primera.children.some((c) => /cmd-fila-t/.test(c.className)), "el título va en su propio hueco");
assert(primera.children.some((c) => /cmd-atajo/.test(c.className)) === (filas[0].atajo.length > 0),
  "el atajo se pinta solo si esa fila lo tiene");

const vacia = elemento();
assert(paleta.pintaLista(vacia, [], 0) === 0, "sin resultados se pintan cero filas");
assert(vacia.children.length === 1 && vacia.children[0].className === "cmd-vacio", "y sale el estado vacío, no un hueco en blanco");
assert(paleta.pintaLista(null, filas, 0) === 0, "un contenedor que no existe no rompe el pintado");

/* ============================================================
   6 · EL FOCO NO SE ESCAPA
   ============================================================ */
console.log("— el foco —");
const caja = elemento();
const b1 = elemento(), b2 = elemento();
caja.querySelectorAll = () => [b1, b2];
assert(focalizables(caja).length === 2, "se enumerated lo que se puede tabular");
assert(focalizables(null).length === 0, "y un contenedor inexistente no da nada");
let enfocada = null;
b2.focus = () => { enfocada = "ultimo"; };
let prevenido = false;
trapFoco(caja, { shiftKey: true, preventDefault: () => { prevenido = true; } });
assert(enfocada === "ultimo" && prevenido, "Shift+Tab desde el primer control salta al último (no se sale de la caja)");
enfocada = null; prevenido = false;
b1.focus = () => { enfocada = "primero"; };
trapFoco(caja, { shiftKey: false, preventDefault: () => { prevenido = true; } });
assert(enfocada === "primero" && prevenido, "y Tab desde el último vuelve al primero");

/* ============================================================
   7 · ESTÁ CONECTADO DE VERDAD
   ============================================================ */
console.log("— cableado —");
const leer = (p) => readFileSync(join(root, p), "utf8");
const index = leer("index.html");
const ui = leer("js/ui.js");
const sw = leer("sw.js");
const pro = leer("css/pro.css");
const fuente = leer("js/ui/command.js");
assert(/<button id="cmd-chip"[^>]*><\/button>/.test(index), "el botón de la paleta está en la barra superior y VACÍO (lo pinta la capa)");
assert(!/>[^<>]*\S[^<>]*<\//.test(index.match(/<button id="cmd-chip"[\s\S]*?<\/button>/)[0].replace(/<button[^>]*>|<\/button>/g, "")),
  "y no lleva texto escrito a mano: el atajo correcto lo pone la capa según el sistema");
assert(/from "\.\/ui\/command\.js"/.test(ui) && /installPaleta\(\)/.test(ui), "la app instala la paleta al arrancar");
assert(sw.includes("./js/comandos.js") && sw.includes("./js/ui/command.js"), "el service worker precachea los dos (funciona sin red)");
assert(sw.includes("bayona-shell-v20"), "y la versión del precache ha subido (si no, el shell viejo gana)");
const hojas = [...index.matchAll(/<link[^>]+href="(css\/[^"]+)"/g)].map((m) => m[1].split("?")[0]);
assert(hojas[hojas.length - 1] === "css/pro.css", "pro.css sigue siendo la última hoja");
for (const sel of [".cmd-chip", "#cmd-layer", "#cmd-box", ".cmd-fila", ".cmd-fila-g", ".cmd-pie", "kbd", ".cmd-vacio", ".cmd-atajos"]) {
  assert(pro.includes(sel), `pro.css da estilo a ${sel}`);
}
const bloqueFila = pro.slice(pro.indexOf("body.fitness-app .cmd-fila {"), pro.indexOf("body.fitness-app .cmd-fila-t"));
const alto = Number((bloqueFila.match(/min-height:\s*(\d+)px/) || [])[1]);
assert(alto > 0 && alto <= 36, `la fila mide ${alto || "?"} px (pro: densa, no un ladrillo)`);
assert(/border-left-color:\s*var\(--fit-ink\)/.test(bloqueFila), "la fila activa se marca con un filete, no solo con el color");
assert(/background:\s*var\(--fit-bg\)/.test(bloqueFila), "y con un fondo: se distingue sin depender del color");
const bloqueCaja = pro.slice(pro.indexOf("body.fitness-app #cmd-box {"));
assert(!/linear-gradient/.test(bloqueCaja) && !/backdrop-filter/.test(bloqueCaja), "la paleta es plana: ni degradado ni cristal");
assert((bloqueCaja.match(/box-shadow:[^;]*!important/) || []).length === 1, "con una única sombra, la de una capa que flota (igual que el modal)");
assert(/coincideAtajo\(e, "mod\+k"\)/.test(fuente), "⌘K abre la paleta desde cualquier sitio");
assert(/enCampo\(e\.target\)/.test(fuente), "y un atajo suelto no salta mientras se escribe en un campo");
assert(/modalAbierto\(\)/.test(fuente), "encima de un modal abierto no se apila otra capa");
assert(/devuelto\.focus\(\)/.test(fuente), "al cerrar, el foco vuelve al control que la abrió");
assert(/aria-activedescendant/.test(fuente), "el input dice qué fila está activa (lectores de pantalla)");
assert(/role", "combobox"/.test(fuente) && /aria-expanded/.test(fuente), "la paleta es un combobox, no un campo suelto");
assert(/aria-activedescendant/.test(fuente) && /id = `cmd-op-\$\{i\}`|id = "cmd-op-/.test(fuente), "las filas tienen el id al que apunta ese atributo");
assert(/hojaAtajos[\s\S]*comandos\(\)\.filter\(\(c\) => c\.atajo\)/.test(fuente), "la hoja de atajos se genera del registro, no se escribe a mano");
assert(/simbolosAtajo\("mod\+k", MOD\)/.test(fuente), "y en la hoja sale también la propia paleta");
assert(/if \(abierta\(\)\) \{[\s\S]{0,140}Escape/.test(fuente), "Escape cierra la paleta esté el foco donde esté");
assert(/role", "dialog"/.test(fuente) && /aria-modal/.test(fuente), "la capa se anuncia como diálogo modal");
assert(/aria-keyshortcuts/.test(fuente), "el botón de la barra dice qué tecla lo abre (lectores de pantalla)");
assert(/getElementById\("modal-layer"\)/.test(fuente), "la capa mira el modal para no apilarse encima");
assert(!/alert\(|confirm\(|prompt\(/.test(fuente), "la paleta no interrumpe con cuadros del navegador");
assert(!/innerHTML\s*=/.test(fuente.replace(/[\s\S]*hojaAtajos[\s\S]*?hideModal;/, "")),
  "las filas se pintan con nodos y texto: el nombre de un socio nunca se interpreta como HTML");

/* ============================================================
   8 · i18n: ninguna palabra de la paleta vive fuera del catálogo
   ============================================================ */
console.log("— los textos —");
const claves = [...fuente.matchAll(/\bt\(\s*"(cmd\.[a-zA-Z.]+)"/g)].map((m) => m[1]);
assert(claves.length >= 18, `la capa usa ${claves.length} claves del catálogo`);
const huerfanas = [...new Set(claves)].filter((k) => cat(k) === k);
assert(huerfanas.length === 0, "ninguna clave cmd.* cae al fallback (se vería «cmd.vacio» en pantalla)", huerfanas.join(", "));
assert(!/\btitulo:\s*"/.test(fuente), "los títulos vienen del catálogo o de la pantalla, no escritos en el código");

/* ============================================================
   RESULTADO
   ============================================================ */
console.log(`\n  ${pass} ok · ${fail} fallos`);
if (fail) {
  console.log("\n  fallos:");
  fallos.forEach((f) => console.log("   ❌ " + f));
}
process.exit(fail ? 1 : 0);
