import { strict as assert } from "node:assert";
import { S, SCHEMA } from "../js/state.js";
import { buildProgramDraft, setMicrocycleLoad, addProgramTest } from "../js/coach-lab.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🧭 PLANNING STUDIO · ESTADO\n");

S.init();
S.reset(true);

ok(SCHEMA>=10,`schema conserva Planning Studio (v${SCHEMA} >= 10)`);
ok(Array.isArray(S.data.coachPrograms)&&S.data.coachPrograms.length===0,"perfil nuevo no inventa programas");
ok(S.data.activeCoachProgramId===null,"sin programa activo inventado");

let p=buildProgramDraft({
  id:"program_test",clientId:"c1",name:"Temporada",
  sportTemplateId:"parkour",generalObjective:"Preparar temporada",startDate:"2026-10-12",
});
let save=S.saveCoachProgram(p);
ok(save.ok&&S.data.coachPrograms.length===1,"programa válido persiste");
ok(S.data.activeCoachProgramId==="program_test","programa guardado queda activo");
ok(S.coachProgram()?.id==="program_test","selector devuelve programa activo");

let loaded=setMicrocycleLoad(S.coachProgram(),1,{volumePct:80,intensityPct:70,rpe:7});
ok(loaded.ok,"carga semanal válida");
save=S.saveCoachProgram(loaded.program);
ok(save.ok&&S.coachProgram().mesocycles[0].microcycles[0].loadTarget.volumePct===80,"carga persiste");

let tested=addProgramTest(S.coachProgram(),{id:"test1",name:"Salto",metric:"distancia",unit:"cm",scheduledWeek:4});
ok(tested.ok&&S.saveCoachProgram(tested.program).ok,"test planificado persiste");

ok(S.saveCoachProgram({id:"bad"}).ok===false,"programa inválido no se guarda");
ok(S.setActiveCoachProgram("missing")===false,"programa inexistente no puede activarse");
ok(S.deleteCoachProgram("program_test")===true,"programa se puede eliminar explícitamente");
ok(S.data.coachPrograms.length===0&&S.data.activeCoachProgramId===null,"borrado limpia selección activa");
ok(S.deleteCoachProgram("program_test")===false,"borrado repetido no finge cambio");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
