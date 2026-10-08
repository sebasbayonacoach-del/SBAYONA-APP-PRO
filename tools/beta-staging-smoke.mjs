#!/usr/bin/env node
// BAYONA · Auditoría HTTP sin credenciales, pagos ni datos personales.
// Uso: node tools/beta-staging-smoke.mjs https://preview.vercel.app [--require-cloud]

const base = String(process.argv[2] || "").replace(/\/$/,"");
const requireCloud=process.argv.includes("--require-cloud");
if(!/^https:\/\//.test(base)){
  console.error("Uso: node tools/beta-staging-smoke.mjs https://preview.vercel.app [--require-cloud]");
  process.exit(2);
}
const checks=[];
async function probe(path,options={}){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const r=await fetch(base+path,{redirect:"follow",cache:"no-store",signal:controller.signal,...options});
      return {status:r.status,body:await r.text()};
    }finally{clearTimeout(timeout);}
  }catch(e){return {status:0,body:"",error:e?.name||"network"};}
}
const add=(label,pass,detail)=>checks.push({label,pass:Boolean(pass),detail});

const landing=await probe("/");
add("landing",landing.status===200,"HTTP "+landing.status);

const cloud=await probe("/api/cloud-status");
let cloudInfo={};
try{cloudInfo=JSON.parse(cloud.body);}catch{}
add("cloud health endpoint",cloud.status===200,"HTTP "+cloud.status);
add("cloud readiness",Boolean(cloudInfo.ok&&cloudInfo.configured),
  cloudInfo.configured?cloudInfo.ok?"ready":"configured but unhealthy":"not configured");

const runtime=await probe("/api/runtime-config.js");
const publicConfigIsNull=runtime.body.includes("window.BAYONA_SUPABASE = null;");
add("runtime safe when missing",runtime.status===200&&(!(!cloudInfo.configured&&!publicConfigIsNull)),
  "HTTP "+runtime.status+(publicConfigIsNull?" · disabled":" · check configuration"));

const billing=await probe("/api/billing-status");
add("unauthenticated billing denied",[401,403,503].includes(billing.status),"HTTP "+billing.status);

const checkout=await probe("/api/billing-checkout",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:"elite"}),
});
add("unauthenticated checkout denied",[401,403,503].includes(checkout.status),"HTTP "+checkout.status);

const webhook=await probe("/api/billing-webhook",{
  method:"POST",headers:{"Content-Type":"application/json"},body:'{"id":"fake-event"}',
});
add("unsigned Stripe webhook denied",[400,403,503].includes(webhook.status),"HTTP "+webhook.status);

const telemetry=await probe("/api/telemetry");
add("telemetry write-only",telemetry.status===405,"HTTP "+telemetry.status);

const required=checks.filter(c=>c.label!=="cloud readiness");
const checksOk=required.every(c=>c.pass);
const ready=checksOk&&cloudInfo.ok===true;
for(const x of checks)console.log((x.pass?"OK":"PENDING")+" | "+x.label+" | "+x.detail);
console.log(JSON.stringify({securityChecksPassed:checksOk,cloudReady:!!cloudInfo.ok,ready,requireCloud}));
process.exit(checksOk&&(!requireCloud||ready)?0:1);
