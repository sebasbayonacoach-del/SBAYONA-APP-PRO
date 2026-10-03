// ============================================================
// BAYONA · SYNC/outbox — el "pendiente" que sobrevive a la recarga
// ------------------------------------------------------------
// syncNow vive en memoria: si el espejo falla (red caída, sin sesión)
// y el usuario cierra la pestaña, el aviso de "EN COLA" se esfuma.
// Este módulo persiste esa intención en localStorage: un único sello
// { motivo, desde, intentos } que marca que HAY datos sin subir.
//
// No guarda payloads: los datos reales siguen siendo S.data (la verdad
// vive en el dispositivo). Al volver la red o la sesión, account.js
// relee S.data y reenvía el espejo completo — idempotente por diseño.
// ============================================================

const KEY = "bayona.sync.outbox.v1";
const BASE_MS = 15000;      // 1er reintento a los 15 s
const MAX_MS = 30 * 60000;  // techo: media hora

function storage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function leer() {
  try { return JSON.parse(storage()?.getItem(KEY) || "null") || null; }
  catch (e) { return null; }
}

function escribir(estado) {
  const s = storage();
  if (!s) return;
  try {
    if (estado) s.setItem(KEY, JSON.stringify(estado));
    else s.removeItem(KEY);
  } catch (e) { /* cuota llena: el outbox es prescindible, la app no */ }
}

/** deja constancia de que hay algo por subir (idempotente: refresca motivo) */
export function marcarPendiente(motivo = "") {
  const prev = leer() || { intentos: 0 };
  escribir({ motivo, desde: prev.desde || new Date().toISOString(), intentos: prev.intentos });
}

/** fallo real del espejo: además de marcar, apunta el intento para el backoff */
export function registrarFallo(motivo = "") {
  const prev = leer();
  escribir({
    motivo,
    desde: prev?.desde || new Date().toISOString(),
    intentos: (prev?.intentos || 0) + 1,
  });
}

/** espejo enviado: la cola queda vacía */
export function limpiar() { escribir(null); }

export function estaPendiente() { return Boolean(leer()); }

/** { motivo, desde, intentos } o null — para la UI de Cuenta */
export function estado() { return leer(); }

/** espera del próximo reintento: 15 s → 30 s → 1 min … techo 30 min */
export function backoffMs() {
  const n = leer()?.intentos || 0;
  return Math.min(MAX_MS, BASE_MS * 2 ** n);
}
