// ============================================================
// BAYONA · identidad local multiusuario
// ------------------------------------------------------------
// La app puede usarse por varias cuentas en el mismo dispositivo sin mezclar
// progreso, backups ni colas de sincronización. Sin identidad activa se
// conserva el namespace legado para no romper instalaciones anteriores.
// ============================================================

export const ACTIVE_IDENTITY_KEY = "bayona.active.identity.v1";

function storage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function safeIdentity(value) {
  const raw = String(value || "").trim();
  return /^[a-zA-Z0-9._-]{6,128}$/.test(raw) ? raw : "";
}

export function activeIdentity(st = storage()) {
  try { return safeIdentity(st?.getItem(ACTIVE_IDENTITY_KEY)); }
  catch { return ""; }
}

export function setActiveIdentity(userId, st = storage()) {
  const id = safeIdentity(userId);
  if (!st || !id) return false;
  try {
    st.setItem(ACTIVE_IDENTITY_KEY, id);
    return true;
  } catch {
    return false;
  }
}

export function clearActiveIdentity(st = storage()) {
  if (!st) return;
  try { st.removeItem(ACTIVE_IDENTITY_KEY); } catch {}
}

export function scopedKey(key, st = storage()) {
  const id = activeIdentity(st);
  return id ? "bayona.user." + id + "::" + key : key;
}

export function scopedStorage(st = storage()) {
  if (!st) return null;
  return {
    getItem(key) { return st.getItem(scopedKey(key, st)); },
    setItem(key, value) { st.setItem(scopedKey(key, st), value); },
    removeItem(key) { st.removeItem(scopedKey(key, st)); },
  };
}


const LEGACY_PERSONAL_KEYS = Object.freeze([
  "bayona.save.v2",
  "bayona.backup.v1",
  "bayona.save.corrupt",
  "bayona.consents.v1",
  "bayona.consent.vision",
  "bayona.consent.camera",
  "bayona.consent.health",
  "bayona.health.consent",
  "bayona.consent.voice",
  "bayona.consent.photos",
  "bayona.consent.avatar_3d",
  "***",
  "bayona.healthmap_v1",
  "bayona.cycle.v1",
  "bayona.diary.v1",
  "bayona.sets_queue_v1",
  "bayona.sets_queue_dead_v1",
  "bayona.sync.outbox.v1",
  "bayona.coaching.complete.v1",
  "bayona.coach.chat.v1",
  "bayona.centro.v1",
  "bayona.centro.anillo.v1",
  "bayona.centro.corrupt",
]);

export function activeNamespacePrefix(st = storage()) {
  const id = activeIdentity(st);
  return id ? "bayona.user." + id + "::" : "";
}

/**
 * Importa datos personales de una instalación pre-cuenta al namespace de la
 * identidad activa. Solo debe llamarse tras confirmación explícita del usuario.
 * No borra los originales: sirven como copia de seguridad de migración.
 */
export function importLegacyUserDataToActive(st = storage()) {
  const id = activeIdentity(st);
  if (!st || !id) return 0;
  const prefix = "bayona.user." + id + "::";
  let copied = 0;
  try {
    for (const key of LEGACY_PERSONAL_KEYS) {
      const value = st.getItem(key);
      if (value === null) continue;
      const target = prefix + key;
      if (st.getItem(target) !== null) continue;
      st.setItem(target, value);
      copied += 1;
    }
  } catch { /* cuota o storage bloqueado: lo ya copiado sigue válido */ }
  return copied;
}

/**
 * Borra TODOS los datos personales locales de la identidad activa.
 * No toca sesión Auth, configuración Supabase, tema, apariencia ni preferencias
 * del dispositivo. Para invitado solo elimina las claves personales históricas.
 */
export function clearActiveUserData(st = storage()) {
  if (!st) return 0;
  const prefix = activeNamespacePrefix(st);
  let removed = 0;
  try {
    if (prefix) {
      const keys = [];
      for (let i = 0; i < Number(st.length || 0); i++) {
        const key = st.key?.(i);
        if (key && key.startsWith(prefix)) keys.push(key);
      }
      for (const key of keys) { st.removeItem(key); removed += 1; }
      return removed;
    }
    for (const key of LEGACY_PERSONAL_KEYS) {
      if (st.getItem(key) !== null) { st.removeItem(key); removed += 1; }
    }
  } catch { /* storage bloqueado: el llamador mantiene la app operativa */ }
  return removed;
}

export function hasScopedState(userId, key = "bayona.save.v2", st = storage()) {
  const id = safeIdentity(userId);
  if (!st || !id) return false;
  try { return Boolean(st.getItem("bayona.user." + id + "::" + key)); }
  catch { return false; }
}
