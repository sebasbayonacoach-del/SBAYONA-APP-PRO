// BAYONA — Coach CRM v1
// CRM operativo del entrenador. Registra hechos; no simula cobros ni compras.

export const CRM_CLIENT_STATUSES=Object.freeze(["lead","active","paused","archived"]);
export const CRM_APPOINTMENT_KINDS=Object.freeze(["session","checkin","review","call","other"]);
export const CRM_APPOINTMENT_STATUSES=Object.freeze(["scheduled","completed","cancelled","no_show"]);
export const CRM_PAYMENT_STATUSES=Object.freeze(["due","paid","overdue","cancelled","refunded"]);
export const CRM_REFERRAL_STATUSES=Object.freeze(["lead","contacted","converted","lost"]);
export const CRM_PURCHASE_STATUSES=Object.freeze(["ordered","paid","fulfilled","refunded","cancelled"]);

const clean=(v,max=180)=>String(v??"").trim().replace(/\s+/g," ").slice(0,max);
const id=(v,prefix)=>{
  const x=clean(v,90).replace(/[^a-zA-Z0-9_.:-]/g,"_");
  return x||`${prefix}_${Date.now()}`;
};
const iso=(v)=>{
  if(!v)return null;
  const d=v instanceof Date?v:new Date(v);
  return Number.isNaN(d.getTime())?null:d.toISOString();
};
const cents=(v)=>{
  const n=Number(v);
  return Number.isInteger(n)&&n>=0&&n<=100000000? n:null;
};
const currency=(v)=>{
  const x=clean(v,3).toUpperCase();
  return /^[A-Z]{3}$/.test(x)?x:"EUR";
};
const status=(v,allowed,fallback)=>allowed.includes(v)?v:fallback;

export function normalizeCrmClient(input={}){
  const name=clean(input.name,100);
  if(!name)return null;
  return {
    id:id(input.id,"client"),
    cloudId:clean(input.cloudId,90)||null,
    linkedUserId:clean(input.linkedUserId,90)||null,
    name,
    email:clean(input.email,120)||null,
    phone:clean(input.phone,40)||null,
    status:status(input.status,CRM_CLIENT_STATUSES,"active"),
    source:["manual","cloud","local"].includes(input.source)?input.source:"manual",
    createdAt:iso(input.createdAt)||new Date().toISOString(),
    updatedAt:iso(input.updatedAt)||new Date().toISOString(),
    note:clean(input.note,300),
  };
}

export function normalizeAppointment(input={}){
  const clientId=clean(input.clientId,90);
  const startAt=iso(input.startAt);
  if(!clientId||!startAt)return null;
  const duration=Math.round(Number(input.durationMin));
  return {
    id:id(input.id,"appt"),
    cloudId:clean(input.cloudId,90)||null,
    clientId,
    startAt,
    durationMin:Number.isFinite(duration)?Math.max(5,Math.min(480,duration)):60,
    kind:status(input.kind,CRM_APPOINTMENT_KINDS,"session"),
    status:status(input.status,CRM_APPOINTMENT_STATUSES,"scheduled"),
    note:clean(input.note,300),
    source:["manual","cloud","calendar"].includes(input.source)?input.source:"manual",
    createdAt:iso(input.createdAt)||new Date().toISOString(),
    updatedAt:iso(input.updatedAt)||iso(input.createdAt)||new Date().toISOString(),
  };
}

export function normalizePayment(input={}){
  const clientId=clean(input.clientId,90);
  const amountCents=cents(input.amountCents);
  if(!clientId||amountCents===null)return null;
  const st=status(input.status,CRM_PAYMENT_STATUSES,"due");
  return {
    id:id(input.id,"pay"),
    cloudId:clean(input.cloudId,90)||null,
    clientId,
    amountCents,
    currency:currency(input.currency),
    status:st,
    dueAt:iso(input.dueAt),
    paidAt:st==="paid"?(iso(input.paidAt)||new Date().toISOString()):null,
    method:clean(input.method,40)||null,
    reference:clean(input.reference,100)||null,
    note:clean(input.note,300),
    source:["manual","billing"].includes(input.source)?input.source:"manual",
    createdAt:iso(input.createdAt)||new Date().toISOString(),
    updatedAt:iso(input.updatedAt)||iso(input.createdAt)||new Date().toISOString(),
  };
}

export function normalizeReferral(input={}){
  const referrerClientId=clean(input.referrerClientId,90);
  const referredName=clean(input.referredName,100);
  if(!referrerClientId||!referredName)return null;
  return {
    id:id(input.id,"ref"),
    cloudId:clean(input.cloudId,90)||null,
    referrerClientId,
    referredName,
    contact:clean(input.contact,120)||null,
    status:status(input.status,CRM_REFERRAL_STATUSES,"lead"),
    note:clean(input.note,300),
    createdAt:iso(input.createdAt)||new Date().toISOString(),
    updatedAt:iso(input.updatedAt)||new Date().toISOString(),
  };
}

export function normalizePurchase(input={}){
  const clientId=clean(input.clientId,90);
  const item=clean(input.item,120);
  const amountCents=cents(input.amountCents);
  if(!clientId||!item||amountCents===null)return null;
  return {
    id:id(input.id,"purchase"),
    cloudId:clean(input.cloudId,90)||null,
    clientId,item,amountCents,
    currency:currency(input.currency),
    status:status(input.status,CRM_PURCHASE_STATUSES,"ordered"),
    reference:clean(input.reference,100)||null,
    note:clean(input.note,300),
    source:["manual","store"].includes(input.source)?input.source:"manual",
    createdAt:iso(input.createdAt)||new Date().toISOString(),
    updatedAt:iso(input.updatedAt)||new Date().toISOString(),
  };
}

export function normalizeCrmNote(input={}){
  const clientId=clean(input.clientId,90);
  const text=clean(input.text,600);
  if(!clientId||!text)return null;
  return {
    id:id(input.id,"note"),
    cloudId:clean(input.cloudId,90)||null,
    clientId,text,
    tags:Array.isArray(input.tags)?[...new Set(input.tags.map((x)=>clean(x,30)).filter(Boolean))].slice(0,10):[],
    at:iso(input.at)||new Date().toISOString(),
  };
}

export function coachCrmDefaults(input={}){
  const clients=(Array.isArray(input.clients)?input.clients:[]).map(normalizeCrmClient).filter(Boolean).slice(-250);
  const appointments=(Array.isArray(input.appointments)?input.appointments:[]).map(normalizeAppointment).filter(Boolean).slice(-1000);
  const payments=(Array.isArray(input.payments)?input.payments:[]).map(normalizePayment).filter(Boolean).slice(-1000);
  const referrals=(Array.isArray(input.referrals)?input.referrals:[]).map(normalizeReferral).filter(Boolean).slice(-500);
  const purchases=(Array.isArray(input.purchases)?input.purchases:[]).map(normalizePurchase).filter(Boolean).slice(-1000);
  const notes=(Array.isArray(input.notes)?input.notes:[]).map(normalizeCrmNote).filter(Boolean).slice(-1000);
  return {clients,appointments,payments,referrals,purchases,notes};
}

function upsert(list,item){
  const next=list.slice();
  const i=next.findIndex((x)=>x.id===item.id);
  if(i>=0)next[i]={...next[i],...item};
  else next.push(item);
  return next;
}

export function upsertCrmClient(crm={},input={}){
  const d=coachCrmDefaults(crm),rec=normalizeCrmClient(input);
  if(!rec)return d;
  d.clients=upsert(d.clients,rec).slice(-250);
  return d;
}

export function addCrmRecord(crm={},kind,input={}){
  const d=coachCrmDefaults(crm);
  const map={
    appointments:["appointments",normalizeAppointment,1000],
    payments:["payments",normalizePayment,1000],
    referrals:["referrals",normalizeReferral,500],
    purchases:["purchases",normalizePurchase,1000],
    notes:["notes",normalizeCrmNote,1000],
  };
  const def=map[kind];
  if(!def)return d;
  const [key,normalizer,limit]=def;
  const rec=normalizer(input);
  if(!rec)return d;
  d[key]=upsert(d[key],rec).slice(-limit);
  return d;
}

export function updateCrmRecordStatus(crm={},kind,recordId,nextStatus,now=new Date()){
  const d=coachCrmDefaults(crm);
  const map={
    appointments:["appointments",CRM_APPOINTMENT_STATUSES],
    payments:["payments",CRM_PAYMENT_STATUSES],
    referrals:["referrals",CRM_REFERRAL_STATUSES],
    purchases:["purchases",CRM_PURCHASE_STATUSES],
  };
  const def=map[kind];
  if(!def||!def[1].includes(nextStatus))return {crm:d,changed:false};
  const [key]=def;
  const i=d[key].findIndex((x)=>x.id===recordId);
  if(i<0||d[key][i].status===nextStatus)return {crm:d,changed:false};
  const patch={...d[key][i],status:nextStatus,updatedAt:iso(now)||new Date().toISOString()};
  if(kind==="payments")patch.paidAt=nextStatus==="paid"?(patch.paidAt||iso(now)):null;
  d[key][i]=patch;
  return {crm:d,changed:true,record:patch};
}

const localDay=(v)=>{
  const d=v instanceof Date?v:new Date(v);
  if(Number.isNaN(d.getTime()))return null;
  const p=(n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
};

export function crmAlerts(crm={},now=new Date()){
  const d=coachCrmDefaults(crm);
  const nowDate=now instanceof Date?now:new Date(now);
  const nowMs=Number.isNaN(nowDate.getTime())?Date.now():nowDate.getTime();
  const out=[];
  for(const p of d.payments){
    const due=p.dueAt?new Date(p.dueAt).getTime():null;
    if(["due","overdue"].includes(p.status)&&due!=null&&due<nowMs){
      out.push({id:`payment:${p.id}`,level:"high",type:"payment",clientId:p.clientId,recordId:p.id,
        text:`Pago vencido · ${p.amountCents} ${p.currency} cents`});
    }
  }
  for(const r of d.referrals){
    const age=(nowMs-new Date(r.updatedAt||r.createdAt).getTime())/864e5;
    if(r.status==="lead"&&age>=7){
      out.push({id:`referral:${r.id}`,level:"medium",type:"referral",clientId:r.referrerClientId,recordId:r.id,
        text:`Referido sin contactar · ${r.referredName}`});
    }
  }
  for(const p of d.purchases){
    const age=(nowMs-new Date(p.updatedAt||p.createdAt).getTime())/864e5;
    if(p.status==="paid"&&age>=7){
      out.push({id:`purchase:${p.id}`,level:"medium",type:"purchase",clientId:p.clientId,recordId:p.id,
        text:`Compra pagada pendiente de entrega · ${p.item}`});
    }
  }
  return out.sort((a,b)=>a.level==="high"&&b.level!=="high"?-1:a.level!== "high"&&b.level==="high"?1:0);
}

export function crmSummary(crm={},now=new Date()){
  const d=coachCrmDefaults(crm);
  const day=localDay(now);
  const todayAppointments=d.appointments.filter((a)=>a.status==="scheduled"&&localDay(a.startAt)===day).length;
  const dueByCurrency={};
  for(const p of d.payments){
    if(!["due","overdue"].includes(p.status))continue;
    dueByCurrency[p.currency]=(dueByCurrency[p.currency]||0)+p.amountCents;
  }
  return {
    clients:d.clients.filter((c)=>c.status==="active").length,
    leads:d.clients.filter((c)=>c.status==="lead").length,
    appointmentsToday:todayAppointments,
    dueByCurrency,
    referralsOpen:d.referrals.filter((r)=>["lead","contacted"].includes(r.status)).length,
    purchasesOpen:d.purchases.filter((p)=>["ordered","paid"].includes(p.status)).length,
    alerts:crmAlerts(d,now).length,
  };
}

export function crmClientSnapshot(crm={},clientId,now=new Date()){
  const d=coachCrmDefaults(crm);
  const idClean=clean(clientId,90);
  const by=(key)=>d[key].filter((x)=>x.clientId===idClean||x.referrerClientId===idClean);
  const payments=by("payments");
  const dueByCurrency={};
  for(const p of payments.filter((x)=>["due","overdue"].includes(x.status))){
    dueByCurrency[p.currency]=(dueByCurrency[p.currency]||0)+p.amountCents;
  }
  return {
    client:d.clients.find((x)=>x.id===idClean)||null,
    appointments:by("appointments").sort((a,b)=>a.startAt.localeCompare(b.startAt)),
    payments:payments.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    referrals:by("referrals").sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    purchases:by("purchases").sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),
    notes:by("notes").sort((a,b)=>b.at.localeCompare(a.at)),
    dueByCurrency,
    alerts:crmAlerts(d,now).filter((a)=>a.clientId===idClean),
  };
}

export function crmTimeline(crm={},clientId){
  const snap=crmClientSnapshot(crm,clientId);
  const rows=[
    ...snap.appointments.map((x)=>({at:x.startAt,type:"appointment",title:x.kind,status:x.status,id:x.id})),
    ...snap.payments.map((x)=>({at:x.paidAt||x.dueAt||x.createdAt,type:"payment",title:`${x.amountCents} ${x.currency} cents`,status:x.status,id:x.id})),
    ...snap.referrals.map((x)=>({at:x.updatedAt||x.createdAt,type:"referral",title:x.referredName,status:x.status,id:x.id})),
    ...snap.purchases.map((x)=>({at:x.updatedAt||x.createdAt,type:"purchase",title:x.item,status:x.status,id:x.id})),
    ...snap.notes.map((x)=>({at:x.at,type:"note",title:x.text,status:"recorded",id:x.id})),
  ];
  return rows.filter((x)=>x.at).sort((a,b)=>b.at.localeCompare(a.at));
}
