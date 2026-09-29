// ============================================================
// BAYONA · CENTRO — persistencia del gimnasio
// ------------------------------------------------------------
// Los datos del centro (socios, cuotas, reservas, accesos) viven
// en su PROPIA clave, aparte de la partida del atleta: son datos de
// OTRAS personas y no deben mezclarse con el progreso de quien
// entrena en su móvil.
//
// Red de seguridad propia, y no la del atleta a propósito: los
// recortes que sirven para una partida (bitácora, notas de voz) no
// sirven aquí. Aquí lo prescindible es OTRO: accesos antiguos y
// reservas ya cerradas. Un centro con 200 socios no puede perder su
// ficha por un byte malo.
import {
  reservar as reservarEn, cancelarReserva as cancelarEn, registrarAcceso as accesoEn, estaDentro,
  nuevoSocio, nuevoPlan, nuevaClase,
  dia, riesgoBaja, deudaDe, visitasDe,
} from "./model.js";

const KEY = "bayona.centro.v1";
const ANILLO = "bayona.centro.anillo.v1";
const CORRUPT = "bayona.centro.corrupt";
const SLOTS = 5;

const VACIO = () => ({
  schema: 1,
  nombreGimnasio: "",
  socios: [],
  planes: {},
  membresias: {},   // socioId → planId
  clases: [],
  reservas: [],
  accesos: [],
  pagos: [],
  notas: {},        // socioId → [{de, texto}]
  actualizado: null,
});

/* ============================================================
   ANILLO DE SEGURIDAD (propio del centro)
   ============================================================ */
const mem = () => (typeof localStorage !== "undefined" ? localStorage : null);

function leerAnillo(st) {
  if (!st) return [];
  try {
    const j = JSON.parse(st.getItem(ANILLO) || "[]");
    return Array.isArray(j) ? j.filter((s) => s && s.data && typeof s.data === "object") : [];
  } catch { return []; }
}

/**
 * Guarda con red: si la cuota está llena, suelta lo RECIENTE-old
 * (accesos, reservas) antes que la lista de socios. Devuelve qué
 * hubo que soltar para poder decirlo en voz alta.
 */
function guardarSeguro(estado, st = mem()) {
  if (!st) return { ok: false, soltado: [] };
  let serie;
  try { serie = JSON.stringify(estado); } catch { return { ok: false, soltado: [], error: "no serializable" }; };

  const anilloPrevio = leerAnillo(st);
  let estadoAnterior = null;
  try {
    const viejo = st.getItem(KEY);
    estadoAnterior = viejo ? JSON.parse(viejo) : null;
  } catch { /* estaba corrupto: no hay anterior que salvar */ }

  /**
   * Escribe liberando ANTES el anillo viejo: son copias enteras del
   * estado y es lo primero que ocupa. Sin esto, un guardado que ya no
   * cabe nunca podría encogerse (setItem suma el valor anterior).
   */
  const escribir = (maxSlots, liberarPrincipal) => {
    if (liberarPrincipal) st.removeItem(KEY);
    st.removeItem(ANILLO);
    st.setItem(KEY, serie);
    st.setItem(ANILLO, JSON.stringify(
      [...anilloPrevio, { at: new Date().toISOString(), data: JSON.parse(serie) }].slice(-maxSlots),
    ));
  };

  try { escribir(SLOTS, false); return { ok: true, soltado: [], datos: estado }; } catch { /* seguimos */ }

  // Cuota llena: primero se suelta lo pesado y RECIENTE-old. La lista
  // de socios NUNCA se recorta: es el dato que no se puede rehacer.
  //
  // OJO: lo recortado se DEVUELVE (`datos`) para que el estado en
  // memoria quede IGUAL a lo que está en disco. Si no, la app
  // mostraría accesos que en realidad no se han guardado.
  const soltado = [];
  for (const campo of ["accesos", "reservas"]) {
    try {
      const copia = JSON.parse(serie);
      const n = copia[campo]?.length || 0;
      copia[campo] = (copia[campo] || []).slice(-50);
      serie = JSON.stringify(copia);
      escribir(SLOTS, false);
      return { ok: true, soltado: [`${campo} (${n}→50)`], datos: copia };
    } catch { /* siguiente nivel */ }
  }
  // Último recurso: el estado anterior se libera y el nuevo, recortado,
  // ocupa su sitio. Si tampoco cabe, se conserva AL MENOS el anterior.
  try {
    escribir(1, true);
    return { ok: true, soltado: [...soltado, "anillo de seguridad (5→1)"], datos: JSON.parse(serie) };
  } catch {
    try {
      if (estadoAnterior) st.setItem(ANILLO, JSON.stringify([{ at: new Date().toISOString(), data: estadoAnterior }]));
      return { ok: false, soltado, error: "almacenamiento lleno" };
    } catch { return { ok: false, soltado, error: "almacenamiento lleno" }; }
  }
}

/** Última versión válida: principal → anillo → copia de emergencia. */
function recuperarSeguro(st = mem()) {
  if (!st) return null;
  const parsea = (txt) => {
    if (!txt) return null;
    try { const d = JSON.parse(txt); return d && typeof d === "object" && !Array.isArray(d) ? d : null; } catch { return null; }
  };
  const principal = parsea(st.getItem(KEY));
  if (principal) return { data: principal, de: "centro" };
  for (const s of leerAnillo(st).slice().reverse()) {
    const d = parsea(JSON.stringify(s.data));
    if (d) return { data: d, de: `instantánea ${new Date(s.at).toLocaleString("es-ES")}` };
  }
  return parsea(st.getItem(CORRUPT)) ? { data: parsea(st.getItem(CORRUPT)), de: "copia de emergencia" } : null;
}

/* ============================================================
   ESTADO
   ============================================================ */
const oyentes = new Set();
export const alCambiar = (fn) => { oyentes.add(fn); return () => oyentes.delete(fn); };
const avisar = () => oyentes.forEach((fn) => { try { fn(G.estado); } catch { /* un oyente roto no tumba la app */ } });

/** Normaliza lo que venga de disco: un tipo raro nunca entra en el estado. */
function sanear(bruto) {
  const base = VACIO();
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return base;
  const lista = (v, chequeo) => (Array.isArray(v) ? v.filter(chequeo) : []);
  return {
    schema: 1,
    nombreGimnasio: typeof bruto.nombreGimnasio === "string" ? bruto.nombreGimnasio : "",
    socios: lista(bruto.socios, (s) => s && typeof s.id === "string" && typeof s.nombre === "string"),
    planes: bruto.planes && typeof bruto.planes === "object" && !Array.isArray(bruto.planes) ? bruto.planes : {},
    membresias: bruto.membresias && typeof bruto.membresias === "object" && !Array.isArray(bruto.membresias) ? bruto.membresias : {},
    clases: lista(bruto.clases, (c) => c && typeof c.id === "string" && typeof c.nombre === "string"),
    reservas: lista(bruto.reservas, (r) => r && typeof r.id === "string" && typeof r.claseId === "string"),
    accesos: lista(bruto.accesos, (a) => a && typeof a.socioId === "string" && typeof a.entrada === "string"),
    pagos: lista(bruto.pagos, (p) => p && typeof p.socioId === "string" && Number.isFinite(p.importe)),
    notas: bruto.notas && typeof bruto.notas === "object" && !Array.isArray(bruto.notas) ? bruto.notas : {},
    actualizado: typeof bruto.actualizado === "string" ? bruto.actualizado : null,
  };
}

export const G = {
  estado: VACIO(),
  error: null,
  recuperadoDe: null,
  ultimoRecorte: [],

  /** Carga. Si está corrupto, busca la última instantánea válida. */
  init() {
    let bruto = null;
    try {
      const raw = localStorage.getItem(KEY);
      bruto = raw ? JSON.parse(raw) : null;
    } catch {
      this.error = "corrupto";
    }
    if (bruto && (typeof bruto !== "object" || Array.isArray(bruto))) {
      this.error = "forma";
      try { localStorage.setItem(CORRUPT, JSON.stringify(bruto)); } catch { /* sin storage */ }
      bruto = null;
    }
    if (!bruto) {
      const r = recuperarSeguro();
      if (r) { bruto = r.data; this.recuperadoDe = r.de; }
    }
    this.estado = sanear(bruto);
    return this.estado;
  },

  save() {
    this.estado.actualizado = new Date().toISOString();
    const r = guardarSeguro(this.estado);
    // lo que de verdad quedó en disco pasa a ser el estado en memoria:
    // si no, la pantalla mostraría datos que no existen en el guardado
    if (r.datos) this.estado = sanear(r.datos);
    this.ultimoRecorte = r.soltado || [];
    this.error = r.ok ? null : (r.error === "almacenamiento lleno" ? "cuota" : "sin-storage");
    avisar();
    return r.ok;
  },

  /* ---------- socios ---------- */
  altaSocio(datos) {
    const r = nuevoSocio(datos);
    if (!r.ok) return r;
    if (this.estado.socios.some((s) => s.nombre.toLowerCase() === r.socio.nombre.toLowerCase())) {
      return { ok: false, error: "Ya existe un socio con ese nombre." };
    }
    this.estado.socios.push(r.socio);
    this.save();
    return r;
  },
  socio(id) { return this.estado.socios.find((s) => s.id === id) || null; },
  editarSocio(id, cambios = {}) {
    const s = this.socio(id);
    if (!s) return { ok: false, error: "socio-no-existe" };
    for (const k of ["nombre", "telefono", "email", "objetivo", "estado"]) {
      if (cambios[k] === undefined) continue;
      if (k === "nombre") {
        const n = String(cambios[k]).trim();
        if (!n) return { ok: false, error: "Falta el nombre." };
        s[k] = n;
      } else if (k === "estado") {
        if (!["activo", "pausado", "baja"].includes(cambios[k])) return { ok: false, error: "Estado desconocido." };
        s[k] = cambios[k];
      } else s[k] = String(cambios[k]).slice(0, 300);
    }
    this.save();
    return { ok: true, socio: s };
  },
  darDeBaja(id) { return this.editarSocio(id, { estado: "baja" }); },
  reactivar(id) { return this.editarSocio(id, { estado: "activo" }); },
  activos() { return this.estado.socios.filter((s) => s.estado === "activo"); },

  /* ---------- planes y membresías ---------- */
  altaPlan(datos) {
    const r = nuevoPlan(datos);
    if (!r.ok) return r;
    this.estado.planes[r.plan.id] = r.plan;
    this.save();
    return r;
  },
  plan(id) { return this.estado.planes[id] || null; },
  asignarPlan(socioId, planId) {
    if (!this.socio(socioId)) return { ok: false, error: "socio-no-existe" };
    if (!this.plan(planId)) return { ok: false, error: "plan-no-existe" };
    this.estado.membresias[socioId] = planId;
    this.save();
    return { ok: true };
  },
  quitarPlan(socioId) { delete this.estado.membresias[socioId]; this.save(); return { ok: true }; },
  planDe(socioId) { return this.plan(this.estado.membresias[socioId]); },

  /* ---------- pagos ---------- */
  /**
   * Registrar un cobro. `pasarela` documenta el origen: con la
   * pasarela conectada se marca «automático»; sin ella es un cobro
   * MANUAL y la app lo dice en la ficha. Nunca se finge un cobro.
   */
  registrarPago({ socioId, importe, pasarela = "manual", concepto = "" }) {
    if (!this.socio(socioId)) return { ok: false, error: "socio-no-existe" };
    const n = Number(importe);
    if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "importe-no-valido" };
    if (n > 100000) return { ok: false, error: "importe-absurdo" };
    const pago = {
      id: `pg_${Date.now()}`,
      socioId,
      importe: Math.round(n * 100) / 100,
      pasarela,
      concepto: String(concepto).slice(0, 120),
      fecha: new Date().toISOString(),
    };
    this.estado.pagos.push(pago);
    this.save();
    return { ok: true, pago };
  },
  pagosDe(socioId) { return this.estado.pagos.filter((p) => p.socioId === socioId); },
  deudaDe(socioId, hoy = dia()) {
    const s = this.socio(socioId);
    if (!s) return { debe: 0, pagado: 0, importe: 0, aFavor: 0, cuotas: 0, impagadas: 0, vencida: false };
    return deudaDe(s, this.planDe(socioId), this.estado.pagos, hoy);
  },

  /* ---------- clases y reservas ---------- */
  altaClase(datos) {
    const r = nuevaClase(datos);
    if (!r.ok) return r;
    this.estado.clases.push(r.clase);
    this.save();
    return r;
  },
  clase(id) { return this.estado.clases.find((c) => c.id === id) || null; },
  reservar(claseId, socioId) {
    const mod = reservarEn(this.clase(claseId), this.socio(socioId), this.estado);
    if (!mod.ok) return mod;
    this.estado.reservas = mod.reservas;
    this.save();
    return mod;
  },
  cancelarReserva(id) {
    const mod = cancelarEn(id, this.estado.reservas);
    if (!mod.ok) return mod;
    this.estado.reservas = mod.reservas;
    this.save();
    return mod;
  },

  /* ---------- acceso ---------- */
  registrarAcceso(socioId, tipo) {
    const mod = accesoEn(socioId, tipo, this.estado);
    if (!mod.ok) return mod;
    this.estado.accesos = mod.accesos;
    this.save();
    return mod;
  },
  dentro(socioId) { return estaDentro(socioId, this.estado.accesos); },

  /* ---------- notas (entrenador ↔ socio) ---------- */
  anotar(socioId, texto) {
    if (!this.socio(socioId)) return { ok: false, error: "socio-no-existe" };
    const t = String(texto || "").trim();
    if (!t) return { ok: false, error: "nota-vacia" };
    if (t.length > 500) return { ok: false, error: "nota-larga" };
    const lista = this.estado.notas[socioId] || [];
    lista.unshift({ de: new Date().toISOString(), texto: t.slice(0, 500) });
    this.estado.notas[socioId] = lista.slice(0, 200);
    this.save();
    return { ok: true };
  },
  notas(socioId) { return this.estado.notas[socioId] || []; },

  /* ---------- lectura ---------- */
  riesgo(socioId, hoy = dia()) {
    const s = this.socio(socioId);
    return s ? riesgoBaja(s, this.estado, hoy) : { nivel: "sin-datos", puntos: 0, motivos: [] };
  },
  visitas(socioId, dias = 30) { return visitasDe(socioId, this.estado.accesos, dias); },
  nombre: () => G.estado.nombreGimnasio || "TU CENTRO",

  borrarTodo() {
    this.estado = VACIO();
    try { for (const k of [KEY, ANILLO, CORRUPT]) localStorage.removeItem(k); } catch { /* sin storage */ }
    avisar();
  },
};
