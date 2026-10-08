import {strict as assert} from "node:assert";
import {spawnSync} from "node:child_process";
import {weekView,weekDayDate} from "../js/training-calendar.js";

let pass=0;
const ok=(yes,msg)=>{assert.ok(yes,msg);pass++;console.log("PASS "+msg)};
console.log("\nBAYONA · CALENDARIO 24 SEMANAS\n");

for(let week=1;week<=24;week++){
 for(let delta=-35;delta<=35;delta++){
  const view=weekView(week,delta);
  const expected=Math.max(1,Math.min(24,week+delta));
  assert.equal(view.week,expected);
  assert.equal(view.offset,expected-week);
  assert.equal(view.canPrevious,expected>1);
  assert.equal(view.canNext,expected<24);
 }
}
ok(true,"1.704 escenarios de límites 1–24 y botones anteriores/siguientes");
ok(weekView(1,-200).week===1,"no aparece una semana cero o negativa");
ok(weekView(24,200).week===24,"no aparece una semana 25");
ok(weekView(3,1).phase.code==="HIPER","semana 4: fase HIPERTROFIA");
ok(weekView(9,1).phase.code==="FUERZA","semana 10: fase FUERZA");
ok(weekView(15,1).phase.code==="PERF","semana 16: fase RENDIMIENTO");
ok(weekView(21,1).phase.code==="PICO","semana 22: fase PICO");
ok(weekView(23,1).phase.code==="DESCARGA","semana 24: fase DESCARGA");
ok(weekView(24,0).phase.name==="DESCARGA","fase seleccionada corresponde a semana vista");
const key=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const ref=new Date(2026,9,8,13);
ok(key(weekDayDate(ref,0,0))==="2026-10-05","lunes del 8 de octubre");
ok(key(weekDayDate(ref,0,3))==="2026-10-08","jueves de la semana actual");
ok(key(weekDayDate(ref,1,3))==="2026-10-15","jueves siguiente corresponde al siguiente plan");
ok(key(weekDayDate(ref,-1,0))==="2026-09-28","salto al mes anterior correcto");
ok(key(weekDayDate(new Date(2026,11,31),1,0))==="2027-01-04","cruce de año conserva fecha local");

for(const timezone of ["Europe/Madrid","America/New_York"]){
 const script=`import {weekDayDate} from './js/training-calendar.js'; const d=weekDayDate(new Date(2026,2,29,12),1,0); console.log(d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate())`;
 const run=spawnSync(process.execPath,["--input-type=module","-e",script],{cwd:new URL("..",import.meta.url),env:{...process.env,TZ:timezone},encoding:"utf8"});
 ok(run.status===0&&run.stdout.trim()==="2026-3-30","semana posterior al cambio horario en "+timezone);
}
console.log("\nRESULTADO: "+pass+" verificaciones + 1704 casos \u00b7 0 fallos\n");
