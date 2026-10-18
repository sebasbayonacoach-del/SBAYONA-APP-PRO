import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { supabaseConfig } from "../js/sync/config.js";

export function classifyProfilesProbe({ status = 0, data = {} } = {}) {
  const code = typeof data?.code === "string" ? data.code : "";
  if (status === 200) return { state: "verified", detail: "public.profiles responde por REST (consulta vacía)." };
  if (status === 404 && code === "PGRST205") {
    return { state: "blocked", detail: "PostgREST no encuentra public.profiles; falta aplicar la migración o exponer la tabla.", code };
  }
  if (code === "42501") {
    return { state: "blocked", detail: "PostgREST reconoce la relación, pero anon carece del privilegio de tabla necesario.", code };
  }
  if (status === 401 || status === 403) {
    return { state: "blocked", detail: `Data API denegó la consulta (HTTP ${status}); no se puede concluir si la relación existe.`, code: code || undefined };
  }
  if (status === 0) return { state: "unverified", detail: "No se pudo alcanzar el endpoint REST." };
  return { state: "unverified", detail: `REST respondió HTTP ${status}; revisar el código PostgREST antes de concluir.` , code: code || undefined };
}

function isMain() {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

export async function runReadiness({ fetchImpl = fetch, env = process.env, config = supabaseConfig() } = {}) {
  const report = { checkedAt: new Date().toISOString(), projectHost: null, checks: {}, registrationPreconditionsReady: false };
  const record = (name, state, detail, extra = {}) => {
    report.checks[name] = { state, detail, ...extra };
    console.log(`${state.toUpperCase()} ${name}: ${detail}`);
  };
  if (!config.ready) {
    record("project", "blocked", "Configurar URL y public key.");
    console.log("REPORT " + JSON.stringify(report));
    return { report, exitCode: 1 };
  }

  const base = config.url.replace(/\/+$/, "");
  report.projectHost = new URL(base).host;
  const headers = { apikey: config.anonKey, Accept: "application/json" };
  async function query(path, { method = "GET", redirect = "follow" } = {}) {
    try {
      const response = await fetchImpl(base + path, {
        method, headers, redirect, cache: "no-store", signal: AbortSignal.timeout(9000),
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data, location: response.headers.get("location") || "" };
    } catch {
      return { status: 0, data: {}, location: "" };
    }
  }

  const health = await query("/auth/v1/health");
  record("supabase_auth", health.status === 200 ? "verified" : health.status === 0 ? "unverified" : "blocked",
    health.status ? `HTTP ${health.status}.` : "No se pudo verificar la salud de Auth.");

  const settings = await query("/auth/v1/settings");
  const googleEnabled = settings.status === 200 && settings.data?.external?.google === true;
  record("google_provider", settings.status !== 200 ? "unverified" : googleEnabled ? "verified" : "blocked",
    settings.status !== 200 ? `Ajustes de Auth respondieron HTTP ${settings.status}.` : `Google ${googleEnabled ? "habilitado" : "deshabilitado"} según los ajustes actuales.`);
  const signupKnown = settings.status === 200 && typeof settings.data?.disable_signup === "boolean";
  const signupEnabled = signupKnown && settings.data.disable_signup === false;
  record("signup_setting", !signupKnown ? "unverified" : signupEnabled ? "verified" : "blocked",
    !signupKnown ? "Auth no expuso disable_signup en esta respuesta." : `Registro por contraseña ${signupEnabled ? "habilitado" : "deshabilitado"} según ajustes actuales.`);

  const profiles = await query("/rest/v1/profiles?select=id&limit=0");
  const profileCheck = classifyProfilesProbe(profiles);
  record("profiles_schema", profileCheck.state, profileCheck.detail, {
    ...(profiles.status ? { httpStatus: profiles.status } : {}),
    ...(profileCheck.code ? { apiCode: profileCheck.code } : {}),
  });

  for (const [name, envKey] of [["web", "BAYONA_AUTH_WEB_REDIRECT"], ["android", "BAYONA_AUTH_ANDROID_REDIRECT"]]) {
    const redirect = env[envKey];
    if (!redirect) {
      record(`oauth_start_${name}`, "unverified", `Define ${envKey} para probar el inicio OAuth configurado.`);
      continue;
    }
    const endpoint = new URL("/auth/v1/authorize", base);
    endpoint.searchParams.set("provider", "google");
    endpoint.searchParams.set("redirect_to", redirect);
    const start = await query(endpoint.pathname + endpoint.search, { redirect: "manual" });
    let providerHost = "";
    try { providerHost = new URL(start.location).hostname; } catch { /* sin destino */ }
    const handoff = start.status >= 300 && start.status < 400 && /(^|\.)google\.com$/i.test(providerHost);
    record(`oauth_start_${name}`, handoff ? "verified" : start.status ? "blocked" : "unverified",
      handoff
        ? `HTTP ${start.status}: Supabase inició el salto a Google; el retorno completo del usuario sigue sin probar.`
        : start.status ? `El inicio OAuth no llegó a Google (HTTP ${start.status}); no se comprobó el retorno.` : "No se pudo comprobar el inicio OAuth.");
  }

  record("oauth_callback_completion", "unverified", "Requiere completar un inicio de sesión real; el diagnóstico no crea ni modifica usuarios.");
  record("owner_role", "unverified", "Requiere revisión autenticada de la función y configuración del propietario; sin credenciales ni UUID no se simula.");

  if (env.BAYONA_DEPLOYMENT_URL) {
    let deployment;
    try {
      const url = new URL(env.BAYONA_DEPLOYMENT_URL);
      const response = await fetchImpl(url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(9000) });
      deployment = response.status >= 200 && response.status < 400 ? "verified" : "blocked";
      record("deployment", deployment, `URL configurada respondió HTTP ${response.status}.`);
    } catch {
      record("deployment", "unverified", "No se pudo verificar la URL de despliegue configurada.");
    }
  } else {
    record("deployment", "unverified", "Define BAYONA_DEPLOYMENT_URL para comprobar un despliegue concreto.");
  }

  report.registrationPreconditionsReady = report.checks.supabase_auth.state === "verified" &&
    report.checks.signup_setting.state === "verified" && report.checks.profiles_schema.state === "verified";
  record("registration_preconditions", report.registrationPreconditionsReady ? "verified" : "blocked",
    report.registrationPreconditionsReady
      ? "Auth, ajuste de registro y endpoint profiles responden; esto no demuestra un alta completa."
      : "Falta verificar salud de Auth, permiso de registro o endpoint profiles.");
  console.log("REPORT " + JSON.stringify(report));
  return { report, exitCode: report.registrationPreconditionsReady ? 0 : 2 };
}

if (isMain()) {
  const { exitCode } = await runReadiness();
  process.exitCode = exitCode;
}
