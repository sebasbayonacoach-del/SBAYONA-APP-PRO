import { strict as assert } from "node:assert";
import { S, SCHEMA } from "../js/state.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🌙 RECOVERY + SLEEP · ESTADO\n");

S.init();
S.reset(true);

ok(SCHEMA===7,"schema actualizado a 7");
ok(S.data.recovery.sleepSchedule.bedTime===null,"perfil nuevo no inventa hora de dormir");
ok(S.data.recovery.wearable.status==="disconnected","wearable empieza desconectado");
ok(S.data.today.sleep===null&&S.data.today.sleepSource===null,"sueño diario empieza sin dato");

const schedule=S.setSleepSchedule({bedTime:"23:00",wakeTime:"07:00",windDownMinutes:45,reminderEnabled:true});
ok(schedule.bedTime==="23:00"&&schedule.wakeTime==="07:00","horario de sueño persiste");
ok(schedule.reminderEnabled===true,"preferencia de recordatorio persiste");

const pause=S.setActivePauseSchedule({enabled:true,intervalMinutes:75});
ok(pause.enabled&&pause.intervalMinutes===75,"pausas activas configurables");

const sleep=S.logSleepWindow({
  hours:7.5,
  bedAt:"2026-10-06T23:15:00Z",
  wakeAt:"2026-10-07T06:45:00Z",
  source:"manual",
});
ok(sleep.hours===7.5&&sleep.source==="manual","ventana de sueño manual se guarda");
ok(S.data.today.sleepBedAt&&S.data.today.sleepWakeAt,"hora de dormir/despertar persisten");

const practice=S.addRecoveryPractice({type:"cold_shower",minutes:3,note:"agua fría"});
ok(practice.type==="cold_shower"&&S.data.today.recoveryPractices.length===1,"práctica real se registra");

const activity=S.addOtherActivity({name:"Fútbol",category:"sport",minutes:60,intensity:"high"});
ok(activity.name==="Fútbol"&&S.data.today.otherActivities.length===1,"otro deporte se registra");

ok(S.setRecoveryNote("  piernas cargadas  ")==="piernas cargadas","nota de recuperación se normaliza");

const disconnected=S.setWearableState({provider:"reloj-x",status:"disconnected",metrics:{hrvMs:52}});
ok(disconnected.status==="disconnected"&&Object.keys(disconnected.metrics).length===0,"desconectado no conserva métricas");
const connected=S.setWearableState({
  provider:"reloj-x",status:"connected",lastSyncAt:"2026-10-07T08:00:00Z",
  capabilities:["hrv","sleep"],metrics:{hrvMs:52,restingHr:49},
});
ok(connected.status==="connected"&&connected.metrics.hrvMs===52,"integración verificada puede guardar métrica real");

S.data.today.stress=4;
S.data.today.energy=7;
S.data.today.soreness=3;
S.data.today.activePauses=2;
S.data.today.nightRoutine=["pantallas"];
S.data.today.date="2026-10-06";
S.rollDay();
const hist=S.data.history.at(-1);
ok(hist.sleep===7.5&&hist.stress===4,"rollover conserva sueño y estrés");
ok(hist.recoveryPractices.length===1&&hist.otherActivities.length===1,"rollover conserva contexto de recuperación");
ok(hist.activePauses===2&&hist.nightRoutine.length===1,"rollover conserva pausas/rutina nocturna");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
