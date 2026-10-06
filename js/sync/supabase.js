// ============================================================
// BAYONA · SYNC/supabase — cliente mínimo de Supabase (Auth + REST)
// ------------------------------------------------------------
// Sin dependencias: la app es JS vanilla con módulos ES y no necesita
// supabase-js para cubrir lo que usamos (magic link, password, refresh
// automático y CRUD con RLS). Si algún día hace falta Realtime o Storage,
// se vendea supabase-js junto a vendor/three.module.js.
//
// PRIVACIDAD (ADR-003 / GDPR art. 9):
//   · NUNCA se suben frames ni vídeo por esta API: solo resúmenes numéricos.
//   · Cada dominio de salud exige su consentimiento activo en `consents`.
// ============================================================
import { supabaseConfig } from "./config.js";

const TOKEN_KEY = "bayon…n.v1";
const cfg = supabaseConfig();

let session = null; // { access_token, refresh_token, expires_at, user }
const listeners = new Set();

/* ---------------- almacenamiento de sesión ---------------- */
function loadSession() {
  try { session = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); }
  catch (e) { session = null; }
  return session;
}
function saveSession(s) {
  session = s;
  try {
    if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    window.dispatchEvent(new CustomEvent("bayona:storage-error"));
  }
  listeners.forEach((fn) => fn(s));
}
export function onAuth(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* ---------------- transporte ---------------- */
async function call(path, { method = "GET", body, token, headers = {} } = {}) {
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) {
    const e = new Error("Supabase sin configurar (js/sync/config.js)");
    e.code = "not_configured";
    throw e;
  }
  const h = {
    apikey: anonKey,
    "Content-Type": "application/json",
    ...headers,
  };
  const use = token || session?.access_token;
  if (use) h.Authorization = `Bearer ${use}`;

  const res = await fetch(url + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error(data?.msg || data?.message || data?.error_description || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data?.error_code || data?.code || data?.error || "http_error";
    err.payload = data;
    throw err;
  }
  return data;
}

/* ---------------- auth ---------------- */
function toSession(payload) {
  if (!payload) return null;
  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: payload.expires_at,
    user: payload.user || null,
  };
}

/** acceso con email + contraseña */
export async function signInWithPassword(email, password) {
  const d = await call("/auth/v1/token?grant_type=password", {
    method: "POST", body: { email, password },
  });
  saveSession(toSession(d));
  return session;
}

/** alta con email + contraseña (crea el usuario en auth.users) */
function normalizeBayonaRole(role) {
  return role === "coach" ? "coach" : "athlete";
}

/** rol de producto persistido en Auth; si la cuenta es antigua usa el último mundo elegido. */
export function accountRole() {
  const u = currentUser();
  const remote = u?.user_metadata?.bayona_role || u?.user_metadata?.role;
  if (remote === "coach" || remote === "athlete") return remote;
  try {
    return localStorage.getItem("bayona.entry.role.v1") === "coach" ? "coach" : "athlete";
  } catch {
    return "athlete";
  }
}

/** alta con email + contraseña + rol BAYONA para mantener separadas las experiencias */
export async function signUpWithPassword(email, password, role = accountRole()) {
  const d = await call("/auth/v1/signup", {
    method: "POST",
    body: {
      email,
      password,
      data: { bayona_role: normalizeBayonaRole(role) },
    },
  });
  if (d?.access_token) saveSession(toSession(d));
  return d;
}

/** magic link: manda un email de acceso de un solo uso */
export async function signInWithMagicLink(email, redirectTo) {
  const d = await call("/auth/v1/otp", {
    method: "POST",
    body: { email, create_user: true, ...(redirectTo ? { options: { email_redirect_to: redirectTo } } : {}) },
  });
  return d;
}

/** recoge el token de la URL tras el clic en el email (#access_token=…&type=magiclink) */
export function completeAuthFromHash(hash = location.hash) {
  const h = new URLSearchParams((hash || "").replace(/^#/, ""));
  const access_token = h.get("access_token");
  const refresh_token = h.get("refresh_token");
  if (!access_token) return null;
  const s = { access_token, refresh_token, expires_at: Math.floor(Date.now() / 1000) + 3600, user: null };
  saveSession(s);
  history.replaceState(null, "", location.pathname + location.search);
  refreshUser();
  return s;
}

export async function refreshUser() {
  if (!session?.access_token) return null;
  try {
    const u = await call("/auth/v1/user");
    session = { ...session, user: u };
    saveSession(session);
    return u;
  } catch (e) {
    if (e.status === 401) saveSession(null);
    return null;
  }
}

export async function signOut() {
  try { await call("/auth/v1/logout", { method: "POST" }); } catch (e) { /* la sesión local manda */ }
  saveSession(null);
}

/** renueva el access token si vence en menos de 2 min */
export async function ensureFreshSession() {
  if (!session?.refresh_token) return null;
  const left = (session.expires_at || 0) * 1000 - Date.now();
  if (left > 120000) return session;
  try {
    const d = await call("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: { refresh_token: session.refresh_token },
    });
    saveSession(toSession(d) || session);
    return session;
  } catch (e) {
    saveSession(null);
    return null;
  }
}

export function currentSession() { return session || loadSession(); }
export function currentUser() { return (session || loadSession())?.user || null; }
export function isConfigured() { return cfg.ready; }

let backendProbe = { at: 0, result: null, promise: null };

/**
 * Comprueba que el Auth de Supabase responde sin enviar datos del usuario.
 * Se cachea 30 s para no convertir la pantalla de cuenta en un health-check loop.
 */
export async function probeBackend({ force = false, timeoutMs = 3500 } = {}) {
  const now = Date.now();
  if (!force && backendProbe.result && now - backendProbe.at < 30000) return backendProbe.result;
  if (!force && backendProbe.promise) return backendProbe.promise;

  const run = (async () => {
    const { url, anonKey, ready } = supabaseConfig();
    if (!ready) return { ok: false, configured: false, status: null, reason: "not_configured" };

    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), Math.max(800, Number(timeoutMs) || 3500)) : null;
    try {
      const res = await fetch(url + "/auth/v1/settings", {
        method: "GET",
        headers: { apikey: anonKey, Accept: "application/json" },
        cache: "no-store",
        signal: ctrl?.signal,
      });
      return {
        ok: res.status >= 200 && res.status < 500,
        configured: true,
        status: res.status,
        reason: res.status >= 200 && res.status < 500 ? null : "upstream_" + res.status,
      };
    } catch (e) {
      return {
        ok: false,
        configured: true,
        status: null,
        reason: e?.name === "AbortError" ? "timeout" : "network",
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();

  backendProbe.promise = run;
  const result = await run;
  backendProbe = { at: Date.now(), result, promise: null };
  return result;
}

/* ---------------- REST (RLS manda en servidor) ----------------
   Métodos pequeños y explícitos. `upsert` usa Prefer: resolution=merge-
   duplicates para idempotencia (clave natural = id del usuario). */
const REST_HEADERS = { Accept: "application/json" };

function qs(params) {
  if (!params) return "";
  const q = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return q ? `?${q}` : "";
}

export async function select(table, params) {
  await ensureFreshSession();
  return call(`/rest/v1/${table}${qs(params)}`, { headers: REST_HEADERS });
}

export async function insert(table, rows) {
  await ensureFreshSession();
  return call(`/rest/v1/${table}`, {
    method: "POST",
    body: rows,
    headers: { ...REST_HEADERS, Prefer: "return=representation" },
  });
}

export async function upsert(table, rows) {
  await ensureFreshSession();
  return call(`/rest/v1/${table}`, {
    method: "POST",
    body: rows,
    headers: { ...REST_HEADERS, Prefer: "return=representation,resolution=merge-duplicates" },
  });
}

export async function update(table, patch, params) {
  await ensureFreshSession();
  return call(`/rest/v1/${table}${qs(params)}`, {
    method: "PATCH",
    body: patch,
    headers: { ...REST_HEADERS, Prefer: "return=representation" },
  });
}

export async function remove(table, params) {
  await ensureFreshSession();
  return call(`/rest/v1/${table}${qs(params)}`, {
    method: "DELETE",
    headers: REST_HEADERS,
  });
}

/* ---------------- RPC (para contadores y export) ---------------- */
export async function rpc(name, args) {
  await ensureFreshSession();
  return call(`/rest/v1/rpc/${name}`, { method: "POST", body: args || {} });
}

loadSession();
