// BAYONA — Recovery + Sleep domain model.
// Organiza hábitos y datos registrados. No diagnostica ni simula wearables.

export const NIGHT_STEPS = Object.freeze(["pantallas","estiramiento","respiracion","hora"]);
export const RECOVERY_TAGS = Object.freeze([
  "walk","mobility","breathing","cold_water","sauna","nap","outdoors","stretching"
]);

export const DEFAULT_RECOVERY = Object.freeze({
  preferences: {
    bedtime: null,
    wakeTime: null,
    windDownMin: 45,
    reminders: { windDown:false, bedtime:false },
    configured: false,
  },
  activePause: {
    enabled: false,
    intervalMin: 90,
  },
});

const TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const clean=(v,max=80)=>String(v||"").trim().replace(/\s+/g," ").slice(0,max);
const clamp=(v,min,max)=>{
  const n=Number(v);
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):null;
};

export function normalizeRecoveryPreferences(input={}){
  const bedtime=TIME_RE.test(String(input.bedtime||""))?String(input.bedtime):null;
  const wakeTime=TIME_RE.test(String(input.wakeTime||""))?String(input.wakeTime):null;
  const wind=clamp(input.windDownMin,10,180);
  return {
    bedtime,
    wakeTime,
    windDownMin: wind==null?45:Math.round(wind),
    reminders:{
      windDown:Boolean(input.reminders?.windDown),
      bedtime:Boolean(input.reminders?.bedtime),
    },
    configured:Boolean(input.configured||(bedtime&&wakeTime)),
  };
}

export function normalizeActivePause(input={}){
  const interval=clamp(input.intervalMin,30,240);
  return {
    enabled:Boolean(input.enabled),
    intervalMin:interval==null?90:Math.round(interval),
  };
}

export function recoveryDefaults(input={}){
  return {
    preferences:normalizeRecoveryPreferences(input.preferences||{}),
    activePause:normalizeActivePause(input.activePause||{}),
  };
}

function mins(time){
  if(!TIME_RE.test(String(time||""))) return null;
  const [h,m]=String(time).split(":").map(Number);
  return h*60+m;
}
function clock(total){
  const x=((Math.round(total)%1440)+1440)%1440;
  return `${String(Math.floor(x/60)).padStart(2,"0")}:${String(x%60).padStart(2,"0")}`;
}

export function sleepWindowDuration(bedtime,wakeTime){
  const b=mins(bedtime),w=mins(wakeTime);
  if(b==null||w==null)return null;
  const diff=(w-b+1440)%1440;
  return diff===0?24:Math.round((diff/60)*10)/10;
}

export function sleepTimeline(preferences={}){
  const p=normalizeRecoveryPreferences(preferences);
  if(!p.bedtime||!p.wakeTime)return [];
  const bed=mins(p.bedtime);
  return [
    {id:"windDown",time:clock(bed-p.windDownMin)},
    {id:"bedtime",time:p.bedtime},
    {id:"wake",time:p.wakeTime},
  ];
}

export function nextSleepEvent(preferences={},now=new Date()){
  const timeline=sleepTimeline(preferences);
  if(!timeline.length)return null;
  const d=now instanceof Date?now:new Date(now);
  if(Number.isNaN(d.getTime()))return null;
  const current=d.getHours()*60+d.getMinutes();
  let best=null;
  for(const event of timeline){
    const m=mins(event.time);
    const delta=(m-current+1440)%1440;
    if(best==null||delta<best.minutes)best={...event,minutes:delta};
  }
  return best;
}

export function normalizeOtherActivity(input={},now=new Date()){
  const minutes=clamp(input.minutes,1,720);
  if(minutes==null)return null;
  const intensity=["easy","moderate","hard"].includes(input.intensity)?input.intensity:"moderate";
  const name=clean(input.name,60);
  if(!name)return null;
  const at=typeof input.at==="string"&&!Number.isNaN(new Date(input.at).getTime())
    ? new Date(input.at)
    : (now instanceof Date?now:new Date(now));
  if(Number.isNaN(at.getTime()))return null;
  return {
    id:clean(input.id,80)||`activity_${at.getTime()}`,
    name,
    minutes:Math.round(minutes),
    intensity,
    at:at.toISOString(),
  };
}

export function normalizeRecoveryPractice(input={},now=new Date()){
  const tag=RECOVERY_TAGS.includes(input.tag)?input.tag:null;
  const minutes=clamp(input.minutes,1,240);
  if(!tag||minutes==null)return null;
  const at=typeof input.at==="string"&&!Number.isNaN(new Date(input.at).getTime())
    ? new Date(input.at)
    : (now instanceof Date?now:new Date(now));
  if(Number.isNaN(at.getTime()))return null;
  return {
    id:clean(input.id,80)||`recovery_${tag}_${at.getTime()}`,
    tag,
    minutes:Math.round(minutes),
    note:clean(input.note,160),
    at:at.toISOString(),
  };
}

export function wearableSnapshot(integrations={}){
  const h=integrations?.health||{};
  const connected=Boolean(h.connected&&clean(h.provider,60));
  if(!connected)return {connected:false,provider:null,lastSyncAt:null,metrics:{}};
  const metrics={};
  for(const [key,min,max] of [
    ["hrvMs",1,400],["restingHr",20,220],["sleepHours",0,24],["steps",0,100000],
  ]){
    const v=clamp(h.metrics?.[key],min,max);
    if(v!=null)metrics[key]=v;
  }
  let lastSyncAt=null;
  if(typeof h.lastSyncAt==="string"&&!Number.isNaN(new Date(h.lastSyncAt).getTime())){
    lastSyncAt=new Date(h.lastSyncAt).toISOString();
  }
  return {connected:true,provider:clean(h.provider,60),lastSyncAt,metrics};
}

function avg(values){
  const xs=values.filter((v)=>Number.isFinite(v));
  if(!xs.length)return null;
  return Math.round((xs.reduce((a,b)=>a+b,0)/xs.length)*10)/10;
}

export function recoveryTrend(history=[],today={},days=7){
  const rows=[...(Array.isArray(history)?history:[])];
  if(today&&today.date)rows.push(today);
  const selected=rows.filter((r)=>r?.date).slice(-Math.max(1,Math.trunc(Number(days)||7)));
  return {
    days:selected.length,
    sleep:avg(selected.map((r)=>Number(r.sleep))),
    soreness:avg(selected.map((r)=>Number(r.soreness))),
    energy:avg(selected.map((r)=>Number(r.energy))),
    stress:avg(selected.map((r)=>Number(r.stress))),
    strain:avg(selected.map((r)=>Number(r.strain)||0)),
    activePauses:selected.reduce((sum,r)=>sum+(Number(r.activePauses)||0),0),
    otherActivityMin:selected.reduce((sum,r)=>sum+(Array.isArray(r.otherActivities)?r.otherActivities.reduce((a,x)=>a+(Number(x.minutes)||0),0):0),0),
  };
}

export function recoverySnapshot({
  today={},history=[],recovery={},integrations={},readiness=null,now=new Date(),
}={}){
  const config=recoveryDefaults(recovery);
  const preferences=config.preferences;
  const night=Array.isArray(today.nightRoutine)?today.nightRoutine.filter((x)=>NIGHT_STEPS.includes(x)):[];
  return {
    preferences,
    activePause:config.activePause,
    sleepWindowHours:sleepWindowDuration(preferences.bedtime,preferences.wakeTime),
    timeline:sleepTimeline(preferences),
    nextEvent:nextSleepEvent(preferences,now),
    nightRoutine:{done:night.length,total:NIGHT_STEPS.length,ids:night},
    today:{
      sleep:Number.isFinite(Number(today.sleep))?Number(today.sleep):null,
      soreness:Number.isFinite(Number(today.soreness))?Number(today.soreness):null,
      energy:Number.isFinite(Number(today.energy))?Number(today.energy):null,
      stress:Number.isFinite(Number(today.stress))?Number(today.stress):null,
      strain:Number(today.strain)||0,
      mobility:Boolean(today.mobility),
      mind:Number(today.mind)||0,
      activePauses:Number(today.activePauses)||0,
      postureChecks:Number(today.postureChecks)||0,
      otherActivities:Array.isArray(today.otherActivities)?today.otherActivities:[],
      recoveryPractices:Array.isArray(today.recoveryPractices)?today.recoveryPractices:[],
    },
    trend7:recoveryTrend(history,today,7),
    wearable:wearableSnapshot(integrations),
    readiness,
  };
}
