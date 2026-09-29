// ============================================================
// BAYONA · CENTRO — cobros por enlace de pasarela
// ------------------------------------------------------------
// Qué resuelve, y qué NO.
//
// Esta app es una PWA estática: no hay servidor. Una pasarela de
// pagos confirma un cobro con un **webhook**, y un webhook necesita
// algo que reciba peticiones. Sin servidor no hay confirmación
// automática. Decir otra cosa sería inventar.
//
// Lo que SÍ se puede, y es lo que hace el software de verdad:
//   1 · el gimnasio pega, en su plan, el ENLACE DE PAGO que ya tiene
//     creado en su pasarela (Mollie, Stripe Payment Links, SumUp…).
//     Ese enlace es público por diseño: es una página de cobro, no
//     una clave. Por eso puede vivir en el cliente sin riesgo.
//   2 · la app abre ese enlace para que pague el socio, en la página
//     de la propia pasarela, con sus métodos (SEPA, Bizum, tarjeta).
//   3 · quien atiende registra el cobro con la REFERENCIA que le ha
//     dado la pasarela. La app guarda de dónde vino cada euro.
//
// El resultado: el socio paga de verdad, con su banco, y el centro
// sabe cuánto ha entrado. Lo único que NO hay es el «me ha llegado un
// aviso solo» del cobro automático, y la app lo dice en voz alta en
// vez de fingirlo.
// ------------------------------------------------------------
//
// Entidades que se tocan: `plan.linkPago` (string) y
// `pago.pasarela` / `pago.referencia` / `pago.link`.

/** Máximo razonable para una URL de pasarela. */
const MAX_URL = 2000;

/** Dominios de las pasarelas más usadas en España. No es una lista
 *  cerrada: cualquiera http(s) vale. Solo se rechazan esquemas
 *  peligrosos, que es lo que de verdad importa. */
export const ESQUEMAS_PERMITIDOS = ["https:", "http:"];

/**
 * Valida un enlace de pago. Devuelve `{ok, url}` o `{ok:false, error}`
 * con un CÓDIGO de error (la frase la pone el catálogo, no aquí).
 *
 * Se rechaza `javascript:` y `data:` a propósito: un enlace pegado
 * desde un correo o un QR malicioso podría ejecutar código al
 * pulsarlo. Solo se abre `https:`/`http:`.
 */
export function esLinkPago(bruto) {
  const txt = String(bruto ?? "").trim();
  if (!txt) return { ok: false, error: "link-vacio" };
  if (txt.length > MAX_URL) return { ok: false, error: "link-largo" };
  let u;
  try {
    u = new URL(txt);
  } catch {
    return { ok: false, error: "link-invalido" };
  }
  if (!ESQUEMAS_PERMITIDOS.includes(u.protocol)) return { ok: false, error: "link-esquema" };
  if (!u.hostname.includes(".")) return { ok: false, error: "link-invalido" };
  return { ok: true, url: u.toString() };
}

/** Nombre legible de la pasarela a partir de su dominio. */
export function nombrePasarela(url) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const marca = host.split(".")[0];
    if (!marca) return host;
    return marca.charAt(0).toUpperCase() + marca.slice(1);
  } catch {
    return "";
  }
}

/**
 * Referencia que el socio recibe de la pasarela. Se guarda tal cual,
 * acotada: es texto de terceros y va a una hoja de cálculo.
 */
export function normalizaReferencia(bruto) {
  return String(bruto ?? "").trim().slice(0, 60);
}

/**
 * Qué falta para poder cobrar por enlace. Sin esto la app no finge
 * que tiene un botón de cobro que no lleva a ninguna parte.
 * @returns {{listo:boolean, motivo:string|null}}
 */
export function estadoCobro(plan) {
  if (!plan) return { listo: false, motivo: "socio-sin-plan" };
  if (!plan.activo) return { listo: false, motivo: "plan-inactivo" };
  const v = esLinkPago(plan.linkPago);
  if (!v.ok) return { listo: false, motivo: "plan-sin-link" };
  return { listo: true, motivo: null };
}
