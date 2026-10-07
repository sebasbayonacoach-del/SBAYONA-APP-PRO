import { strict as assert } from "node:assert";
import {
  progressRecords,strengthRecords,strengthLeaders,weeklyLoad,
  periodSummary,photoSummary,progressSnapshot,
} from "../js/progress-visual.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n📈 PROGRESS VISUAL · DOMINIO\n");

const data={
  stats:{workouts:3,sets:24,prs:2,sessionsMin:150,km:7.5},
  streak:3,
  history:[
    {date:"2026-09-10",workouts:1,sets:8,water:1800,strain:8,setLog:[
      {ex:"squat",kg:60,reps:8},{ex:"bench",kg:50,reps:8}
    ],prPoints:[{ex:"squat",e1:76}]},
    {date:"2026-09-17",workouts:1,sets:8,water:1600,strain:10,setLog:[
      {ex:"squat",kg:65,reps:8},{ex:"bench",kg:52.5,reps:8}
    ],prPoints:[{ex:"squat",e1:82}]},
    {date:"2026-09-25",workouts:1,sets:8,water:1200,strain:11,setLog:[
      {ex:"squat",kg:70,reps:6}
    ]},
  ],
  today:{date:"2026-10-07",trained:false,startedWorkout:true,trainingSets:3,water:900,strain:5,setLog:[
    {ex:"squat",kg:72.5,reps:5}
  ],prPoints:[]},
  medidas:[
    {fecha:"2026-09-01",pesoKg:80,cinturaCm:90},
    {fecha:"2026-09-15",pesoKg:79.2,cinturaCm:88.5},
    {fecha:"2026-10-01",pesoKg:78.8,cinturaCm:88},
  ],
  photos:[
    {view:"front",at:"2026-09-01T10:00:00Z",dataUrl:"x"},
    {view:"front",at:"2026-10-01T10:00:00Z",dataUrl:"y"},
  ],
  journey:[{date:"2026-09-17",type:"hito",text:"Semana sólida",xp:20}],
};

const rec=progressRecords(data);
ok(rec.length===4,"registros combinan histórico + hoy");
ok(rec.at(-1).fecha==="2026-10-07","hoy queda en orden cronológico");
ok(rec.at(-1).series[0].ejercicio==="squat","series preservan ejercicio real");

const sr=strengthRecords(data);
ok(sr.some((x)=>x.series.some((s)=>s.e1RM===82)),"récord guardado entra en fuerza");
const leaders=strengthLeaders(data);
ok(leaders[0].ejercicio==="squat"&&leaders[0].points>=3,"líder de fuerza usa puntos reales");
ok(leaders[0].delta>0,"delta de fuerza deriva inicio→actual");

const load=weeklyLoad(data);
ok(load.length>=3,"carga se agrupa por semana");
ok(load.some((x)=>x.strain===10),"strain semanal conserva dato real");

const p=periodSummary(data,28,"2026-10-07");
ok(p.days===28&&p.current.sets>0,"comparativa de 28 días resume trabajo actual");
ok(p.comparable===false,"sin periodo previo suficiente no se inventa comparación");
ok(typeof p.delta.sets==="number","el delta matemático existe, aunque la UI no lo vende como comparable");

const photos=photoSummary(data.photos);
ok(photos.count===2&&photos.byView.front===2&&photos.comparable,"fotos resumidas por vista");
ok(photoSummary([]).latestAt===null,"sin fotos no inventa última fecha");

const snap=progressSnapshot(data,"2026-10-07");
ok(snap.stats.workouts===3&&snap.stats.sets===24,"snapshot usa stats reales");
ok(snap.measures.count===3&&snap.measures.latest.pesoKg===78.8,"medidas muestran última real");
ok(snap.measures.deltas.pesoKg.delta===-1.2,"delta corporal exacto");
ok(snap.timeline.length>=3,"timeline unifica hitos existentes");
ok(snap.volumeWeeks.length>0,"snapshot expone volumen semanal");

const empty=progressSnapshot({today:{date:"2026-10-07"},stats:{}},"2026-10-07");
ok(empty.strength.length===0&&empty.photos.count===0,"sin datos no fabrica progreso");
ok(empty.period28.current.sessions===0,"periodo vacío queda en cero de actividad registrada");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
