import { applyCors, json, publicSupabaseEnv, verifySupabaseUser } from "./_security.js";
import { subscriptionActive } from "./_billing.js";

export default async function handler(req,res){
  if(!applyCors(req,res,"GET,OPTIONS"))return json(res,403,{ok:false,error:"origin_not_allowed"});
  if(req.method==="OPTIONS"){res.statusCode=204;return res.end();}
  if(req.method!=="GET")return json(res,405,{ok:false,error:"method_not_allowed"});

  const auth=await verifySupabaseUser(req);
  if(!auth.ok)return json(res,auth.status,{ok:false,error:auth.reason});
  const {url,anonKey,configured}=publicSupabaseEnv();
  if(!configured)return json(res,503,{ok:false,error:"cloud_not_configured"});

  try{
    const q=new URLSearchParams({
      user_id:`eq.${auth.user.id}`,
      select:"plan,status,current_period_end,cancel_at_period_end,updated_at",
      limit:"1",
    });
    const r=await fetch(`${url}/rest/v1/billing_subscriptions?${q}`,{
      headers:{apikey:anonKey,authorization:`Bearer ${auth.token}`,accept:"application/json"},
      cache:"no-store",
    });
    if(!r.ok)return json(res,r.status===404?503:r.status,{ok:false,error:"billing_status_unavailable"});
    const row=(await r.json())?.[0]||null;
    return json(res,200,{
      ok:true,
      active:subscriptionActive(row),
      plan:subscriptionActive(row)?row.plan:"free",
      status:row?.status||"none",
      currentPeriodEnd:row?.current_period_end||null,
      cancelAtPeriodEnd:Boolean(row?.cancel_at_period_end),
      updatedAt:row?.updated_at||null,
    });
  }catch{
    return json(res,503,{ok:false,error:"billing_status_unavailable"});
  }
}
