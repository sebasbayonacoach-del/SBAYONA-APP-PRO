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
  riesgoBaja, kpis, seSolapan, finDeClase, dia, sumarDias, PERIODOS,
} from "../js/gym/model.js";

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
const sinPagos = deudaDe(socio, plan.plan, [], hoy);
assert(sinPagos.importe > 0, "sin pagos hay deuda");
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
   11 · ENTRADA HOSTIL
   ============================================================ */
console.log("— entradas hostiles —");
assert(!puedeReservar(null, socio, G.estado, hoy).ok, "reservar una clase inexistente no revienta");
assert(!puedeReservar(clase.clase, null, G.estado, hoy).ok, "reservar sin socio no revienta");
assert(G.editarSocio(socio.id, { nombre: "" }).ok === false, "un nombre vacío no borra el nombre");
assert(!nuevoPlan({ nombre: "X", precio: NaN }).ok, "NaN no es un precio");
assert(!nuevaClase({ nombre: "X", aforo: "diez" }).ok, "«diez» no es un aforo");
const conBasura = registrarAcceso(socio.id, "entrada", { accesos: "no es una lista" });
assert(Boolean(conBasura && "ok" in conBasura), "el dominio no revienta si le llega una lista corrupta");
store.set("bayona.centro.v1", JSON.stringify({ socios: [{ id: "s1", nombre: "Ana" }], accesos: "no es una lista", reservas: 7 }));
G.init();
assert(Array.isArray(G.estado.accesos) && G.estado.accesos.length === 0, "el store limpia un guardado con tipos raros");
assert(G.estado.socios.length === 1, "y conserva lo que sí es válido");

/* ============================================================
   12 · LA INTERFAZ ESTÁ CABLEADA Y CON ESTILO
   ============================================================ */
console.log("— interfaz y estilo —");
const leer = (p) => readFileSync(join(root, p), "utf8");
const index = leer("index.html");
const pro = leer("css/pro.css");
for (const f of ["js/gym/model.js", "js/gym/store.js", "js/ui/centro.js", "js/ui/cuotas.js", "js/ui/agenda.js"]) {
  assert(leer("sw.js").includes(`./${f}`), `el service worker precachea ${f}`);
}
assert(/\.\/ui\/centro\.js/.test(leer("js/ui.js")), "la app importa el centro al arrancar");
assert(/'Centro'/.test(leer("js/ui/fitness.js")), "el centro tiene su sitio en el menú");
for (const seccion of ["centro", "socios", "cuotas", "agenda"]) {
  assert(new RegExp(`${seccion}\\s*:`).test(leer("js/ui/shared.js")), `«${seccion}» tiene título y lugar`);
}
// ninguna clase gym-* sin estilo: es el mismo control que el del tablero
const fuente = leer("js/ui/centro.js") + leer("js/ui/cuotas.js") + leer("js/ui/agenda.js");
const clases = [...new Set([...fuente.matchAll(/["'`\s]((?:gym)-[a-z-]+)["'`\s]/g)].map((m) => m[1]))];
const sinEstilo = clases.filter((c) => !pro.includes(`.${c}`));
assert(sinEstilo.length === 0, `las ${clases.length} clases gym-* tienen estilo`, sinEstilo.join(", "));
assert(clases.length >= 12, `la pantalla del centro tiene piezas propias (${clases.length} clases)`);

/* ============================================================
   RESULTADO
   ============================================================ */
console.log(`\n  ${pass} ok · ${fail} fallos`);
if (fallos.length) {
  console.log("\n  primeros fallos:");
  fallos.forEach((f) => console.log("   ❌ " + f));
}
process.exit(fail ? 1 : 0);
