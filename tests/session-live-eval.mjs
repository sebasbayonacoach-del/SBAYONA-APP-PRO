import { strict as assert } from "node:assert";
import {
  SESSION_PHASES, SET_FEELINGS, normalizeSetFeedback, sessionPhase,
  sessionCompletion, exerciseCheckpoint, completionDelta, sessionPath,
} from "../js/session-live.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🏋️ SESIÓN VIVA · DOMINIO\n");

ok(SESSION_PHASES.length===3,"tres fases explícitas");
ok(SET_FEELINGS.some(x=>x.id==="pain"),"feedback permite registrar dolor/molestia sin diagnosticar");
let f=normalizeSetFeedback({feeling:"hard",note:"  uff   me costó más  ",effort:4.4});
ok(f.feeling==="hard"&&f.note==="uff me costó más"&&f.effort===4,"feedback se normaliza");
f=normalizeSetFeedback({feeling:"inventado",note:"x".repeat(300),effort:99});
ok(f.feeling===null&&f.note.length===180&&f.effort===5,"feedback inválido se limita");

ok(sessionPhase({logged:0,plannedSets:10}).id==="initial","0 series = fase inicial");
ok(sessionPhase({logged:3,plannedSets:10}).id==="central","trabajo en curso = fase central");
ok(sessionPhase({logged:10,plannedSets:10}).id==="final","todas las series = fase final");
ok(sessionCompletion({logged:7,plannedSets:10}).complete===false,"sesión parcial no se considera completada");
ok(sessionCompletion({logged:10,plannedSets:10}).complete===true,"solo trabajo completo habilita cierre completo");
ok(sessionCompletion({logged:3,plannedSets:10}).pct===30,"progreso porcentual real");
ok(exerciseCheckpoint({exercises:[1,2,3],exIdx:1}).current===2,"checkpoint de ejercicio correcto");
ok(exerciseCheckpoint({exercises:[1,2,3],exIdx:3}).done===true,"checkpoint final detectado");

const d=completionDelta(
  {level:3,credits:120,points:50},
  {level:4,credits:170,points:110},
  {xp:88}
);
ok(d.leveledUp&&d.fitCoinsGained===50&&d.pointsGained===60&&d.completionXp===88,"resumen usa deltas reales");
const path=sessionPath({logged:5,plannedSets:5,exercises:[1,2],exIdx:2});
ok(path.phase==="final"&&path.canComplete&&path.progress===100,"path final solo con 100% real");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
