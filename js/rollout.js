// BAYONA — gradual feature rollout.
// Flags are server-owned rows; user bucketing is deterministic.

import { currentUser, currentSession, select } from "./sync/supabase.js";

let cache={at:0,rows:[]};

function bucket(seed,key){
  let h=2166136261;
  for(const ch of `${seed}:${key}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0)%100;
}

export async function loadRollouts({force=false}={}){
  if(!currentSession())return [];
  if(!force&&Date.now()-cache.at<60_000)return cache.rows;
  try{
    const rows=await select("feature_rollouts",{select:"key,enabled,percentage,plans,payload,updated_at"});
    cache={at:Date.now(),rows:Array.isArray(rows)?rows:[]};
    return cache.rows;
  }catch{
    return cache.rows||[];
  }
}

export async function rolloutEnabled(key,{plan="free",force=false}={}){
  const user=currentUser();
  if(!user)return false;
  const rows=await loadRollouts({force});
  const flag=rows.find((x)=>x.key===key);
  if(!flag?.enabled)return false;
  const plans=Array.isArray(flag.plans)?flag.plans:[];
  if(plans.length&&!plans.includes(plan))return false;
  const pct=Math.max(0,Math.min(100,Number(flag.percentage)||0));
  return bucket(user.id,key)<pct;
}

export function clearRolloutCache(){cache={at:0,rows:[]};}
