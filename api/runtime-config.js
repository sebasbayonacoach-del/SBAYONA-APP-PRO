// BAYONA · configuración pública de runtime.
// Solo expone credenciales públicas diseñadas para navegador.
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

export default function handler(req, res) {
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_ANON_KEY;
  const url = validUrl(envUrl) ? envUrl : FALLBACK_URL;
  const anonKey = validPublicKey(envKey) ? envKey : FALLBACK_KEY;

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const payload = JSON.stringify({ url, anonKey })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  res.status(200).send(`window.BAYONA_SUPABASE = ${payload};\n`);
}
