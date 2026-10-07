// ============================================================
// dashboard-receta-eval.mjs — el tablero y las fotos de receta
// (node tests/dashboard-receta-eval.mjs)
//
// Qué fija este archivo:
//   · el punto de corte del tablero es el MISMO en JS y en CSS. Si
//     divergen, en móvil aparece un HUD sin sitio o un personaje sin
//     resumen — y no se ve hasta que ya es tarde;
//   · el mundo 3D se dimensiona por su CONTENEDOR, no por la ventana;
//   · el proxy de imágenes construye el prompt desde el catálogo, y
//     el cliente no puede inyectar el suyo;
//   · sin clave, sin red o con error, la cocina sigue funcionando;
//   · la caché del dispositivo respeta su tope y no se duplica.
//
// Es una app que depende de una clave opcional: el fallo que importa
// no es que la IA falle, es que la app se quede coja sin ella.
// ============================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { RECETAS } from "../js/nutricion.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (p) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const assert = (c, name, extra = "") => {
  if (c) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log("\n🖥️ DASHBOARD + FOTOS DE RECETA\n");

/* ---------- utilidades de CSS: no vamos a jugar a los regex ---------- */

/** Devuelve el cuerpo de la regla que empieza por `selector`, o "". */
function bloque(css, selector) {
  const i = css.indexOf(selector);
  if (i < 0) return "";
  const ini = css.indexOf("{", i);
  if (ini < 0) return "";
  const fin = css.indexOf("}", ini);
  return fin < 0 ? "" : css.slice(ini + 1, fin);
}

/** Devuelve el cuerpo del @media whose max-width is exactly `px`. */
function mediaMax(css, px) {
  const marca = `@media (max-width: ${px}px)`;
  const i = css.indexOf(marca);
  if (i < 0) return "";
  const fin = css.indexOf("\n}", i);
  return fin < 0 ? css.slice(i) : css.slice(i, fin);
}

/** Todos los anchos max-width declarados en la hoja. */
function cortesMax(css) {
  return [...css.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)].map((m) => Number(m[1]));
}

/* ============================================================
   1 · EL TABLERO: JS Y CSS TIENEN QUE COINCIDIR
   ============================================================ */
console.log("— el tablero solo aparece donde cabe —");
{
  const js = leer("js/ui/dashboard.js");
  const css = leer("css/dashboard.css");

  const bpJs = Number((js.match(/const BREAKPOINT = (\d+)/) || [])[1]);
  assert(Number.isInteger(bpJs) && bpJs > 0, `el JS declara su punto de corte (${bpJs}px)`);

  // el CSS debe apagarse en el MISMO número
  const cortes = cortesMax(css);
  assert(cortes.includes(bpJs),
    `el CSS corta en el mismo ancho (CSS ${cortes.join("/")} · JS ${bpJs})`,
    `faltaría ${bpJs}px en la hoja`);

  // por debajo del corte el HUD desaparece de verdad
  const bajo = mediaMax(css, bpJs);
  assert(/#dash-hud\s*\{[^}]*display:\s*none\s*!important/.test(bajo),
    "por debajo del corte el HUD se oculta con !important");

  // el HUD no puede capturar clics sobre el mundo
  assert(/pointer-events:\s*none/.test(bloque(css, "#dash-hud {")),
    "el contenedor del HUD no intercepta el ratón");
  assert(/pointer-events:\s*auto/.test(bloque(css, ".dash-card {")),
    "las tarjetas sí son clicables");

  // el personaje vive en SU columna, no debajo del panel
  const escena = bloque(css, "body.fitness-app.dash-pc #scene-wrap {");
  assert(/inset:\s*var\(--dash-top\)\s*var\(--dash-panel\)\s*0\s*var\(--dash-rail\)/.test(escena),
    "la escena 3D se inserta entre el raíl y la columna de contenido", JSON.stringify(escena.slice(0, 120)));
  assert(/display:\s*block\s*!important/.test(escena),
    "la escena se ENCIENDE en el tablero (en el shell de escritorio estaba oculta)");
  const panel = bloque(css, "body.fitness-app.dash-pc #drawer,\nbody.fitness-app.dash-pc #drawer.open,");
  assert(/width:\s*var\(--dash-panel\)/.test(panel),
    "la columna de contenido toma el ancho de panel", JSON.stringify(panel.slice(0, 120)));

  // el estado se decide por el mismo criterio
  assert(/window\.matchMedia\(`\(min-width: \$\{BREAKPOINT\}px\)`\)/.test(js),
    "la decisión en JS usa matchMedia, no innerWidth a pelo");
}

/* ============================================================
   2 · EL MUNDO SE MIDE POR SU CAJA
   ============================================================ */
console.log("\n— el mundo 3D se dimensiona por su contenedor —");
{
  const world = leer("js/world.js");
  const resize = world.slice(world.indexOf("resize() {"), world.indexOf("raycastNDC"));

  assert(/getBoundingClientRect/.test(resize),
    "resize() mide la caja del canvas, no la ventana");
  assert(!/const w = innerWidth, h = innerHeight;/.test(resize),
    "ya no usa innerWidth/innerHeight a pelo");
  assert(/innerWidth/.test(resize),
    "si el canvas está oculto (caja 0×0), cae a la ventana en vez de romperse");
  assert(/setSize\(w, h, true\)/.test(resize),
    "el renderer escribe también el tamaño CSS, que si no se queda obsoleto");
  assert(/Math\.round\(box\?\.width\) > 0/.test(resize) && /Math\.round\(box\?\.height\) > 0/.test(resize),
    "una caja de 0×0 no se cuela como tamaño válido");
  assert(/ResizeObserver/.test(world),
    "un ResizeObserver cubre los cambios de tamaño que no son de la ventana");

  // y el bucle dibuja cuando el tablero está encendido
  const main = leer("js/main.js");
  assert(/avatar-view.*dashboardActivo|avatar-view"\) \|\| dashboardActivo/.test(main),
    "el bucle de render se activa también con el tablero");
  assert(/installDashboard\(\)/.test(main), "el tablero se instala desde el arranque");
}

/* ============================================================
   3 · LAS FOTOS: EL PROMPT LO MANDA EL SERVIDOR
   ============================================================ */
console.log("\n— el proxy de imágenes no es un generador abierto —");
{
  const { default: handler, promptDeReceta } = await import("../api/image.js");

  const r = RECETAS[0];
  const p = promptDeReceta(r);
  assert(p.toLowerCase().includes(r.nombre.toLowerCase()), "el prompt sale del nombre real de la receta");
  assert(r.ingredientes.some((i) => p.includes(i)), "el prompt incluye los ingredientes de esa receta");
  assert(p.length < 900, `el prompt es corto (${p.length} caracteres)`);
  assert(!/prompt/i.test(p.replace(/^Photografía[^.]*\./, "")), "el prompt no es texto del cliente");

  // receta desconocida → 404, no se inventa nada
  const res = mkRes();
  await handler({ method: "GET", headers: {}, socket: {}, url: "/api/meal-image?id=r_no_existe" }, res);
  assert(res.statusCode === 404, "una receta que no existe da 404");
  assert(!res.body.includes("prompt"), "el 404 no filtra el prompt");

  // el catálogo es la única fuente: un id del cliente solo puede elegir
  // entre recetas que YA existen en el repo
  const fuente = leer("api/image.js");
  assert(/RECETAS\.map/.test(fuente) && /porId/.test(fuente),
    "el prompt se resuelve contra el catálogo importado, no contra un parámetro");
  assert(!/searchParams\.get\(\s*["']prompt/.test(fuente),
    "el endpoint NO acepta un prompt libre por query");

  // método incorrecto
  const res2 = mkRes();
  await handler({ method: "POST", headers: {}, socket: {}, url: "/api/meal-image?id=r_bowl_pollo" }, res2);
  assert(res2.statusCode === 405, "solo se acepta GET");

  // salud sin clave
  const res3 = mkRes();
  await handler({ method: "GET", headers: {}, socket: {}, url: "/api/meal-image/health" }, res3);
  assert(res3.statusCode === 200 && JSON.parse(res3.body).ok === false,
    "sin clave, la salud lo dice en vez de fingir");

  // sin clave, una receta válida responde con señal de repliegue
  const res4 = mkRes();
  await handler({ method: "GET", headers: {}, socket: {}, url: `/api/meal-image?id=${r.id}` }, res4);
  const j4 = JSON.parse(res4.body);
  assert(res4.statusCode === 503 && j4.fallback === "ilustración",
    "sin clave, la app recibe una señal clara para usar la ilustración", JSON.stringify(j4));
}

/* ============================================================
   4 · LA CACHÉ DEL DISPOSITIVO
   ============================================================ */
console.log("\n— la caché no se come el almacenamiento —");
{
  // localStorage mínimo, como el que usan el resto de tests del repo
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  // navigator es de solo lectura en Node: se redefine la propiedad
  const red = (onLine) => Object.defineProperty(globalThis, "navigator", {
    value: { onLine }, configurable: true, writable: true,
  });
  red(true);

  const { pedirImagen, imagenEnCache, ilustracion, totalEnCache, limpiarCache } =
    await import("../js/recipeImage.js");
  limpiarCache();

  // la ilustración es estable: mismo id, mismo color
  const r = RECETAS[1];
  assert(ilustracion(r) === ilustracion(r), "la ilustración de repuesto es determinista");
  assert(ilustracion(RECETAS[0]) !== ilustracion(RECETAS[1]), "cada receta tiene la suya");

  // sin red, se devuelve null pero NO se lanza: la cocina sigue
  red(false);
  const sinRed = await pedirImagen(r);
  assert(sinRed === null, "sin red, pedir imagen devuelve null en vez de romper");
  red(true);

  // con el servicio caído, también null y sin excepción
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("sin red"); };
  const caido = await pedirImagen(r);
  assert(caido === null, "si el servicio cae, se devuelve null y la tarjeta sigue viva");
  globalThis.fetch = realFetch;

  // dos peticiones simultáneas de la MISMA receta → una sola llamada
  let llamadas = 0;
  globalThis.fetch = async () => {
    llamadas++;
    await new Promise((r2) => setTimeout(r2, 10));
    return { ok: true, json: async () => ({ ok: true, image: "data:image/png;base64,AAAA" }) };
  };
  // sin canvas en node, aMiniatura devuelve la src tal cual
  const [a, b] = await Promise.all([pedirImagen(r), pedirImagen(r)]);
  globalThis.fetch = realFetch;
  assert(llamadas === 1, `dos tarjetas a la vez → una sola petición (${llamadas})`);
  assert(a === b && a !== null, "las dos reciben la misma imagen");

  // y la segunda vez ya no se pide
  assert(imagenEnCache(r.id) !== null, "la imagen queda en caché");
  const antes = totalEnCache();
  globalThis.fetch = async () => { throw new Error("no debería llamarse"); };
  assert((await pedirImagen(r)) !== null, "repetir receta no vuelve a pedirla");
  globalThis.fetch = realFetch;
  assert(totalEnCache() === antes, "no se duplica la entrada");

  // REGRESIÓN: un intento sin red no puede dejar la receta envenenada
  // para el resto de la sesión. Antes el marcador guardaba la promesa
  // nula para siempre y esa receta ya no volvía a pedir su foto.
  limpiarCache();
  red(false);
  assert((await pedirImagen(r)) === null, "sin red: null");
  red(true);
  let tras = 0;
  globalThis.fetch = async () => {
    tras++;
    return { ok: true, json: async () => ({ ok: true, image: "data:image/png;base64,BBBB" }) };
  };
  const recuperada = await pedirImagen(r);
  globalThis.fetch = realFetch;
  assert(tras === 1, `al volver la red, la receta vuelve a pedir su foto (${tras} peticiones)`);
  assert(recuperada !== null, "y la recibe: el fallo offline no la dejó coja");

  // LRU: más de 8 recetas, se cae la más antigua
  for (const x of RECETAS) await pedirImagen(x);
  assert(totalEnCache() <= 8, `la caché respeta su tope (${totalEnCache()} de 8)`);
  limpiarCache();
  assert(totalEnCache() === 0, "se puede vaciar");
}

/* ============================================================
   5 · CONTRATO CON LA INTERFAZ
   ============================================================ */
console.log("\n— contrato con el catálogo, los estilos y el shell —");
{
  const cat = leer("js/i18n.js");
  const claves = new Set([...cat.matchAll(/^\s*"([a-zA-Z0-9_.]+)":/gm)].map((m) => m[1]));

  for (const [fichero, prefijo] of [["js/ui/dashboard.js", "dash."], ["js/ui/nutrition.js", "nut."]]) {
    const usadas = [...leer(fichero).matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1])
      .filter((k) => k.startsWith(prefijo));
    const huerfanas = [...new Set(usadas)].filter((k) => !claves.has(k));
    assert(huerfanas.length === 0,
      `${fichero}: las claves ${prefijo}* existen en el catálogo`, huerfanas.join(", "));
  }

  const index = leer("index.html");
  assert(/css\/dashboard\.css/.test(index), "index.html carga la hoja del tablero");
  assert(/css\/coach\.css/.test(index), "index.html sigue cargando la hoja del coach");

  const sw = leer("sw.js");
  for (const f of ["./css/dashboard.css", "./js/ui/dashboard.js", "./js/recipeImage.js"]) {
    assert(sw.includes(f), `el service worker precachea ${f.replace("./", "")}`);
  }

  // las clases que pinta el JS existen en la hoja (como clase o como id)
  // dashboard.css cubre el tablero histórico; pro.css es la capa final de producto\n  // y es dueña de los componentes nuevos de Nutrición. El contrato valida la cascada real.\n  const css = leer("css/dashboard.css") + "\\n" + leer("css/pro.css");\n  const fuente = leer("js/ui/dashboard.js") + leer("js/ui/nutrition.js");
  const nombres = [...new Set([...fuente.matchAll(/["'`\s]((?:dash|nut)-[a-z-]+)["'`\s]/g)].map((m) => m[1]))];
  const sinEstilo = nombres.filter((c) => !css.includes(`.${c}`) && !css.includes(`#${c}`));
  assert(sinEstilo.length === 0,
    `los ${nombres.length} elementos dash-*/nut-* tienen estilo`, sinEstilo.join(", "));

  // nada de HTML con datos que vienen de la IA
  assert(!/innerHTML\s*=\s*`[^`]*\$\{(?:src|j\.)/.test(fuente), "la imagen no se inyecta como HTML");

  // el servidor tiene que enrutar las comprobaciones de salud por
  // prefijo, no por ruta exacta: si no, el cliente nunca sabe si las
  // fotos están disponibles y la nota del pie miente.
  const serve = leer("tools/serve.mjs");
  assert(/startsWith\(`\$\{r\.prefijo\}\/`\)/.test(serve),
    "el servidor enruta por prefijo, para que /health también llegue");
  assert(/prefijo:\s*"\/api\/meal-image"/.test(serve), "el proxy de imágenes está montado");

  // el cliente pregunta en la ruta que el servidor entiende
  // (apiBase() permite apuntar al despliegue público desde el APK)
  assert(/fetch\(apiBase\(\) \+ "\/api\/meal-image\/health"/.test(leer("js/recipeImage.js")),
    "el cliente consulta la salud en /api/meal-image/health");
  assert(/\/api\/meal-image\/health/.test(leer("api/image.js")),
    "el proxy entiende esa misma ruta");
}

/* ============================================================
   RESULTADO
   ============================================================ */
console.log("\n══════════════════════════════════");
console.log(`  → ${pass} ok · ${fail} fallos`);
process.exit(fail ? 1 : 0);

/* ---------- mocks ---------- */
function mkRes() {
  return {
    statusCode: 0, headers: {}, chunks: [],
    setHeader(k, v) { this.headers[k] = v; },
    end(c) { if (c) this.chunks.push(c); },
    get body() { return this.chunks.join(""); },
  };
}
