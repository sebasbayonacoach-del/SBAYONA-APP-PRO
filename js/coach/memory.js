// BAYONA — Coach Memory v1
// Memoria explicable: registrado ≠ derivado ≠ decisión del Coach.

export const MEMORY_BASIS=Object.freeze(["registered","derived","coach"]);
export const MEMORY_TYPES=Object.freeze(["observation","preference","decision","proposal","outcome","note"]);
export const MEMORY_CATEGORIES=Object.freeze(["training","nutrition","recovery","progress","health","general"]);
export const MEMORY_STATUSES=Object.freeze(["active","pending","accepted","rejected","applied"]);

const clean=(v,max=220)=>String(v||"").trim().replace(/\s+/g," ").slice(0,max);
const iso=(v)=>{
  const d=v instanceof Date?v:new Date(v||Date.now());
  return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
};

export function normalizeMemoryEvent(input={}){
  const type=MEMORY_TYPES.includes(input.type)?input.type:"observation";
  const category=MEMORY_CATEGORIES.includes(input.category)?input.category:"general";
  const basis=MEMORY_BASIS.includes(input.basis)?input.basis:"registered";
  const status=MEMORY_STATUSES.includes(input.status)?input.status:(type==="proposal"?"pending":"active");
  const summary=clean(input.summary,220);
  if(!summary)return null;
  return {
    id:clean(input.id,80)||`mem_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    at:iso(input.at),
    type,category,basis,status,summary,
    evidence:Array.isArray(input.evidence)
      ? input.evidence.map((x)=>clean(x,120)).filter(Boolean).slice(0,12)
      : [],
    source:clean(input.source,60)||"app",
    meta:input.meta&&typeof input.meta==="object"&&!Array.isArray(input.meta)?{...input.meta}:{},
  };
}

export function memoryDefaults(input={}){
  const events=(Array.isArray(input.events)?input.events:[])
    .map(normalizeMemoryEvent).filter(Boolean)
    .sort((a,b)=>a.at<b.at?-1:1).slice(-250);
  return {events};
}

export function addMemoryEvent(memory={},event={}){
  const m=memoryDefaults(memory);
  const e=normalizeMemoryEvent(event);
  if(!e)return m;
  const existing=m.events.findIndex((x)=>x.id===e.id);
  if(existing>=0)m.events[existing]={...m.events[existing],...e};
  else m.events.push(e);
  m.events=m.events.slice(-250);
  return m;
}

export function updateMemoryStatus(memory={},id,status){
  if(!MEMORY_STATUSES.includes(status))return memoryDefaults(memory);
  const m=memoryDefaults(memory);
  const idx=m.events.findIndex((x)=>x.id===id);
  if(idx<0)return m;
  m.events[idx]={...m.events[idx],status,updatedAt:new Date().toISOString()};
  return m;
}

const last=(arr,pred)=>[...(Array.isArray(arr)?arr:[])].reverse().find(pred)||null;
const avg=(xs)=>{
  const v=xs.filter(Number.isFinite);
  return v.length?Math.round((v.reduce((a,b)=>a+b,0)/v.length)*10)/10:null;
};

export function derivedMemoryFacts(data={}){
  const facts=[];
  const today=data.today||{};
  const history=Array.isArray(data.history)?data.history:[];
  const recent=[...history.slice(-6),today].filter((x)=>x&&x.date);

  const sleep=avg(recent.map((x)=>Number(x.sleep)).filter((x)=>Number.isFinite(x)));
  if(sleep!=null)facts.push({
    id:"derived_sleep7",basis:"derived",category:"recovery",
    summary:`Sueño medio reciente: ${sleep} h`,
    evidence:recent.filter((x)=>x.sleep!=null).map((x)=>`${x.date}: ${x.sleep} h`).slice(-7),
  });

  const energy=avg(recent.map((x)=>Number(x.energy)).filter((x)=>Number.isFinite(x)));
  if(energy!=null)facts.push({
    id:"derived_energy7",basis:"derived",category:"recovery",
    summary:`Energía media reciente: ${energy}/10`,
    evidence:recent.filter((x)=>x.energy!=null).map((x)=>`${x.date}: ${x.energy}/10`).slice(-7),
  });

  const setLogs=[...(history.flatMap((x)=>Array.isArray(x.setLog)?x.setLog:[])),...(Array.isArray(today.setLog)?today.setLog:[])];
  const note=last(setLogs,(x)=>x?.note||x?.feeling);
  if(note)facts.push({
    id:"registered_last_set_feedback",basis:"registered",category:"training",
    summary:`Último feedback de serie: ${clean(note.feeling||"sin etiqueta",40)}${note.note?` · ${clean(note.note,120)}`:""}`,
    evidence:[note.ex?String(note.ex):"serie registrada"],
  });

  const recoveryNote=clean(today.recoveryNote,160);
  if(recoveryNote)facts.push({
    id:"registered_recovery_note",basis:"registered",category:"recovery",
    summary:`Nota de recuperación de hoy: ${recoveryNote}`,evidence:[today.date||"hoy"],
  });

  const meal=last(today.meals,(x)=>x?.note||x?.feeling);
  if(meal)facts.push({
    id:"registered_meal_feedback",basis:"registered",category:"nutrition",
    summary:`Último contexto de comida: ${clean(meal.feeling||"sin etiqueta",40)}${meal.note?` · ${clean(meal.note,120)}`:""}`,
    evidence:[meal.name||"comida registrada"],
  });

  const pr=last([...history,today],(x)=>Array.isArray(x?.prPoints)&&x.prPoints.length);
  if(pr){
    const point=pr.prPoints.at(-1);
    facts.push({
      id:"registered_recent_pr",basis:"registered",category:"progress",
      summary:`Récord reciente: ${clean(point.ex,60)} · e1RM ${Number(point.e1)||0} kg`,
      evidence:[pr.date||"fecha no disponible"],
    });
  }
  return facts;
}

export function coachMemoryFacts(data={},limit=12){
  const explicit=memoryDefaults(data.coachMemory||{}).events
    .filter((x)=>["active","accepted","applied"].includes(x.status))
    .slice(-8)
    .map((x)=>({
      id:x.id,basis:x.basis,category:x.category,summary:x.summary,evidence:x.evidence,at:x.at,
    }));
  const all=[...derivedMemoryFacts(data),...explicit];
  const seen=new Set();
  return all.filter((x)=>{
    const key=`${x.basis}:${x.category}:${x.summary}`;
    if(seen.has(key))return false;seen.add(key);return true;
  }).slice(-Math.max(1,limit));
}

export function memoryPromptLines(data={},limit=12){
  const tag={registered:"REGISTRADO",derived:"DERIVADO",coach:"COACH"};
  return coachMemoryFacts(data,limit).map((f)=>
    `[${tag[f.basis]||"REGISTRADO"}] ${f.summary}${f.evidence?.length?` · evidencia: ${f.evidence.join(" | ")}`:""}`
  );
}

export function toolEvidence(name,args={},data={}){
  const today=data.today||{};
  const profile=data.profile||{};
  const lines=[];
  const push=(basis,label,value)=>{
    if(value===null||value===undefined||value==="")return;
    lines.push({basis,label,value:String(value)});
  };
  if(name==="adjust_session"){
    push("registered","Sueño",today.sleep!=null?`${today.sleep} h`:null);
    push("registered","Energía",today.energy!=null?`${today.energy}/10`:null);
    push("registered","Estrés",today.stress!=null?`${today.stress}/10`:null);
    push("registered","Molestia",today.soreness!=null?`${today.soreness}/10`:null);
    push("coach","Razón propuesta",args.razon||null);
  }else if(name==="nutrition_suggest"){
    push("registered","Energía ingerida",Number.isFinite(Number(today.kcal))?`${today.kcal} kcal`:null);
    push("registered","Proteína",Number.isFinite(Number(today.p))?`${today.p} g`:null);
    push("registered","Agua",Number.isFinite(Number(today.water))?`${today.water} ml`:null);
  }else if(name==="assign_routine"){
    push("registered","Objetivo",profile.goalPrimary||profile.goal||null);
    push("registered","Experiencia",profile.experience||null);
    push("coach","Razón propuesta",args.razon||null);
  }
  return lines;
}

export function proposalFromTool(tool={},now=new Date()){
  if(!tool?.name)return null;
  const actionable=["assign_routine","adjust_session","log_symptom","nutrition_suggest"];
  if(!actionable.includes(tool.name))return null;
  return normalizeMemoryEvent({
    id:`proposal_${tool.name}_${now.getTime()}`,
    at:now,
    type:"proposal",
    category:tool.name==="nutrition_suggest"?"nutrition":tool.name==="log_symptom"?"health":"training",
    basis:"coach",
    status:"pending",
    summary:clean(tool.label||tool.name,180),
    evidence:tool.args?.razon?[clean(tool.args.razon,120)]:[],
    source:"coach",
    meta:{tool:tool.name,args:tool.args||{}},
  });
}
