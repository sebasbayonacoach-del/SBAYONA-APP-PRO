export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || "https://otkhozruunouimjgvvun.supabase.co";
  const key = process.env.SUPABASE_ANON_KEY || "sb_publishable_ZaBblymo5dRZZJNNOAUXeA_T2-7S1to";
  res.setHeader("Cache-Control", "no-store");

  const out = {
    ok: false,
    configured: Boolean(url && key),
    restReachable: false,
    restStatus: null,
    authReachable: false,
    authStatus: null,
    coreSchema: false,
    coachingSchema: false,
  };

  if (!url || !key) return res.status(200).json(out);

  const headers = { apikey: key };
  try {
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

    return res.status(200).json(out);
  } catch {
    return res.status(200).json(out);
  }
}
