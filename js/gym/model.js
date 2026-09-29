// ============================================================
// BAYONA · CENTRO — dominio puro de gestión del gimnasio
// ------------------------------------------------------------
// Lo que hace Trainingym, aquí calculado y SIN servidor:
// socios · membresías · cuotas · deuda · agenda · reservas ·
// acceso · riesgo de baja · KPIs.
//
// REGLAS DEL PROYECTO que este fichero respeta:
//   · NUNCA se inventa un dato. Si no hay registros, se dice
//     («sin datos»), no se rellena con una estimación bonita.
//   · El riesgo de baja SIEMPRE explica sus motivos. Un número
//     sin motivo es una adivinanza: aquí sale o no sale.
//   · Puro: sin DOM, sin localStorage, sin fetch. Por eso se
//     puede testear entero en Node y reutilizar en la nube.
//     (El catálogo i18n no tiene efectos: importarlo no rompe la pureza.)
// ============================================================
import { t as _t } from "../i18n.js";
/** Motivos de riesgo en el idioma del usuario, desde el catálogo. */
const t = (k, vars) => _t(k, vars);

/** Periodicidad de los planes, en días. */
export const PERIODOS = { mensual: 30, trimestral: 90, semestral: 180, anual: 365 };
/** Etiquetas de periodicidad (se muestran tal cual en la interfaz). */
export const PERIODO_LABEL = { mensual: "mes", trimestral: "trimestre", semestral: "semestre", anual: "año" };

/** Estados de un socio. `baja` no borra: conserva el historial. */
export const ESTADOS = ["activo", "pausado", "baja"];

/* ---------- fechas locales (NUNCA UTC: el día del socio es el suyo) --- */
const p2 = (n) => String(n).padStart(2, "0");
export function dia(d = new Date()) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
export function sumarDias(iso, n) {
  const [a, m, d] = String(iso).split("-").map(Number);
  const f = new Date(a, (m || 1) - 1, d || 1);
  f.setDate(f.getDate() + n);
  return dia(f);
}
export function diasEntre(desde, hasta) {
  const [a, m, d] = String(desde).split("-").map(Number);
  const [a2, m2, d2] = String(hasta).split("-").map(Number);
  return Math.round((new Date(a2, m2 - 1, d2) - new Date(a, m - 1, d)) / 864e5);
}
/** "hace 12 días" en es-ES */
export function haceCuanto(iso, hoy = dia()) {
  const n = diasEntre(iso, hoy);
  if (n <= 0) return "hoy";
  if (n === 1) return "ayer";
  return `hace ${n} días`;
}

/* ============================================================
   1 · SOCIOS
   ============================================================ */
const id = (prefijo, semilla) => `${prefijo}_${(semilla || "").toString(36).replace(/[^a-z0-9]/gi, "").slice(0, 8) || Math.random().toString(36).slice(2, 8)}`;

/** Una lista SIEMPRE es una lista. Un guardado corrupto con `"accesos": "x"`
 *  no puede hacer que el dominio reviente al leerlo. */
const lista = (v) => (Array.isArray(v) ? v : []);

/** Alta de socio. Valida lo mínimo para que un alta no rompa nada. */
export function nuevoSocio(datos = {}) {
  const nombre = String(datos.nombre || "").trim();
  if (!nombre) return { ok: false, error: "Falta el nombre del socio." };
  const hoy = datos.hoy || dia();
  return {
    ok: true,
    socio: {
      id: datos.id || id("soc", nombre),
      nombre,
      telefono: datos.telefono || "",
      email: datos.email || "",
      objetivo: datos.objetivo || "",
      estado: ESTADOS.includes(datos.estado) ? datos.estado : "activo",
      alta: datos.alta || hoy,
      demo: Boolean(datos.demo),
      notas: datos.notas || [],
    },
  };
}

/* ============================================================
   2 · MEMBRESÍAS Y CUOTAS
   ------------------------------------------------------------
   Una cuota es una factura de un periodo. El dinero entra por
   `pagos`: si no hay pasarela conectada, se registra a mano y
   la app lo dice. Nunca se simula un cobro.
   ============================================================ */
export function nuevoPlan(datos = {}) {
  const nombre = String(datos.nombre || "").trim();
  if (!nombre) return { ok: false, error: "Falta el nombre del plan." };
  const precio = Number(datos.precio);
  if (!Number.isFinite(precio) || precio < 0) return { ok: false, error: "El precio debe ser un número válido." };
  const periodo = datos.periodo in PERIODOS ? datos.periodo : "mensual";
  return {
    ok: true,
    plan: {
      id: datos.id || id("pl", nombre),
      nombre,
      precio: Math.round(precio * 100) / 100,
      periodo,
      dias: datos.dias || PERIODOS[periodo],
      activo: datos.activo !== false,
    },
  };
}

/** Cuotas que le tocan a un socio desde su alta hasta `hasta`. */
export function cuotasDe(socio, plan, hasta = dia()) {
  if (!socio || !plan || !plan.activo) return [];
  const out = [];
  let desde = socio.alta;
  let i = 0;
  // tope duro: 200 periodos = más de 15 años de historial, de sobra
  while (desde <= hasta && i++ < 200) {
    const hastaPeriodo = sumarDias(desde, plan.dias - 1);
    out.push({
      concepto: `${plan.nombre} · ${desde} → ${hastaPeriodo}`,
      desde,
      hasta: hastaPeriodo,
      importe: plan.precio,
      vencida: diasEntre(hastaPeriodo, hasta) > 0,
    });
    desde = sumarDias(desde, plan.dias);
  }
  return out;
}

/** Pagos registrados a un socio. */
export function pagosDe(socioId, pagos = []) {
  return lista(pagos).filter((x) => x && x.socioId === socioId && x.importe > 0);
}

/**
 * Deuda de un socio. NUNCA negativa: si ha pagado de más, eso es un
 * saldo a favor, no una deuda de -40 €.
 */
export function deudaDe(socio, plan, pagos = [], hoy = dia()) {
  const cuotas = cuotasDe(socio, plan, hoy);
  const pagado = pagosDe(socio?.id, pagos).reduce((a, x) => a + x.importe, 0);
  const debe = cuotas.reduce((a, c) => a + c.importe, 0);
  const diff = Math.round((debe - pagado) * 100) / 100;
  const impagadas = cuotas.filter((c) => c.vencida).length;
  return {
    debe, pagado,
    importe: Math.max(0, diff),
    aFavor: Math.max(0, -diff),
    cuotas: impagadas,
    impagadas,
    vencida: impagadas > 0,
  };
}

/** Días que lleva en mora (0 si no debe nada). */
export function diasDeMora(socio, plan, pagos = [], hoy = dia()) {
  const d = deudaDe(socio, plan, pagos, hoy);
  if (!d.vencida) return 0;
  const vencidas = cuotasDe(socio, plan, hoy).filter((c) => c.vencida);
  const primera = vencidas[0]?.hasta;
  return primera ? Math.max(0, diasEntre(primera, hoy)) : 0;
}

/* ============================================================
   3 · AGENDA, RESERVAS Y ACCESO
   ============================================================ */
export function nuevaClase(datos = {}) {
  const nombre = String(datos.nombre || "").trim();
  const aforo = Number(datos.aforo);
  if (!nombre) return { ok: false, error: "Falta el nombre de la clase." };
  if (!Number.isInteger(aforo) || aforo < 1) return { ok: false, error: "El aforo debe ser un número entero mayor que 0." };
  return {
    ok: true,
    clase: {
      id: datos.id || id("cl", nombre),
      nombre,
      entrenador: datos.entrenador || "",
      dia: datos.dia || dia(),
      hora: datos.hora || "19:00",
      minutos: Number(datos.minutos) || 60,
      aforo,
      workoutId: datos.workoutId || null,
      cancelada: Boolean(datos.cancelada),
    },
  };
}

const minutosDe = (hora) => {
  const [h, m] = String(hora || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
/** Fin de la clase en minutos desde medianoche. */
export const finDeClase = (clase) => minutosDe(clase.hora) + (clase.minutos || 60);
/** ¿Se solapan dos clases? (mismo día y horario encadenado) */
export function seSolapan(a, b) {
  if (!a || !b || a.dia !== b.dia) return false;
  return minutosDe(a.hora) < finDeClase(b) && minutosDe(b.hora) < finDeClase(a);
}

export const reservasDe = (claseId, reservas = []) =>
  lista(reservas).filter((r) => r && r.claseId === claseId && r.estado !== "cancelada");
export const plazasLibres = (clase, reservas = []) =>
  Math.max(0, (clase.aforo || 0) - reservasDe(clase.id, reservas).length);

/**
 * ¿Puede este socio reservar esta clase?
 * Las cuatro razones que importan, en el orden en que se comprueban:
 *   · clase cancelada o ya pasada
 *   · socio dado de baja o pausado
 *   · ya tiene reserva viva (no se reserva dos veces)
 *   · se solapa con otra clase suya
 *   · no quedan plazas
 */
export function puedeReservar(clase, socio, estado = {}, hoy = dia()) {
  const { reservas = [], clases = [] } = estado;
  if (!clase) return { ok: false, motivo: "clase-no-existe" };
  if (clase.cancelada) return { ok: false, motivo: "clase-cancelada" };
  if (clase.dia < hoy) return { ok: false, motivo: "clase-pasada" };
  if (!socio) return { ok: false, motivo: "socio-desconocido" };
  if (socio.estado === "baja") return { ok: false, motivo: "socio-de-baja" };
  if (socio.estado === "pausado") return { ok: false, motivo: "socio-pausado" };

  const ya = reservasDe(clase.id, reservas).find((r) => r.socioId === socio.id);
  if (ya) return { ok: false, motivo: "ya-reservada", reserva: ya };

  const suyas = lista(reservas).filter((r) => r && r.socioId === socio.id && r.estado !== "cancelada");
  for (const r of suyas) {
    const otra = clases.find((c) => c.id === r.claseId);
    if (seSolapan(otra, clase)) return { ok: false, motivo: "solape", clase: otra };
  }
  if (plazasLibres(clase, reservas) <= 0) return { ok: false, motivo: "sin-plazas" };
  return { ok: true, motivo: null };
}

/** Reserva. Devuelve el estado NUEVO (nunca muta el recibido). */
export function reservar(clase, socio, estado = {}, hoy = dia()) {
  const v = puedeReservar(clase, socio, estado, hoy);
  if (!v.ok) return { ok: false, error: v.motivo, detalle: v.clase || v.reserva || null };
  const reserva = { id: id("res", clase.id + socio.id), claseId: clase.id, socioId: socio.id, estado: "confirmada", creada: new Date().toISOString() };
  return { ok: true, reserva, reservas: [...lista(estado.reservas), reserva] };
}

export function cancelarReserva(reservaId, reservas = []) {
  const listaActual = lista(reservas);
  const existe = listaActual.find((r) => r.id === reservaId);
  if (!existe) return { ok: false, error: "reserva-no-existe" };
  if (existe.estado === "cancelada") return { ok: false, error: "ya-cancelada" };
  return { ok: true, reservas: listaActual.map((r) => (r.id === reservaId ? { ...r, estado: "cancelada", cancelada: new Date().toISOString() } : r)) };
}

/**
 * Check-in de acceso. Una SALIDA CIERRA la entrada abierta: no crea un
 * registro nuevo (si no, el socio quedaba «dentro» para siempre y no
 * se podía volver a fichar).
 */
export function registrarAcceso(socioId, tipo, estado = {}, ahora = new Date()) {
  if (!socioId) return { ok: false, error: "socio-desconocido" };
  if (tipo !== "entrada" && tipo !== "salida") return { ok: false, error: "tipo-desconocido" };
  const accesos = lista(estado.accesos);
  const abierta = accesos.find((a) => a.socioId === socioId && !a.salida);
  if (tipo === "entrada" && abierta) return { ok: false, error: "ya-esta-dentro" };
  if (tipo === "salida" && !abierta) return { ok: false, error: "no-esta-dentro" };
  if (tipo === "salida") {
    const salida = ahora.toISOString();
    const nuevos = accesos.map((a) => (a === abierta ? { ...a, salida } : a));
    return { ok: true, acceso: { ...abierta, salida }, accesos: nuevos };
  }
  const acceso = { id: id("ac", socioId + ahora.getTime()), socioId, entrada: ahora.toISOString(), salida: null };
  return { ok: true, acceso, accesos: [...accesos, acceso] };
}
export const estaDentro = (socioId, accesos = []) =>
  lista(accesos).some((a) => a.socioId === socioId && !a.salida);

/** Visitas de un socio en los últimos `dias` días. */
export function visitasDe(socioId, accesos = [], dias = 30, hoy = dia()) {
  const desde = sumarDias(hoy, -dias);
  return lista(accesos).filter((a) => a && a.socioId === socioId && String(a.entrada || "").slice(0, 10) >= desde).length;
}

/* ============================================================
   4 · RIESGO DE BAJA · reglas explicables
   ------------------------------------------------------------
   No es una caja negra: cada señal dice su nombre y su peso.
   Sin registros suficientes NO se da de alta a nadie: se dice
   «sin datos suficientes» y punto.
   ============================================================ */
export const PESOS = { inasistencia: 35, impago: 30, pausa: 20, ceroVisitas: 25, bajaActividad: 15 };

/**
 * Riesgo de baja de un socio entre 0 y 100.
 * @returns {{nivel:'alto'|'medio'|'bajo'|'sin-datos', puntos:number, motivos:Array}}
 */
export function riesgoBaja(socio, estado = {}, hoy = dia()) {
  const { accesos = [], pagos = [], planes = {}, membresias = {}, reservas = [] } = estado;
  if (!socio) return { nivel: "sin-datos", puntos: 0, motivos: [] };
  if (socio.estado === "baja") return { nivel: "baja", puntos: 0, motivos: [{ id: "ya-baja", peso: 0, texto: t("gym.motivo.ya-baja") }] };

  const motivos = [];
  const plan = planes?.[membresias[socio.id]];
  const deuda = plan ? deudaDe(socio, plan, pagos, hoy) : null;

  if (socio.estado === "pausado") motivos.push({ id: "pausa", peso: PESOS.pausa, texto: t("gym.motivo.pausa") });

  if (deuda && deuda.vencida) {
    motivos.push({
      id: "impago", peso: PESOS.impago,
      texto: t("gym.motivo.impago", { n: deuda.cuotas, importe: deuda.importe.toFixed(2).replace(".", ",") }),
    });
  }

  const visitas30 = visitasDe(socio.id, accesos, 30, hoy);
  const visitas60 = visitasDe(socio.id, accesos, 60, hoy);
  if (visitas60 === 0) {
    motivos.push({ id: "cero-visitas", peso: PESOS.ceroVisitas, texto: t("gym.motivo.cero-visitas") });
  } else if (visitas30 <= visitas60 / 4) {
    motivos.push({ id: "baja-actividad", peso: PESOS.bajaActividad, texto: t("gym.motivo.baja-actividad", { antes: visitas60, despues: visitas30 }) });
  }

  const suyas = lista(reservas).filter((r) => r && r.socioId === socio.id && r.estado !== "cancelada");
  if (suyas.length === 0 && visitas60 > 0) {
    motivos.push({ id: "inaistencia", peso: PESOS.inasistencia, texto: t("gym.motivo.inaistencia") });
  }

  const puntos = Math.min(100, motivos.reduce((a, m) => a + m.peso, 0));
  const nivel = motivos.length === 0 ? "bajo" : puntos >= 50 ? "alto" : "medio";
  return { nivel, puntos, motivos, visitas30, visitas60, deuda };
}

/* ============================================================
   5 · KPIs DEL CENTRO
   ============================================================ */
export function kpis(estado = {}, hoy = dia()) {
  const socios = lista(estado.socios);
  const planes = estado.planes || {};
  const membresias = estado.membresias || {};
  const clases = lista(estado.clases);
  const reservas = lista(estado.reservas);
  const accesos = lista(estado.accesos);
  const pagos = lista(estado.pagos);
  const activos = socios.filter((s) => s && s.estado === "activo");
  const enMora = activos.filter((s) => riesgoBaja(s, estado, hoy).motivos.some((m) => m.id === "impago"));
  const enRiesgo = activos.filter((s) => riesgoBaja(s, estado, hoy).nivel === "alto");
  const dentro = new Set(accesos.filter((a) => !a.salida).map((a) => a.socioId)).size;
  const occup = clases.filter((c) => c.dia === hoy);
  const ocupacion = occup.length
    ? Math.round(occup.reduce((a, c) => a + (reservasDe(c.id, reservas).length / Math.max(1, c.aforo)) * 100, 0) / occup.length)
    : 0;
  const mesActual = hoy.slice(0, 7);
  const ingresosMes = pagos
    .filter((p) => String(p.fecha || "").slice(0, 7) === mesActual)
    .reduce((a, p) => a + p.importe, 0);
  const deudaTotal = activos.reduce((a, s) => {
    const plan = planes[membresias[s.id]];
    return a + (plan ? deudaDe(s, plan, pagos, hoy).importe : 0);
  }, 0);
  return {
    socios: socios.length,
    activos: activos.length,
    enMora: enMora.length,
    enRiesgo: enRiesgo.length,
    dentro,
    ocupacion,
    ingresosMes: Math.round(ingresosMes * 100) / 100,
    deudaTotal: Math.round(deudaTotal * 100) / 100,
  };
}
