import { strict as assert } from "node:assert";
import { S, SCHEMA } from "../js/state.js";
import { FITCOIN_REWARDS } from "../js/community.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🤝 COMMUNITY + FITCOINS · ESTADO\n");

S.init();
S.reset(true);

ok(SCHEMA===11,"schema actualizado a 11");
ok(S.fitCoinBalance()===120,"saldo inicial compatible = 120 FitCoins");
ok(S.fitCoinLedger().length===1&&S.fitCoinLedger()[0].source==="legacy_balance","saldo inicial tiene asiento de apertura");

const before=S.fitCoinBalance();
ok(S.addCredits(20,"test","ref1","Test reward")===true,"FitCoins pueden añadirse con fuente");
ok(S.fitCoinBalance()===before+20,"saldo aumenta exactamente");
ok(S.fitCoinLedger().at(-1).balanceAfter===S.fitCoinBalance(),"ledger termina en saldo real");

const cheap=FITCOIN_REWARDS.find((x)=>x.cost<=S.fitCoinBalance());
ok(!cheap,"con saldo inicial no se puede canjear premio caro accidentalmente");

S.addCredits(1000,"test","ref2","Preparar canje");
const reward=FITCOIN_REWARDS[0];
const b=S.fitCoinBalance();
const out=S.redeemFitCoinReward(reward.id);
ok(out.ok&&S.fitCoinBalance()===b-reward.cost,"canje descuenta coste exacto");
ok(S.isOwned(reward.itemId),"canje desbloquea gemelo digital");
ok(!S.redeemFitCoinReward(reward.id).ok,"mismo artículo no se cobra dos veces");

S.data.today.trained=true;
S.data.today.workoutDone="Fuerza A";
S.data.today.trainingSets=12;
const cand=S.progressShareCandidates();
ok(cand.some((x)=>x.kind==="workout"),"historial real expone candidato compartible");
const post=S.createProgressPost(cand.find((x)=>x.kind==="workout").id,"Hecho con calma.");
ok(post.ok&&S.data.community.posts.length===1,"post verificable persiste");
ok(!S.createProgressPost(post.post.evidenceId,"duplicado").ok,"misma evidencia no se duplica");

let react=S.toggleCommunityReaction(post.post.id,"fire");
ok(react.ok&&react.reaction==="fire","reacción persiste");
react=S.toggleCommunityReaction(post.post.id,"fire");
ok(react.ok&&react.reaction===null,"reacción se puede quitar");

const invite=S.recordReferralShare("whatsapp");
ok(invite.ok&&/^BAY-/.test(invite.code),"compartir referido crea código estable");
ok(S.communitySummary().referralsShared===1&&S.communitySummary().referralsVerified===0,"compartir no finge conversión");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
