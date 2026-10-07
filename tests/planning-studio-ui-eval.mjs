#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join,dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🧭 PLANNING STUDIO · CONTRATO UI\n");

const ui=read("js/ui/planning-studio.js");
const coachos=read("js/ui/coachos.js");
const domain=read("js/coach-lab.js");
const state=read("js/state.js");
const css=read("css/coach.css");
const sw=read("sw.js");

ok(coachos.includes("renderPlanningStudio"),"Coach OS abre Planning Studio");
ok(ui.includes("buildProgramDraft"),"UI crea programas desde dominio");
ok(ui.includes("programCalendar"),"UI muestra calendario canónico");
ok(ui.includes("setMicrocycleLoad"),"carga semanal usa dominio");
ok(ui.includes("addProgramTest")&&ui.includes("recordProgramTestResult"),"tests se planifican y registran explícitamente");
ok(ui.includes("addSessionToWeek"),"sesiones entran en microciclo");
ok(ui.includes("searchExercises")&&ui.includes("exerciseFacets"),"buscador usa motor avanzado");
ok(ui.includes('fetch("./trainingym/catalog.json"'),"buscador consume catálogo real");
ok(ui.includes('availability:"video"'),"constructor puede exigir ejercicio con vídeo");
ok(ui.includes("3.141 ejercicios"),"UI declara tamaño del catálogo auditado");

ok(ui.includes("Nada se calcula solo"),"UI declara que la carga no se inventa");
ok(ui.includes("SIN DEFINIR"),"carga ausente sigue ausente");
ok(ui.includes("no genera recomendaciones automáticas"),"gate manual bloquea autorrecomendación");
ok(ui.includes("MARCA SOLO LO DECLARADO"),"contexto sensible requiere declaración explícita");
ok(ui.includes("Añade primero un cliente al Coach CRM"),"programa exige cliente real del CRM");
ok(!ui.includes("Math.random"),"Planning Studio no inventa IDs aleatorios");
ok(!ui.includes("diagnóstico"),"Planning Studio no se presenta como diagnóstico");

ok(domain.includes("SPORT_TEMPLATES"),"dominio tiene plantillas deportivas");
ok(domain.includes("PROGRAM_LEVELS"),"jerarquía Macro/Meso/Micro/Sesión sigue canónica");
ok(domain.includes("recommendationGate"),"dominio conserva gate de seguridad");
ok(domain.includes("manual_review"),"riesgos declarados exigen revisión manual");
ok(domain.includes("loadTarget:{volume:null,intensity:null,rpe:null}"),"microciclo nace sin carga inventada");
ok(domain.includes("result:input.result")&&domain.includes('status:"planned"'),"test nace sin resultado fabricado");

ok(state.includes("coachPrograms: []"),"estado nuevo empieza sin programas");
ok(state.includes("saveCoachProgram(program"),"estado persiste programas validados");
ok(state.includes("deleteCoachProgram(id)"),"programas se eliminan explícitamente");

ok(css.includes("PLANNING STUDIO · Macro"),"Planning Studio tiene capa visual");
ok(css.includes(".planning-week")&&css.includes(".planning-browser-row"),"calendario y catálogo tienen layout");
ok(css.includes("@media(max-width:520px)"),"Planning Studio contempla móvil");

ok(sw.includes("./js/coach-lab.js")&&sw.includes("./js/ui/planning-studio.js"),"Planning Studio funciona offline");
ok(/CACHE = "bayona-shell-v42"/.test(sw),"shell PWA subió a v42");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
