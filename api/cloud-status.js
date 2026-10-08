import { publicSupabaseEnv, securityHeaders } from "./_security.js";

export default async function handler(req, res) {
  securityHeaders(res);
  const { url, anonKey, configured } = publicSupabaseEnv();

  const out = {
    ok: false,
    configured,
    runtimeSource: configured ? "vercel-env" : "not-configured",
    restReachable: false,
    restStatus: null,
    authReachable: false,
    authStatus: null,
    coreSchema: false,
    coachingSchema: false,
    communitySchema: false,
  };

  if (!configured) return res.status(200).json(out);

  try {
    const headers = { apikey: anonKey, accept: "application/json" };
    const [rest, auth, core, coaching, community] = await Promise.all([
      fetch(url + "/rest/v1/", { headers, cache: "no-store" }),
      fetch(url + "/auth/v1/settings", { headers, cache: "no-store" }),
      fetch(url + "/rest/v1/profiles?select=id&limit=0", { headers, cache: "no-store" }),
      fetch(url + "/rest/v1/coach_clients?select=coach_id&limit=0", { headers, cache: "no-store" }),
      fetch(url + "/rest/v1/community_posts?select=id&limit=0", { headers, cache: "no-store" }),
    ]);

    out.restStatus = rest.status;
    out.authStatus = auth.status;
    out.restReachable = rest.status < 500;
    out.authReachable = auth.status < 500;
    out.coreSchema = core.status < 500 && core.status !== 404;
    out.coachingSchema = coaching.status < 500 && coaching.status !== 404;
    out.communitySchema = community.status < 500 && community.status !== 404;
    out.ok = configured && out.restReachable && out.authReachable && out.coreSchema && out.coachingSchema;
  } catch {
    // Diagnóstico seguro: no expone URL, clave ni cuerpo remoto.
  }
  return res.status(200).json(out);
}
