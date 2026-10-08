#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\nPRODUCTION HARDENING CONTRACT\n");

const sec=read("api/_security.js");
const coach=read("api/coach.js");
const ai=read("js/coach/ai.js");
const runtime=read("api/runtime-config.js");
const syncCfg=read("js/sync/config.js");
const status=read("api/cloud-status.js");
const probe=read("api/cloud-probe.js");
const billing=read("api/billing-checkout.js");
const webhook=read("api/billing-webhook.js");
const migration=read("api/supabase/migrations/0008_production_hardening.sql");
const backup=read("js/cloud-backup.js");
const telemetry=read("api/telemetry.js");
const obs=read("js/observability.js");
const rollout=read("js/rollout.js");
const ci=read(".github/workflows/ci.yml");
const vercel=read("vercel.json");
const sw=read("sw.js");
const more=read("js/ui/more.js");
const loader=read("js/app-loader.js");

ok(sec.includes("allowedOrigin")&&sec.includes("verifySupabaseUser"),"helper controla origen y sesión");
ok(!coach.includes('access-control-allow-origin", "*"'),"Coach no usa CORS wildcard");
ok(coach.includes("verifySupabaseUser(req)"),"Coach cloud requiere sesión");
ok(ai.includes("session?.access_token")&&ai.includes("headers.authorization"),"cliente envía bearer al Coach");
ok(runtime.includes("publicSupabaseEnv")&&!runtime.includes("FALLBACK_KEY"),"runtime depende de env");
ok(!/https:\/\/[a-z0-9-]+\.supabase\.co/i.test(syncCfg),"cliente no contiene URL Supabase fija");
ok(!/sb_publishable_[A-Za-z0-9_-]{8,}/.test(syncCfg),"cliente no contiene publishable key fija");
ok(status.includes("not-configured")&&!status.includes("shared-bayona-fallback"),"cloud status no finge fallback");
ok(!probe.includes("js/sync/config.js"),"cloud probe no raspa código cliente");

ok(billing.includes("verifySupabaseUser")&&billing.includes("stripeRequest"),"checkout exige auth y Stripe server");
ok(webhook.includes("verifyStripeSignature")&&webhook.includes("alreadyProcessed"),"webhook es firmado e idempotente");
ok(migration.includes("user reads own billing subscription"),"billing tiene RLS propia");
ok(!migration.includes("user inserts own billing subscription"),"usuario no puede autoconcederse plan");
ok(migration.includes("billing_webhook_events"),"webhooks tienen ledger idempotente");

ok(backup.includes("sha256")&&backup.includes("checksum"),"backup verifica SHA-256");
ok(migration.includes("user reads own backups")&&migration.includes("user inserts own backups"),"backup RLS es por usuario");
ok(migration.includes("offset 5"),"backend limita backups por usuario");
ok(migration.includes("octet_length(payload::text) <= 1000000"),"backend limita tamaño de backup");

ok(telemetry.includes("DETAIL_KEYS"),"telemetría usa allowlist");
ok(!obs.includes("event.message")&&!/event\.(?:error|reason)\?\.stack|details\.stack/.test(obs),"observabilidad no manda texto libre ni stack de errores");
ok(migration.includes("Sin policies: el navegador no lee/escribe telemetría directamente"),"telemetría no tiene acceso directo cliente");
ok(rollout.includes("bucket(user.id,key)")&&migration.includes("percentage between 0 and 100"),"rollout es gradual y determinista");
ok(migration.includes("('billing_checkout',false,0")&&migration.includes("('cloud_backup',false,0"),"features sensibles nacen apagadas");

ok(!ci.includes("continue-on-error: true"),"CI no tolera fallos estáticos");
ok(ci.includes("verify-production.mjs")&&ci.includes("perf-budget.mjs"),"CI bloquea seguridad y performance");
ok(vercel.includes("Strict-Transport-Security")&&vercel.includes("Content-Security-Policy"),"despliegue añade HSTS y CSP");
ok(!sw.includes("./trainingym/catalog.json")&&!sw.includes("./vendor/three.module.js"),"PWA no precarga recursos pesados");
ok(/CACHE = "bayona-shell-v45"/.test(sw),"shell PWA está en v45");
ok(more.includes("renderProductionControls"),"controles de producción están en Más");
ok(loader.includes("installObservability"),"observabilidad se instala al cargar");

console.log(`\nRESULTADO: ${pass} pass · 0 fail\n`);
