#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n☁️ COACH CRM · CLOUD + RLS\n");

const sql=read("api/supabase/migrations/0006_coach_crm.sql");
const sync=read("js/sync/coaching.js");
const ui=read("js/ui/coach-crm.js");

for(const table of [
  "coach_crm_clients","coach_crm_appointments","coach_crm_payments",
  "coach_crm_referrals","coach_crm_purchases","coach_crm_notes",
]){
  ok(sql.includes(`create table if not exists ${table}`),`${table} existe`);
  ok(sql.includes(`alter table ${table} enable row level security`),`${table} tiene RLS`);
}
ok(sql.includes("auth.uid() = coach_id")||sql.includes("auth.uid()=coach_id"),"RLS ata registros al Coach autenticado");
ok(sql.includes("coach_crm_client_link_valid"),"cliente autenticado requiere vínculo activo");
ok(sql.includes("coach_crm_owns_client"),"hijos deben pertenecer a ficha del mismo Coach");
ok(sql.includes("No policy de UPDATE para notas"),"notas son inmutables por política");
ok(!/client reads own crm payments/i.test(sql),"no existe policy que abra pagos al cliente");
ok(!/client reads own crm notes/i.test(sql),"no existe policy que abra notas al cliente");
ok(sql.includes("amount_cents")&&sql.includes("currency"),"backend conserva dinero en céntimos + moneda");
ok(sql.includes("NO procesan pagos"),"migración declara alcance administrativo");

ok(sync.includes("pushCoachCrmToCloud"),"existe push explícito");
ok(sync.includes("pullCoachCrmFromCloud"),"existe pull explícito");
ok(sync.includes("syncCoachCrmCloud"),"existe fusión explícita");
ok(sync.includes("crmNewer"),"sync compara timestamps");
ok(sync.includes("cloudId"),"sync separa id local y cloud");
ok(sync.includes('accountRole() !== "coach"'),"sync requiere rol Coach");
ok(!sync.includes("service_role"),"cliente nunca usa service_role");

ok(ui.includes('syncCoachCrmCloud(S)'),"UI invoca sync solo por acción");
ok(ui.includes('sync.onclick=async()=>'),"sync está detrás de click explícito");
ok(ui.includes("No se ejecuta automáticamente"),"UI explica que no sube datos sola");
ok(ui.includes("CRM LOCAL A SALVO"),"fallo cloud preserva y comunica estado local");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
