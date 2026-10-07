// BAYONA — Coach Lab domain.
// Búsqueda, gates de seguridad y jerarquía Macro → Meso → Micro → Sesión.
// Puro y testeable: no toca DOM, storage ni red.

export const PROGRAM_LEVELS = Object.freeze(["macrocycle","mesocycle","microcycle","session"]);

export const CONTEXT_FLAGS = Object.freeze([
  "healthy_adult",
  "youth_adolescent",
  "older_adult",
  "return_after_inactivity",
  "pregnancy_postpartum",
  "current_pain",
  "medical_condition",
  "post_injury",
  "post_surgery",
]);

export const SPORT_TEMPLATES = Object.freeze({
  general: { id:"general", label:"General", programTemplateId:"general_adherence", defaultWeeks:12, focus:["adherencia","fuerza_general","movilidad"] },
  football: { id:"football", label:"Fútbol", programTemplateId:"sport_performance", defaultWeeks:16, focus:["fuerza","aceleracion","cambio_direccion","sprints_repetidos"] },
  running: { id:"running", label:"Running", programTemplateId:"sport_performance", defaultWeeks:12, focus:["fuerza","economia_carrera","tolerancia_carga","ritmo"] },
  parkour: { id:"parkour", label:"Parkour", programTemplateId:"sport_performance", defaultWeeks:12, focus:["fuerza_relativa","aterrizajes","potencia","movilidad"] },
  cycling: { id:"cycling", label:"Ciclismo", programTemplateId:"sport_performance", defaultWeeks:12, focus:["fuerza","capacidad_aerobica","cadencia","tolerancia_carga"] },
  swimming: { id:"swimming", label:"Natación", programTemplateId:"sport_performance", defaultWeeks:12, focus:["fuerza","tecnica","capacidad_aerobica","movilidad"] },
  combat: { id:"combat", label:"Deportes de combate", programTemplateId:"sport_performance", defaultWeeks:12, focus:["fuerza","potencia","acondicionamiento","movilidad"] },
  racket: { id:"racket", label:"Raqueta", programTemplateId:"sport_performance", defaultWeeks:12, focus:["fuerza","potencia_rotacional","cambio_direccion","capacidad_repetida"] },
});

export const PROGRAM_TEST_TYPES = Object.freeze(["performance","strength","capacity","mobility","skill","custom"]);

export const PROGRAM_TEMPLATES = Object.freeze({
  general_adherence: {
    id:"general_adherence",
    defaultWeeks:12,
    loadStrategy:"simple_progression",
    stageIds:["foundation","build","consolidate"],
  },
  strength: {
    id:"strength",
    defaultWeeks:12,
    loadStrategy:"progressive_strength",
    stageIds:["base","development","specific"],
  },
  hypertrophy: {
    id:"hypertrophy",
    defaultWeeks:12,
    loadStrategy:"volume_progression",
    stageIds:["base","accumulation","consolidate"],
  },
  power: {
    id:"power",
    defaultWeeks:8,
    loadStrategy:"load_velocity",
    stageIds:["base","power","specific"],
  },
  return_transition: {
    id:"return_transition",
    defaultWeeks:4,
    loadStrategy:"conservative_transition",
    stageIds:["reentry","rebuild"],
  },
  youth_ltd: {
    id:"youth_ltd",
    defaultWeeks:12,
    loadStrategy:"skill_first",
    stageIds:["literacy","skill","capacity"],
  },
  sport_performance: {
    id:"sport_performance",
    defaultWeeks:16,
    loadStrategy:"phase_based",
    stageIds:["general","specific","competition","review"],
  },
});

const clean=(value,max=120)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);
export const normalizeCoachText=(value)=>clean(value,240)
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es");

const arr=(value)=>Array.isArray(value)?value:[];
const uniq=(value,max=20)=>[...new Set(arr(value).map((x)=>clean(x,100)).filter(Boolean))].slice(0,max);
const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):fallback;

function recordSearchText(record={}) {
  return {
    name:normalizeCoachText(record.nombre),
    muscle:normalizeCoachText(record.grupo_muscular),
    type:normalizeCoachText(record.tipo),
    effort:normalizeCoachText(arr(record.nivel_esfuerzo).join(" ")),
    resistance:normalizeCoachText(arr(record.perfil_resistencia).join(" ")),
    tags:normalizeCoachText(arr(record.etiquetas).join(" ")),
  };
}

function tokenScore(record,token){
  const x=recordSearchText(record);
  if(x.name===token)return 1000;
  if(x.name.startsWith(token))return 900;
  if(x.name.split(/\s+/).some((word)=>word.startsWith(token)))return 820;
  if(x.name.includes(token))return 740;
  if(x.muscle.includes(token))return 520;
  if(x.type.includes(token))return 430;
  if(x.tags.includes(token))return 340;
  if(x.resistance.includes(token))return 290;
  if(x.effort.includes(token))return 260;
  return -1;
}

function queryScore(record,qNorm) {
  const tokens=qNorm.split(/\s+/).filter(Boolean).slice(0,8);
  if(!tokens.length)return 0;
  let total=0;
  for(const token of tokens){
    const score=tokenScore(record,token);
    if(score<0)return -1;
    total+=score;
  }
  return total+(tokens.length>1?tokens.length*20:0);
}

function matchesFilter(record,filters={}) {
  if(filters.type && record.tipo!==filters.type)return false;
  if(filters.muscle && (record.grupo_muscular||"")!==filters.muscle)return false;
  if(filters.effort && !arr(record.nivel_esfuerzo).includes(filters.effort))return false;
  if(filters.resistance && !arr(record.perfil_resistencia).includes(filters.resistance))return false;
  if(filters.tag && !arr(record.etiquetas).includes(filters.tag))return false;
  if(filters.availability==="video" && !record.video_disponible_local)return false;
  if(["ok","duplicate","no_video","error"].includes(filters.availability) && record.estado_media!==filters.availability)return false;
  return true;
}

export function searchExercises(records=[],filters={},limit=300) {
  const q=normalizeCoachText(filters.q||"");
  const max=Math.max(1,Math.min(5000,Number(limit)||300));
  return arr(records)
    .map((record,index)=>({record,index,score:q?queryScore(record,q):0}))
    .filter((x)=>x.score>=0 && matchesFilter(x.record,filters))
    .sort((a,b)=>b.score-a.score
      || Number(a.record.pos??Number.MAX_SAFE_INTEGER)-Number(b.record.pos??Number.MAX_SAFE_INTEGER)
      || a.index-b.index)
    .slice(0,max)
    .map((x)=>x.record);
}

export function exerciseFacets(records=[]){
  const unique=(key,flat=false)=>[...new Set(arr(records).flatMap((r)=>{
    const value=r?.[key];
    return flat?arr(value):[value];
  }).map((x)=>clean(x,100)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  return {
    types:unique("tipo"),
    muscles:unique("grupo_muscular"),
    efforts:unique("nivel_esfuerzo",true),
    resistances:unique("perfil_resistencia",true),
    tags:unique("etiquetas",true),
  };
}

export function resolveSportTemplate(value){
  const key=normalizeCoachText(value||"general").replace(/\s+/g,"_");
  return SPORT_TEMPLATES[key]||SPORT_TEMPLATES.general;
}

export function recommendationGate(context={}) {
  const flags=new Set(uniq(context.flags,CONTEXT_FLAGS.length));
  const age=Number(context.age);
  if(Number.isFinite(age)){
    if(age<18)flags.add("youth_adolescent");
    if(age>=65)flags.add("older_adult");
  }

  const manual=["current_pain","medical_condition","post_injury","post_surgery","pregnancy_postpartum"]
    .filter((x)=>flags.has(x));
  if(manual.length){
    return {clearance:"manual_review",autoRecommend:false,flags:[...flags],reasonCodes:manual};
  }
  if(flags.has("return_after_inactivity")){
    return {clearance:"transition_limited",autoRecommend:true,flags:[...flags],reasonCodes:["return_after_inactivity"]};
  }
  const development=["youth_adolescent","older_adult"].filter((x)=>flags.has(x));
  if(development.length){
    return {clearance:"development_aware",autoRecommend:true,flags:[...flags],reasonCodes:development};
  }
  return {clearance:"standard",autoRecommend:true,flags:[...flags],reasonCodes:[]};
}

function isoDate(value){
  if(!value)return null;
  const d=value instanceof Date?new Date(value):new Date(String(value)+"T12:00:00");
  return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10);
}
function addDays(dateKey,days){
  const d=new Date(dateKey+"T12:00:00");
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

export function buildProgramDraft(input={}) {
  const sportTemplate=resolveSportTemplate(input.sportTemplateId||input.sport||"general");
  const template=PROGRAM_TEMPLATES[input.templateId]||PROGRAM_TEMPLATES[sportTemplate.programTemplateId]||PROGRAM_TEMPLATES.general_adherence;
  const requestedWeeks=input.durationWeeks===null||input.durationWeeks===undefined||input.durationWeeks===""
    ? (sportTemplate.defaultWeeks??template.defaultWeeks)
    : input.durationWeeks;
  const durationWeeks=Math.round(clamp(requestedWeeks,4,52,sportTemplate.defaultWeeks??template.defaultWeeks));
  const startDate=isoDate(input.startDate)||new Date().toISOString().slice(0,10);
  const mesoWeeks=Math.round(clamp(input.mesocycleWeeks,2,8,4));
  const gate=recommendationGate({flags:input.contextFlags,age:input.age});
  const mesocycles=[];
  let week=1,mesoIndex=0;

  while(week<=durationWeeks){
    const from=week;
    const to=Math.min(durationWeeks,week+mesoWeeks-1);
    const stageIndex=Math.min(template.stageIds.length-1,Math.floor((from-1)/durationWeeks*template.stageIds.length));
    const stageId=template.stageIds[stageIndex];
    const microcycles=[];
    for(let w=from;w<=to;w++){
      const microStart=addDays(startDate,(w-1)*7);
      microcycles.push({
        id:`micro_${w}`,
        week:w,
        startDate:microStart,
        endDate:addDays(microStart,6),
        objectiveIds:[],
        loadTarget:{volume:null,intensity:null,rpe:null},
        tests:[],
        sessions:[],
      });
    }
    mesocycles.push({
      id:`meso_${++mesoIndex}`,
      fromWeek:from,
      toWeek:to,
      stageId,
      objectiveIds:[],
      loadStrategy:template.loadStrategy,
      tests:[],
      microcycles,
    });
    week=to+1;
  }

  return {
    id:clean(input.id||`program_${Date.now()}`,80),
    clientId:clean(input.clientId||"local",80),
    name:clean(input.name||"",100),
    sport:clean(input.sport||sportTemplate.label,80),
    sportTemplateId:sportTemplate.id,
    sportFocus:[...sportTemplate.focus],
    templateId:template.id,
    generalObjective:clean(input.generalObjective||"",180),
    specificObjectives:uniq(input.specificObjectives,12),
    contextFlags:uniq(input.contextFlags,CONTEXT_FLAGS.length).filter((x)=>CONTEXT_FLAGS.includes(x)),
    safetyGate:gate,
    startDate,
    endDate:addDays(startDate,durationWeeks*7-1),
    durationWeeks,
    loadStrategy:template.loadStrategy,
    stageIds:[...template.stageIds],
    checkpoints:[],
    tests:[],
    mesocycles,
    createdAt:input.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString(),
  };
}

export function validateProgram(program={}) {
  const errors=[];
  if(!program.id)errors.push("id");
  if(!program.clientId)errors.push("clientId");
  if(!program.generalObjective)errors.push("generalObjective");
  if(!Number.isInteger(program.durationWeeks)||program.durationWeeks<4||program.durationWeeks>52)errors.push("durationWeeks");
  if(!Array.isArray(program.mesocycles)||!program.mesocycles.length)errors.push("mesocycles");

  let weeks=0;
  for(const meso of arr(program.mesocycles)){
    if(!Array.isArray(meso.microcycles)||!meso.microcycles.length){errors.push("microcycles");continue;}
    weeks+=meso.microcycles.length;
    for(const micro of meso.microcycles){
      if(!Array.isArray(micro.sessions))errors.push("sessions");
      if(!Array.isArray(micro.tests))errors.push("tests");
    }
  }
  if(weeks!==program.durationWeeks)errors.push("weekCoverage");
  const gate=recommendationGate({flags:program.contextFlags});
  if(gate.clearance==="manual_review" && program.safetyGate?.clearance!=="manual_review")errors.push("safetyGate");
  return {ok:errors.length===0,errors:[...new Set(errors)]};
}

export function addProgramCheckpoint(program,input={}) {
  const copy=structuredClone(program);
  copy.checkpoints=arr(copy.checkpoints);
  copy.checkpoints.push({
    id:clean(input.id||`checkpoint_${copy.checkpoints.length+1}`,80),
    week:Math.round(clamp(input.week,1,copy.durationWeeks||52,1)),
    kind:clean(input.kind||"review",40),
    metricIds:uniq(input.metricIds,20),
    note:clean(input.note||"",180),
  });
  copy.updatedAt=new Date().toISOString();
  return copy;
}

export function addSessionToWeek(program,weekNumber,session={}) {
  const copy=structuredClone(program);
  const week=Math.round(Number(weekNumber)||0);
  const micro=copy.mesocycles?.flatMap((x)=>x.microcycles||[]).find((x)=>x.week===week);
  if(!micro)return {ok:false,program,reason:"week_not_found"};
  const exercises=arr(session.exercises).slice(0,20).map((x)=>({...x}));
  micro.sessions.push({
    id:clean(session.id||`session_${week}_${micro.sessions.length+1}`,80),
    name:clean(session.name||"",100),
    day:clean(session.day||"",16),
    durationMin:Math.round(clamp(session.durationMin,5,240,45)),
    objectiveIds:uniq(session.objectiveIds,12),
    exercises,
    note:clean(session.note||"",180),
  });
  copy.updatedAt=new Date().toISOString();
  return {ok:true,program:copy};
}

export function setMicrocycleLoad(program,weekNumber,input={}){
  const copy=structuredClone(program);
  const week=Math.round(Number(weekNumber)||0);
  const micro=copy.mesocycles?.flatMap((x)=>x.microcycles||[]).find((x)=>x.week===week);
  if(!micro)return {ok:false,program,reason:"week_not_found"};
  const num=(v,min,max)=>{
    if(v===null||v===undefined||v==="")return null;
    const n=Number(v); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null;
  };
  micro.loadTarget={
    volumePct:num(input.volumePct,0,200),
    intensityPct:num(input.intensityPct,0,100),
    rpe:num(input.rpe,1,10),
  };
  copy.updatedAt=new Date().toISOString();
  return {ok:true,program:copy,loadTarget:{...micro.loadTarget}};
}

function normalizeProgramTest(input={},durationWeeks=52){
  const name=clean(input.name||"",100);
  if(!name)return null;
  return {
    id:clean(input.id||`test_${Date.now()}`,80),
    name,
    type:PROGRAM_TEST_TYPES.includes(input.type)?input.type:"custom",
    metric:clean(input.metric||"",80),
    unit:clean(input.unit||"",30),
    scheduledWeek:Math.round(clamp(input.scheduledWeek,1,durationWeeks,1)),
    target:input.target===null||input.target===undefined||input.target===""?null:Number(input.target),
    result:input.result===null||input.result===undefined||input.result===""?null:Number(input.result),
    status:["planned","completed","cancelled"].includes(input.status)?input.status:"planned",
    note:clean(input.note||"",180),
  };
}

export function addProgramTest(program,input={}){
  const copy=structuredClone(program);
  const test=normalizeProgramTest(input,copy.durationWeeks||52);
  if(!test||!Number.isFinite(test.target)&&test.target!==null||!Number.isFinite(test.result)&&test.result!==null){
    return {ok:false,program,reason:"invalid_test"};
  }
  copy.tests=arr(copy.tests);
  copy.tests.push(test);
  copy.updatedAt=new Date().toISOString();
  return {ok:true,program:copy,test};
}

export function recordProgramTestResult(program,testId,result,note=""){
  const copy=structuredClone(program);
  const test=arr(copy.tests).find((x)=>x.id===testId);
  const n=Number(result);
  if(!test||!Number.isFinite(n))return {ok:false,program,reason:"test_not_found_or_invalid"};
  test.result=n;
  test.status="completed";
  if(note)test.note=clean(note,180);
  copy.updatedAt=new Date().toISOString();
  return {ok:true,program:copy,test:{...test}};
}

export function programCalendar(program={}){
  return arr(program.mesocycles).flatMap((meso)=>arr(meso.microcycles).map((micro)=>({
    week:micro.week,
    startDate:micro.startDate,
    endDate:micro.endDate,
    stageId:meso.stageId,
    loadStrategy:meso.loadStrategy,
    loadTarget:{...(micro.loadTarget||{})},
    sessions:arr(micro.sessions).length,
    tests:arr(micro.tests).length+arr(program.tests).filter((t)=>t.scheduledWeek===micro.week).length,
  })));
}

export function programStats(program={}) {
  const mesos=arr(program.mesocycles);
  const micros=mesos.flatMap((x)=>arr(x.microcycles));
  const sessions=micros.flatMap((x)=>arr(x.sessions));
  return {
    weeks:micros.length,
    mesocycles:mesos.length,
    microcycles:micros.length,
    sessions:sessions.length,
    tests:arr(program.tests).length+mesos.reduce((a,x)=>a+arr(x.tests).length,0)+micros.reduce((a,x)=>a+arr(x.tests).length,0),
    checkpoints:arr(program.checkpoints).length,
    loadTargets:micros.filter((x)=>x.loadTarget&&Object.values(x.loadTarget).some((v)=>v!=null)).length,
  };
}
