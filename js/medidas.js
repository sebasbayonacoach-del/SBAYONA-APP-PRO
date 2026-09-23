// ============================================================
// BAYONA — MEDICIONES · evolución corporal (dominio puro)
// ------------------------------------------------------------
// El ADN del Excel de Colombia convertido en producto: peso, perímetros
// y composición con línea del tiempo ANTES → AHORA → HACIA DÓNDE VOY.
//
// HONESTIDAD (reglas BAYONA):
//   · MEDIDO = lo que tú mides y registras (tallada/espejo/báscula).
//   · ESTIMACIÓN = grasa % (balanza/bioimpedancia: nunca dato clínico).
//   · SIN DATOS = null → la UI dice «Todavía no lo has registrado».
//   · La proyección declara su supuesto («si mantienes la tendencia»)
//     y topea el ritmo a valores realistas: no se venden milagros.
// ============================================================

export const CAMPOS = [
  { k: "pesoKg",    label: "PESO",    unidad: "kg", dec: 1, min: 25,  max: 250, estimado: false },
  { k: "cinturaCm", label: "CINTURA", unidad: "cm", dec: 1, min: 30,  max: 200, estimado: false },
  { k: "caderaCm",  label: "CADERA",  unidad: "cm", dec: 1, min: 30,  max: 220, estimado: false },
  { k: "brazoCm",   label: "BRAZO",   unidad: "cm", dec: 1, min: 15,  max: 70,  estimado: false },
  { k: "musloCm",   label: "MUSLO",   unidad: "cm", dec: 1, min: 25,  max: 110, estimado: false },
  { k: "grasaPct",  label: "GRASA",   unidad: "%",  dec: 1, min: 3,   max: 75,  estimado: true },
];

export const FRECUENCIA_DIAS = 14;   // cada cuánto conviene medir
const RITMO_MAX = 0.5;               // % del peso/semana: tope de proyección honesta

/** Normaliza y valida una medición. Devuelve null si nada es usable. */
export function normalizaMedida({ fecha = null, ...vals } = {}) {
  const out = { fecha: fecha || null };
  let ok = false;
  for (const c of CAMPOS) {
    const v = vals[c.k];
    if (v == null || v === "" || !Number.isFinite(+v)) continue;
    const n = +v;
    if (n < c.min || n > c.max) continue; // valores absurdos: se descartan, no se maquillan
    out[c.k] = +n.toFixed(c.dec);
    ok = true;
  }
  return ok ? out : null;
}

/** Serie de un campo ordenada por fecha (solo puntos con valor). */
export function serie(medidas, campo) {
  return (medidas || [])
    .filter((m) => m && m[campo] != null)
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .map((m) => ({ fecha: m.fecha, v: m[campo] }));
}

/** Deltas inicio → actual por campo (ANTES vs AHORA). */
export function deltas(medidas) {
  const out = {};
  for (const c of CAMPOS) {
    const s = serie(medidas, c.k);
    if (s.length < 2) { out[c.k] = s.length ? { inicio: s[0].v, actual: s[0].v, delta: 0, puntos: s.length } : null; continue; }
    const inicio = s[0].v, actual = s[s.length - 1].v;
    out[c.k] = { inicio, actual, delta: +(actual - inicio).toFixed(c.dec), puntos: s.length };
  }
  return out;
}

/** Tendencia por mínimos cuadrados → kg (o cm) por semana. */
export function tendencia(medidas, campo) {
  const s = serie(medidas, campo);
  if (s.length < 3) return null;
  const t0 = new Date(s[0].fecha).getTime();
  const pts = s.map((p) => [ (new Date(p.fecha).getTime() - t0) / 6.048e8, p.v ]); // semanas
  const n = pts.length;
  const mx = pts.reduce((a, p) => a + p[0], 0) / n;
  const my = pts.reduce((a, p) => a + p[1], 0) / n;
  let num = 0, den = 0;
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  if (!den) return null;
  const ritmo = num / den; // unidades/semana
  const dir = Math.abs(ritmo) < (campo === "pesoKg" ? 0.05 : 0.15) ? "estable" : (ritmo < 0 ? "baja" : "sube");
  return { dir, ritmo: +ritmo.toFixed(2) };
}

/**
 * HACIA DÓNDE VOY: proyección lineal conservadora con tope de ritmo.
 * Solo con ≥ 3 puntos y tendencia clara. Nunca promete resultados.
 */
export function proyeccion(medidas, campo, semanas = 4) {
  const s = serie(medidas, campo);
  const t = tendencia(medidas, campo);
  if (!t || s.length < 3) return null;
  const actual = s[s.length - 1].v;
  const tope = Math.max(Math.abs(t.ritmo), 0) > RITMO_MAX ? Math.sign(t.ritmo) * RITMO_MAX : t.ritmo;
  const valor = +(actual + tope * semanas).toFixed(1);
  return { semanas, ritmo: tope, valor, supuesto: "si mantienes la tendencia actual" };
}

/** ¿Te toca medir? (> FRECUENCIA_DIAS desde la última medición). */
export function proximaMedicion(medidas, hoyKey) {
  const s = (medidas || []).filter((m) => m && m.fecha).slice().sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (!s.length) return { falta: true, dias: null, motivo: "Aún no tienes ninguna medición." };
  const ult = s[s.length - 1].fecha;
  const dias = Math.round((new Date(hoyKey) - new Date(ult)) / 8.64e7);
  return {
    falta: dias >= FRECUENCIA_DIAS,
    dias,
    motivo: dias >= FRECUENCIA_DIAS
      ? `Tu última medición fue hace ${dias} días.`
      : `Medida hace ${dias} días · próxima en ${FRECUENCIA_DIAS - dias} días.`,
  };
}
