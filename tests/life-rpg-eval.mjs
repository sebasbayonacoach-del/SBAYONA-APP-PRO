import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeLifeRpgMode,lifeRpgSnapshot,lifeRpgAreaRoute} from "../js/ui/life-rpg.js";
assert.equal(normalizeLifeRpgMode(undefined),"adventure");
for(const id of ["simple","adventure","expert"])assert.equal(normalizeLifeRpgMode(id),id);
assert.equal(normalizeLifeRpgMode("pay_to_win"),"adventure");
const sample=lifeRpgSnapshot({
 profile:{lifeRpgView:"simple"},
 today:{date:"2026-10-19",trained:true,mind:0,workBlocks:0,missionKeys:[]},
 life:{planner:{items:[]}},
 xp:490,level:{lvl:3,cur:45,need:610},
 decision:{title:"Hoy toca recuperar",body:"Descansar es progreso",action:"recover",actionLabel:"Recuperarme"}
});
assert.equal(sample.mode,"simple");
assert.equal(sample.completed,1);
assert.equal(sample.all,5);
assert.equal(sample.claimable,1);
assert.equal(sample.areas.length,5);
assert.equal(sample.areas[0].id,"body");
assert.equal(sample.areas[0].done,true);
assert.equal(sample.areas[0].claimed,false);
assert.equal(sample.areas[0].source,"tracked");
assert.equal(sample.areas[0].xp>0,true);
assert.equal(sample.percent,7);
assert.equal(sample.toNext,565);
assert.equal(sample.recommendation.title,"Hoy toca recuperar");
const claimed=lifeRpgSnapshot({today:{date:"2026-10-19",trained:true,missionKeys:["area_body"]},life:{planner:{items:[]}}});
assert.equal(claimed.claimable,0);
assert.equal(claimed.areas[0].claimed,true);
assert.equal(lifeRpgAreaRoute("body"),"training");
assert.equal(lifeRpgAreaRoute("relationships"),"planner");
assert.equal(lifeRpgAreaRoute("purpose"),"planner");
const file=readFileSync(new URL("../js/ui/life-rpg.js",import.meta.url),"utf8");
const home=readFileSync(new URL("../js/ui/fitness.js",import.meta.url),"utf8");
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(home,/renderLifeRpg\(body,\{/);
assert.match(home,/S\.claimAreaMission\(id\)/);
assert.match(home,/S\.data\.profile\.lifeRpgView=mode/);
assert.match(file,/aria-pressed/);
assert.match(file,/setAttribute\("aria-valuenow"/);
assert.ok(!file.includes("localStorage"));
assert.ok(!file.includes("fetch("));
assert.ok(!file.includes("addXP("),"never create another XP currency");
assert.match(sw,/"\.\/css\/life-rpg\.css"/);
assert.match(sw,/"\.\/js\/ui\/life-rpg\.js"/);
assert.match(html,/css\/life-rpg\.css/);
const coach=readFileSync(new URL("../js/ui/one.js",import.meta.url),"utf8");
assert.match(coach,/function openCoachRpgPreview/);
assert.match(coach,/if \(accountRole\(\) !== "coach"\) return/);
assert.match(coach,/renderCoachRpgPreview\(body\)/);
assert.match(coach,/Ejemplo sin datos reales/);
assert.ok(!/S\.addXP\(/.test(coach),"Preview cannot award fake XP");
console.log("BAYONA Life RPG: 36 checks PASS");
