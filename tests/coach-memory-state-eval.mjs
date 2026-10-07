import { strict as assert } from "node:assert";
import { S, SCHEMA } from "../js/state.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🧠 COACH MEMORY · ESTADO\n");

S.init();
S.reset(true);

ok(SCHEMA===8,"schema actualizado a 8");
ok(Array.isArray(S.data.coachMemory.events)&&S.data.coachMemory.events.length===0,"memoria nueva empieza vacía");

const first=S.rememberCoachEvent({
  id:"proposal_test",
  type:"proposal",
  category:"training",
  basis:"coach",
  status:"pending",
  summary:"Reducir una serie hoy",
  evidence:["energía 4/10"],
  source:"coach",
});
ok(first?.id==="proposal_test","evento del Coach se guarda");
ok(S.data.coachMemory.events.length===1,"evento aparece una sola vez");
ok(S.data.coachMemory.events[0].status==="pending","propuesta nace pendiente");

S.rememberCoachEvent({
  id:"proposal_test",
  type:"proposal",
  category:"training",
  basis:"coach",
  status:"pending",
  summary:"Reducir dos series hoy",
  source:"coach",
});
ok(S.data.coachMemory.events.length===1,"mismo id actualiza sin duplicar");
ok(S.data.coachMemory.events[0].summary==="Reducir dos series hoy","actualización reemplaza contenido");

ok(S.updateCoachMemoryStatus("proposal_test","accepted")===true,"estado puede aceptarse");
ok(S.data.coachMemory.events[0].status==="accepted","aceptación persiste");
ok(S.updateCoachMemoryStatus("proposal_test","applied")===true,"estado puede pasar a aplicado");
ok(S.data.coachMemory.events[0].status==="applied","aplicación persiste");
ok(S.updateCoachMemoryStatus("missing","rejected")===false,"id inexistente no finge cambio");

S.rememberCoachEvent({
  id:"registered_note",
  type:"note",
  category:"recovery",
  basis:"registered",
  status:"active",
  summary:"Piernas cargadas",
  source:"user",
});
ok(S.data.coachMemory.events.some((x)=>x.basis==="registered"),"memoria conserva origen registrado");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
