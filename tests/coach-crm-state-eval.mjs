import { strict as assert } from "node:assert";
import { S, SCHEMA } from "../js/state.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n📇 COACH CRM · ESTADO\n");

S.init();
S.reset(true);

ok(SCHEMA>=9,`schema conserva Coach CRM (v${SCHEMA} >= 9)`);
ok(S.data.coachCrm.clients.length===0,"CRM nuevo empieza sin clientes inventados");
ok(S.data.coachCrm.payments.length===0,"CRM nuevo empieza sin pagos inventados");

const c=S.upsertCoachCrmClient({id:"c1",name:"Ana",status:"active"});
ok(c?.id==="c1"&&S.data.coachCrm.clients.length===1,"cliente persiste");
S.upsertCoachCrmClient({id:"c1",name:"Ana M.",status:"active"});
ok(S.data.coachCrm.clients.length===1&&S.data.coachCrm.clients[0].name==="Ana M.","upsert no duplica cliente");

const ap=S.addCoachCrmRecord("appointments",{id:"a1",clientId:"c1",startAt:"2026-10-08T10:00:00Z",durationMin:60});
ok(ap?.id==="a1"&&S.data.coachCrm.appointments.length===1,"cita persiste");

const pay=S.addCoachCrmRecord("payments",{id:"p1",clientId:"c1",amountCents:3500,currency:"EUR",status:"due",dueAt:"2026-10-08T10:00:00Z"});
ok(pay?.amountCents===3500,"pago registrado persiste");
ok(S.updateCoachCrmStatus("payments","p1","paid")===true,"pago puede marcarse pagado");
ok(S.data.coachCrm.payments[0].status==="paid"&&S.data.coachCrm.payments[0].paidAt,"paid guarda timestamp");
ok(S.updateCoachCrmStatus("payments","p1","paid")===false,"mismo estado no finge cambio");
ok(S.updateCoachCrmStatus("payments","missing","paid")===false,"id inexistente no finge cambio");

const ref=S.addCoachCrmRecord("referrals",{id:"r1",referrerClientId:"c1",referredName:"Luis"});
const pur=S.addCoachCrmRecord("purchases",{id:"b1",clientId:"c1",item:"Camiseta",amountCents:4900,currency:"EUR"});
const note=S.addCoachCrmRecord("notes",{id:"n1",clientId:"c1",text:"Seguimiento semanal"});
ok(ref&&pur&&note,"referido, compra y nota persisten");

ok(S.addCoachCrmRecord("payments",{id:"bad",clientId:"c1",amountCents:3.5})===null,"registro inválido no se escribe");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
