// ============================================================
// BAYONA · CENTRO — acceso: código, validación y bloqueo
// ------------------------------------------------------------
// Lo que un gimnasio llama «control de acceso»: un código por socio
// que se presenta en la puerta (o se teclea si el lector no está),
// y una decisión clara: se pasa o no se pasa.
//
// HONESTIDAD TECNOLÓGICA (importante, y va escrita en la app):
//   · el código es una credencial de puerta, NO criptografía. Se
//     valida en el dispositivo. Quien tenga el dispositivo tiene
//     los códigos; eso es inherente a un sistema local.
//   · un torniquete real (QR, pulsera, lector facial) es un
//     proyecto de hardware aparte: aquí está la DECISIÓN y el
//     código, que es lo que el lector leería. Sin hardware, el
//     mismo código se teclea a mano.
//   · si hay deuda vencida, se bloquea la entrada y se explica por
//     qué. Nunca se bloquea en silencio, y nunca «por sistema».
import { dia, sumarDias, diasEntre, deudaDe, finDeMembresia } from "./model.js";

/* ============================================================
   1 · CÓDIGO DE ACCESO
   ============================================================ */
// alfabeto sin 0/O/1/I/L: se teclea sin equivocarse
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Hash determinista y barato (no criptográfico, a propósito). */
function hash(texto, semilla = 0) {
  let h = (2166136261 ^ semilla) >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Código de 8 caracteres para un socio. Determinista: el mismo
 * socio siempre tiene el mismo código (si se pierde, no hay que
 * dar de alta a nadie nuevo: se regenera).
 */
export function codigoAcceso(socioId, secreto = "bayona") {
  if (!socioId) return null;
  const h1 = hash(socioId + secreto);
  const h2 = hash(socioId + secreto + "#2", h1);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += ALFABETO[(h1 >>> (i * 3)) % ALFABETO.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/** Normaliza lo que llega de un lector o de tecleo ("ab-12" → "AB12"). */
export function normalizaCodigo(txt) {
  return String(txt || "").toUpperCase().replace(/[^0-9A-Z]/g, "").trim();
}

/** Socio cuyo código coincide con el introducido. */
export function socioPorCodigo(codigo, estado, secreto = "bayona") {
  const limpio = normalizaCodigo(codigo);
  if (limpio.length !== 8) return null;
  const lista = Array.isArray(estado?.socios) ? estado.socios : [];
  for (const s of lista) {
    if (!s || !s.id) continue;
    if (normalizaCodigo(codigoAcceso(s.id, secreto)) === limpio) return s;
  }
  return null;
}

/* ============================================================
   2 · LA DECISIÓN DE LA PUERTA
   ============================================================ */
/**
 * Motivos por los que NO se pasa. Aquí vive el CÓDIGO, no la frase: el
 * texto que se le dice a la persona está en el catálogo (`gym.rechazo.*`)
 * y la interfaz lo resuelve. El dominio no escribe pantallas.
 */
export const MOTIVOS_RECHAZO = [
  "codigo-desconocido",
  "socio-de-baja",
  "socio-pausado",
  "impagado",
  "ya-dentro",
];

/**
 * Valida un acceso. Devuelve SIEMPRE un motivo cuando no se pasa.
 * @returns {{ok:boolean, motivo:string|null, socio?:object, detalle?:string}}
 */
export function validarAcceso(codigo, estado, opciones = {}) {
  const { hoy = dia(), ignorarImpago = false, secreto = "bayona" } = opciones;
  const socio = socioPorCodigo(codigo, estado, secreto);
  if (!socio) return { ok: false, motivo: "codigo-desconocido" };
  if (socio.estado === "baja") return { ok: false, motivo: "socio-de-baja", socio };
  if (socio.estado === "pausado") return { ok: false, motivo: "socio-pausado", socio };

  const plan = estado?.planes?.[estado?.membresias?.[socio.id]];
  if (!ignorarImpago && plan) {
    const d = deudaDe(socio, plan, estado.pagos, hoy);
    if (d.vencida) {
      // la cifra es lo VENCIDO, no el saldo: la cuota en curso aún no
      // se puede exigir y no tiene sentido decirla como deuda
      return {
        ok: false, motivo: "impagado", socio,
        detalle: `${d.cuotas} cuota(s) vencida(s) · ${d.vencido.toFixed(2).replace(".", ",")} €`,
      };
    }
  }
  const dentro = (Array.isArray(estado.accesos) ? estado.accesos : []).some((a) => a && a.socioId === socio.id && !a.salida);
  if (dentro) return { ok: false, motivo: "ya-dentro", socio };
  return { ok: true, motivo: null, socio };
}

/* ============================================================
   3 · AVISOS: lo que hay que decirle a alguien
   ------------------------------------------------------------   Reglas explicables sobre datos reales. Se genera el TEXTO y la
   persona lo copia y lo manda por donde quiera: sin proveedor de
   SMS o correo, esta app no finge que ha enviado nada.
   ============================================================ */
const PLANTILLA = {
  impago: (n, importe) => `Hola ${n}, te recordamos que tienes ${importe} € pendientes de membresía. Puedes abonarlo en recepción o en la app.`,
  inactivo: (n, dias) => `Hola ${n}, hace ${dias} días que no te vemos. Tu plan sigue activo: si te está costando volver, dímelo y lo ajustamos.`,
  "plan-proximo": (n, fecha) => `Hola ${n}, tu membresía termina el ${fecha}. Renueva en recepción o en la app.`,
  "vence-hoy": (n) => `Hola ${n}, hoy vence tu membresía. Renueva en recepción o en la app.`,
};

/**
 * Cola de avisos pendientes. Cada uno explica de dónde sale.
 * @returns {Array<{id:string, socioId:string, tipo:string, texto:string, motivo:string}>}
 */
export function avisosPendientes(estado, hoy = dia()) {
  const socios = Array.isArray(estado?.socios) ? estado.socios : [];
  const planes = estado?.planes || {};
  const membresias = estado?.membresias || {};
  const accesos = Array.isArray(estado?.accesos) ? estado.accesos : [];
  const out = [];

  for (const s of socios) {
    if (!s || s.estado !== "activo") continue;
    const plan = planes[membresias[s.id]];
    if (!plan) continue;

    // 1 · impago
    const d = deudaDe(s, plan, estado.pagos, hoy);
    if (d.vencida) {
      const imp = d.vencido.toFixed(2).replace(".", ",");
      out.push({
        id: `av_${s.id}_impago`, socioId: s.id, tipo: "impago",
        texto: PLANTILLA.impago(s.nombre, imp),
        motivo: `${d.cuotas} cuota(s) vencida(s) · ${imp} €`,
      });
    }

    // 2 · inactividad real (14 días sin visitas registradas)
    const visitas = accesos.filter((a) => a && a.socioId === s.id && String(a.entrada || "").slice(0, 10) >= sumarDias(hoy, -14));
    if (visitas.length === 0) {
      out.push({
        id: `av_${s.id}_inactivo`, socioId: s.id, tipo: "inactivo",
        texto: PLANTILLA.inactivo(s.nombre, 14),
        motivo: "Sin ninguna visita en los últimos 14 días",
      });
    }

    // 3 · la membresía está por vencer (últimos 7 días del periodo)
    const vencen = finDeMembresia(s, plan, hoy);
    const diasParaVencer = vencen ? diasEntre(hoy, vencen) : null;
    if (diasParaVencer !== null && diasParaVencer <= 7 && diasParaVencer >= 0) {
      out.push({
        id: `av_${s.id}_vence`, socioId: s.id, tipo: diasParaVencer === 0 ? "vence-hoy" : "plan-proximo",
        texto: diasParaVencer === 0 ? PLANTILLA["vence-hoy"](s.nombre) : PLANTILLA["plan-proximo"](s.nombre, vencen),
        motivo: `Membresía vigente hasta ${vencen}`,
      });
    }
  }
  return out;
}
