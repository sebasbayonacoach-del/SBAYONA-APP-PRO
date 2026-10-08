// ============================================================
// BAYONA — CONSENTIMIENTOS CENTRALIZADOS
// Dominio · estado · versión · fecha · revocación (un solo sitio).
// Los módulos (cámara, salud, voz, fotos) leen de aquí NUNCA de claves sueltas.
// ============================================================

export const CONSENT_VERSION = 1;
const KEY = "bayona.consents.v1";

// claves históricas que deben migrarse (incluye la clave rota "***")
const LEGACY = {
  vision: ["bayona.consent.vision", "bayona.consent.camera", "***"],
  health: ["bayona.consent.health", "bayona.health.consent", "***"],
  voice:  ["bayona.consent.voice"],
  photos: ["bayona.consent.photos"],
  recordings: ["bayona.consent.recordings"],
  avatar_3d: ["bayona.consent.avatar_3d"], // avatar 3D (Avaturn): la selfie se procesa en sus servidores
};

function store() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

function blank() {
  return {
    vision: { granted: false, at: null, revokedAt: null, version: CONSENT_VERSION },
    health: { granted: false, at: null, revokedAt: null, version: CONSENT_VERSION },
    voice:  { granted: false, at: null, revokedAt: null, version: CONSENT_VERSION },
    photos: { granted: false, at: null, revokedAt: null, version: CONSENT_VERSION },
    recordings: { granted: false, at: null, revokedAt: null, version: CONSENT_VERSION },
    avatar_3d: { granted: false, at: null, revokedAt: null, version: CONSENT_VERSION },
  };
}

let cache = null;

function readRaw() {
  const s = store();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function write(data) {
  const s = store();
  if (!s) {
    // Test de dominio sin DOM: permite cache en memoria, pero en un navegador
    // la falta de almacenamiento impide conceder permiso de grabación.
    if (typeof window === "undefined") { cache = data; return true; }
    return false;
  }
  try {
    s.setItem(KEY, JSON.stringify(data));
    cache = data; // Nunca conservar un consentimiento concedido que no pudo guardarse.
    return true;
  } catch { return false; }
}

/** Migra claves antiguas (incluida la clave rota '***') sin perder consentimientos ya dados. */
export function migrateLegacyConsents() {
  const data = cache || readRaw() || blank();
  const s = store();
  if (!s) return data;
  let changed = false;
  for (const [domain, keys] of Object.entries(LEGACY)) {
    if (data[domain].granted || data[domain].revokedAt) continue;
    for (const k of keys) {
      let v = null;
      try { v = s.getItem(k); } catch { /* sin acceso */ }
      if (v) {
        data[domain] = { granted: true, at: v, revokedAt: null, version: CONSENT_VERSION };
        changed = true;
        if (k !== "***") { try { s.removeItem(k); } catch { /* nada */ } }
        break;
      }
    }
  }
  if (changed || !readRaw()) write(data);
  return data;
}

export function getConsents() {
  if (cache) return cache;
  cache = readRaw() || migrateLegacyConsents();
  return cache;
}

export function isGranted(domain) {
  const c = getConsents()[domain];
  return !!(c && c.granted && !c.revokedAt);
}

/** Devuelve false si el almacenamiento rechazó el guardado (llamador debe avisar). */
export function setConsent(domain, granted = true) {
  // Copia aislada: si Storage falla, no mutamos el cache del consentimiento.
  const current = getConsents();
  const data = { ...current, [domain]: { ...(current[domain] || {
    granted: false, at: null, revokedAt: null, version: CONSENT_VERSION,
  }) } };
  data[domain].granted = granted;
  data[domain].at = granted ? new Date().toISOString() : data[domain].at;
  data[domain].revokedAt = granted ? null : new Date().toISOString();
  data[domain].version = CONSENT_VERSION;
  const saved = write(data);
  if (!saved && !granted) cache = data; // revocar en memoria es seguro incluso si Storage falla
  return saved;
}

export function revokeConsent(domain) {
  return setConsent(domain, false);
}

/** Borra TODOS los consentimientos (borrado total de datos · RGPD). Único dueño de la clave. */
export function resetConsents() {
  cache = blank();
  const s = store();
  if (!s) return false;
  try { s.removeItem(KEY); return true; } catch { return false; }
}

/** Estado legible para la UI de privacidad. */
export function consentStatus() {
  const c = getConsents();
  return Object.fromEntries(
    Object.entries(c).map(([k, v]) => [
      k,
      { concedido: !!v.granted && !v.revokedAt, desde: v.at, revocado: v.revokedAt, version: v.version },
    ])
  );
}
