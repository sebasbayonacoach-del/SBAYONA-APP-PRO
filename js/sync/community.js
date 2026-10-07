// BAYONA · COMMUNITY CLOUD
// Feed social autenticado + reacciones + referidos verificados.
// No sincroniza FitCoins: el wallet autoritativo se aborda en Production Hardening.

import {
  currentUser,currentSession,select,insert,update,remove,rpc,
} from "./supabase.js";

function mustUser(){
  const u=currentUser();
  if(!currentSession()||!u?.id)throw new Error("Inicia sesión para usar la Comunidad en la nube.");
  return u;
}
const asArray=(v)=>Array.isArray(v)?v:v==null?[]:[v];
const safe=(v,max=280)=>String(v??"").trim().slice(0,max);
const inFilter=(values=[])=>{
  const ids=[...new Set(values.filter(Boolean).map((v)=>String(v).replace(/[(),]/g,"")))];
  return ids.length?`in.(${ids.join(",")})`:null;
};

export async function loadCommunityFeed(limit=60){
  const u=mustUser();
  const n=Math.max(1,Math.min(100,Math.trunc(Number(limit)||60)));
  const posts=asArray(await select("community_posts",{
    select:"id,user_id,author_name,type,evidence_id,title,subtitle,metric,caption,verification,created_at",
    order:"created_at.desc",limit:String(n),
  }));
  const ids=posts.map((p)=>p.id).filter(Boolean);
  const filter=inFilter(ids);
  const reactions=filter?asArray(await select("community_reactions",{
    post_id:filter,
    select:"post_id,user_id,type,created_at",
    limit:"5000",
  })):[];
  const counts=new Map();
  const mine=new Map();
  for(const r of reactions){
    if(!counts.has(r.post_id))counts.set(r.post_id,{respect:0,fire:0,strong:0});
    const c=counts.get(r.post_id);
    if(c[r.type]!==undefined)c[r.type]++;
    if(r.user_id===u.id)mine.set(r.post_id,r.type);
  }
  return posts.map((p)=>({
    ...p,
    reactionCounts:counts.get(p.id)||{respect:0,fire:0,strong:0},
    myReaction:mine.get(p.id)||null,
    mine:p.user_id===u.id,
  }));
}

export async function publishCommunityPost(post={}){
  const u=mustUser();
  if(!post?.evidenceId||!post?.type||!post?.title)throw new Error("Falta evidencia registrada.");
  const rows=await insert("community_posts",[{
    user_id:u.id,
    type:safe(post.type,20),
    evidence_id:safe(post.evidenceId,120),
    title:safe(post.title,120),
    subtitle:safe(post.subtitle,180),
    metric:safe(post.metric,80),
    caption:safe(post.caption,280),
    verification:"client_registered",
  }]);
  return asArray(rows)[0]||null;
}

export async function toggleCommunityReactionCloud(postId,type="respect"){
  const u=mustUser();
  if(!postId||!["respect","fire","strong"].includes(type))throw new Error("Reacción inválida.");
  const existing=asArray(await select("community_reactions",{
    post_id:`eq.${postId}`,user_id:`eq.${u.id}`,
    select:"post_id,user_id,type",limit:"1",
  }))[0]||null;
  if(existing?.type===type){
    await remove("community_reactions",{post_id:`eq.${postId}`,user_id:`eq.${u.id}`});
    return null;
  }
  if(existing){
    const rows=await update("community_reactions",{type},{post_id:`eq.${postId}`,user_id:`eq.${u.id}`});
    return asArray(rows)[0]||{post_id:postId,user_id:u.id,type};
  }
  const rows=await insert("community_reactions",[{post_id:postId,user_id:u.id,type}]);
  return asArray(rows)[0]||null;
}

export async function getOrCreateReferralCode(){
  mustUser();
  const result=await rpc("create_user_referral_code",{});
  return typeof result==="string"?result:asArray(result)[0]||"";
}

export async function acceptReferralCode(code){
  mustUser();
  const clean=String(code||"").trim().toUpperCase();
  if(!/^BAY-[A-Z0-9]{6,14}$/.test(clean))throw new Error("Código de referido inválido.");
  const result=await rpc("accept_user_referral_code",{p_code:clean});
  return result===true||asArray(result)[0]===true;
}

export async function myReferralStats(){
  const u=mustUser();
  const referred=asArray(await select("user_referrals",{
    referrer_id:`eq.${u.id}`,status:"eq.verified",
    select:"id,code,referred_id,status,verified_at",order:"verified_at.desc",limit:"500",
  }));
  const own=asArray(await select("user_referrals",{
    referred_id:`eq.${u.id}`,
    select:"id,code,referrer_id,status,verified_at",limit:"1",
  }));
  return {verified:referred.length,referrals:referred,referredBy:own[0]||null};
}
