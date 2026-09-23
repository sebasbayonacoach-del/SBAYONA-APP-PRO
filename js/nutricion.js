// ============================================================
// BAYONA — NUTRICIÓN · recetas y adherencia al plan (dominio puro)
// ------------------------------------------------------------
// «Comida real para una vida extraordinaria»: recetas sencillas con
// macros honestos y adherencia al plan diario. Sin clonar MyFitnessPal:
// plan + registro + cumplimiento + educación.
// ============================================================
import { MEALS } from "./data.js";

/** Comidas principales del plan diario (viven en MEALS: sin catálogo paralelo). */
export const PLAN_COMIDAS = ["m_breakfast", "m_lunch", "m_dinner"];

export const RECETAS = [
  {
    id: "r_bowl_yogur", nombre: "BOWL DE YOGUR GRIEGO", tipo: "DESAYUNO",
    kcal: 420, p: 28, c: 48, f: 12,
    ingredientes: ["200 g de yogur griego natural", "40 g de avena", "100 g de frutos rojos", "1 cucharadita de miel"],
    pasos: ["Sirve el yogur en un bol.", "Añade avena y frutos rojos.", "Corona con miel y listo."],
  },
  {
    id: "r_bowl_pollo", nombre: "BOWL DE POLLO Y VERDURAS", tipo: "ALMUERZO",
    kcal: 610, p: 45, c: 58, f: 18,
    ingredientes: ["150 g de pechuga de pollo", "80 g de arroz integral", "Brócoli y pimiento al vapor", "1 cucharada de aceite de oliva"],
    pasos: ["Cuece el arroz.", "Saltea el pollo en dados.", "Monta el bol con las verduras y el aceite."],
  },
  {
    id: "r_salmon_batata", nombre: "SALMÓN CON BATATA", tipo: "CENA",
    kcal: 520, p: 38, c: 42, f: 20,
    ingredientes: ["150 g de salmón", "200 g de batata", "Ensalada verde", "Limón y hierbas"],
    pasos: ["Hornea la batata en dados 20 min.", "Cocina el salmón a la plancha.", "Acompaña con ensalada y limón."],
  },
  {
    id: "r_tortilla", nombre: "TORTILLA DE ESPINACAS", tipo: "CENA LIGERA",
    kcal: 340, p: 24, c: 12, f: 22,
    ingredientes: ["3 huevos", "80 g de espinacas", "30 g de queso fresco", "1 pizca de nuez moscada"],
    pasos: ["Saltea las espinacas.", "Bate los huevos y añade el queso.", "Cuaja la tortilla por ambos lados."],
  },
  {
    id: "r_overnight", nombre: "AVENA NOCTURNA", tipo: "DESAYUNO RÁPIDO",
    kcal: 380, p: 22, c: 50, f: 9,
    ingredientes: ["50 g de avena", "180 ml de leche o bebida vegetal", "1 plátano", "Canela"],
    pasos: ["Mezcla todo la noche anterior.", "Refrigera en un tarro.", "Toma frío por la mañana."],
  },
  {
    id: "r_wrap_atun", nombre: "WRAP DE ATÚN", tipo: "COMIDA FUERA",
    kcal: 450, p: 32, c: 46, f: 13,
    ingredientes: ["1 tortilla integral", "1 lata de atún al natural", "Tomate y lechuga", "1 cucharada de yogur natural"],
    pasos: ["Mezcla el atún con el yogur.", "Rellena la tortilla.", "Enrolla y corta por la mitad."],
  },
];

export function receta(id) { return RECETAS.find((r) => r.id === id) || null; }

/**
 * Adherencia al plan diario: 3 comidas principales (MEALS) cumplidas.
 * Lo registrado fuera del plan se declara como «extra», nunca se esconde.
 */
export function adherenciaPlan(hoy) {
  const ids = (hoy?.meals || []).map((m) => m.id);
  const detalle = PLAN_COMIDAS.map((id) => ({
    id,
    nombre: MEALS.find((m) => m.id === id)?.name || id,
    hecha: ids.includes(id),
  }));
  const cumplidas = detalle.filter((d) => d.hecha).length;
  const fuera = (hoy?.meals || []).filter((m) => !PLAN_COMIDAS.includes(m.id)).length;
  return {
    cumplidas, total: PLAN_COMIDAS.length,
    pct: Math.round((cumplidas / PLAN_COMIDAS.length) * 100),
    extra: fuera, detalle,
  };
}
