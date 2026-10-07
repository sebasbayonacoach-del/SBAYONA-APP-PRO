import { strict as assert } from "node:assert";
import {
  NIGHT_STEPS,normalizeRecoveryPreferences,recoveryDefaults,sleepWindowDuration,
  sleepRecordFromTimes,sleepTimeline,nextSleepEvent,normalizeOtherActivity,normalizeRecoveryPractice,
  wearableSnapshot,recoveryTrend,recoverySnapshot,
} from "../js/recovery-sleep.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🌙 RECOVERY + SLEEP · DOMINIO\n");

const prefs=normalizeRecoveryPreferences({
  bedtime:"23:15",wakeTime:"07:15",windDownMin:60,
  reminders:{windDown:true,bedtime:false},
});
ok(prefs.configured&&prefs.windDownMin===60,"horario personal se normaliza");
ok(sleepWindowDuration("23:15","07:15")===8,"ventana nocturna cruza medianoche");
ok(sleepWindowDuration("bad","07:15")===null,"horario inválido no se inventa");
const sleepRec=sleepRecordFromTimes("2026-10-07","23:15","06:45");
ok(sleepRec?.hours===7.5,"registro real cruza medianoche y calcula duración");
ok(sleepRecordFromTimes("2026-10-07","99:00","07:00")===null,"registro con hora inválida se rechaza");

const tl=sleepTimeline(prefs);
ok(tl.length===3&&tl[0].time==="22:15"&&tl[2].time==="07:15","timeline calcula desaceleración y despertar");
const next=nextSleepEvent(prefs,new Date(2026,9,7,22,0,0));
ok(next.id==="windDown"&&next.minutes===15,"siguiente evento usa hora local real");

const activity=normalizeOtherActivity({name:"Fútbol",minutes:75,intensity:"hard",at:"2026-10-07T18:00:00Z"});
ok(activity?.name==="Fútbol"&&activity.minutes===75&&activity.intensity==="hard","otra actividad queda estructurada");
ok(normalizeOtherActivity({name:"",minutes:20})===null,"actividad sin nombre se rechaza");

const practice=normalizeRecoveryPractice({tag:"breathing",minutes:5,note:"antes de dormir",at:"2026-10-07T21:00:00Z"});
ok(practice?.tag==="breathing"&&practice.minutes===5,"práctica de recuperación queda estructurada");
ok(normalizeRecoveryPractice({tag:"invented",minutes:5})===null,"práctica desconocida no entra");

const disconnected=wearableSnapshot({});
ok(!disconnected.connected&&Object.keys(disconnected.metrics).length===0,"wearable desconectado no simula métricas");
const connected=wearableSnapshot({health:{connected:true,provider:"Apple Health",lastSyncAt:"2026-10-07T08:00:00Z",metrics:{hrvMs:62,restingHr:54,sleepHours:7.8,steps:8900}}});
ok(connected.connected&&connected.provider==="Apple Health"&&connected.metrics.hrvMs===62,"wearable real conserva proveedor y métricas");

const trend=recoveryTrend([
  {date:"2026-10-05",sleep:7,soreness:4,energy:6,stress:5,strain:8,activePauses:2,otherActivities:[{minutes:30}]},
  {date:"2026-10-06",sleep:8,soreness:3,energy:7,stress:4,strain:6,activePauses:3,otherActivities:[{minutes:45}]},
],{date:"2026-10-07",sleep:7.5,soreness:2,energy:8,stress:3,strain:4,activePauses:1,otherActivities:[]},7);
ok(trend.sleep===7.5&&trend.activePauses===6,"tendencia usa datos registrados");
ok(trend.otherActivityMin===75,"otros deportes se agregan sin convertirlos en entreno BAYONA");

const snap=recoverySnapshot({
  today:{date:"2026-10-07",sleep:7.5,soreness:2,energy:8,stress:3,strain:4,nightRoutine:["pantallas","hora"],activePauses:1,postureChecks:2,otherActivities:[activity],recoveryPractices:[practice]},
  history:[],recovery:{preferences:prefs},integrations:{},readiness:{score:81,estimated:true},
  now:new Date("2026-10-07T22:00:00+02:00"),
});
ok(snap.nightRoutine.done===2&&snap.nightRoutine.total===NIGHT_STEPS.length,"rutina nocturna cuenta pasos reales");
ok(snap.sleepWindowHours===8&&snap.nextEvent.id==="windDown","snapshot combina horario y próximo evento");
ok(snap.wearable.connected===false,"snapshot no finge conexión externa");
ok(snap.readiness.score===81,"readiness existente entra como dato separado");
ok(recoveryDefaults().preferences.configured===false,"defaults no fingen horario configurado");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
