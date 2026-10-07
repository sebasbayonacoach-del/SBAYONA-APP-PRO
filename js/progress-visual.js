// BAYONA — Progress Visual domain model.
// Une entrenamiento, medidas, fotos y consistencia sin rellenar huecos.

import { volumenPorSemana, constancia, progresoFuerza } from "./progreso.js";
import { deltas, proximaMedicion } from "./medidas.js";
import { lineaDelTiempo } from "./timeline.js";

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;

function dayNum(key){
  if(!DATE_RE.test(String(key||""))) return null;
  const [y,m,d]=String(key).split("-").map(Number);
  return Date.UTC(y,m-1,d)/864e5;
}
function dayKey(n){
  const d=new Date(n*864e5);
  const p=(x)=>String(x).padStart(2,"0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`;
}
function validSeries(setLog=[]){
  return (Array.isArray(setLog)?setLog:[])
    .filter((s)=>s&&Number.isFinite(Number(s.reps))&&Number(s.reps)>0)
    .map((s)=>({
      ejercicio:s.ex||s.ejercicio||null,
      kg:Number.isFinite(Number(s.kg))?Number(s.kg):null,
      reps:Number(s.reps),
      e1RM:Number.isFinite(Number(s.e1RM))?Number(s.e1RM):undefined,
    }));
}

export function progressRecords(data={}){
  const out=[];
  const push=(fecha,source={})=>{
    if(!DATE_RE.test(String(fecha||""))) return;
    const series=validSeries(source.setLog);
    const active=Boolean(
      source.workouts>0||source.sets>0||source.trained||source.startedWorkout||
      source.mobility||Number(source.mind)>0||Number(source.water)>=1500||series.length
    );
    if(series.length) out.push({fecha,series,actividad:true});
    else if(active) out.push({fecha,actividad:true,series:[]});
  };
  for(const h of Array.isArray(data.history)?data.history:[]) push(h?.date,h||{});
  if(data.today?.date) push(data.today.date,data.today);
  return out.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0);
}

export function strengthRecords(data={}){
  const rows=progressRecords(data).map((r)=>({fecha:r.fecha,series:(r.series||[]).slice()}));
  const add=(fecha,s)=>{
    if(!DATE_RE.test(String(fecha||""))||!s?.ejercicio) return;
    let row=rows.find((x)=>x.fecha===fecha);
    if(!row){row={fecha,series:[]};rows.push(row);}
    row.series.push(s);
  };
  for(const h of Array.isArray(data.history)?data.history:[]){
    for(const p of Array.isArray(h?.prPoints)?h.prPoints:[]){
      if(Number.isFinite(Number(p.e1))) add(h.date,{ejercicio:p.ex,e1RM:Number(p.e1)});
    }
  }
  for(const p of Array.isArray(data.today?.prPoints)?data.today.prPoints:[]){
    if(Number.isFinite(Number(p.e1))) add(data.today.date,{ejercicio:p.ex,e1RM:Number(p.e1)});
  }
  return rows.sort((a,b)=>a.fecha<b.fecha?-1:a.fecha>b.fecha?1:0);
}

export function strengthLeaders(data={}){
  return progresoFuerza(strengthRecords(data)).map((row)=>{
    const first=row.puntos[0]||null;
    const last=row.puntos.at(-1)||null;
    return {
      ejercicio:row.ejercicio,
      first,
      last,
      delta:first&&last?+(last.e1RM-first.e1RM).toFixed(1):null,
      points:row.puntos.length,
    };
  }).sort((a,b)=>(b.last?.e1RM||0)-(a.last?.e1RM||0));
}

export function weeklyLoad(data={}){
  const bucket=new Map();
  const rows=[...(Array.isArray(data.history)?data.history:[])];
  if(data.today?.date) rows.push({
    date:data.today.date,
    strain:data.today.strain||0,
    sets:data.today.trainingSets||0,
    workouts:data.today.trained?1:0,
  });
  for(const r of rows){
    const n=dayNum(r?.date);
    if(n===null) continue;
    const monday=n-((n+3)%7);
    const key=dayKey(monday);
    if(!bucket.has(key)) bucket.set(key,{week:key,strain:0,sets:0,sessions:0,days:0});
    const x=bucket.get(key);
    const strain=Number(r.strain);
    const sets=Number(r.sets);
    const sessions=Number(r.workouts);
    if(Number.isFinite(strain)) x.strain+=Math.max(0,strain);
    if(Number.isFinite(sets)) x.sets+=Math.max(0,sets);
    if(Number.isFinite(sessions)) x.sessions+=Math.max(0,sessions);
    if((strain>0)||(sets>0)||(sessions>0)) x.days++;
  }
  return [...bucket.values()].sort((a,b)=>a.week<b.week?-1:1);
}

function periodRows(data={},from,to){
  const all=[...(Array.isArray(data.history)?data.history:[])];
  if(data.today?.date) all.push({
    ...data.today,
    date:data.today.date,
    workouts:data.today.trained?1:0,
    sets:data.today.trainingSets||0,
  });
  return all.filter((r)=>{
    const n=dayNum(r?.date);
    return n!==null&&n>=from&&n<=to;
  });
}

export function periodSummary(data={},days=28,nowKey=data.today?.date){
  const now=dayNum(nowKey);
  const span=Math.max(1,Math.trunc(Number(days)||28));
  if(now===null) return null;
  const currentFrom=now-span+1;
  const previousFrom=currentFrom-span;
  const previousTo=currentFrom-1;

  const summarize=(rows)=>{
    let sessions=0,sets=0,activeDays=0,volume=0,volumeKnown=true,prs=0;
    for(const r of rows){
      sessions+=Math.max(0,Number(r.workouts)||0);
      sets+=Math.max(0,Number(r.sets)||0);
      if((Number(r.workouts)>0)||(Number(r.sets)>0)||(Number(r.water)>=1500)||(Number(r.mind)>0)||r.mobility) activeDays++;
      prs+=(Array.isArray(r.prPoints)?r.prPoints.length:0);
      for(const s of validSeries(r.setLog)){
        if(Number.isFinite(s.kg)&&s.kg>=0) volume+=s.kg*s.reps;
        else volumeKnown=false;
      }
    }
    return {sessions,sets,activeDays,prs,volumeKg:volumeKnown?Math.round(volume):null,daysWithData:rows.length};
  };
  const current=summarize(periodRows(data,currentFrom,now));
  const previous=summarize(periodRows(data,previousFrom,previousTo));
  const delta=(key)=>{
    const a=current[key],b=previous[key];
    if(a==null||b==null) return null;
    return +(a-b).toFixed(1);
  };
  return {
    days:span,
    current,
    previous,
    delta:{
      sessions:delta("sessions"),
      sets:delta("sets"),
      activeDays:delta("activeDays"),
      prs:delta("prs"),
      volumeKg:delta("volumeKg"),
    },
    comparable:previous.daysWithData>0,
  };
}

export function photoSummary(photos=[]){
  const valid=(Array.isArray(photos)?photos:[]).filter((p)=>p?.at&&p?.view);
  const byView={front:0,side:0,back:0,other:0};
  for(const p of valid){
    const k=Object.hasOwn(byView,p.view)?p.view:"other";
    byView[k]++;
  }
  const latest=valid.slice().sort((a,b)=>a.at<b.at?1:-1)[0]||null;
  return {count:valid.length,byView,latestAt:latest?.at||null,comparable:valid.length>=2};
}

export function progressSnapshot(data={},nowKey=data.today?.date){
  const records=progressRecords(data);
  const volumes=volumenPorSemana(records);
  const measures=Array.isArray(data.medidas)?data.medidas:[];
  return {
    stats:{
      workouts:Math.max(0,Number(data.stats?.workouts)||0),
      sets:Math.max(0,Number(data.stats?.sets)||0),
      prs:Math.max(0,Number(data.stats?.prs)||0),
      sessionsMin:Math.max(0,Number(data.stats?.sessionsMin)||0),
      km:Math.max(0,Number(data.stats?.km)||0),
      streak:Math.max(0,Number(data.streak)||0),
    },
    consistency:constancia(records),
    volumeWeeks:volumes,
    strength:strengthLeaders(data),
    loadWeeks:weeklyLoad(data),
    measures:{
      count:measures.length,
      deltas:deltas(measures),
      due:nowKey?proximaMedicion(measures,nowKey):null,
      latest:measures.slice().filter((m)=>m?.fecha).sort((a,b)=>a.fecha<b.fecha?1:-1)[0]||null,
    },
    photos:photoSummary(data.photos),
    period28:periodSummary(data,28,nowKey),
    timeline:lineaDelTiempo({
      medidas,
      fotos:data.photos||[],
      history:data.history||[],
      journey:data.journey||[],
    }),
  };
}
