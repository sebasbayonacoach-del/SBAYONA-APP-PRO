// ============================================================
// BAYONA — LÍNEA DEL TIEMPO UNIFICADA (dominio puro)
// ------------------------------------------------------------
// «ANTES → AHORA → HACIA DÓNDE» en UNA sola historia: mediciones,
// fotos de progreso, récords y hitos del journey. Sin duplicar los
// módulos que ya generan esos datos: solo los ordena y narra.
// ============================================================
import { EXERCISES } from "./data.js";

const byFecha = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0);
const UNIDAD = 0.5; // kg mínimo de cambio corporal que merece un hito
/** decimal es-ES: 0,9 */
const esDec = (n) => String(n).replace(".", ",");

/**
 * Historia unificada (más reciente primero).
 * @param {{medidas?:Array, fotos?:Array, history?:Array, journey?:Array}} fuentes
 * @returns {Array<{fecha:string, tipo:string, texto:string, xp?:number}>}
 */
export function lineaDelTiempo({ medidas = [], fotos = [], history = [], journey = [] } = {}) {
  const ev = [];

  // ---- mediciones: primera + cambios notables (≥ 0,5 kg) ----
  const serie = (medidas || []).filter((m) => m && m.fecha && m.pesoKg != null).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  serie.forEach((m, i) => {
    if (i === 0) {
      ev.push({ fecha: m.fecha, tipo: "medicion", texto: `Primera medición: ${esDec(m.pesoKg)} kg` });
      return;
    }
    const d = +(m.pesoKg - serie[i - 1].pesoKg).toFixed(1);
    if (Math.abs(d) >= UNIDAD) {
      ev.push({ fecha: m.fecha, tipo: "medicion", texto: `Peso ${d < 0 ? "−" : "+"}${esDec(Math.abs(d))} kg → ${esDec(m.pesoKg)} kg` });
    }
  });

  // ---- fotos de progreso (privadas; solo constancia en la historia) ----
  for (const f of fotos || []) {
    if (f && f.at) ev.push({ fecha: f.at.slice(0, 10), tipo: "foto", texto: "Foto de progreso guardada (privada, solo en tu dispositivo)." });
  }

  // ---- récords del histórico ----
  for (const h of history || []) {
    for (const p of h.prPoints || []) {
      const nombre = EXERCISES[p.ex]?.name || p.ex;
      ev.push({ fecha: h.date, tipo: "pr", texto: `Récord en ${nombre} · 1RM estimado ${esDec(p.e1)} kg` });
    }
  }

  // ---- hitos del journey ----
  for (const j of journey || []) {
    if (j && j.date) ev.push({ fecha: j.date, tipo: j.type === "pr" ? "pr" : "hito", texto: j.text, xp: j.xp || 0 });
  }

  return ev.sort(byFecha).slice(0, 60);
}

/** Resumen ANTES → AHORA → HACIA DÓNDE para la cabecera. */
export function resumenEvolucion(medidas = [], proyeccionFn = null) {
  const serieP = (medidas || []).filter((m) => m && m.pesoKg != null).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (!serieP.length) return null;
  const antes = serieP[0].pesoKg, ahora = serieP[serieP.length - 1].pesoKg;
  return {
    antes, ahora, delta: +(ahora - antes).toFixed(1),
    proyeccion: proyeccionFn ? proyeccionFn : null,
  };
}
