#!/usr/bin/env node
// ============================================================
// tests/gym-eval.mjs · el centro de gimnasio, a prueba
// ------------------------------------------------------------
// Un centro de mando que «funciona» en la demo y rompe con la
// primera reserva doble es peor que no tenerlo. Aquí se comprueban
// las reglas que NO se pueden negociar:
//
//   1 · no se sobrevende una clase
//   2 · nadie se apunta dos veces a la misma clase
//   3 · nadie se apunta a dos clases que se solapan
//   4 · la deuda nunca es negativa (sobrar no es deber)
//   5 · el riesgo de baja SIEMPRE explica sus motivos
//   6 · sin registros NO se inventa riesgo
//   7 · un socio dado de baja no reserva ni entra
//   8 · los datos de los socios no se mezclan con la partida
// ============================================================
import { G } from "../js/gym/store.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
import {
  nuevoSocio, nuevoPlan, nuevaClase, reservar, puedeReservar, cancelarReserva,
  registrarAcceso, estaDentro, visitasDe, cuotasDe, deudaDe, diasDeMora,
  riesgoBaja, kpis, seSolapan, finDeClase, dia, sumarDias, diasEntre, PERIODOS,
  finDeMembresia,
} from "../js/gym/model.js";
import {
  codigoAcceso, normalizaCodigo, socioPorCodigo, validarAcceso, avisosPendientes, MOTIVOS_RECHAZO,
} from "../js/gym/acceso.js";
import {
  facturacionMensual, asistenciaDiaria, ocupacionClases, watchlist, morosos, resumenMensual, aCSV,
} from "../js/gym/informes.js";

/* ---------- laboratorio: localStorage falso con cuota real ---------- */
const store = new Map();
let CUOTA = Infinity;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => {
    let n = 0;
    for (const [kk, vv] of store) n += kk.length + String(vv).length;
    n += k.length + String(v).length;
    if (n > CUOTA) { const e = new Error("cuota"); e.name = "QuotaExceededError"; throw e; }
    store.set(k, String(v));
  },
  removeItem: (k) => store.delete(k),
};

let pass = 0, fail = 0;
const fallos = [];
function assert(c, label) {
  if (c) { pass++; }
  else { fail++; if (fallos.length < 14) fallos.push(label); console.log("  ❌ " + label); }
}
console.log("\n🏋️ BAYONA CENTRO · gestión de gimnasio\n");

/* ============================================================
   1 · ALTA: nada de socios con nombre vacío ni repetidos
   ============================================================ */
console.log("— alta de socios —");
G.init();
assert(nuevoSocio({}).ok === false, "un socio sin nombre no se da de alta");
assert(nuevoSocio({ nombre: "  " }).ok === false, "un nombre en blanco tampoco");
const a1 = G.altaSocio({ nombre: "Paola Moreno", objetivo: "Recomposición" });
assert(a1.ok, "alta válida");
assert(!G.altaSocio({ nombre: "paola moreno" }).ok, "no se admiten dos socios con el mismo nombre (sin tildes ni mayúsculas)");
const b1 = G.altaSocio({ nombre: "Diego" });
assert(b1.ok, "segundo socio");
assert(G.editarSocio(b1.socio.id, { estado: "inventado" }).ok === false, "un estado desconocido se rechaza");
assert(G.editarSocio("no-existe", { nombre: "X" }).ok === false, "editar un socio inexistente falla limpio");
assert(G.editarSocio(a1.socio.id, { telefono: "x".repeat(500) }).ok, "un campo larguísimo se recorta, no revienta");

/* ============================================================
   2 · PLANES, CUOTAS Y DEUDA
   ============================================================ */
console.log("— cuotas y deuda —");
const plan = G.altaPlan({ nombre: "Mensual", precio: 49, periodo: "mensual" });
assert(plan.ok, "plan mensual creado");
assert(!G.altaPlan({ nombre: "Gratis", precio: "mucho" }).ok, "un precio no numérico se rechaza");
assert(!G.altaPlan({ precio: 10 }).ok, "un plan sin nombre se rechaza");
const socio = G.socio(a1.socio.id);
G.asignarPlan(socio.id, plan.plan.id);
assert(!G.asignarPlan(socio.id, "plan-inventado").ok, "asignar un plan que no existe se rechaza");
assert(!G.asignarPlan("socio-fantasma", plan.plan.id).ok, "asignar a un socio fantasma se rechaza");

const hoy = dia();
const cuotas = cuotasDe(socio, plan.plan, hoy);
assert(cuotas.length >= 1, `el alta genera al menos una cuota (${cuotas.length})`);
assert(cuotas.every((c) => c.importe === 49), "cada cuota vale lo que el plan");
const sinPagos = deudaDe(socio, plan.plan, [], hoy);assert(sinPagos.importe > 0, "sin pagos hay deuda");
G.registrarPago({ socioId: socio.id, importe: 49, concepto: "Cuota de prueba" });
const conPago = deudaDe(socio, plan.plan, G.pagosDe(socio.id), hoy);
assert(conPago.importe < sinPagos.importe, "un cobro reduce la deuda");
const deMas = deudaDe(socio, plan.plan, [...G.pagosDe(socio.id), { socioId: socio.id, importe: 500, fecha: hoy }], hoy);
assert(deMas.importe === 0 && deMas.aFavor > 0, "pagar de más es saldo a favor, NUNCA deuda negativa");
assert(!G.registrarPago({ socioId: socio.id, importe: -10 }).ok, "no se registra un cobro negativo");
assert(!G.registrarPago({ socioId: socio.id, importe: "mucho" }).ok, "ni un importe que no sea número");
assert(!G.registrarPago({ socioId: socio.id, importe: 999999 }).ok, "ni un importe absurdo");

/* ============================================================
   3 · CLASES Y AFORO: no se sobrevende
   ============================================================ */
console.log("— clases y aforo —");
const manana = sumarDias(hoy, 1);
const clase = G.altaClase({ nombre: "Tren superior", entrenador: "Coach", dia: manana, hora: "19:00", minutos: 60, aforo: 2 });
assert(clase.ok, "clase creada con aforo 2");
assert(!G.altaClase({ nombre: "X", aforo: 0 }).ok, "aforo 0 se rechaza");
assert(!G.altaClase({ nombre: "  ", aforo: 10 }).ok, "clase sin nombre se rechaza");
assert(!G.altaClase({ nombre: "X", aforo: 2.5 }).ok, "aforo decimal se rechaza");

const clase2 = G.altaClase({ nombre: "Movilidad", dia: manana, hora: "19:30", minutos: 45, aforo: 5 });
assert(G.reservar(clase.clase.id, socio.id).ok, "primera reserva correcta");
assert(!G.reservar(clase.clase.id, socio.id).ok, "el MISMO socio no reserva dos veces la misma clase");
const tercero = G.altaSocio({ nombre: "Carlos Ruiz" });
const r3 = G.reservar(clase.clase.id, tercero.socio.id);
assert(r3.ok, "segundo socio entra (queda 1 plaza)");
const cuarto = G.altaSocio({ nombre: "Lucía Pena" });
assert(!G.reservar(clase.clase.id, cuarto.socio.id).ok, "con aforo 2 no entra un tercero: NO se sobrevende");
const claseLlena = G.clase(clase.clase.id);
const vivos = claseLlena ? G.estado.reservas.filter((r) => r.claseId === clase.clase.id && r.estado !== "cancelada") : [];
assert(vivos.length === 2, `el aforo se respeta exactamente (${vivos.length}/2)`);

/* ============================================================
   4 · SOLAPES
   ============================================================ */
console.log("— solapes —");
assert(seSolapan({ dia: manana, hora: "19:00", minutos: 60 }, { dia: manana, hora: "19:30", minutos: 45 }), "19:00-20:00 y 19:30-20:15 se solapan");
assert(!seSolapan({ dia: manana, hora: "19:00", minutos: 60 }, { dia: manana, hora: "20:00", minutos: 45 }), "19:00-20:00 y 20:00-20:45 NO se solapan (se tocan, no se pisan)");
assert(!seSolapan({ dia: manana, hora: "19:00", minutos: 60 }, { dia: sumarDias(hoy, 2), hora: "19:00", minutos: 60 }), "otro día no se solapa");
const rSolape = G.reservar(clase2.clase.id, socio.id);
assert(!rSolape.ok && rSolape.error === "solape", "un socio no se apunta a dos clases a la vez", rSolape.error);
assert(finDeClase({ hora: "19:00", minutos: 60 }) === 20 * 60, "el fin de clase se calcula bien");

/* ============================================================
   5 · ESTADO DEL SOCIO
   ============================================================ */
console.log("— bajas y pausas —");
G.darDeBaja(tercero.socio.id);
assert(!G.reservar(clase2.clase.id, tercero.socio.id).ok, "un socio dado de baja no reserva");
G.reactivar(tercero.socio.id);
G.editarSocio(cuarto.socio.id, { estado: "pausado" });
assert(!G.reservar(clase2.clase.id, cuarto.socio.id).ok, "un socio en pausa no reserva");
G.reactivar(cuarto.socio.id);
const pasada = G.altaClase({ nombre: "Clase vieja", dia: sumarDias(hoy, -1), hora: "10:00", aforo: 5 });
assert(!G.reservar(pasada.clase.id, socio.id).ok, "no se reserva una clase que ya pasó");

/* ============================================================
   6 · CANCELAR DEJA PLAZA LIBRE
   ============================================================ */
console.log("— cancelar —");
const reservaViva = G.estado.reservas.find((r) => r.claseId === clase.clase.id && r.estado !== "cancelada");
const cancelado = G.cancelarReserva(reservaViva.id);
assert(cancelado.ok, "se cancela una reserva");
assert(!G.cancelarReserva(reservaViva.id).ok, "no se cancela dos veces la misma reserva");
assert(!G.cancelarReserva("reserva-fantasma").ok, "cancelar una reserva que no existe falla limpio");
const otra = G.reservar(clase.clase.id, cuarto.socio.id);
assert(otra.ok, "al cancelar, la plaza vuelve a estar libre");

/* ============================================================
   7 · ACCESO
   ============================================================ */
console.log("— control de acceso —");
const ent = G.registrarAcceso(socio.id, "entrada");
assert(ent.ok, "entrada registrada");
assert(!G.registrarAcceso(socio.id, "entrada").ok, "no se fichan dos entradas seguidas");
assert(G.dentro(socio.id), "el socio figura dentro");
assert(G.registrarAcceso(socio.id, "salida").ok, "salida válida");
assert(!G.dentro(socio.id), "tras salir, ya no está dentro");
assert(!G.registrarAcceso(socio.id, "salida").ok, "no se puede salir sin haber entrado");
assert(!G.registrarAcceso(socio.id, "vuelo").ok, "un tipo de acceso desconocido se rechaza");
assert(!G.registrarAcceso(null, "entrada").ok, "acceso sin socio se rechaza");
assert(visitasDe(socio.id, G.estado.accesos, 30, hoy) >= 1, "la visita cuenta en el histórico");

/* ============================================================
   8 · RIESGO DE BAJA: siempre con motivo
   ============================================================ */
console.log("— riesgo de baja —");
const nuevo = G.altaSocio({ nombre: "Ana Riesgo" }).socio;
G.asignarPlan(nuevo.id, plan.plan.id);
const rNuevo = riesgoBaja(nuevo, G.estado, hoy);
assert(["bajo", "medio", "alto"].includes(rNuevo.nivel), `un socio nuevo tiene un nivel válido (${rNuevo.nivel})`);
assert(rNuevo.nivel !== "alto", "un socio con cero datos NO es «riesgo alto» a la primera");
const rImpa = riesgoBaja(nuevo, G.estado, hoy);
assert(rImpa.motivos.every((m) => typeof m.texto === "string" && m.texto.length > 5), "todo motivo dice algo legible");
const rDesconocido = riesgoBaja(null, G.estado, hoy);
assert(rDesconocido.nivel === "sin-datos" && rDesconocido.motivos.length === 0, "sin socio: sin datos y sin invención");
const bajaAhora = G.altaSocio({ nombre: "Marina Fuera" }).socio;
G.asignarPlan(bajaAhora.id, plan.plan.id);
G.darDeBaja(bajaAhora.id);
const rBaja = riesgoBaja(G.socio(bajaAhora.id), G.estado, hoy);
assert(rBaja.motivos.some((m) => m.id === "ya-baja"), "un socio dado de baja no se marca como «en riesgo»: ya está fuera");
assert(rBaja.nivel === "baja", "y su nivel es «baja», no «alto»");
assert(riesgoBaja(socio, { accesos: [], pagos: [], planes: {}, membresias: {}, reservas: [] }, hoy).puntos >= 0, "el riesgo nunca es negativo");
assert(Math.max(0, Math.min(100, riesgoBaja(nuevo, G.estado, hoy).puntos)) === riesgoBaja(nuevo, G.estado, hoy).puntos, "el riesgo está acotado 0-100");
assert(diasDeMora(socio, plan.plan, G.pagosDe(socio.id), hoy) >= 0, "los días de mora nunca son negativos");

/* ============================================================
   9 · KPIs
   ============================================================ */
console.log("— indicadores —");
const k = kpis(G.estado, hoy);
assert(k.activos <= k.socios, "activos nunca superan el total");
assert(k.ocupacion >= 0 && k.ocupacion <= 100, `la ocupación es un porcentaje real (${k.ocupacion})`);
assert(k.deudaTotal >= 0, "la deuda total nunca es negativa");
const kVacio = kpis({}, hoy);
assert(kVacio.activos === 0 && kVacio.deudaTotal === 0 && kVacio.ocupacion === 0, "sin datos, los KPIs valen 0 (no NaN, no inventados)");

/* ============================================================
   10 · AISLAMIENTO Y PERSISTENCIA
   ============================================================ */
console.log("— aislamiento y red de seguridad —");
assert(store.has("bayona.centro.v1"), "el centro guarda en su PROPIA clave");
assert(!store.has("bayona.save.v2"), "y NO toca la partida del atleta");
G.anotar(socio.id, "Va mejor en sentadilla, revisar técnica de cadera");
assert(G.notas(socio.id).length === 1, "las notas del entrenador se guardan");
assert(!G.anotar(socio.id, "   ").ok, "una nota vacía no se guarda");
assert(!G.anotar(socio.id, "x".repeat(501)).ok, "ni una nota de 500+ caracteres");

// corrupción: el centro se recupera de su anillo, no de la partida
const bueno = store.get("bayona.centro.v1");
store.set("bayona.centro.v1", "{esto no es json");
G.estado = null;
G.error = null;
G.recuperadoDe = null;
G.init();
assert(G.estado.socios.length > 0, `un centro corrupto se recupera del anillo (${G.estado.socios.length} socios)`);
assert(!!G.recuperadoDe, "y dice de dónde lo recuperó");
store.set("bayona.centro.v1", '"solo una cadena"');
G.init();
assert(Array.isArray(G.estado.socios), "un guardado que es texto se trata como corrupción, no como datos");
assert(bueno, "hubo un estado bueno antes de romperlo (control del propio test)");

// cuota llena: se suelta lo viejo y RECIENTE, nunca la lista de socios
const nSocios = G.estado.socios.length;
for (let i = 0; i < 400; i++) {
  G.estado.accesos.push({ id: `x${i}`, socioId: "s", entrada: new Date().toISOString(), salida: new Date().toISOString() });
}
const bytes = JSON.stringify(G.estado).length;
CUOTA = Math.ceil(bytes * 0.6);    // no cabe entero, pero sí recortado
const okCuota = G.save();
assert(okCuota, `con la cuota apretada el centro guarda recortando (${bytes} B de estado, cuota ${CUOTA} B)`);
assert(G.estado.accesos.length <= 50, `los accesos antiguos se sueltan (${G.estado.accesos.length})`);
assert(G.estado.socios.length === nSocios, `los socios NO se recortan nunca (${nSocios} antes y después)`);

// cuota IMPOSIBLE: se avisa y no se pierde nada en memoria
CUOTA = 200;
const okImposible = G.save();
assert(!okImposible, "si no cabe ni recortado, el guardado devuelve «no guardado»");
assert(G.error === "cuota", "y explica por qué (cuota), no falla en silencio");
assert(G.estado.socios.length === nSocios, "y en memoria sigue todo entero");
CUOTA = Infinity;

/* ============================================================
   11 · LA PUERTA: código, decisión y bloqueo por impago
   ------------------------------------------------------------
   Reglas que no se pueden negociar: un código solo pasa si el
   socio existe, está activo, no debe nada vencida y no está ya
   dentro. Y NUNCA en silencio: siempre hay motivo.
   ============================================================ */
console.log("— la puerta —");
const codigo = codigoAcceso(socio.id);
assert(Boolean(codigo) && /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/.test(codigo), `el código tiene forma de código (${codigo})`);
assert(codigoAcceso(socio.id) === codigo, "el mismo socio siempre tiene el mismo código");
assert(codigoAcceso(socio.id, "otro-secreto") !== codigo, "cambiar el secreto cambia el código");
assert(!codigo.includes("0") && !codigo.includes("1") && !codigo.includes("O") && !codigo.includes("I"),
  "el alfabeto no tiene letras ni números que se confundan al teclear");
assert(codigoAcceso("") === null, "sin socio no hay código");
assert(codigoAcceso(null) === null, "ni con null");
assert(normalizaCodigo(" ab-12 ") === "AB12", "el lector y el tecleo llevan al mismo sitio");
assert(normalizaCodigo("a-b-c-d-e") === "ABCDE", "se ignoran los separadores que metan el lector");
assert(socioPorCodigo(codigo, G.estado)?.id === socio.id, "el código devuelve a su socio");
assert(socioPorCodigo("ABCDEFGH", G.estado) === null, "un código de otra persona no entra");
assert(socioPorCodigo("", G.estado) === null, "un código vacío no revienta");
assert(socioPorCodigo(codigo, null) === null, "ni contra un estado vacío");

// --- socio al día: se pasa ---
G.registrarAcceso(socio.id, "salida");   // por si estaba dentro
const impagadosAntes = G.estado.pagos.length;
G.registrarPago({ socioId: socio.id, importe: 999, concepto: "test" });
const pasa = validarAcceso(codigo, G.estado, { hoy });
assert(pasa.ok === true, "un socio al día pasa la puerta");
assert(pasa.socio && pasa.socio.id === socio.id, "y la decisión sabe de quién es");
assert(pasa.motivo === null, "cuando pasa, no hay motivo");
assert(G.estado.pagos.length === impagadosAntes + 1, "el pago del test se registró de verdad");

// --- el que paga POR ADELANTADO no se bloquea ---
// Es el fallo más caro de este módulo: periods caducados ≠ dinero
// vencido. Un socio al año no puede quedarse en la puerta.
const adelanta = G.altaSocio({ nombre: "Irene Adelanta", alta: sumarDias(hoy, -(plan.plan.dias * 6)) }).socio;
G.asignarPlan(adelanta.id, plan.plan.id);
const dAntes = G.deudaDe(adelanta.id, hoy);
assert(dAntes.cuotas >= 5, `tiene ${dAntes.cuotas} periodos caducados...`);
G.registrarPago({ socioId: adelanta.id, importe: dAntes.debe, concepto: "año completo" });
const dPagada = G.deudaDe(adelanta.id, hoy);
assert(dPagada.cuotas >= 5, "…pero con la cuota en curso ya pagada");
assert(dPagada.importe === 0, "y debe CERO");
assert(dPagada.vencido === 0, "y no tiene nada vencido");
assert(dPagada.vencida === false, "«vencida» es dinero vencido, no periodos caducados: con el año pagado NO está vencida");
assert(validarAcceso(codigoAcceso(adelanta.id), G.estado, { hoy }).ok === true,
  "quien ha pagado el año entero PASA la puerta, aunque le hayan caducado los periodos");
assert(!avisosPendientes(G.estado, hoy).some((a) => a.socioId === adelanta.id && a.tipo === "impago"),
  "y no recibe un aviso de impago que no existe");
assert(!watchlist(G.estado, hoy).some((x) => x.socio.id === adelanta.id && x.deuda?.vencida),
  "ni aparece en la lista de morosos por un impago inexistente");

// --- socio deudor: NO pasa, y se explica ---
// El alta va atrás a propósito: con alta de HOY aún no ha vencido
// ninguna cuota (una membresía empieza cuando empieza), así que un
// deudor de verdad necesita al menos un periodo entero transcurrido.
const deudor = G.altaSocio({ nombre: "Marta Deuda", alta: sumarDias(hoy, -(plan.plan.dias + 10)) }).socio;
G.asignarPlan(deudor.id, plan.plan.id);
assert(G.deudaDe(deudor.id, hoy).vencida, "el socio lleva un periodo entero sin pagar");
{
  // La cifra que se dice en la puerta es lo VENCIDO, no el saldo: la
  // cuota en curso todavía no se puede exigir.
  const dDeuda = G.deudaDe(deudor.id, hoy);
  assert(dDeuda.cuotas >= 1, `tiene ${dDeuda.cuotas} cuota(s) vencida(s)`);
  assert(dDeuda.vencido > 0 && dDeuda.vencido <= dDeuda.importe,
    `lo vencido (${dDeuda.vencido}) no supera la cuenta total (${dDeuda.importe})`);
  assert(dDeuda.vencido < dDeuda.importe,
    `y son MENOS: incluir la cuota en curso inflaría la deuda (${dDeuda.vencido} < ${dDeuda.importe})`);
  assert(Math.abs(dDeuda.vencido - dDeuda.cuotas * plan.plan.precio) < 0.01,
    "lo vencido es exactamente el precio de las cuotas vencidas");
}
const vDeuda = validarAcceso(codigoAcceso(deudor.id), G.estado, { hoy });
assert(vDeuda.ok === false, "con cuotas vencidas no se pasa");
assert(vDeuda.motivo === "impagado", "el motivo es el impago, no un código de error");
assert(/\d/.test(vDeuda.detalle || ""), "y el motivo trae la cifra de lo que debe");
assert(vDeuda.detalle.includes(G.deudaDe(deudor.id, hoy).vencido.toFixed(2).replace(".", ",")),
  "y la cifra es lo VENCIDO, no el saldo con la cuota en curso dentro");
assert(G.dentro(deudor.id) === false, "y NO se ha fichado entrada por la puerta");

// --- la deferencia es explícita, no un milagro ---
const vDeferido = validarAcceso(codigoAcceso(deudor.id), G.estado, { hoy, ignorarImpago: true });
assert(vDeferido.ok === true, "quien atiende puede deferir la entrada");
assert(G.dentro(deudor.id) === false,
  "el dominio solo DECIDE: la visita la ficha quien opera la puerta, no una regla");

// --- baja, pausa y desconocido ---
G.darDeBaja(deudor.id);
assert(validarAcceso(codigoAcceso(deudor.id), G.estado, { hoy }).motivo === "socio-de-baja", "un socio dado de baja no entra");
G.reactivar(deudor.id);
G.editarSocio(deudor.id, { estado: "pausado" });
assert(validarAcceso(codigoAcceso(deudor.id), G.estado, { hoy }).motivo === "socio-pausado", "uno en pausa no entra");
assert(validarAcceso("ZZZZ-ZZZZ", G.estado, { hoy }).motivo === "codigo-desconocido", "un código desconocido no se cuela");
assert(validarAcceso("ZZZZ-ZZZZ", G.estado, { hoy }).socio === undefined, "y no se inventa de quién es");

// --- ya está dentro ---
G.editarSocio(deudor.id, { estado: "activo" });
G.registrarAcceso(deudor.id, "entrada");
assert(validarAcceso(codigoAcceso(deudor.id), G.estado, { hoy, ignorarImpago: true }).motivo === "ya-dentro", "no se ficha dos veces seguidas");
assert(G.registrarAcceso(deudor.id, "entrada").ok === false, "ni desde el atajo de la ficha");
G.registrarAcceso(deudor.id, "salida");
assert(validarAcceso(codigoAcceso(deudor.id), G.estado, { hoy, ignorarImpago: true }).ok === true, "tras la salida, se vuelve a pasar");

// --- sin estado, sin reventón ---
assert(validarAcceso("ABCDEFGH", {}, { hoy }).ok === false, "la puerta aguanta un estado vacío");
assert(validarAcceso(codigo, { socios: "no es una lista" }, { hoy }).ok === false, "y una lista corrupta");

/* ============================================================
   12 · AVISOS: la cola que hay que trabajar hoy
   ------------------------------------------------------------
   Regla: un aviso explica DE DÓNDE sale. Sin proveedor de SMS ni
   de correo, la app genera el texto y lo dice. No finge avisos.
   ============================================================ */
console.log("— avisos —");
const avisos = avisosPendientes(G.estado, hoy);
assert(Array.isArray(avisos), "la cola de avisos es una lista");
assert(avisos.every((a) => a.texto && a.motivo && a.socioId), "cada aviso trae texto, motivo y de quién es");
assert(avisos.every((a) => !a.enviado && !a.enviadoEn), "ningún aviso se da por enviado: aquí no se manda nada");
assert(avisos.some((a) => a.socioId === deudor.id && a.tipo === "impago"), "el deudor tiene aviso de impago");
assert(avisos.some((a) => a.socioId === socio.id && a.tipo === "inactivo"),
  "un socio que no viene hace 14 días tiene aviso de inactividad");
const idsAviso = avisos.map((a) => a.id);
assert(new Set(idsAviso).size === idsAviso.length, "no hay dos avisos con el mismo id (se pueden volver a generar)");
assert(avisosPendientes(G.estado, hoy).length === avisos.length, "generar la cola dos veces da lo mismo: no se duplica");
assert(Array.isArray(avisosPendientes({}, hoy)) && avisosPendientes({}, hoy).length === 0, "sin socios no hay avisos");

// El primer periodo va del alta a alta+dias-1 (ambos inclusive).
const venciendo = G.altaSocio({ nombre: "Nuria Vence", alta: sumarDias(hoy, -(plan.plan.dias - 4)) }).socio;
G.asignarPlan(venciendo.id, plan.plan.id);
const hasta = finDeMembresia(venciendo, plan.plan, hoy);
assert(Boolean(hasta), "la membresía tiene fecha de fin");
assert(diasEntre(hoy, hasta) === 3, "y le quedan 3 días para vencer");
assert(avisosPendientes(G.estado, hoy).some((a) => a.socioId === venciendo.id && a.tipo === "plan-proximo"),
  "a tres días de vencerse, sale el aviso de renovación");
assert(avisosPendientes(G.estado, hasta).some((a) => a.socioId === venciendo.id && a.tipo === "vence-hoy"),
  "el día que vence, el aviso cambia a «vence hoy»");
assert(!avisosPendientes(G.estado, sumarDias(hoy, 4)).some((a) => a.tipo === "plan-proximo"),
  "pasado el vencimiento, el aviso de renovación desaparece: no se avisa de algo que ya no está en el horizonte");

/* ============================================================
   13 · INFORMES: cifras que salen de los registros
   ------------------------------------------------------------
   Regla: ningún informe estima. Un mes sin cobros sale a 0, y se
   dice. Una proyección jamás se mezcla con un dato cerrado.
   ============================================================ */
console.log("— informes —");
const serie = facturacionMensual(G.estado, 6, hoy);
assert(serie.length === 6, "la serie de facturación trae 6 meses");
assert(serie.every((m) => Number.isFinite(m.importe) && m.importe >= 0), "ningún mes sale con una cifra rota o negativa");
assert(serie[5].clave === hoy.slice(0, 7), "el último mes de la serie es el mes en curso");
const mesActual = serie[5];
const esperadoMes = G.estado.pagos.filter((p) => String(p.fecha || "").slice(0, 7) === hoy.slice(0, 7))
  .reduce((a, p) => a + p.importe, 0);
assert(Math.abs(mesActual.importe - esperadoMes) < 0.01, "el mes en curso suma exactamente los cobros registrados");
assert(mesActual.operaciones === G.estado.pagos.filter((p) => String(p.fecha || "").slice(0, 7) === hoy.slice(0, 7)).length,
  "y el número de operaciones también");

const asistencia = asistenciaDiaria(G.estado, 14, hoy);
assert(asistencia.length === 14, "la asistencia trae 14 días");
assert(asistencia[13].fecha === hoy, "el último día es hoy");
assert(asistencia.every((d) => Number.isInteger(d.visitas) && d.visitas >= 0), "ningún día trae visitas rotas");
const visitasHoyReales = G.estado.accesos.filter((a) => String(a.entrada || "").slice(0, 10) === hoy).length;
assert(asistencia[13].visitas === visitasHoyReales, "las visitas de hoy son las entradas de hoy, ni una más");

const ocupacion = ocupacionClases(G.estado, hoy);
assert(ocupacion.every((c) => c.ocupadas <= c.aforo), "ninguna clase reporta más ocupados que aforo");
assert(ocupacion.every((c) => c.pct >= 0 && c.pct <= 100), "los porcentajes de ocupación no se salen de 0 a 100");
assert(Array.isArray(ocupacionClases({}, hoy)), "la ocupación aguanta un estado vacío");

const lista = watchlist(G.estado, hoy);
assert(lista.every((x) => x.socio && x.riesgo), "cada llamada tiene su socio y su riesgo");
assert(lista.every((x) => x.riesgo.nivel === "alto" || (x.deuda && x.deuda.vencida)), "solo entra en la lista quien tiene un motivo real");
assert(lista.length === 0 || lista[0].riesgo.puntos >= lista[lista.length - 1].riesgo.puntos, "la lista va de más urgencia a menos");
assert(lista.every((x) => x.riesgo.motivos.every((m) => m.texto)), "y todo motivo explica por qué, en palabras");

const deuda = morosos(G.estado, hoy);
assert(deuda.every((x) => x.deuda.vencida && x.deuda.vencido > 0), "en morosos solo entra quien debe de verdad, y lo que debe está vencido");
assert(deuda.every((x) => Number.isInteger(x.dias) && x.dias >= 0), "los días de mora son un número, no un texto");
assert(deuda.length === 0 || deuda[0].dias >= deuda[deuda.length - 1].dias, "y se ordenan por días de mora");

const resumen = resumenMensual(G.estado, null, hoy);
assert(resumen.mes === hoy.slice(0, 7), "el resumen es del mes en curso si no se le dice otro");
assert(resumen.operaciones === 0 ? resumen.ticket === 0 : resumen.ticket > 0, "sin operaciones, el ticket medio es 0 y no se inventa");
assert(resumenMensual(G.estado, "1999-01", hoy).cobros === 0, "un mes sin datos sale a cero, no a una estimación");
assert(resumenMensual({}, "1999-01", hoy).visitas === 0, "el resumen aguanta un estado vacío");

const csv = aCSV([{ socio: "Pepe; El Grande", importe: 10 }, { socio: 'Cita "con comillas"', importe: 20 }]);
const lineas = csv.split("\n");
assert(lineas[0] === "socio;importe", "la primera línea del CSV son las cabeceras");
assert(lineas.length === 3, "una línea por fila, más la de cabeceras");
assert(lineas[1] === '"Pepe; El Grande";10', "un punto y coma dentro del dato NO parte la columna (Excel lo entendería mal)");
assert(lineas[2] === '"Cita ""con comillas""";20', "las comillas del dato se escapan duplicándolas");
assert(aCSV([], ["a", "b"]) === "a;b", "sin filas, solo la cabecera: no peta");
assert(aCSV([]) === "", "ni cabecera ni filas: cadena vacía, no un error");

/* ============================================================
   14 · EL PROGRAMA DEL SOCIO
   ============================================================ */
console.log("— programa del socio —");
assert(G.estado.programas && typeof G.estado.programas === "object", "el estado guarda el programa del socio");
assert(G.asignarPrograma(socio.id, "op_upper").ok, "se asigna un programa existente");
assert(G.programa(socio.id) === "op_upper", "y se lee el mismo");
assert(G.asignarPrograma(socio.id, "no-existe").ok === false, "un programa que no existe no se asigna");
assert(G.asignarPrograma(socio.id, "../../etc/passwd").ok === false, "ni una ruta rara: la clave es texto plano acotado");
assert(G.asignarPrograma("socio-inventado", "op_upper").ok === false, "ni a un socio que no existe");
assert(G.programa(socio.id) === "op_upper", "un intento fallido NO borra el programa que ya tenía");
assert(G.asignarPrograma(socio.id, null).ok && G.programa(socio.id) === null, "se puede quitar el programa");

/* ============================================================
   15 · ENTRADA HOSTIL
   ============================================================ */
console.log("— entradas hostiles —");
assert(!puedeReservar(null, socio, G.estado, hoy).ok, "reservar una clase inexistente no revienta");
assert(!puedeReservar(clase.clase, null, G.estado, hoy).ok, "reservar sin socio no revienta");
assert(G.editarSocio(socio.id, { nombre: "" }).ok === false, "un nombre vacío no borra el nombre");
assert(!nuevoPlan({ nombre: "X", precio: NaN }).ok, "NaN no es un precio");
assert(!nuevaClase({ nombre: "X", aforo: "diez" }).ok, "«diez» no es un aforo");
const conBasura = registrarAcceso(socio.id, "entrada", { accesos: "no es una lista" });
assert(Boolean(conBasura && "ok" in conBasura), "el dominio no revienta si le llega una lista corrupta");
store.set("bayona.centro.v1", JSON.stringify({
  socios: [{ id: "s1", nombre: "Ana" }], accesos: "no es una lista", reservas: 7, programas: "no es un mapa",
}));
G.init();
assert(Array.isArray(G.estado.accesos) && G.estado.accesos.length === 0, "el store limpia un guardado con tipos raros");
assert(G.estado.socios.length === 1, "y conserva lo que sí es válido");
assert(G.estado.programas && !Array.isArray(G.estado.programas), "y un `programas` corrupto tampoco entra en el estado");

/* ============================================================
   16 · LA INTERFAZ ESTÁ CABLEADA Y CON ESTILO
   ============================================================ */
console.log("— interfaz y estilo —");
const leer = (p) => readFileSync(join(root, p), "utf8");
const index = leer("index.html");
const pro = leer("css/pro.css");
for (const f of [
  "js/gym/model.js", "js/gym/store.js", "js/gym/acceso.js", "js/gym/informes.js",
  "js/ui/centro.js", "js/ui/cuotas.js", "js/ui/agenda.js",
  "js/ui/acceso.js", "js/ui/portal.js", "js/ui/informes.js",
]) {
  assert(leer("sw.js").includes(`./${f}`), `el service worker precachea ${f}`);
}
assert(/\.\/ui\/centro\.js/.test(leer("js/ui.js")), "la app importa el centro al arrancar");
for (const f of ["ui/acceso.js", "ui/portal.js", "ui/informes.js"]) {
  assert(leer("js/ui.js").includes(`"./${f}"`), `la app importa ${f} al arrancar`);
}
assert(/'Centro'/.test(leer("js/ui/fitness.js")), "el centro tiene su sitio en el menú");
for (const seccion of ["centro", "socios", "cuotas", "agenda", "acceso", "portal", "informes"]) {
  assert(new RegExp(`${seccion}\\s*:`).test(leer("js/ui/shared.js")), `«${seccion}» tiene título y lugar`);
}
// ninguna clase gym-* sin estilo: es el mismo control que el del tablero
const fuente = leer("js/ui/centro.js") + leer("js/ui/cuotas.js") + leer("js/ui/agenda.js")
  + leer("js/ui/acceso.js") + leer("js/ui/portal.js") + leer("js/ui/informes.js");
const clases = [...new Set([...fuente.matchAll(/["'`\s]((?:gym)-[a-z-]+)["'`\s]/g)].map((m) => m[1]))];
const sinEstilo = clases.filter((c) => !pro.includes(`.${c}`));
assert(sinEstilo.length === 0, `las ${clases.length} clases gym-* tienen estilo`, sinEstilo.join(", "));
assert(clases.length >= 12, `la pantalla del centro tiene piezas propias (${clases.length} clases)`);
// todo texto de puerta, avisos e informes sale del catálogo
const i18n = leer("js/i18n.js");
for (const prefijo of ["gym.puerta.", "gym.portal.", "gym.informe.", "gym.aviso.", "gym.rechazo."]) {
  assert(new RegExp(`"${prefijo}`).test(i18n), `el catálogo tiene claves ${prefijo}*`);
}
// el dominio NO escribe pantallas: los motivos son códigos, no frases
const dominioAcceso = leer("js/gym/acceso.js");
assert(Array.isArray(MOTIVOS_RECHAZO) && MOTIVOS_RECHAZO.length === 5, "el dominio expone los códigos de rechazo, no sus frases");
assert(!/[«"]Ese código no es de ningún socio/.test(dominioAcceso), "el texto de la puerta vive en el catálogo, no en el dominio");

/* ============================================================
   RESULTADO
   ============================================================ */
console.log(`\n  ${pass} ok · ${fail} fallos`);
if (fallos.length) {
  console.log("\n  primeros fallos:");
  fallos.forEach((f) => console.log("   ❌ " + f));
}
process.exit(fail ? 1 : 0);
