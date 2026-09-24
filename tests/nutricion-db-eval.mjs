// nutricion-db-eval.mjs — regresión de la base de alimentos offline (P09)
// (node tests/nutricion-db-eval.mjs)
// Sin navegador y sin red: todo con node puro.
import { performance } from "node:perf_hooks";
import { ALIMENTOS, buscarAlimentos, obtenerPorcion, calcularMacros, normalizaTexto } from "../js/nutricion-db.js";

let pass = 0, fail = 0;
const assert = (cond, name, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log("\n🥗 NUTRICIÓN · EVAL DE LA BASE DE ALIMENTOS (offline)\n");

// ── estructura de la base ────────────────────────────────────────────────
{
  assert(ALIMENTOS.length >= 300, `base de ≥ 300 alimentos (hay ${ALIMENTOS.length})`);
  assert(new Set(ALIMENTOS.map((a) => a.id)).size === ALIMENTOS.length, "ids únicos");
  const bienFormados = ALIMENTOS.every((a) =>
    typeof a.id === "string" && typeof a.nombre === "string" && typeof a.categoria === "string" &&
    a.porcion && a.porcion.cantidad > 0 && typeof a.porcion.unidad === "string" &&
    ["kcal", "proteina_g", "carbos_g", "grasa_g"].every((k) => typeof a.macros[k] === "number" && a.macros[k] >= 0)
  );
  assert(bienFormados, "todo alimento tiene id, nombre, categoría, porción y macros numéricos");
  assert(Object.isFrozen(ALIMENTOS) && Object.isFrozen(ALIMENTOS[0].macros), "la base está congelada (dominio puro)");
  assert(new Set(ALIMENTOS.map((a) => a.categoria)).size >= 15, "≥ 15 categorías distintas");
}

// ── coherencia de macros: kcal ≈ 4·prot + 4·carb + 9·grasa (±3) ─────────
{
  let peor = { desv: 0, id: "" };
  for (const a of ALIMENTOS) {
    const calc = 4 * a.macros.proteina_g + 4 * a.macros.carbos_g + 9 * a.macros.grasa_g;
    const desv = Math.abs(calc - a.macros.kcal);
    if (desv > peor.desv) peor = { desv, id: a.id };
  }
  assert(peor.desv <= 3, `macros coherentes en los ${ALIMENTOS.length} alimentos (desviación máx ${peor.desv.toFixed(2)} kcal en «${peor.id}»)`);
}

// ── búsqueda por nombre ─────────────────────────────────────────────────
{
  const pollo = buscarAlimentos("pollo");
  assert(pollo.length >= 3, `«pollo» devuelve resultados (${pollo.length})`);
  assert(pollo.length > 0 && pollo.every((a) => normalizaTexto(`${a.nombre} ${a.categoria}`).includes("pollo")), "todo resultado de «pollo» contiene «pollo»");
  assert(pollo.some((a) => a.nombre === "Pechuga de pollo a la plancha"), "«pollo» incluye la pechuga de pollo");

  const manzana = buscarAlimentos("manzana");
  assert(manzana.some((a) => a.nombre === "Manzana (1 mediana)"), "«manzana» incluye la manzana");
  assert(manzana.some((a) => a.nombre === "Tarta de manzana"), "«manzana» también encuentra la tarta de manzana");

  const arroz = buscarAlimentos("arroz");
  assert(arroz.length >= 3, `«arroz» devuelve ${arroz.length} resultados (≥ 3)`);
  assert(arroz.some((a) => a.nombre === "Arroz blanco cocido") && arroz.some((a) => a.nombre === "Arroz integral cocido"), "«arroz» incluye blanco e integral");

  const imposible = buscarAlimentos("pizza_de_unicornio");
  assert(imposible.length === 0, "lo que no existe no se inventa (búsqueda sin resultado → [])");
}

// ── búsqueda insensible a acentos y mayúsculas + por categoría ──────────
{
  const naranja = buscarAlimentos("naranja");
  assert(naranja.some((a) => a.nombre === "Naranja (1 mediana)"), "«naranja» encuentra «Naranja»");
  assert(buscarAlimentos("NARANJA").some((a) => a.nombre === "Naranja (1 mediana)"), "«NARANJA» (mayúsculas) también");
  assert(buscarAlimentos("pure").some((a) => a.nombre === "Puré de patata"), "«pure» encuentra «Puré de patata» (sin tilde)");
  assert(buscarAlimentos("esparragos").some((a) => a.nombre === "Espárragos"), "«esparragos» encuentra «Espárragos»");
  assert(buscarAlimentos("platano").some((a) => a.nombre === "Plátano (1 mediano)"), "«platano» encuentra «Plátano»");
  assert(buscarAlimentos("salmon").some((a) => a.nombre.startsWith("Salmón")), "«salmon» encuentra «Salmón»");

  const frutas = buscarAlimentos("fruta");
  const deCategoria = frutas.filter((a) => a.categoria === "fruta");
  assert(deCategoria.length >= 30 && frutas.every((a) => normalizaTexto(`${a.nombre} ${a.categoria}`).includes("fruta")),
    `búsqueda por categoría («fruta» → ${frutas.length} hits, ${deCategoria.length} con categoría fruta)`);

  const mixta = buscarAlimentos("queso manchego");
  assert(mixta.some((a) => a.nombre === "Queso curado (Manchego)"), "búsqueda de 2 palabras («queso manchego»)");
}

// ── porciones proporcionales ────────────────────────────────────────────
{
  assert(obtenerPorcion("al_no_existe", 100) === null, "alimento desconocido → null (sin inventar)");
  assert(obtenerPorcion(ALIMENTOS[0].id, 0) === null, "cantidad 0 → null");
  assert(obtenerPorcion(ALIMENTOS[0].id, -5) === null, "cantidad negativa → null");
  assert(obtenerPorcion(ALIMENTOS[0].id, NaN) === null, "cantidad NaN → null");

  let exactos = true;
  for (const a of ALIMENTOS) {
    const p = obtenerPorcion(a.id, a.porcion.cantidad);
    if (!p || p.kcal !== a.macros.kcal || p.proteina_g !== a.macros.proteina_g ||
        p.carbos_g !== a.macros.carbos_g || p.grasa_g !== a.macros.grasa_g) { exactos = false; break; }
  }
  assert(exactos, "porción canónica (cantidad de la porción) devuelve EXACTAMENTE los macros almacenados");

  let dobles = true, peorKcal = 0;
  for (const a of ALIMENTOS) {
    const u = obtenerPorcion(a.id, a.porcion.cantidad);
    const d = obtenerPorcion(a.id, a.porcion.cantidad * 2);
    const desvKcal = Math.abs(d.kcal - 2 * u.kcal);
    if (desvKcal > peorKcal) peorKcal = desvKcal;
    if (!d || d.proteina_g !== r1(2 * u.proteina_g) || d.carbos_g !== r1(2 * u.carbos_g) ||
        d.grasa_g !== r1(2 * u.grasa_g) || desvKcal > 1) { dobles = false; break; }
  }
  assert(dobles, `doble cantidad = doble macro (kcal ±1 por redondeo; peor desviación ${peorKcal})`);

  const manzana = buscarAlimentos("manzana").find((a) => a.id === "al_manzana_1_mediana");
  const una = obtenerPorcion(manzana.id, 1);
  const tres = obtenerPorcion(manzana.id, 3);
  assert(Math.abs(tres.proteina_g - 3 * una.proteina_g) <= 0.05 && tres.kcal === Math.round(4 * tres.proteina_g + 4 * tres.carbos_g + 9 * tres.grasa_g),
    "triple cantidad escala bien y su kcal sigue coherente");
}

// ── calcularMacros suma bien ────────────────────────────────────────────
{
  const vacio = calcularMacros([]);
  assert(vacio.kcal === 0 && vacio.proteina_g === 0 && vacio.alimentos === 0 && vacio.desconocidos.length === 0,
    "registro vacío → 0 honesto");

  const items = [
    { id: "al_pollo_a_la_plancha", cantidad: 0 }, // inválido a propósito (ver abajo)
    { id: "al_pechuga_de_pollo_a_la_plancha", cantidad: 150 },
    { id: "al_arroz_blanco_cocido", cantidad: 300 },
  ];
  const suma = calcularMacros(items);
  const p1 = obtenerPorcion("al_pechuga_de_pollo_a_la_plancha", 150);
  const p2 = obtenerPorcion("al_arroz_blanco_cocido", 300);
  assert(suma.alimentos === 2, "solo cuentan los items válidos");
  assert(suma.desconocidos.length === 1 && suma.desconocidos.includes("al_pollo_a_la_plancha"),
    "lo no registrado se declara en «desconocidos» (sin inventar)");
  assert(suma.proteina_g === r1(p1.proteina_g + p2.proteina_g) && suma.carbos_g === r1(p1.carbos_g + p2.carbos_g) &&
    suma.grasa_g === r1(p1.grasa_g + p2.grasa_g) && suma.kcal === p1.kcal + p2.kcal,
    `suma de macros exacta (${suma.kcal} kcal · ${suma.proteina_g} g P · ${suma.carbos_g} g C · ${suma.grasa_g} g G)`);

  const conFantasma = calcularMacros([{ id: "al_inventado", cantidad: 100 }]);
  assert(conFantasma.kcal === 0 && conFantasma.desconocidos.includes("al_inventado"),
    "alimento fantasma aporta 0 kcal y queda registrado como desconocido");
}

// ── rendimiento de búsqueda (informativo) ───────────────────────────────
{
  const consultas = ["pollo", "manzana", "arroz", "naranja", "pure", "salmon", "queso manchego", "zzz"];
  const t0 = performance.now();
  const vueltas = 500;
  for (let i = 0; i < vueltas; i++) for (const q of consultas) buscarAlimentos(q);
  const totalMs = performance.now() - t0;
  const porBusqueda = totalMs / (vueltas * consultas.length);
  console.log(`\n⏱  búsqueda: ${porBusqueda.toFixed(3)} ms de media · ${ALIMENTOS.length} alimentos · ${(vueltas * consultas.length)} consultas en ${totalMs.toFixed(1)} ms`);
  assert(porBusqueda < 15, `búsqueda offline por debajo de 15 ms (${porBusqueda.toFixed(3)} ms)`);
}

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);

function r1(x) { return Math.round(x * 10) / 10; }
