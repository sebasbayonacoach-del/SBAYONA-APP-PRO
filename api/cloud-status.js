export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || "https://otkhozruunouimjgvvun.supabase.co";
  const key = process.env.SUPABASE_ANON_KEY || "sb_publishable_ZaBblymo5dRZZJNNOAUXeA_T2-7S1to";
  res.setHeader("Cache-Control", "no-store");
  if (!url || !key) return res.status(200).json({ ok: false, configured: false });
  try {
    const r = await fetch(url + "/rest/v1/", { headers: { apikey: key } });
    const body = await r.text();
    return res.status(200).json({
      ok: r.ok,
      configured: true,
      coreSchema: body.includes("profiles"),
      coachingSchema: body.includes("coach_clients") && body.includes("coach_assignments"),
    });
  } catch {
    return res.status(200).json({ ok: false, configured: true, coreSchema: false, coachingSchema: false });
  }
}
