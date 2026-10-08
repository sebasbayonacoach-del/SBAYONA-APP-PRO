// BAYONA · diagnóstico del backend desde variables de entorno.
// No lee código cliente ni devuelve credenciales.

import { publicSupabaseEnv, securityHeaders } from "./_security.js";

export default async function handler(req, res) {
  securityHeaders(res);
  const { url, anonKey, configured } = publicSupabaseEnv();
  const result = {
    ok: false,
    configured,
    authStatus: null,
    profilesStatus: null,
    progressStatus: null,
    coachingStatus: null,
    communityStatus: null,
  };

  if (!configured) return res.status(200).json(result);

  const headers = { apikey: anonKey, accept: "application/json" };
  const probe = async (path) => {
    try {
      const response = await fetch(url + path, { headers, cache: "no-store" });
      return response.status;
    } catch {
      return null;
    }
  };

  const [authStatus, profilesStatus, progressStatus, coachingStatus, communityStatus] = await Promise.all([
    probe("/auth/v1/settings"),
    probe("/rest/v1/profiles?select=id&limit=0"),
    probe("/rest/v1/progress_logs?select=user_id&limit=0"),
    probe("/rest/v1/coach_clients?select=coach_id&limit=0"),
    probe("/rest/v1/community_posts?select=id&limit=0"),
  ]);

  Object.assign(result,{authStatus,profilesStatus,progressStatus,coachingStatus,communityStatus});
  result.ok =
    Number(authStatus) >= 200 && Number(authStatus) < 500 &&
    Number(profilesStatus) >= 200 && Number(profilesStatus) < 500 &&
    Number(coachingStatus) >= 200 && Number(coachingStatus) < 500;

  return res.status(200).json(result);
}
