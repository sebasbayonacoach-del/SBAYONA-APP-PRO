import { supabaseConfig } from "../js/sync/config.js";

const cfg = supabaseConfig();
const report = { checkedAt: new Date().toISOString(), project: null, checks: {}, readyForPublicRegistration: false };
const status = (name, ok, detail) => {
  report.checks[name] = { ok: Boolean(ok), detail };
  console.log(`${ok ? "PASS" : "BLOCKED"} ${name}: ${detail}`);
};
if (!cfg.ready) {
  status("project", false, "Configurar URL y public key.");
  process.exitCode = 1;
} else {
  report.project = new URL(cfg.url).host;
  const headers = { apikey: cfg.anonKey };
  async function query(path, options = {}) {
    try {
      const response = await fetch(cfg.url + path, {
        ...options, headers: { ...headers, ...options.headers },
        signal: AbortSignal.timeout(9000),
      });
      const data = options.method === "HEAD" ? {} : await response.json().catch(() => ({}));
      return { status: response.status, data, location: response.headers.get("location") || "" };
    } catch (error) {
      return { status: 0, data: {}, error: error.message, location: "" };
    }
  }
  const health = await query("/auth/v1/health");
  status("supabase_auth", health.status === 200, "HTTP " + health.status);

  const settings = await query("/auth/v1/settings");
  status("google_provider", settings.data.external?.google === true, "Google enabled: " + Boolean(settings.data.external?.google));

  const profiles = await query("/rest/v1/profiles?select=id&limit=0");
  const exists = profiles.status === 200 || profiles.status === 401 || profiles.status === 403;
  status("profiles_schema", exists, "HTTP " + profiles.status + (profiles.data?.code ? " / " + profiles.data.code : ""));

  const nonce = "readiness-diagnostic";
  for (const [name, redirect] of Object.entries({
    android: "bayonafit://auth/callback?auth_state=" + nonce,
    web: "https://bayona-app-one.vercel.app/?source=pwa&auth_state=" + nonce,
  })) {
    const url = new URL("/auth/v1/authorize", cfg.url);
    url.searchParams.set("provider", "google");
    url.searchParams.set("redirect_to", redirect);
    try {
      const response = await fetch(url, {
        headers, redirect: "manual", signal: AbortSignal.timeout(9000),
      });
      const target = new URL(response.headers.get("location") || cfg.url);
      status("google_redirect_" + name, response.status === 302 && target.hostname.endsWith("google.com"),
        "HTTP " + response.status + " to " + target.hostname);
    } catch (error) {
      status("google_redirect_" + name, false, error.message);
    }
  }

  report.backendPrerequisitesPassed = Boolean(
    report.checks.supabase_auth.ok &&
    report.checks.google_provider.ok &&
    report.checks.profiles_schema.ok &&
    report.checks.google_redirect_android.ok &&
    report.checks.google_redirect_web.ok
  );
  status("oauth_callback_web_e2e", false,
    "Observed OAuth login returned to marketing bayona-jet.vercel.app, not APP; fix Supabase redirect allowlist.");
  status("oauth_callback_android_e2e", false,
    "Android deep-link return not yet completed with a real Google test account.");
  status("owner_role_production", false,
    "SQL function is_bayona_coach missing while public schema is absent.");
  status("vercel_preview", false,
    "Deployment API denied access to team scope (HTTP 403).");
  report.readyForPublicRegistration = false;
  status("release_gate", false,
    "Release blocked until schema/RLS, final OAuth callbacks, coach owner, and app deployment pass.");
  if (!report.readyForPublicRegistration) process.exitCode = 2;
}
console.log("REPORT " + JSON.stringify(report));
