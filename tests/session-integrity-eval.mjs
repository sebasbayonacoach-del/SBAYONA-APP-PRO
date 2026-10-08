import { strict as assert } from "node:assert";
import { S } from "../js/state.js";
import { archiveSet } from "../js/engine.js";
import { normalizeSetFeedback, recordedSessionStrain } from "../js/session-live.js";

let passed=0;
const check=(condition,description)=>{assert.ok(condition,description);passed++;console.log("  PASS "+description);};
const r=s=>JSON.stringify(s);
console.log("\nBAYONA · SPRINT 17 · CONTINUIDAD Y HONESTIDAD DEL ENTRENAMIENTO\n");
S.init(); S.reset(true);

for(const value of [null,undefined,"", " ", false]){
  const feedback=normalizeSetFeedback({feeling:"smooth",effort:value,note:" bien "});
  check(feedback.effort===null,"sensación de esfuerzo no inventada cuando el campo es "+String(value));
}
check(normalizeSetFeedback({effort:"4",note:"  real  "}).effort===4,"esfuerzo real indicado se conserva");
const initial={xp:S.data.xp,points:S.data.points,credits:S.data.credits};
const zero=S.completeWorkout("op_upper",{plannedSets:0,loggedSets:0,minutes:50});
check(zero?.completed===false&&!S.data.today.trained,"sin trabajo previsto no se marca sesión completada");
check(S.data.xp===initial.xp&&S.data.points===initial.points&&S.data.credits===initial.credits,
  "sin series no hay bono, XP, puntos ni FitCoins");
const partial=S.completeWorkout("op_upper",{plannedSets:3,loggedSets:1,minutes:50});
check(partial?.completed===false&&!S.data.today.trained,"una sesión parcial no concede recompensa");
S.reset(true);
const firstPR=S.data.prs.bench;
check(firstPR===undefined,"sin PR inicial");
const s1=S.logSet("bench",0,60,8,2,{idKey:"s17:0:0"});
check(s1?.pr&&s1.skillGain>=1,"primera serie con récord registrada");
archiveSet("bench",60,8,2,"PECHO",{idKey:"s17:0:0",effort:null,note:"primera"});
const savedPR={...S.data.prs.bench};
const recorded1=S.data.today.setLog[0];
check(recorded1.effort===null&&recorded1.idKey==="s17:0:0","histórico conserva esfuerzo ausente como null y clave real");
check(recorded1.e1Base>0&&S.data.today.strain>0,"registro conserva base estimada y esfuerzo derivado real");
const snapshot={
  xp:S.data.xp,points:S.data.points,
  sets:S.data.today.trainingSets,statsSets:S.data.stats.sets,
  prs:S.data.stats.prs,skills:{...S.data.skills},
  strain:S.data.today.strain,ledger:S.data.today.setLog.length,
};
const s2=S.logSet("bench",1,80,8,2,{idKey:"s17:0:1"});
check(s2?.pr&&S.data.prs.bench.kg===80,"segundo récord reemplaza el anterior");
archiveSet("bench",80,8,2,"PECHO",{idKey:"s17:0:1",effort:4,note:"serie corregible"});
check(S.data.today.setLog.length===2&&S.data.today.strain>=snapshot.strain,"dos series cuentan para carga y registros");
const undone=S.undoSet({
  ...s2,idKey:"s17:0:1",exKey:"bench",kg:80,reps:8,previousPR:savedPR
});
check(undone===true,"última serie se puede deshacer");
check(r(S.data.prs.bench)===r(savedPR),"corrección restaura PR previo, no borra un récord válido");
check(S.data.xp===snapshot.xp&&S.data.points===snapshot.points,"XP y puntos vuelven a valores previos");
check(S.data.today.trainingSets===snapshot.sets&&S.data.stats.sets===snapshot.statsSets,"contadores de series vuelven a valores previos");
check(S.data.stats.prs===snapshot.prs,"contador de PRs se revierte exactamente");
check(r(S.data.skills)===r(snapshot.skills),"habilidades no conservan incremento fantasma");
check(S.data.today.setLog.length===snapshot.ledger&&S.data.today.setLog[0].idKey==="s17:0:0",
  "histórico mantiene la primera serie y retira la corregida");
check(S.data.today.strain===snapshot.strain &&
  S.data.today.strain===recordedSessionStrain(S.data.today.setLog),
  "carga de esfuerzo regresa al valor recalculado tras deshacer");
const secondUndo=S.undoSet({...s2,idKey:"s17:0:1",exKey:"bench",kg:80,reps:8,previousPR:savedPR});
check(secondUndo===false&&S.data.xp===snapshot.xp,"doble clic en deshacer no vuelve a restar XP");
const afterUndo=S.logSet("bench",1,82,8,2,{idKey:"s17:0:1"});
check(afterUndo?.pr&&S.data.today.trainingSets===snapshot.sets+1,
  "una serie deshecha puede corregirse y registrarse una vez");
const duplicate=S.logSet("bench",1,82,8,2,{idKey:"s17:0:1"});
check(duplicate===null&&S.data.today.trainingSets===snapshot.sets+1,"doble registro no duplica XP ni progreso");
console.log("\nRESULTADO: "+passed+" verificaciones, sin fallos\n");
