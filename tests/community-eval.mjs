import { strict as assert } from "node:assert";
import {
  FITCOIN_REWARDS,communityDefaults,normalizeFitCoinTx,appendFitCoinTx,
  redeemFitCoinReward,progressShareCandidates,createProgressPost,toggleLocalReaction,
  referralCodeFor,recordReferralShare,communitySummary,
} from "../js/community.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🤝 COMMUNITY + FITCOINS · DOMINIO\n");

const c=communityDefaults({},120);
ok(c.fitcoinLedger.length===1&&c.fitcoinLedger[0].balanceAfter===120,"saldo heredado crea apertura auditable");
ok(FITCOIN_REWARDS.length>=8&&FITCOIN_REWARDS.every((x)=>x.kind==="digital"),"catálogo FitCoin inicial es digital");

ok(normalizeFitCoinTx({amount:50,balanceBefore:120,source:"test"})?.balanceAfter===170,"transacción calcula saldo posterior");
ok(normalizeFitCoinTx({amount:-200,balanceBefore:120})===null,"saldo negativo se rechaza");
let tx=appendFitCoinTx(c,{id:"x1",amount:50,balanceBefore:120,source:"reward",label:"Premio"});
ok(tx.ok&&tx.tx.balanceAfter===170,"ledger añade movimiento");
ok(appendFitCoinTx(tx.community,{id:"x1",amount:50,balanceBefore:120}).duplicate===true,"ledger es idempotente por id");

let red=redeemFitCoinReward(c,FITCOIN_REWARDS[0].id,120,[]);
ok(!red.ok&&red.error==="insufficient_fitcoins","canje insuficiente se rechaza");
red=redeemFitCoinReward(c,FITCOIN_REWARDS[0].id,1000,[]);
ok(red.ok&&red.balance===1000-FITCOIN_REWARDS[0].cost&&red.tx.amount<0,"canje descuenta exactamente el coste");
ok(!redeemFitCoinReward(c,FITCOIN_REWARDS[0].id,1000,[FITCOIN_REWARDS[0].itemId]).ok,"objeto ya poseído no se cobra");

const data={
  streak:5,
  today:{date:"2026-10-07",trained:true,trainingSets:12,workoutDone:"Fuerza A"},
  history:[
    {date:"2026-10-05",workouts:1,sets:10,prPoints:[{ex:"squat",e1:90}]},
    {date:"2026-10-06",workouts:0,sets:0,prPoints:[]},
  ],
};
const candidates=progressShareCandidates(data);
ok(candidates.some((x)=>x.kind==="workout")&&candidates.some((x)=>x.kind==="pr")&&candidates.some((x)=>x.kind==="streak"),"solo historial real genera candidatos");

let post=createProgressPost({},candidates[0],"Trabajo hecho.");
ok(post.ok&&post.post.verification==="registered","post nace desde evidencia registrada");
ok(!createProgressPost(post.community,candidates[0],"otra vez").ok,"misma evidencia no se publica dos veces");

let react=toggleLocalReaction(post.community,post.post.id,"respect");
ok(react.ok&&react.reaction==="respect","reacción local se registra");
react=toggleLocalReaction(react.community,post.post.id,"respect");
ok(react.ok&&react.reaction===null,"segunda pulsación quita reacción");

const code=referralCodeFor("user-seed-1");
ok(/^BAY-[A-Z0-9]{6,14}$/.test(code),"código de referido tiene formato estable");
const invite=recordReferralShare({}, "user-seed-1","whatsapp");
ok(invite.ok&&invite.community.referralInvites.length===1&&invite.code===referralCodeFor("user-seed-1"),"compartir referido registra invitación sin fingir conversión");

const sum=communitySummary({...post.community,referralInvites:invite.community.referralInvites},900);
ok(sum.posts===1&&sum.fitcoins===900&&sum.referralsShared===1&&sum.referralsVerified===0,"resumen no inventa conversiones verificadas");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
