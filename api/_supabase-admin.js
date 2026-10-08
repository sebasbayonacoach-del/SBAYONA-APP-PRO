// BAYONA — Supabase admin REST helpers.
// EXCLUSIVO servidor. Usa service_role desde variables de entorno.

import { serviceSupabaseEnv } from "./_security.js";

function env() {
  const cfg=serviceSupabaseEnv();
  if(!cfg.serviceConfigured) throw new Error("supabase_admin_not_configured");
  return cfg;
}

function qs(params={}) {
  const q=new URLSearchParams();
  for(const [k,v] of Object.entries(params)){
    if(v!==undefined&&v!==null)q.set(k,String(v));
  }
  const s=q.toString();
  return s?`?${s}`:"";
}

async function call(path,{method="GET",body,headers={}}={}){
  const {url,serviceRole}=env();
  const res=await fetch(url+path,{
    method,
    headers:{
      apikey:serviceRole,
      authorization:`Bearer ${serviceRole}`,
      accept:"application/json",
      ...(body!==undefined?{"content-type":"application/json"}:{}),
      ...headers,
    },
    body:body===undefined?undefined:JSON.stringify(body),
    cache:"no-store",
  });
  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null;}catch{data=text;}
  if(!res.ok){
    const err=new Error(`supabase_admin_${res.status}`);
    err.status=res.status;err.data=data;throw err;
  }
  return data;
}

export function adminSelect(table,params){return call(`/rest/v1/${table}${qs(params)}`);}
export function adminInsert(table,rows){
  return call(`/rest/v1/${table}`,{
    method:"POST",body:rows,
    headers:{Prefer:"return=representation"},
  });
}
export function adminUpsert(table,rows,onConflict){
  const params=onConflict?{on_conflict:onConflict}:{};
  return call(`/rest/v1/${table}${qs(params)}`,{
    method:"POST",body:rows,
    headers:{Prefer:"return=representation,resolution=merge-duplicates"},
  });
}
export function adminUpdate(table,patch,params){
  return call(`/rest/v1/${table}${qs(params)}`,{
    method:"PATCH",body:patch,
    headers:{Prefer:"return=representation"},
  });
}
