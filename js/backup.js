// ============================================================
// BAYONA · RED DE SEGURIDAD DEL PROGRESO
// ------------------------------------------------------------
// La pregunta «¿cómo sé que no pierdo mi progreso?» tiene que
// poder responderse con pruebas, no con buenas intenciones.
//
// El problema real: el progreso vivía en UNA clave de localStorage.
// Una escritura corrupta, una cuota llena, o dos pestañas abiertas
// al mismo tiempo bastaban para perderlo todo, sin vuelta atrás.
//
// Lo que hace este módulo:
//
//   1. RESPALDO.   Cada guardado correcto deja además una foto del
//      estado en un anillo de 8 instantáneas. No es un historial
//      eterno: es la red que evita perder un día de trabajo por un
//      byte malo.
//   2. CUOTA.      Si localStorage está lleno, no se tira el progreso:
//      se sueltan primero las cosas prescindibles (notas de voz,
//      logs de series viejas, diario) y se reintenta. Solo si
//      tampoco así cabe, se avisa.
//   3. RECUPERACIÓN. Al abrir la app, si la partida principal no
//      parsea, se recorre el anillo de la instantánea más reciente
//      a la más antigua hasta encontrar una válida.
//   4. REPARACIÓN A MANO. El usuario puede volver a un punto
//      concreto desde AJUSTES, sin tocar una línea de código.
//   5. DOS PESTANAS. Si otra pestaña guarda, esta lo nota en vez de
//      sobrescribir en silencio lo que acabas de registrar.
//
// Todo es comprobable sin navegador: recibe el almacenamiento como
// parámetro, así que la batería de pruebas lo ejercita entero.
// ============================================================

const RING = "bayona.backup.v1";
const MAIN = "bayona.save.v2";
const CORRUPT = "bayona.save.corrupt";
const SLOTS = 8;

/** Cuánto se suelta de cada cosa cuando la cuota está llena. */
const RECORTES = [
  ["voice", (d) => { const n = d.voice.length; d.voice = d.voice.slice(-1); return `notas de voz (${n}→1)`; }],
  ["journey", (d) => { const n = d.journey.length; d.journey = d.journey.slice(-5); return `bitácora (${n}→5)`; }],
  ["history", (d) => { const n = d.history.length; d.history = d.history.slice(-30); return `historial (${n}→30)`; }],
  ["setLog", (d) => {
    let n = 0;
    for (const h of d.history || []) if (h.setLog?.length) { n += h.setLog.length; h.setLog = h.setLog.slice(-10); }
    if (d.today?.setLog?.length) { n += d.today.setLog.length; d.today.setLog = d.today.setLog.slice(-10); }
    return `series registradas (${n}→10/día)`;
  }],
];

const mem = () => (typeof localStorage !== "undefined" ? localStorage : null);

/* ---------- huella barata para no llenar el anillo de copias iguales ---------- */
function huella(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 7) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${s.length}:${h}`;
}

/* ---------- anillo ---------- */
export function leerAnillo(st = mem()) {
  if (!st) return { slots: [] };
  try {
    const v = JSON.parse(st.getItem(RING) || "null");
    if (v && Array.isArray(v.slots)) return v;
  } catch { /* anillo ilegible: se empieza uno nuevo */ }
  return { slots: [] };
}

function escribirAnillo(anillo, st) {
  try { st.setItem(RING, JSON.stringify(anillo)); return true; }
  catch { return false; }
}

/**
 * Deja una instantánea del progreso. Si el estado es idéntico al
 * último, no se guarda: el anillo sirve para cambios, no para copiar.
 */
export function respaldar(data, st = mem()) {
  if (!st || !data) return false;
  let serie;
  try { serie = JSON.stringify(data); } catch { return false; }
  const h = huella(serie);
  const anillo = leerAnillo(st);
  if (anillo.slots.length && anillo.slots[anillo.slots.length - 1].h === h) return false;

  anillo.slots.push({ at: Date.now(), h, data });
  while (anillo.slots.length > SLOTS) anillo.slots.shift();
  if (!escribirAnillo(anillo, st)) {
    // el anillo es lo accesorio: si no cabe, se suelta a sí mismo
    try { st.removeItem(RING); st.setItem(RING, JSON.stringify({ slots: anillo.slots.slice(-2) })); }
    catch { /* sin red: el estado principal sigue siendo el bueno */ }
  }
  return true;
}

/** Instantáneas disponibles, de la más reciente a la más antigua. */
export function instantaneas(st = mem()) {
  return leerAnillo(st).slots.slice().reverse();
}

/* ---------- escritura a prueba de cuota ---------- */
/**
 * Guarda los datos y, si no caben, suelta lo prescindible y reintenta.
 * Devuelve qué hubo que soltar para poder explicárselo al usuario.
 * @returns {{ok:boolean, soltado:string[]}}
 */
export function guardarSeguro(datos, st = mem(), clave = MAIN) {
  if (!st) return { ok: false, soltado: [] };
  let serie;
  try { serie = JSON.stringify(datos); }
  catch (e) { return { ok: false, soltado: [], error: "no serializable" }; }

  const intentar = () => { st.setItem(clave, serie); };

  try { intentar(); return { ok: true, soltado: [] }; } catch { /* seguimos */ }

  // el recorte se hace sobre una copia: el estado en memoria sigue intacto
  const copia = JSON.parse(serie);
  const soltado = [];
  for (const [, fn] of RECORTES) {
    try {
      const msg = fn(copia);
      if (msg) soltado.push(msg);
      serie = JSON.stringify(copia);
      intentar();
      return { ok: true, soltado };
    } catch { /* siguiente nivel de recorte */ }
  }
  return { ok: false, soltado, error: "almacenamiento lleno" };
}

/* ---------- recuperación ---------- */
const parsea = (txt) => {
  if (!txt) return null;
  try {
    const d = JSON.parse(txt);
    return d && typeof d === "object" && !Array.isArray(d) ? d : null;
  } catch { return null; }
};

/**
 * El mejor dato disponible: la partida principal si es válida; si no,
 * la instantánea más reciente que parsee.
 * @returns {{data:object, de:string}|null}
 */
export function recuperar(st = mem()) {
  const principal = parsea(st?.getItem(MAIN));
  if (principal) return { data: principal, de: "partida" };

  for (const s of instantaneas(st)) {
    const d = parsea(JSON.stringify(s.data));
    if (d) return { data: d, de: `instantánea ${new Date(s.at).toLocaleString("es-ES")}` };
  }
  // último recurso: el_blob corrupto que el propio juego guardó
  const bruto = st?.getItem(CORRUPT);
  const d = parsea(bruto);
  if (d) return { data: d, de: "copia de emergencia" };
  return null;
}

/** Devuelve una instantánea concreta a la partida principal. */
export function restaurar(indice = 0, st = mem()) {
  if (!st) return false;
  const s = instantaneas(st)[indice];
  if (!s?.data) return false;
  try {
    st.setItem(MAIN, JSON.stringify(s.data));
    return true;
  } catch { return false; }
}

/** Presenta una instantánea sin escribir: para que el usuario decida. */
export function previsualizar(indice = 0, st = mem()) {
  const s = instantaneas(st)[indice];
  if (!s?.data) return null;
  const d = s.data;
  return {
    at: s.at,
    xp: d.xp || 0,
    nivel: d.xp || 0, // el nivel lo calcula el estado al cargar
    entrainamientos: d.stats?.workouts || 0,
    series: d.stats?.sets || 0,
    fecha: d.today?.date || null,
  };
}

/* ---------- diagnóstico para la UI ---------- */
export function diagnostico(st = mem()) {
  const anillo = leerAnillo(st);
  const principal = parsea(st?.getItem(MAIN));
  const bytes = (() => { try { return (st?.getItem(MAIN) || "").length; } catch { return 0; } })();
  return {
    partidaLegible: Boolean(principal),
    instantaneas: anillo.slots.length,
    maxima: SLOTS,
    bytesPartida: bytes,
    corrupto: Boolean(st?.getItem(CORRUPT)),
    ultimoRespaldo: anillo.slots.length ? anillo.slots[anillo.slots.length - 1].at : null,
  };
}

/* ---------- dos pestañas ---------- */
/**
 * Detecta que otra pestaña guardó. Sin esto, la segunda en escribir
 * borra en silencio lo que la primera acababa de registrar.
 * @returns {()=>void} función para dejar de vigilar
 */
export function vigilarOtraPestana(alCambiar, st = mem()) {
  if (typeof addEventListener !== "function") return () => {};
  const MAIN_URL = `http://x/${MAIN}`;
  const onStorage = (e) => {
    if (e.key !== MAIN) return;
    // e.newValue === null significa que la otra pestaña BORRÓ la partida
    alCambiar({ tipo: e.newValue === null ? "borrado" : "guardado", de: e.storageArea ? "otra" : "esta" });
  };
  addEventListener("storage", onStorage);
  return () => removeEventListener("storage", onStorage);
}

export { MAIN, RING, CORRUPT, SLOTS };
