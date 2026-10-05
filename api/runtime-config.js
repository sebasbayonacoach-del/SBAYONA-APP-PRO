// BAYONA · configuración pública de runtime.
// Expone únicamente credenciales diseñadas para el navegador:
// SUPABASE_URL + anon public key. Nunca service_role ni secretos privados.
export default function handler(req, res) {
  const url = process.env.SUPABASE_URL || "https://otkhozruunouimjgvvun.supabase.co";
  const anonKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_ZaBblymo5dRZZJNNOAUXeA_T2-7S1to";

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const payload = JSON.stringify({ url, anonKey })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  res.status(200).send(`window.BAYONA_SUPABASE = ${payload};\n`);
}
