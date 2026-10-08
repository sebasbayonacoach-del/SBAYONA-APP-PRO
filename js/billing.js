// BAYONA — billing client
// El navegador nunca decide que una suscripción está activa: pregunta al backend.

import { currentSession, currentUser, onAuth } from "./sync/supabase.js";
import { acceptVerifiedEntitlement, clearVerifiedEntitlement } from "./entitlements.js";

let cache={at:0,value:null};

function authHeaders(json=false){
  const token=currentSession()?.access_token;
  return {
    ...(json?{"content-type":"application/json"}:{}),
    ...(token?{authorization:`Bearer ${token}`}:{}),
  };
}

export async function billingStatus({force=false}={}){
  if(!currentSession())return {ok:true,active:false,plan:"free",status:"signed_out"};
  if(!force&&cache.value&&Date.now()-cache.at<60_000)return cache.value;
  try{
    const r=await fetch("/api/billing-status",{headers:authHeaders(),cache:"no-store"});
    const data=await r.json().catch(()=>({}));
    const value=r.ok?data:{ok:false,active:false,plan:"free",status:data.error||"unavailable"};
    cache={at:Date.now(),value};
    return value;
  }catch{
    return {ok:false,active:false,plan:"free",status:"network"};
  }
}

export async function startCheckout(plan){
  if(!currentSession())return {ok:false,error:"sign_in_required"};
  try{
    const r=await fetch("/api/billing-checkout",{
      method:"POST",headers:authHeaders(true),body:JSON.stringify({plan}),
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.url)return {ok:false,error:data.error||"checkout_failed"};
    location.assign(data.url);
    return {ok:true,url:data.url};
  }catch{return {ok:false,error:"network"};}
}

export async function openBillingPortal(){
  if(!currentSession())return {ok:false,error:"sign_in_required"};
  try{
    const r=await fetch("/api/billing-portal",{method:"POST",headers:authHeaders(true),body:"{}"});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.url)return {ok:false,error:data.error||"portal_failed"};
    location.assign(data.url);
    return {ok:true,url:data.url};
  }catch{return {ok:false,error:"network"};}
}

export async function hydrateBillingEntitlement(S,{force=false}={}){
  const userId=currentUser()?.id||null;
  const status=await billingStatus({force});
  // Evita que una respuesta lenta de otra cuenta desbloquee esta sesión.
  if (!userId || currentUser()?.id!==userId || !currentSession()?.access_token) {
    clearVerifiedEntitlement();
    return status;
  }
  acceptVerifiedEntitlement(userId,status);
  if(!S?.data?.profile||!status.ok)return status;
  const currentSource=S.data.profile.membershipSource;
  if(status.active&&["raiz","performance","elite"].includes(status.plan)){
    const changed=S.data.profile.membershipPlan!==status.plan||currentSource!=="billing";
    S.data.profile.membershipPlan=status.plan;
    S.data.profile.membershipSource="billing";
    S.data.profile.membershipVerifiedAt=new Date().toISOString();
    if(changed)S.save();
  }else if(currentSource==="billing"&&!status.active){
    S.data.profile.membershipPlan="free";
    S.data.profile.membershipSource="billing";
    S.data.profile.membershipVerifiedAt=new Date().toISOString();
    S.save();
  }
  return status;
}

export function clearBillingCache(){
  cache={at:0,value:null};
  clearVerifiedEntitlement();
}

// En login, logout, refresh o cambio de cuenta invalidamos la caché local.
// Una sesión previa jamás transfiere privilegios a otra.
onAuth(async(s)=>{
  clearBillingCache();
  if (!s?.access_token || !s?.user?.id) return;
  try {
    const { S } = await import("./state.js");
    await hydrateBillingEntitlement(S,{force:true});
  } catch { clearVerifiedEntitlement(); }
});

// Una sesión restaurada al refrescar el navegador también se valida.
if(typeof window!=="undefined"&&currentSession()?.user?.id){
  import("./state.js")
    .then(({ S })=>hydrateBillingEntitlement(S,{force:true}))
    .catch(()=>clearVerifiedEntitlement());
}
