// BAYONA — server security helpers
// Shared by serverless endpoints. No client secrets belong here unless read from env.

const RATE = new Map();

export function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
}

function protoOf(req) {
  return String(req.headers?.["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
}

function hostOf(req) {
  return String(req.headers?.["x-forwarded-host"] || req.headers?.host || "").split(",")[0].trim();
}

export function sameOrigin(req) {
  const host = hostOf(req);
  return host ? `${protoOf(req)}://${host}` : null;
}

function configuredOrigins() {
  return String(process.env.BAYONA_ALLOWED_ORIGINS || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function allowedOrigin(req) {
  const origin = String(req.headers?.origin || "").trim();
  if (!origin) return null;
  const same = sameOrigin(req);
  const allowed = new Set([same, ...configuredOrigins()].filter(Boolean));
  return allowed.has(origin) ? origin : false;
}

export function applyCors(req, res, methods = "GET,POST,OPTIONS") {
  securityHeaders(res);
  const origin = allowedOrigin(req);
  if (origin === false) return false;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

export function clientIp(req) {
  return String(req.headers?.["x-forwarded-for"] || "")
    .split(",")[0].trim()
    || req.socket?.remoteAddress
    || "?";
}

export function rateLimited(key, { max = 30, windowMs = 60_000 } = {}) {
  const k = String(key || "?").slice(0, 200);
  const now = Date.now();
  const rec = RATE.get(k) || { n: 0, t0: now };
  if (now - rec.t0 >= windowMs) {
    rec.n = 0;
    rec.t0 = now;
  }
  rec.n += 1;
  RATE.set(k, rec);
  if (RATE.size > 10_000) {
    for (const [id, value] of RATE) {
      if (now - value.t0 > windowMs * 2) RATE.delete(id);
    }
  }
  return rec.n > max;
}

export function validSupabaseUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "https:" && /\.supabase\.co$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export function validPublicKey(value) {
  const v = String(value || "");
  return v.startsWith("sb_publishable_")
    || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v);
}

export function publicSupabaseEnv() {
  const url = String(process.env.SUPABASE_URL || "");
  const anonKey = String(process.env.SUPABASE_ANON_KEY || "");
  return {
    url: validSupabaseUrl(url) ? url : "",
    anonKey: validPublicKey(anonKey) ? anonKey : "",
    configured: validSupabaseUrl(url) && validPublicKey(anonKey),
  };
}

export function serviceSupabaseEnv() {
  const pub = publicSupabaseEnv();
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  return { ...pub, serviceRole, serviceConfigured: pub.configured && Boolean(serviceRole) };
}

export async function verifySupabaseUser(req) {
  const { url, anonKey, configured } = publicSupabaseEnv();
  if (!configured) return { ok: false, status: 503, reason: "cloud_not_configured", user: null, token: null };
  const auth = String(req.headers?.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, reason: "missing_bearer", user: null, token: null };

  try {
    const r = await fetch(url + "/auth/v1/user", {
      headers: { apikey: anonKey, authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!r.ok) return { ok: false, status: 401, reason: "invalid_session", user: null, token: null };
    const user = await r.json();
    if (!user?.id) return { ok: false, status: 401, reason: "invalid_session", user: null, token: null };
    return { ok: true, status: 200, reason: null, user, token };
  } catch {
    return { ok: false, status: 503, reason: "auth_unreachable", user: null, token: null };
  }
}

export async function readRaw(req, limit = 64 * 1024) {
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body) > limit) throw new Error("body_too_large");
    return req.body;
  }
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > limit) throw new Error("body_too_large");
    return req.body.toString("utf8");
  }
  if (req.body && typeof req.body === "object") {
    const raw = JSON.stringify(req.body);
    if (Buffer.byteLength(raw) > limit) throw new Error("body_too_large");
    return raw;
  }
  return await new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      // Node's IncomingMessage emits Buffers; test adapters can emit strings.
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += bytes.length;
      if (total > limit) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(bytes);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export async function readJson(req, limit = 64 * 1024) {
  const raw = await readRaw(req, limit);
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw new Error("invalid_json"); }
}

export function json(res, status, payload) {
  securityHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
