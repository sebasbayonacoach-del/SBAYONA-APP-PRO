import { strict as assert } from "node:assert";
import { dueDailyReminder, dayKey } from "../js/notifications/daily.js";

const date = (h,m=0) => new Date(2026,10,15,h,m);
const plan = { siguiente:{id:"sesion",titulo:"Sentadilla técnica"},
  grupos:[{items:[{id:"sesion",done:false,titulo:"Sentadilla técnica"}, {id:"checkin",done:false,titulo:"Check-in del día"}]}] };
const prefs = {asked:true,morning:true,preTraining:true,preTrainingAt:"18:00",evening:true};
let passed=0;
const ok=(cond,label)=>{assert.ok(cond,label);passed++;};
ok(dayKey(date(8))==="2026-11-15","fecha local estable");
ok(dueDailyReminder({plan,preferences:{...prefs,asked:false},now:date(8,30)})===null,"sin consentimiento no hay avisos");
ok(dueDailyReminder({plan,preferences:{asked:true},now:date(8,30)})===null,"ningún momento elegido no avisa");
const morning=dueDailyReminder({plan,preferences:prefs,now:date(8,30)});
ok(morning?.id==="2026-11-15:morning","recordatorio por la mañana");
ok(!morning.body.includes("Sentadilla"),"la pantalla bloqueada no revela el nombre de la sesión");
ok(dueDailyReminder({plan,preferences:prefs,now:date(8,31),sent:[morning.id]})===null,"no repite mañana");
ok(dueDailyReminder({plan,preferences:prefs,now:date(12)})===null,"fuera de ventana no llega un aviso atrasado");
const training=dueDailyReminder({plan,preferences:prefs,now:date(18,20)});
ok(training?.id.endsWith(":preTraining"),"entrenamiento en hora elegida");
ok(dueDailyReminder({plan,preferences:{...prefs,preTrainingAt:""},now:date(18,20)})===null,"sin hora configurada no se adivina");
ok(dueDailyReminder({plan,preferences:prefs,now:date(19)})===null,"sin avisos atrasados");
const complete={siguiente:null,grupos:[{items:[{id:"sesion",done:true},{id:"checkin",done:true}]}]};
ok(dueDailyReminder({plan:complete,preferences:prefs,now:date(18,20)})===null,"no inventa sesión terminada");
const evening=dueDailyReminder({plan,preferences:prefs,now:date(20,15)});
ok(evening?.id.endsWith(":evening"),"cierre pendiente al final del día");
ok(dueDailyReminder({plan:complete,preferences:prefs,now:date(20,15)})===null,"sin check-in pendiente no molesta");
ok(dueDailyReminder({plan,preferences:prefs,now:date(23,55)})===null,"no interrumpe entrada la madrugada");
ok(dueDailyReminder({plan,preferences:prefs,now:date(20,15),sent:[evening.id]})===null,"no repite cierre");
console.log("APP 6.0 · "+passed+" comprobaciones de recordatorios: PASS");
