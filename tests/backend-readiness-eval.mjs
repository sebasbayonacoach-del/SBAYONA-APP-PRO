import assert from "node:assert/strict";
import { classifyProfilesProbe, runReadiness } from "../tools/auth-readiness.mjs";

const tests = [];
const check = (condition, label) => { assert.ok(condition, label); tests.push(label); };

check(classifyProfilesProbe({ status: 200 }).state === "verified", "HTTP 200 verifica el endpoint profiles");
check(classifyProfilesProbe({ status: 404, data: { code: "PGRST205" } }).state === "blocked", "PGRST205 identifica tabla ausente o no expuesta");
check(classifyProfilesProbe({ status: 403, data: { code: "42501" } }).state === "blocked", "42501 identifica permiso insuficiente sin llamarlo tabla inexistente");
check(classifyProfilesProbe({ status: 401, data: { code: "invalid_api_key" } }).detail.includes("no se puede concluir"), "401 no se confunde con relación ausente");
check(classifyProfilesProbe({ status: 0 }).state === "unverified", "fallo de red queda sin verificar");

const quiet = console.log;
console.log = () => {};
try {
  const { report, exitCode } = await runReadiness({
    config: { ready: true, url: "https://project.example", anonKey: "test-public-key" },
    env: {},
    fetchImpl: async (input) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/auth/v1/health")) return new Response("{}", { status: 200 });
      if (url.pathname.endsWith("/auth/v1/settings")) {
        return Response.json({ external: { google: true }, disable_signup: false });
      }
      if (url.pathname.endsWith("/rest/v1/profiles")) return Response.json([]);
      return new Response("{}", { status: 404 });
    },
  });
  check(exitCode === 0 && report.registrationPreconditionsReady, "precondiciones se basan en respuestas actuales simuladas");
  check(report.checks.oauth_callback_completion.state === "unverified", "no finge un OAuth completado sin login real");
  check(report.checks.owner_role.state === "unverified", "no declara falta del propietario sin consulta autenticada");
  check(report.checks.deployment.state === "unverified", "despliegue sin URL no se marca como fallido");
} finally { console.log = quiet; }

console.log(`✅ ${tests.length} comprobaciones de backend/readiness`);
