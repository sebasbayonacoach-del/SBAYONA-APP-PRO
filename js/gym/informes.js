// ============================================================
// BAYONA · CENTRO — informes
// ------------------------------------------------------------
// Lo que el dueño mira a fin de mes: cuánto entró, quién viene,
// qué clases se llenan y a quién hay que llamar hoy.
//
// Cada cifra sale de registros reales. Las PROYECCIONES se calculan
// aparte y se marcan como tales: mezclar una estimación con un dato
// cerrado es como se miente sin querer.
import { dia, sumarDias, riesgoBaja, deudaDe, diasDeMora, visitasDe, reservasDe, plazasLibres } from "./model.js";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const lista = (v) => (Array.isArray(v) ? v : []);
const eur = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Serie de los últimos N meses: cobrados y número de operaciones. */
export function facturacionMensual(estado, meses = 6, hoy = dia()) {
  const pagos = lista(estado?.pagos);
  const out = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - i, 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const delMes = pagos.filter((p) => p && String(p.fecha || "").slice(0, 7) === clave);
    out.push({
      clave,
      mes: `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      importe: eur(delMes.reduce((a, p) => a + p.importe, 0)),
      operaciones: delMes.length,
    });
  }
  return out;
}

/** Visitas por día de los últimos N días. */
export function asistenciaDiaria(estado, dias = 14, hoy = dia()) {
  const accesos = lista(estado?.accesos);
  const out = [];
  for (let i = dias - 1; i >= 0; i--) {
    const f = sumarDias(hoy, -i);
    out.push({
      fecha: f,
      dia: f.slice(8) + " " + MESES[Number(f.slice(5, 7)) - 1],
      visitas: accesos.filter((a) => a && String(a.entrada || "").slice(0, 10) === f).length,
    });
  }
  return out;
}

/** Qué clases se llenan y cuáles se quedan vacías. */
export function ocupacionClases(estado, hoy = dia()) {
  const clases = lista(estado?.clases).filter((c) => c && c.dia >= hoy);
  const reservas = lista(estado?.reservas);
  return clases
    .map((c) => {
      const ocupadas = reservasDe(c.id, reservas).length;
      return {
        id: c.id, nombre: c.nombre, dia: c.dia, hora: c.hora,
        aforo: c.aforo, ocupadas,
        libres: plazasLibres(c, reservas),
        pct: Math.round((ocupadas / Math.max(1, c.aforo)) * 100),
      };
    })
    .sort((a, b) => b.ocupadas - a.ocupadas || b.pct - a.pct);
}

/** Socios que hay que llamar HOY, ordenados por urgencia real. */
export function watchlist(estado, hoy = dia()) {
  const planes = estado?.plans || {};
  const membresias = estado?.membresias || {};
  return lista(estado?.socios)
    .filter((s) => s && s.estado === "activo")
    .map((s) => {
      const r = riesgoBaja(s, estado, hoy);
      const plan = planes[membresias[s.id]];
      const d = plan ? deudaDe(s, plan, estado.pagos, hoy) : null;
      return { socio: s, riesgo: r, deuda: d, visitas: visitasDe(s.id, lista(estado?.accesos), 30, hoy) };
    })
    .filter((x) => x.riesgo.nivel === "alto" || (x.deuda && x.deuda.vencida))
    .sort((a, b) => b.riesgo.puntos - a.riesgo.puntos);
}

/** Deuda por socio, solo lo que se debe de verdad, con los días de mora. */
export function morosos(estado, hoy = dia()) {
  const planes = estado?.plans || {};
  const membresias = estado?.membresias || {};
  return lista(estado?.socios)
    .filter((s) => s && s.estado === "activo")
    .map((s) => {
      const plan = planes[membresias[s.id]];
      if (!plan) return null;
      const deuda = deudaDe(s, plan, estado.pagos, hoy);
      return deuda.vencida ? { socio: s, deuda, dias: diasDeMora(s, plan, estado.pagos, hoy) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.dias - a.dias || b.deuda.importe - a.deuda.importe);
}

/** Resumen de un mes concreto (o del mes en curso si no se dice). */
export function resumenMensual(estado, clave, hoy = dia()) {
  const mes = clave || hoy.slice(0, 7);
  const pagos = lista(estado?.pagos).filter((p) => p && String(p.fecha || "").slice(0, 7) === mes);
  const accesos = lista(estado?.accesos).filter((a) => a && String(a.entrada || "").slice(0, 7) === mes);
  const socios = lista(estado?.socios);
  const activos = socios.filter((s) => s && s.estado === "activo");
  const total = pagos.reduce((a, p) => a + p.importe, 0);
  return {
    mes,
    cobros: eur(total),
    operaciones: pagos.length,
    ticket: pagos.length ? eur(total / pagos.length) : 0,
    visitas: accesos.length,
    sociosActivos: activos.length,
    nuevos: socios.filter((s) => s && s.alta && s.alta.slice(0, 7) === mes).length,
  };
}

/**
 * Exportación CSV. Se genera aquí y se descarga desde el navegador;
 * sin servidor ni dependencias.
 */
export function aCSV(filas, cabeceras) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const cab = cabeceras || Object.keys(filas[0] || {});
  const lineas = [cab.join(";")];
  for (const f of filas) lineas.push(cab.map((c) => esc(f[c])).join(";"));
  return lineas.join("\n");
}
