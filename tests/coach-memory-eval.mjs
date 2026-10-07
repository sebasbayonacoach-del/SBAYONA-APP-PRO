import { strict as assert } from "node:assert";
import {
  normalizeMemoryEvent,memoryDefaults,addMemoryEvent,updateMemoryStatus,
  derivedMemoryFacts,coachMemoryFacts,memoryPromptLines,toolEvidence,proposalFromTool,
} from "../js/coach/memory.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🧠 COACH MEMORY · DOMINIO\n");

const e=normalizeMemoryEvent({type:"note",category:"training",basis:"registered",summary:"  me costó la última serie  "});
ok(e.summary==="me costó la última serie"&&e.basis==="registered","evento se normaliza");
ok(normalizeMemoryEvent({summary:""})===null,"evento vacío se rechaza");

let mem=addMemoryEvent({}, {...e,id:"x"});
mem=addMemoryEvent(mem,{...e,id:"x",summary:"actualizado"});
ok(mem.events.length===1&&mem.events[0].summary==="actualizado","idempotencia por id");
mem=updateMemoryStatus(mem,"x","accepted");
ok(mem.events[0].status==="accepted","estado explícito de memoria se actualiza");

const data={
  profile:{goalPrimary:"FUERZA",experience:"INTERMEDIO"},
  today:{date:"2026-10-07",sleep:7.5,energy:8,stress:3,soreness:2,kcal:1600,p:110,water:1500,
    recoveryNote:"piernas cargadas",setLog:[{ex:"squat",feeling:"hard",note:"última serie dura"}],
    meals:[{name:"Almuerzo",feeling:"satisfied",note:"me sentó bien"}]},
  history:[{date:"2026-10-06",sleep:7,energy:7,prPoints:[{ex:"squat",e1:90}]}],
  coachMemory:{events:[{id:"m1",at:"2026-10-07T10:00:00Z",type:"decision",category:"training",basis:"coach",status:"applied",summary:"Reducir una serie",evidence:["energía 4/10"],source:"coach"}]},
};
const facts=derivedMemoryFacts(data);
ok(facts.some((x)=>x.basis==="derived"&&/Sueño medio/.test(x.summary)),"media de sueño queda marcada DERIVADA");
ok(facts.some((x)=>x.basis==="registered"&&/feedback de serie/.test(x.summary)),"feedback real queda REGISTRADO");
const all=coachMemoryFacts(data);
ok(all.some((x)=>x.basis==="coach"&&/Reducir/.test(x.summary)),"decisión del Coach conserva su origen");
const lines=memoryPromptLines(data);
ok(lines.some((x)=>x.startsWith("[DERIVADO]"))&&lines.some((x)=>x.startsWith("[COACH]")),"prompt etiqueta origen");

const ev=toolEvidence("adjust_session",{razon:"fatiga"},data);
ok(ev.some((x)=>x.basis==="registered"&&x.label==="Sueño"),"propuesta cita datos registrados");
ok(ev.some((x)=>x.basis==="coach"&&x.label==="Razón propuesta"),"razón del Coach se distingue");

const prop=proposalFromTool({name:"adjust_session",label:"Ajustar sesión",args:{razon:"fatiga"}},new Date("2026-10-07T12:00:00Z"));
ok(prop.type==="proposal"&&prop.status==="pending"&&prop.basis==="coach","tool accionable crea propuesta pendiente");
ok(memoryDefaults({events:Array.from({length:300},(_,i)=>({id:"e"+i,summary:"x"+i,at:new Date(2026,0,1,0,i%60).toISOString()}))}).events.length===250,"memoria tiene límite");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
