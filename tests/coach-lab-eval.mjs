import { strict as assert } from "node:assert";
import {
  PROGRAM_LEVELS, PROGRAM_TEMPLATES, normalizeCoachText, searchExercises,
  recommendationGate, buildProgramDraft, validateProgram,
  addProgramCheckpoint, addSessionToWeek, programStats,
} from "../js/coach-lab.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🧪 COACH LAB · BÚSQUEDA + PLANIFICACIÓN\n");

ok(JSON.stringify(PROGRAM_LEVELS)===JSON.stringify(["macrocycle","mesocycle","microcycle","session"]),"jerarquía Macro → Meso → Micro → Sesión");
ok(Object.keys(PROGRAM_TEMPLATES).length>=7,"plantillas cubren salud, fuerza, hipertrofia, potencia, retorno, juventud y deporte");
ok(normalizeCoachText("  MÚSCULO  ").trim()==="musculo","normalización quita acentos");

const rows=[
  {pos:3,nombre:"Press banca",tipo:"Fuerza",grupo_muscular:"Pecho",nivel_esfuerzo:["medio"],perfil_resistencia:["carga"],etiquetas:["barra"],estado_media:"ok",video_disponible_local:true},
  {pos:1,nombre:"Peso muerto",tipo:"Fuerza",grupo_muscular:"Cadena posterior",nivel_esfuerzo:["alto"],perfil_resistencia:["carga"],etiquetas:["barra"],estado_media:"ok",video_disponible_local:true},
  {pos:2,nombre:"Puente de glúteo",tipo:"Fuerza",grupo_muscular:"Glúteo",nivel_esfuerzo:["medio"],perfil_resistencia:["carga"],etiquetas:["suelo"],estado_media:"no_video",video_disponible_local:false},
  {pos:4,nombre:"Movilidad pectoral",tipo:"Movilidad",grupo_muscular:"Pecho",nivel_esfuerzo:["bajo"],perfil_resistencia:["movilidad"],etiquetas:["pared"],estado_media:"ok",video_disponible_local:true},
];
let found=searchExercises(rows,{q:"p"});
ok(found.length===4,"una sola letra devuelve todas las coincidencias");
ok(found[0].nombre==="Peso muerto"&&found[1].nombre==="Press banca"&&found[2].nombre==="Puente de glúteo","empieza por nombre antes de coincidencias secundarias");
found=searchExercises(rows,{q:"pecho"});
ok(found.length===2&&found[0].nombre==="Press banca","nombre pesa más que grupo muscular");
found=searchExercises(rows,{q:"p",type:"Movilidad"});
ok(found.length===1&&found[0].nombre==="Movilidad pectoral","búsqueda y filtros se cruzan");
found=searchExercises(rows,{q:"barra"});
ok(found.length===2,"etiquetas también son buscables");

ok(recommendationGate({flags:["healthy_adult"]}).clearance==="standard","adulto sano → estándar");
ok(recommendationGate({age:15}).clearance==="development_aware","menor → ruta de desarrollo");
ok(recommendationGate({flags:["return_after_inactivity"]}).clearance==="transition_limited","retorno → transición limitada");
const risky=recommendationGate({flags:["current_pain","medical_condition"]});
ok(risky.clearance==="manual_review"&&!risky.autoRecommend,"dolor/condición médica → revisión manual, no autorrecomendación");

let p=buildProgramDraft({
  clientId:"c1",name:"Fuerza 12 semanas",templateId:"strength",
  generalObjective:"Mejorar fuerza",specificObjectives:["Sentadilla","Press"],durationWeeks:12,
  startDate:"2026-10-12",contextFlags:["healthy_adult"],
});
ok(p.durationWeeks===12&&p.mesocycles.length===3,"12 semanas → 3 mesociclos de 4");
ok(p.mesocycles.flatMap(x=>x.microcycles).length===12,"cubre 12 microciclos semanales");
ok(validateProgram(p).ok,"programa generado cumple contrato");
p=addProgramCheckpoint(p,{week:4,kind:"review",metricIds:["adherencia","carga"]});
ok(p.checkpoints.length===1&&p.checkpoints[0].week===4,"checkpoint se añade con semana");
let added=addSessionToWeek(p,2,{name:"Fuerza A",day:"M",durationMin:60,exercises:[{ex:"squat"}]});
ok(added.ok&&programStats(added.program).sessions===1,"sesión se inserta dentro del microciclo");
ok(!addSessionToWeek(p,99,{name:"x"}).ok,"semana inexistente no se inventa");

const danger=buildProgramDraft({
  clientId:"c2",templateId:"general_adherence",generalObjective:"Volver",
  durationWeeks:8,contextFlags:["current_pain"],
});
ok(danger.safetyGate.clearance==="manual_review","macro hereda el gate de seguridad");
ok(validateProgram({...danger,safetyGate:{clearance:"standard"}}).ok===false,"no se puede degradar un gate manual");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
