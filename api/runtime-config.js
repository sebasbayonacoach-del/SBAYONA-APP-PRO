// BAYONA · configuración pública de runtime.
// Solo expone credenciales PUBLICABLES diseñadas para navegador.
// Producción no usa fallback hardcodeado: el despliegue debe declarar env.

import { publicSupabaseEnv, securityHeaders } from "./_security.js";

export default function handler(req, res) {
  securityHeaders(res);
  const { url, anonKey, configured } = publicSupabaseEnv();

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=3600");

  const payload = configured ? { url, anonKey } : null;
  const safe = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  res.status(200).send(`window.BAYONA_SUPABASE = ${safe};\n`);
}
