// ============================================================
// BAYONA — DOMINIO PHYGITAL (producto físico → gemelo digital)
// Reglas REALES de verificación (no vale cualquier texto):
//   formato BAY-XXXX-XXXX-XXXX (base32 Crockford sin I/L/O/U),
//   dígito de control Luhn mod 32, catálogo de artículos válido,
//   USO ÚNICO por código, auditoría de cada intento.
// Esta verificación es LOCAL (offline). La validación server-side y la
// firma de lotes requieren backend: está marcado como pendiente honesto.
// ============================================================

export const CODE_RE = /^BAY-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})-([0-9A-HJKMNP-TV-Z]{4})$/;
const ALPH = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford: sin I, L, O, U

/** dígito de control (Luhn mod 32) sobre los 12 caracteres del cuerpo */
export function checkChar(body12) {
  let sum = 0;
  for (let i = 0; i < body12.length; i++) {
    let v = ALPH.indexOf(body12[i]);
    if (v < 0) return null;
    if (i % 2 === 0) { v *= 2; if (v > 31) v -= 31; }
    sum += v;
  }
  return ALPH[(32 - (sum % 32)) % 32];
}

/** Genera un código con formato válido (para lote de fabricación / pruebas). */
export function makeCode(rng = Math.random) {
  const pick = () => ALPH[Math.floor(rng() * ALPH.length)];
  let body = "";
  for (let i = 0; i < 11; i++) body += pick(); // 11 + 1 dígito de control = 12
  const full = body + checkChar(body);
  return `BAY-${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}`;
}

/**
 * Valida estructura + dígito de control. NO acepta texto arbitrario.
 * @returns {{ok:boolean, reason?:string, code?:string}}
 */
export function validateCode(raw) {
  const code = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
  const m = CODE_RE.exec(code);
  if (!m) return { ok: false, reason: "Formato incorrecto. El código es BAY-XXXX-XXXX-XXXX." };
  const all = m[1] + m[2] + m[3]; // 12 caracteres
  const body = all.slice(0, 11);
  const ctrl = all.slice(11);
  if (checkChar(body) !== ctrl) return { ok: false, reason: "Dígito de control incorrecto: el código no es auténtico." };
  return { ok: true, code: `BAY-${m[1]}-${m[2]}-${m[3]}` };
}

/**
 * Verificación completa de canje: formato + control + catálogo + uso único.
 * @param {{isCodeUsed:(c:string)=>boolean, item:(id:string)=>object|null, redeemPhygital:(r:object)=>object}} S
 * @param {string} raw @param {string} itemId
 */
export function verifyAndRedeem(S, raw, itemId) {
  const reject = (reason, code) => {
    S.auditPhygital?.({ event: "rechazo", code: String(raw || "").slice(0, 24), itemId: itemId || null, reason });
    return { ok: false, reason };
  };
  const v = validateCode(raw);
  if (!v.ok) return reject(v.reason);
  if (!itemId || !S.item(itemId)) return reject("Artículo no reconocido para este código.", v.code);
  if (S.isCodeUsed(v.code)) return reject("Este código ya se usó. Cada código desbloquea un solo gemelo.", v.code);
  const rec = S.redeemPhygital({ code: v.code, itemId, source: "codigo-fisico" });
  return { ok: true, item: S.item(itemId), rec, note: "Verificación local completada. La validación server-side del lote está pendiente de backend." };
}
