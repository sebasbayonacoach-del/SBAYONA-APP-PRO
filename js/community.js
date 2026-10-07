// BAYONA — Community + FitCoins v1
// Progreso social verificable desde estado local + economía virtual auditable.
// FitCoins NO premian dolor, exceso ni actividad compulsiva.

export const COMMUNITY_POST_TYPES=Object.freeze(["workout","pr","streak","milestone","progress"]);
export const REACTION_TYPES=Object.freeze(["respect","fire","strong"]);

export const FITCOIN_REWARDS=Object.freeze([
  {id:"reward_bayona_cap",itemId:"bayona_cap",name:"Gorra BAYONA · digital",cost:500,kind:"digital"},
  {id:"reward_perf_bands",itemId:"perf_bands",name:"Muñequeras Rendimiento · digital",cost:800,kind:"digital"},
  {id:"reward_vanguard_pants",itemId:"vanguard_pants",name:"Pantalón Vanguardia · digital",cost:900,kind:"digital"},
  {id:"reward_field_pack",itemId:"field_pack",name:"Mochila de Campo · digital",cost:1000,kind:"digital"},
  {id:"reward_apex_lifters",itemId:"apex_lifters",name:"Zapatillas Ápice · digital",cost:1200,kind:"digital"},
  {id:"reward_aura_ice",itemId:"aura_ice",name:"Aura Glacial",cost:1500,kind:"digital"},
  {id:"reward_myth_shell",itemId:"myth_shell",name:"Cubierta Mítica",cost:1800,kind:"digital"},
  {id:"reward_apex_wings",itemId:"apex_wings",name:"Alas Ápice",cost:2200,kind:"digital"},
  {id:"reward_aura_sun",itemId:"aura_sun",name:"Aura Amanecer",cost:2500,kind:"digital"},
]);

const clean=(v,max=180)=>String(v??"").trim().replace(/\s+/g," ").slice(0,max);
const iso=(v)=>{
  const d=v instanceof Date?v:new Date(v||Date.now());
  return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
};
const hash=(value)=>{
  let h=2166136261;
  for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return (h>>>0).toString(36).toUpperCase();
};

export function fitCoinReward(id){
  return FITCOIN_REWARDS.find((x)=>x.id===id)||null;
}

export function normalizeFitCoinTx(input={}){
  const amount=Math.trunc(Number(input.amount));
  const before=Math.trunc(Number(input.balanceBefore));
  if(!Number.isFinite(amount)||amount===0||!Number.isFinite(before)||before<0)return null;
  const after=before+amount;
  if(after<0||after>1000000)return null;
  return {
    id:clean(input.id,90)||`fc_${Date.now()}_${hash(`${amount}:${before}:${input.source||""}`)}`,
    at:iso(input.at),
    amount,balanceBefore:before,balanceAfter:after,
    source:clean(input.source,60)||"system",
    reference:clean(input.reference,100)||null,
    label:clean(input.label,160)||"fitcoin.transaction",
  };
}

export function normalizeRedemption(input={}){
  const reward=fitCoinReward(input.rewardId);
  if(!reward)return null;
  const cost=Math.trunc(Number(input.cost??reward.cost));
  if(cost!==reward.cost)return null;
  return {
    id:clean(input.id,90)||`redeem_${Date.now()}_${reward.id}`,
    at:iso(input.at),rewardId:reward.id,itemId:reward.itemId,cost,
    status:["completed","cancelled"].includes(input.status)?input.status:"completed",
  };
}

export function normalizeCommunityPost(input={}){
  const type=COMMUNITY_POST_TYPES.includes(input.type)?input.type:null;
  const evidenceId=clean(input.evidenceId,120);
  const title=clean(input.title,120);
  if(!type||!evidenceId||!title)return null;
  return {
    id:clean(input.id,90)||`post_${Date.now()}_${hash(evidenceId)}`,
    cloudId:clean(input.cloudId,90)||null,
    at:iso(input.at),type,evidenceId,title,
    subtitle:clean(input.subtitle,180),
    metric:clean(input.metric,80),
    caption:clean(input.caption,280),
    source:["local","cloud"].includes(input.source)?input.source:"local",
    verification:["registered","cloud","unverified"].includes(input.verification)?input.verification:"registered",
  };
}

export function normalizeReferralInvite(input={}){
  const code=clean(input.code,24).toUpperCase();
  if(!/^BAY-[A-Z0-9]{6,14}$/.test(code))return null;
  return {
    id:clean(input.id,90)||`invite_${Date.now()}_${code}`,
    code,at:iso(input.at),
    channel:clean(input.channel,40)||"share",
    status:["shared","verified","expired"].includes(input.status)?input.status:"shared",
    note:clean(input.note,160),
  };
}

export function communityDefaults(input={},legacyBalance=0){
  const posts=(Array.isArray(input.posts)?input.posts:[]).map(normalizeCommunityPost).filter(Boolean).slice(-300);
  const ledger=(Array.isArray(input.fitcoinLedger)?input.fitcoinLedger:[]).map(normalizeFitCoinTx).filter(Boolean).slice(-1000);
  const redemptions=(Array.isArray(input.redemptions)?input.redemptions:[]).map(normalizeRedemption).filter(Boolean).slice(-500);
  const reactions=input.reactions&&typeof input.reactions==="object"&&!Array.isArray(input.reactions)?{...input.reactions}:{};
  const referralInvites=(Array.isArray(input.referralInvites)?input.referralInvites:[]).map(normalizeReferralInvite).filter(Boolean).slice(-500);
  const referralCode=/^BAY-[A-Z0-9]{6,14}$/.test(String(input.referralCode||"").toUpperCase())
    ? String(input.referralCode).toUpperCase() : null;
  const out={posts,fitcoinLedger:ledger,redemptions,reactions,referralInvites,referralCode};
  if(!out.fitcoinLedger.length&&Number.isFinite(Number(legacyBalance))&&Number(legacyBalance)>0){
    const opening=normalizeFitCoinTx({
      id:"fitcoin_opening_balance",
      at:"2026-10-07T00:00:00.000Z",
      amount:Math.trunc(Number(legacyBalance)),
      balanceBefore:0,
      source:"legacy_balance",
      label:"fitcoin.opening",
    });
    if(opening)out.fitcoinLedger.push(opening);
  }
  return out;
}

export function appendFitCoinTx(community={},input={}){
  const d=communityDefaults(community);
  const tx=normalizeFitCoinTx(input);
  if(!tx)return {ok:false,community:d,error:"invalid_transaction"};
  if(d.fitcoinLedger.some((x)=>x.id===tx.id))return {ok:true,community:d,tx:d.fitcoinLedger.find((x)=>x.id===tx.id),duplicate:true};
  d.fitcoinLedger.push(tx);
  d.fitcoinLedger=d.fitcoinLedger.slice(-1000);
  return {ok:true,community:d,tx,duplicate:false};
}

export function redeemFitCoinReward(community={},rewardId,balance,ownedIds=[]){
  const d=communityDefaults(community);
  const reward=fitCoinReward(rewardId);
  const current=Math.trunc(Number(balance));
  if(!reward)return {ok:false,community:d,balance:current,error:"reward_not_found"};
  if((ownedIds||[]).includes(reward.itemId))return {ok:false,community:d,balance:current,error:"already_owned"};
  if(!Number.isFinite(current)||current<reward.cost)return {ok:false,community:d,balance:current,error:"insufficient_fitcoins"};
  const tx=normalizeFitCoinTx({
    id:`redeem_tx_${reward.id}_${Date.now()}`,
    amount:-reward.cost,balanceBefore:current,source:"reward_redemption",
    reference:reward.id,label:"fitcoin.redemption",
  });
  if(!tx)return {ok:false,community:d,balance:current,error:"invalid_transaction"};
  d.fitcoinLedger.push(tx);
  const redemption=normalizeRedemption({rewardId:reward.id,cost:reward.cost,status:"completed"});
  d.redemptions.push(redemption);
  return {ok:true,community:d,balance:tx.balanceAfter,reward,tx,redemption};
}

export function progressShareCandidates(data={}){
  const out=[];
  const today=data.today||{};
  const hist=Array.isArray(data.history)?data.history:[];
  if(today.trained){
    out.push({
      kind:"workout",id:`workout:${today.date}`,title:"Sesión completada",
      subtitle:today.workoutDone||"Entrenamiento BAYONA",metric:`${today.trainingSets||0} series`,
    });
  }
  for(const day of hist.slice(-30)){
    if(day?.workouts>0)out.push({
      kind:"workout",id:`workout:${day.date}`,title:"Sesión completada",
      subtitle:day.workoutDone||"Entrenamiento BAYONA",metric:`${day.sets||0} series`,
    });
    for(const pr of Array.isArray(day?.prPoints)?day.prPoints:[]){
      if(!pr?.ex)continue;
      out.push({
        kind:"pr",id:`pr:${day.date}:${clean(pr.ex,50)}:${Number(pr.e1)||0}`,
        title:"Nuevo récord personal",subtitle:clean(pr.ex,80),
        metric:Number(pr.e1)?`e1RM ${Number(pr.e1)} kg`:"PR registrado",
      });
    }
  }
  const streak=Math.trunc(Number(data.streak)||0);
  if(streak>=3)out.push({
    kind:"streak",id:`streak:${streak}`,title:"Constancia",subtitle:"Racha BAYONA",metric:`${streak} días`,
  });
  const seen=new Set();
  return out.filter((x)=>{if(seen.has(x.id))return false;seen.add(x.id);return true;}).slice(-80).reverse();
}

export function createProgressPost(community={},candidate={},caption=""){
  const d=communityDefaults(community);
  if(!candidate?.id||!candidate?.kind||!candidate?.title)return {ok:false,community:d,error:"invalid_evidence"};
  if(!COMMUNITY_POST_TYPES.includes(candidate.kind))return {ok:false,community:d,error:"invalid_type"};
  if(d.posts.some((p)=>p.evidenceId===candidate.id))return {ok:false,community:d,error:"already_shared"};
  const post=normalizeCommunityPost({
    type:candidate.kind,evidenceId:candidate.id,title:candidate.title,
    subtitle:candidate.subtitle,metric:candidate.metric,caption,
    source:"local",verification:"registered",
  });
  if(!post)return {ok:false,community:d,error:"invalid_post"};
  d.posts.push(post);
  d.posts=d.posts.slice(-300);
  return {ok:true,community:d,post};
}

export function toggleLocalReaction(community={},postId,type="respect"){
  const d=communityDefaults(community);
  if(!d.posts.some((x)=>x.id===postId)||!REACTION_TYPES.includes(type))return {ok:false,community:d};
  const prev=d.reactions[postId];
  if(prev===type)delete d.reactions[postId];
  else d.reactions[postId]=type;
  return {ok:true,community:d,reaction:d.reactions[postId]||null};
}

export function referralCodeFor(seed){
  const h=hash(clean(seed,200)||"BAYONA");
  return `BAY-${h.padStart(8,"0").slice(0,10)}`;
}

export function recordReferralShare(community={},seed,channel="share"){
  const d=communityDefaults(community);
  const code=d.referralCode||referralCodeFor(seed);
  d.referralCode=code;
  const invite=normalizeReferralInvite({code,channel,status:"shared"});
  d.referralInvites.push(invite);
  d.referralInvites=d.referralInvites.slice(-500);
  return {ok:true,community:d,code,invite};
}

export function communitySummary(community={},balance=0){
  const d=communityDefaults(community);
  return {
    posts:d.posts.length,
    fitcoins:Math.max(0,Math.trunc(Number(balance)||0)),
    redemptions:d.redemptions.filter((x)=>x.status==="completed").length,
    referralsShared:d.referralInvites.length,
    referralsVerified:d.referralInvites.filter((x)=>x.status==="verified").length,
  };
}
