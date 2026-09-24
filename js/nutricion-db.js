// ============================================================
// BAYONA — NUTRICIÓN · base de alimentos offline (dominio puro)
// ------------------------------------------------------------
// «Lo que no se ha registrado no se inventa»: aquí SOLO hay datos
// de alimentos (macros por porción) y aritmética de porciones.
// Sin red, sin navegador, sin estimaciones fantasma.
//
// Fuente de datos: `js/data/alimentos.json` (macros por porción,
// derivados de valores aproximados por 100 g con factores de
// Atwater generales 4/4/9; por eso kcal es coherente con
// 4·proteína + 4·carbohidrato + 9·grasa por construcción).
// ============================================================
import alimentosData from "./data/alimentos.json" with { type: "json" };

/** Catálogo completo (NO mutar: es la fuente de verdad local). */
export const ALIMENTOS = deepFreeze(alimentosData);

const r1 = (x) => Math.round(x * 10) / 10;

function deepFreeze(xs) {
  for (const x of xs) {
    Object.freeze(x.porcion);
    Object.freeze(x.macros);
    Object.freeze(x);
  }
  return Object.freeze(xs);
}

/** Minúsculas sin acentos ni diacríticos: «Puré» y «pure» son lo mismo. */
export function normalizaTexto(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function porRelevancia(a, b, qNorm) {
  const na = normalizaTexto(a.nombre);
  const nb = normalizaTexto(b.nombre);
  const pa = na === qNorm ? 0 : na.startsWith(qNorm) ? 1 : na.includes(qNorm) ? 2 : 3;
  const pb = nb === qNorm ? 0 : nb.startsWith(qNorm) ? 1 : nb.includes(qNorm) ? 2 : 3;
  return pa - pb || na.localeCompare(nb, "es");
}

/**
 * Búsqueda offline insensible a acentos y mayúsculas, por nombre y categoría.
 * Todas las palabras de la consulta deben aparecer (búsqueda tipo «queso
 * manchego» encuentra «Queso curado (Manchego)»).
 * Consulta vacía → catálogo completo (para explorar).
 * Devuelve copias: la base nunca se toca.
 */
export function buscarAlimentos(q) {
  const consulta = normalizaTexto(q);
  if (!consulta) return ALIMENTOS.map(copiaAlimento);
  const palabras = consulta.split(/\s+/);
  const hits = ALIMENTOS.filter((a) => {
    const heno = normalizaTexto(`${a.nombre} ${a.categoria}`);
    return palabras.every((p) => heno.includes(p));
  });
  return hits.sort((a, b) => porRelevancia(a, b, consulta)).map(copiaAlimento);
}

function copiaAlimento(a) {
  return { id: a.id, nombre: a.nombre, categoria: a.categoria, porcion: { ...a.porcion }, macros: { ...a.macros } };
}

/**
 * Macros de una cantidad dada (en la unidad de la porción del alimento).
 * Proporcional y honesto: doble de cantidad = doble de macros.
 * Devuelve null si el alimento no existe o la cantidad no es válida
 * (nunca se inventa un resultado).
 */
export function obtenerPorcion(id, cantidad) {
  const alimento = ALIMENTOS.find((a) => a.id === id);
  if (!alimento) return null;
  if (typeof cantidad !== "number" || !Number.isFinite(cantidad) || cantidad <= 0) return null;
  const factor = cantidad / alimento.porcion.cantidad;
  const proteina_g = r1(alimento.macros.proteina_g * factor);
  const carbos_g = r1(alimento.macros.carbos_g * factor);
  const grasa_g = r1(alimento.macros.grasa_g * factor);
  return {
    id: alimento.id,
    nombre: alimento.nombre,
    categoria: alimento.categoria,
    cantidad,
    unidad: alimento.porcion.unidad,
    kcal: Math.round(4 * proteina_g + 4 * carbos_g + 9 * grasa_g),
    proteina_g,
    carbos_g,
    grasa_g,
  };
}

/**
 * Suma los macros de un registro de comida.
 * items: [{ id, cantidad }] (cantidad en la unidad de cada alimento).
 * Lo desconocido NO se estima: se devuelve en `desconocidos` y aporta 0.
 */
export function calcularMacros(items) {
  const desconocidos = [];
  const totales = { kcal: 0, proteina_g: 0, carbos_g: 0, grasa_g: 0, alimentos: 0 };
  for (const item of items || []) {
    const porcion = obtenerPorcion(item?.id, item?.cantidad);
    if (!porcion) {
      desconocidos.push(item?.id ?? null);
      continue;
    }
    totales.kcal += porcion.kcal;
    totales.proteina_g += porcion.proteina_g;
    totales.carbos_g += porcion.carbos_g;
    totales.grasa_g += porcion.grasa_g;
    totales.alimentos += 1;
  }
  return {
    kcal: totales.kcal,
    proteina_g: r1(totales.proteina_g),
    carbos_g: r1(totales.carbos_g),
    grasa_g: r1(totales.grasa_g),
    alimentos: totales.alimentos,
    desconocidos,
  };
}
