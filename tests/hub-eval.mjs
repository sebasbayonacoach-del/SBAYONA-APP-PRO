import { strict as assert } from "node:assert";
import {
  DEFAULT_PROGRESS_REVIEW_DAYS, defaultProgressReviewAt, progressReviewStatus,
  coachPulse, sessionJourney, hubSnapshot, focusPreset,
} from "../js/hub.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🏠 HUB PERSONAL · DOMINIO\n");

ok(DEFAULT_PROGRESS_REVIEW_DAYS===28,"revisión de progreso por defecto = 28 días");
const base=new Date("2026-10-07T10:00:00Z");
const next=defaultProgressReviewAt(base);
ok(next.startsWith("2026-11-04"),"la revisión se programa 28 días después");
ok(progressReviewStatus({nextProgressReviewAt:next},base).days===28,"días hasta revisión exactos");
ok(progressReviewStatus({},base).status==="unscheduled","sin fecha explícita no se inventa revisión");
ok(progressReviewStatus({nextProgressReviewAt:"2026-10-06T10:00:00Z"},base).status==="overdue","revisión vencida se distingue");

ok(coachPulse({profile:{},today:{energy:null},workout:{id:"x"}}).state==="checkin","sin energía → Coach pide contexto");
ok(coachPulse({profile:{},today:{energy:3},workout:{id:"x"}}).state==="low-energy","energía baja → Coach adapta tono");
ok(coachPulse({profile:{},today:{trained:true},workout:{id:"x"}}).state==="recovery","sesión hecha → recuperación");
ok(coachPulse({profile:{},today:{},active:{status:"pausada"},workout:{id:"x"}}).state==="resume","sesión pendiente → retomar");

let j=sessionJourney({today:{},workout:{id:"x"}});
ok(j[0].state==="current"&&j[1].state==="locked","sin check-in empieza por contexto");
j=sessionJourney({today:{energy:7,startedWorkout:true,trainingSets:3},active:{logged:3,plannedSets:10,status:"activa"},workout:{id:"x"}});
ok(j[0].state==="done"&&j[1].state==="current"&&j[1].progress===30,"sesión activa refleja progreso real");
j=sessionJourney({today:{energy:7,trained:true,trainingSets:10},workout:{id:"x"}});
ok(j.every((x,i)=>i===3?x.state==="claimable":x.state==="done"),"sesión completada desbloquea recompensa");

const snap=hubSnapshot({
  data:{profile:{name:"Sebastian",membershipPlan:"performance",goalPrimary:"FUERZA"},today:{energy:8},credits:140,points:88,streak:4,stats:{workouts:9,sets:120,prs:3}},
  level:{lvl:4,cur:200,need:790},rank:"BASE",workout:{id:"op_upper"},now:base,
});
ok(snap.fitCoins===140&&snap.points===88,"FitCoins reutiliza credits; puntos siguen separados");
ok(snap.level===4&&snap.xp.pct===25,"nivel y XP salen de datos reales");
ok(snap.workouts===9&&snap.sets===120&&snap.prs===3,"historial visible sin inventar");
ok(snap.review.status==="unscheduled","snapshot no fabrica próxima revisión");
ok(focusPreset("nutrition").action==="sit"&&focusPreset("nutrition").env==="kitchen","nutrición tiene preset espacial real");
ok(Array.isArray(focusPreset("training").cam)&&focusPreset("training").cam.length===3&&focusPreset("training").env==="gym","preset de cámara y entorno válido");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
