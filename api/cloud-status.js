const FALLBACK_URL = "https://otkhozruunouimjgvvun.supabase.co";
const FALLBACK_KEY = "sb_publishable_ZaBblymo5dRZZJNNOAUXeA_T2-7S1to";

function validUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "https:" && /\.supabase\.co$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function validPublicKey(value) {
  const v = String(value || "");
  return v.startsWith("sb_publishable_") || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v);
}

export default async function handler(req, res) {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY;
  const url = validUrl(envUrl) ? envUrl : FALLBACK_URL;
  const key = validPublicKey(envKey) ? envKey : FALLBACK_KEY;

  res.setHeader("Cache-Control", "no-store");

  const out = {
    ok: false,
    configured: Boolean(url && key),
    runtimeSource: validUrl(envUrl) && validPublicKey(envKey) ? "vercel-env" : "shared-bayona-fallback",
    restReachable: false,
    restStatus: null,
    authReachable: false,
    authStatus: null,
    coreSchema: false,
    coachingSchema: false,
  };

  try {
    const headers = { apikey: key };
    const [rest, auth] = await Promise.all([
      fetch(url + "/rest/v1/", { headers }),
      fetch(url + "/auth/v1/settings", { headers }),
    ]);

    out.restStatus = rest.status;
    out.authStatus = auth.status;
    out.restReachable = rest.status < 500;
    out.authReachable = auth.status < 500;

    const body = await rest.text();
    out.coreSchema = rest.ok && body.includes("profiles");
    out.coachingSchema = rest.ok && body.includes("coach_clients") && body.includes("coach_assignments");
    out.ok = out.configured && rest.ok && out.authReachable && out.coreSchema && out.coachingSchema;
  } catch {
    // Diagnóstico seguro: no exponer URLs completas, claves ni cuerpo remoto.
  }
  return res.status(200).json(out);
}
