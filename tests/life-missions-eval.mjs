import assert from "node:assert/strict";
import { S, todayKey } from "../js/state.js";
import { RULES, areaMissionReward } from "../js/rewards.js";
import { addPlannerItem, completePlannerItem } from "../js/planner.js";
import { lifeMissions } from "../js/game/missions.js";
import { decideNow } from "../js/now.js";

let pass=0;
function check(condition, label) {
  assert.ok(condition,label);
  pass++;
  console.log("  ✅ " + label);
}
console.log("\nBAYONA · LIFE GAME · MISIONES 5 ÁREAS\n");
S.init();
S.reset(true);
const date=todayKey();
let progress=lifeMissions({life:S.data.life,today:S.data.today,date});
check(progress.areas.length===5 && progress.done===0, "cinco áreas reales, sin misiones ficticias");
check(!S.claimAreaMission("body"), "no cobra bono sin actividad");

const areas=["body","mind","work","relationships","purpose"];
for (const area of areas) {
  const result=addPlannerItem(S.data.life, {
    title:"Hacer una acción en "+area,area,date,
    source:"manual",status:"planned",type:"personal",
  },{id:"growth_"+area});
  S.data.life=result.life;
}
check(lifeMissions({life:S.data.life,today:S.data.today,date}).next.id==="growth_body",
  "elige la siguiente tarea voluntaria ya planificada");
const startXP=S.data.xp;
check(S.claimAreaMission("purpose")===null,"un área pendiente no concede puntos");

const external=addPlannerItem(S.data.life,{
  title:"Visitar a alguien",area:"relationships",date,source:"device_calendar",
  externalId:"ext_1",status:"done",
},{id:"ext1"});
S.data.life=external.life;
check(lifeMissions({life:S.data.life,today:S.data.today,date}).areas.find(x=>x.id==="relationships").done===false,
  "evento importado no demuestra misión personal");

const completed=completePlannerItem(S.data.life,"growth_relationships",true);
S.data.life=completed.life;
progress=lifeMissions({life:S.data.life,today:S.data.today,date});
const relations=progress.areas.find(x=>x.id==="relationships");
check(relations.done && relations.source==="confirmed", "área Relaciones respeta confirmación manual explícita");
const r1=S.claimAreaMission("relationships");
check(r1?.xp===RULES.areaMission.relationships, "bono pequeño sale de rewards.js");
check(!S.claimAreaMission("relationships"),"repetir el botón no concede XP otra vez");
check(S.data.xp===startXP+RULES.areaMission.relationships,"el XP coincide con el bono único");

S.data.today.trained=true;
S.data.today.mind=5;
S.data.today.workBlocks=1;
S.data.life=completePlannerItem(S.data.life,"growth_purpose",true).life;
progress=lifeMissions({life:S.data.life,today:S.data.today,date});
check(progress.done===5,"registro deportivo, mente y trabajo + confirmaciones completan las cinco áreas");
for (const area of ["body","mind","work","purpose"]) {
  const reward=S.claimAreaMission(area);
  check(reward?.xp===areaMissionReward(area).xp,"bono limitado del área "+area);
  check(S.claimAreaMission(area)===null, "área "+area+" no se reclama dos veces");
}
const total=Object.values(RULES.areaMission).reduce((a,b)=>a+b,0);
check(S.data.xp===startXP+total && total<=52,"límite absoluto diario de 52 XP");
check(S.claimMission("area_body")===null,"ruta legacy no permite reclamar los IDs de áreas");
check(S.data.today.missionKeys.filter(k=>k.startsWith("area_")).length===5,
  "los cinco bonos quedan registrados en missionKeys de hoy");

let now=decideNow({
  now:new Date(new Date().setHours(12,0,0,0)),
  profile:{name:"Lucía"},today:{trained:false,date},
  readinessDetail:{score:75},workout:null,activeSession:null,
  missionContext:lifeMissions({life:S.data.life,today:{date},date}),
});
check(now.action==="planner" && now.kind==="life",
  "NOW sugiere tarea ya elegida al no tener sesión o cita");

now=decideNow({
  now:new Date(new Date().setHours(12,0,0,0)),
  profile:{name:"Lucía"},today:{trained:false,date},
  readinessDetail:{score:25},workout:null,activeSession:null,
  missionContext:lifeMissions({life:S.data.life,today:{date},date}),
});
check(now.kind!=="life","preparación baja evita sugerir progreso forzado");

now=decideNow({
  now:new Date(new Date().setHours(12,0,0,0)),
  profile:{name:"Lucía"},today:{trained:false,date},
  readinessDetail:{score:75},workout:null,
  activeSession:{status:"en_curso",logged:1,plannedSets:3},
  missionContext:lifeMissions({life:S.data.life,today:{date},date}),
});
check(now.kind==="resume","sesión activa conserva prioridad sobre misiones");

check(S.data.life.planner.items.filter(x=>x.id.startsWith("growth_")).length===5,
  "misiones no duplican ni crean tareas automáticamente");
console.log("\n"+pass+" comprobaciones · 0 fallos\n");
