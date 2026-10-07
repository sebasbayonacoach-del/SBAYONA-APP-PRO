#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🏠 HUB PERSONAL · CONTRATO DE UI\n");
const fitness=read("js/ui/fitness.js");
const hub=read("js/hub.js");
const state=read("js/state.js");
const css=read("css/pro.css");
const sw=read("sw.js");
const i18n=read("js/i18n.js");

ok(fitness.includes("hubSnapshot"),"Inicio consume un snapshot canónico");
ok(fitness.includes("hubIdentity(snapshot,p)"),"renderiza identidad/personaje");
ok(fitness.includes("hubReview(snapshot"),"renderiza próxima revisión");
ok(fitness.includes("hubCoach(snapshot)"),"renderiza Coach contextual");
ok(fitness.includes("hubJourney(snapshot)"),"renderiza journey de hoy");
ok(fitness.includes("hubSpatial()"),"renderiza navegación espacial");
ok(fitness.includes("UI.W.goTo"),"Mueve el foco usa transición 3D real");
ok(hub.includes('env:"gym"')&&hub.includes('env:"kitchen"')&&hub.includes('env:"recovery"'),"presets conectan gimnasio, cocina y recuperación");
ok(hub.includes("fitCoins: Math.max(0,Number(data.credits)||0)"),"FitCoins reutiliza la economía credits");
ok(!hub.includes("Math.random"),"el Hub no fabrica métricas aleatorias");
ok(state.includes("nextProgressReviewAt: null"),"estado conserva revisión explícita");
ok(state.includes("defaultProgressReviewAt(new Date())"),"onboarding programa el primer checkpoint");
ok(state.includes("setProgressReviewAt(value)")&&state.includes("scheduleProgressReview(days = 28)"),"revisión se puede editar/reprogramar");
ok(css.includes("37 · PERSONAL HUB · command center"),"capa visual dedicada existe");
ok(css.includes(".fit-hub-identity")&&css.includes(".fit-hub-journey")&&css.includes(".fit-hub-coach"),"componentes principales tienen estilos");
ok(css.includes('html[data-surface-theme="light"] body.fitness-app .fit-hub-avatar'),"Hub respeta Día/Noche");
ok(sw.includes("./js/hub.js"),"modelo del Hub funciona offline");
ok(i18n.includes('"hub.coach.checkin"')&&i18n.includes('"hub.journey.label"'),"copy del Hub está centralizado");
ok(!fitness.includes("Próxima evaluación médica"),"la revisión no se presenta como acto médico");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
