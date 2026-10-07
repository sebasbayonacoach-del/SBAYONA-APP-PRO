#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n📇 COACH CRM · CONTRATO UI\n");

const ui=read("js/ui/coach-crm.js");
const coachos=read("js/ui/coachos.js");
const domain=read("js/coach/crm.js");
const state=read("js/state.js");
const css=read("css/coach.css");
const sw=read("sw.js");

ok(coachos.includes("renderCoachCrm"),"Coach OS abre el CRM operativo");
ok(coachos.includes("registerCloudClientInCrm"),"clientes vinculados reales entran al CRM");
ok(coachos.includes("Los datos demo no entran al ledger"),"UI declara separación de demos");
ok(!ui.includes("CLIENTES_DEMO"),"CRM no importa cartera demo");

ok(ui.includes("crmSummary")&&ui.includes("crmClientSnapshot")&&ui.includes("crmTimeline"),"UI usa dominio canónico");
ok(ui.includes('S.upsertCoachCrmClient'),"alta de cliente escribe estado real");
ok(ui.includes('S.addCoachCrmRecord("appointments"'),"agenda escribe ledger");
ok(ui.includes('S.addCoachCrmRecord("payments"'),"pagos se registran en ledger");
ok(ui.includes('S.addCoachCrmRecord("referrals"'),"referidos se registran");
ok(ui.includes('S.addCoachCrmRecord("purchases"'),"compras se registran");
ok(ui.includes('S.addCoachCrmRecord("notes"'),"notas se registran");
ok(ui.includes('S.updateCoachCrmStatus("payments"'),"estado de pago cambia explícitamente");
ok(ui.includes("no realiza ningún cargo")&&ui.includes("no ejecuta el cobro"),"UI no finge procesamiento bancario");
ok(!ui.includes("stripe")&&!ui.includes("checkout"),"CRM local no dispara cobros externos");
ok(ui.includes("SINCRONIZAR NUBE")&&ui.includes("sync.onclick"),"subida de CRM requiere acción explícita");
ok(ui.includes("currentSession()&&accountRole()===\"coach\""),"sync solo aparece a Coach autenticado");

ok(domain.includes("amountCents"),"dominio usa céntimos enteros");
ok(domain.includes("dueByCurrency"),"dominio separa saldos por moneda");
ok(domain.includes('source:["manual","cloud","local"]'),"cliente conserva fuente");
ok(domain.includes("Pago vencido"),"pagos vencidos generan alerta");
ok(domain.includes("Referido sin contactar"),"referidos sin seguimiento generan alerta");
ok(domain.includes("Compra pagada pendiente de entrega"),"compras pendientes generan alerta");

ok(state.includes("coachCrm: coachCrmDefaults()"),"estado nuevo incluye CRM vacío");
ok(state.includes("upsertCoachCrmClient(input"),"estado expone upsert cliente");
ok(state.includes("addCoachCrmRecord(kind"),"estado expone ledger genérico");
ok(state.includes("updateCoachCrmStatus(kind"),"estado expone transición explícita");

ok(css.includes("COACH CRM · cartera"),"CRM tiene capa visual dedicada");
ok(css.includes(".coach-crm-client")&&css.includes(".coach-crm-ledger-row"),"cartera y ledger tienen layout");
ok(css.includes("@media(max-width:520px)"),"CRM contempla móvil");

ok(sw.includes("./js/coach/crm.js")&&sw.includes("./js/ui/coach-crm.js"),"CRM funciona offline");
{
  const version=Number((sw.match(/bayona-shell-v(\d+)/)||[])[1]||0);
  ok(version>=41,`shell PWA conserva Coach CRM (v${version} >= v41)`);
}

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
