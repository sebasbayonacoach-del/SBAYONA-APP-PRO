// BAYONA · diagnóstico del backend usando la misma configuración pública del cliente.
// No contiene ni devuelve credenciales.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const result = {
    ok: false,
    configured: false,
    authStatus: null,
    profilesStatus: null,
    progressStatus: null,
    coachingStatus: null,
  };

  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
    if (!host) return res.status(200).json(result);

    const src = await fetch(`${proto}://${host}/js/sync/config.js`, { cache: "no-store" }).then((r) => r.text());
    const url = src.match(/url:\s*["']([^"']+supabase\.co)["']/)?.[1] || "";
    const key = src.match(/anonKey:\s*["']([^"']+)["']/)?.[1] || "";
    result.configured = Boolean(url && key && !key.startsWith("PEGA_AQUI"));
    if (!result.configured) return res.status(200).json(result);

    const apiHeaders = { apikey: key, Accept: "application/json" };
    const probe = async (path, headers = apiHeaders) => {
      try {
        const response = await fetch(url + path, { headers });
        return response.status;
      } catch {
        return null;
      }
    };

    const [authStatus, profilesStatus, progressStatus, coachingStatus] = await Promise.all([
      probe("/auth/v1/settings", { apikey: key }),
      probe("/rest/v1/profiles?select=id&limit=0"),
      probe("/rest/v1/progress_logs?select=user_id&limit=0"),
      probe("/rest/v1/coach_clients?select=coach_id&limit=0"),
    ]);

    result.authStatus = authStatus;
    result.profilesStatus = profilesStatus;
    result.progressStatus = progressStatus;
    result.coachingStatus = coachingStatus;
    result.ok =
      Number(authStatus) >= 200 && Number(authStatus) < 400 &&
      Number(profilesStatus) >= 200 && Number(profilesStatus) < 400 &&
      Number(coachingStatus) >= 200 && Number(coachingStatus) < 400;

    return res.status(200).json(result);
  } catch {
    return res.status(200).json(result);
  }
}
