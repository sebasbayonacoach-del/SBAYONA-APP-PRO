import { strict as assert } from "node:assert";
import { buildProgramDraft, recommendationGate, validateProgram } from "../js/coach-lab.js";

let passed=0;
const check=(condition,description)=>{assert.ok(condition,description);passed++;console.log("  PASS "+description);};
console.log("\nCOACH LAB · INTEGRIDAD DE EDAD Y FECHAS\n");

for(const age of [null,undefined,""," ",0,-1,NaN,false,true,999]){
  const gate=recommendationGate({age});
  check(gate.clearance==="standard","edad ausente/no válida no se inventa como menor: "+String(age));
}
check(recommendationGate({age:"16"}).clearance==="development_aware","edad 16 declarada: ruta de desarrollo");
check(recommendationGate({age:70}).clearance==="development_aware","edad 70 declarada: ruta adaptada");
check(recommendationGate({age:null,flags:["current_pain"]}).clearance==="manual_review","dolor declarado mantiene revisión manual");
check(recommendationGate({age:"",flags:["post_surgery"]}).autoRecommend===false,"postcirugía declarada bloquea recomendación automática");

const tzBefore=process.env.TZ;
try {
  for(const tz of ["UTC","Europe/Madrid","Pacific/Kiritimati","America/Los_Angeles"]){
    process.env.TZ=tz;
    const program=buildProgramDraft({
      clientId:"c1",generalObjective:"Mejorar movilidad",durationWeeks:4,
      startDate:"2026-10-25",contextFlags:["healthy_adult"],age:null,
    });
    check(program.startDate==="2026-10-25"&&program.endDate==="2026-11-21","fechas intactas al cruzar DST: "+tz);
    const weeks=program.mesocycles.flatMap(m=>m.microcycles);
    check(weeks[0].startDate==="2026-10-25"&&weeks[1].startDate==="2026-11-01","semanas de calendario sin desvío: "+tz);
    check(weeks.every(w=>Object.values(w.loadTarget).every(value=>value===null)),"cargas no inventadas: "+tz);
    check(program.safetyGate.clearance==="standard"&&validateProgram(program).ok,"programa sin edad válida conserva estado correcto: "+tz);
    const leap=buildProgramDraft({generalObjective:"Prueba",durationWeeks:4,startDate:"2028-02-29"});
    check(leap.startDate==="2028-02-29"&&leap.mesocycles[0].microcycles[1].startDate==="2028-03-07","día bisiesto válido: "+tz);
  }
} finally {
  if(tzBefore===undefined)delete process.env.TZ;else process.env.TZ=tzBefore;
}
for(const invalid of ["2026-02-30","2027-02-29","2026-13-01","2026-10-1","no-es-fecha"]){
  const program=buildProgramDraft({generalObjective:"Prueba",startDate:invalid});
  check(program.startDate===new Date().toISOString().slice(0,10),"fecha imposible no se normaliza a otra cita: "+invalid);
}
console.log("\nRESULTADO: "+passed+" checks · 0 fallos\n");
