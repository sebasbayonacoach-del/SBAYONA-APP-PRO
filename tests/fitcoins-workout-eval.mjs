import { strict as assert } from "node:assert";
import { S } from "../js/state.js";
import { WORKOUTS } from "../js/data.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n✦ FITCOINS · CIERRE DE SESIÓN\n");

S.init();
S.reset(true);
const id=Object.keys(WORKOUTS)[0];
ok(Boolean(id),"hay entrenamiento canónico para probar");
const before=S.fitCoinBalance();
const out=S.completeWorkout(id,{loggedSets:1,plannedSets:1,minutes:20});
ok(out?.fitcoins===20,"recompensa de cierre anuncia 20 FitCoins");
ok(S.fitCoinBalance()===before+20,"cierre completo acredita exactamente 20");
const ledger=S.fitCoinLedger();
ok(ledger.at(-1).source==="workout_complete","ledger explica el origen");
ok(/workout:/.test(ledger.at(-1).reference||""),"ledger conserva referencia de sesión");

const second=S.completeWorkout(id,{loggedSets:1,plannedSets:1,minutes:20});
ok(second===null,"segundo cierre es idempotente");
ok(S.fitCoinBalance()===before+20,"doble cierre no duplica FitCoins");

S.reset(true);
const b2=S.fitCoinBalance();
const partial=S.completeWorkout(id,{loggedSets:1,plannedSets:5,minutes:10});
ok(partial?.completed===false,"cierre incompleto se trata como parcial");
ok(S.fitCoinBalance()===b2,"sesión parcial no recibe FitCoins");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
