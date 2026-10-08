// BAYONA — privacy-preserving observability.
// Nunca envía texto libre del usuario, salud, notas, prompts o stack traces.

import { currentSession } from "./sync/supabase.js";

let installed=false;
const release=()=>String(globalThis.window?.BAYONA_RELEASE||document.documentElement?.dataset?.release||"web").slice(0,80);

function safeDetails(input={}){
  const keys=["code","name","metric","value","durationMs","count","online","section","status","viewportWidth","viewportHeight"];
  const out={};
  for(const k of keys){
    const v=input[k];
    if(typeof v==="number"&&Number.isFinite(v))out[k]=v;
    else if(typeof v==="boolean"||typeof v==="string")out[k]=v;
  }
  return out;
}

export async function captureTelemetry(kind,details={},severity="info"){
  if(typeof navigator!=="undefined"&&navigator.doNotTrack==="1")return false;
  const token=currentSession()?.access_token;
  const body={
    kind,severity,
    route:typeof location!=="undefined"?location.pathname:null,
    release:release(),
    details:safeDetails(details),
  };
  try{
    const r=await fetch("/api/telemetry",{
      method:"POST",
      headers:{
        "content-type":"application/json",
        ...(token?{authorization:`Bearer ${token}`}:{}),
      },
      body:JSON.stringify(body),
      keepalive:true,
    });
    return r.ok;
  }catch{return false;}
}

function reportNavigation(){
  try{
    const nav=performance.getEntriesByType("navigation")?.[0];
    if(!nav)return;
    captureTelemetry("web_vital",{
      metric:"navigation_load",
      value:nav.loadEventEnd||nav.duration||0,
      durationMs:nav.domContentLoadedEventEnd||0,
      viewportWidth:innerWidth,
      viewportHeight:innerHeight,
    },"info");
  }catch{}
}

export function installObservability(){
  if(installed||typeof window==="undefined")return;
  installed=true;

  window.addEventListener("error",(event)=>{
    captureTelemetry("client_error",{
      code:"window_error",
      name:event.error?.name||"Error",
      online:navigator.onLine!==false,
      section:document.body?.dataset?.section||"",
    },"error");
  });

  window.addEventListener("unhandledrejection",(event)=>{
    captureTelemetry("unhandled_rejection",{
      code:"unhandled_rejection",
      name:event.reason?.name||"PromiseRejection",
      online:navigator.onLine!==false,
      section:document.body?.dataset?.section||"",
    },"error");
  });

  window.addEventListener("bayona:optional-load-error",(event)=>{
    captureTelemetry("optional_load_error",{
      code:"optional_module",
      count:Number(event.detail?.count)||1,
      online:navigator.onLine!==false,
    },"warn");
  });

  window.addEventListener("load",()=>setTimeout(reportNavigation,0),{once:true});
  captureTelemetry("release",{code:"app_loaded",online:navigator.onLine!==false},"info");
}
