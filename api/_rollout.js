// BAYONA — server-side rollout gate.
// Same FNV-1a bucketing used by js/rollout.js.

import { adminSelect } from "./_supabase-admin.js";

function bucket(seed,key){
  let h=2166136261;
  for(const ch of `${seed}:${key}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0)%100;
}

export async function serverRolloutAllowed(key,userId,plan){
  try{
    const rows=await adminSelect("feature_rollouts",{key:`eq.${key}`,select:"key,enabled,percentage,plans",limit:"1"});
    const flag=rows?.[0];
    if(!flag?.enabled)return false;
    const plans=Array.isArray(flag.plans)?flag.plans:[];
    if(plans.length&&!plans.includes(plan))return false;
    const pct=Math.max(0,Math.min(100,Number(flag.percentage)||0));
    return bucket(userId,key)<pct;
  }catch{
    return false;
  }
}
