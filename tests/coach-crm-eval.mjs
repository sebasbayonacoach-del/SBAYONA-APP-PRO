import { strict as assert } from "node:assert";
import {
  normalizeCrmClient,normalizeAppointment,normalizePayment,normalizeReferral,normalizePurchase,
  normalizeCrmNote,coachCrmDefaults,upsertCrmClient,addCrmRecord,updateCrmRecordStatus,
  crmAlerts,crmSummary,crmClientSnapshot,crmTimeline,
} from "../js/coach/crm.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n📇 COACH CRM · DOMINIO\n");

ok(normalizeCrmClient({name:" Ana "})?.name==="Ana","cliente se normaliza");
ok(normalizeCrmClient({name:""})===null,"cliente sin nombre se rechaza");

const ap=normalizeAppointment({id:"a1",clientId:"c1",startAt:"2026-10-07T17:00:00+02:00",durationMin:45,kind:"session"});
ok(ap?.durationMin===45&&ap.status==="scheduled","cita estructurada");
ok(normalizeAppointment({clientId:"c1",startAt:"no"})===null,"cita con fecha inválida se rechaza");

const pay=normalizePayment({id:"p1",clientId:"c1",amountCents:3500,currency:"eur",status:"due",dueAt:"2026-10-01T12:00:00Z"});
ok(pay?.amountCents===3500&&pay.currency==="EUR","pago usa céntimos + moneda");
ok(normalizePayment({clientId:"c1",amountCents:35.5})===null,"pago fraccionario en céntimos se rechaza");

ok(normalizeReferral({referrerClientId:"c1",referredName:"Luis"})?.status==="lead","referido estructurado");
ok(normalizePurchase({clientId:"c1",item:"Camiseta",amountCents:4900})?.status==="ordered","compra estructurada");
ok(normalizeCrmNote({clientId:"c1",text:"Prefiere entrenar por la tarde"})?.text.includes("tarde"),"nota estructurada");

let crm=coachCrmDefaults();
crm=upsertCrmClient(crm,{id:"c1",name:"Ana",status:"active"});
crm=upsertCrmClient(crm,{id:"c1",name:"Ana M.",status:"active"});
ok(crm.clients.length===1&&crm.clients[0].name==="Ana M.","cartera hace upsert por id");

crm=addCrmRecord(crm,"appointments",ap);
crm=addCrmRecord(crm,"payments",pay);
crm=addCrmRecord(crm,"referrals",{id:"r1",referrerClientId:"c1",referredName:"Luis",status:"lead",createdAt:"2026-09-20T12:00:00Z",updatedAt:"2026-09-20T12:00:00Z"});
crm=addCrmRecord(crm,"purchases",{id:"b1",clientId:"c1",item:"Camiseta",amountCents:4900,currency:"EUR",status:"paid",createdAt:"2026-09-20T12:00:00Z",updatedAt:"2026-09-20T12:00:00Z"});
crm=addCrmRecord(crm,"notes",{id:"n1",clientId:"c1",text:"Seguimiento semanal"});
ok(crm.appointments.length===1&&crm.payments.length===1&&crm.notes.length===1,"ledger acumula registros");

let up=updateCrmRecordStatus(crm,"payments","p1","paid",new Date("2026-10-07T12:00:00Z"));
ok(up.changed&&up.record.paidAt,"pago puede marcarse pagado explícitamente");
crm=up.crm;
ok(updateCrmRecordStatus(crm,"payments","p1","paid").changed===false,"mismo estado no finge cambio");

crm=addCrmRecord(crm,"payments",{id:"p2",clientId:"c1",amountCents:100000,currency:"COP",status:"due",dueAt:"2026-10-01T12:00:00Z"});
crm=addCrmRecord(crm,"payments",{id:"p3",clientId:"c1",amountCents:2500,currency:"EUR",status:"due",dueAt:"2026-10-01T12:00:00Z"});
const now=new Date("2026-10-07T12:00:00Z");
const alerts=crmAlerts(crm,now);
ok(alerts.some((x)=>x.type==="payment"),"pago vencido genera alerta");
ok(alerts.some((x)=>x.type==="referral"),"referido sin seguimiento genera alerta");
ok(alerts.some((x)=>x.type==="purchase"),"compra pagada sin entregar genera alerta");

const sum=crmSummary(crm,new Date("2026-10-07T17:30:00+02:00"));
ok(sum.clients===1,"resumen cuenta clientes activos");
ok(sum.dueByCurrency.EUR===2500&&sum.dueByCurrency.COP===100000,"deuda no mezcla monedas");
ok(sum.appointmentsToday===1,"agenda del día usa fecha local");

const snap=crmClientSnapshot(crm,"c1",now);
ok(snap.client?.name==="Ana M."&&snap.payments.length===3,"ficha reúne cartera + ledger");
ok(snap.dueByCurrency.EUR===2500&&snap.dueByCurrency.COP===100000,"ficha conserva deuda por moneda");

const timeline=crmTimeline(crm,"c1");
ok(timeline.length>=6&&timeline[0].at>=timeline.at(-1).at,"timeline unifica eventos en orden");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
