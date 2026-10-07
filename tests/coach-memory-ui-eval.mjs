#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🧠 COACH MEMORY · CONTRATO UI/IA\n");

const ui=read("js/ui/core.js");
const ai=read("js/coach/ai.js");
const core=read("js/coach/ai-core.js");
const memory=read("js/coach/memory.js");
const state=read("js/state.js");
const css=read("css/coach.css");
const sw=read("sw.js");

ok(ui.includes("coachMemoryFacts"),"panel consume memoria canónica");
ok(ui.includes("toolEvidence"),"tarjetas muestran evidencia de propuesta");
ok(ui.includes("proposalFromTool"),"tools accionables crean propuesta explícita");
ok(ui.includes("coach-memory-basis"),"UI distingue origen de cada recuerdo");
ok(ui.includes('t("coach.evidence.title")'),"evidencia tiene etiqueta visible");
ok(ui.includes('t("coach.proposal.pending")'),"propuesta pendiente se ve como pendiente");
ok(ui.includes("S.updateCoachMemoryStatus(memoryEvent.id, \"applied\")"),"acciones confirmadas pueden marcarse aplicadas");
ok(ui.includes("S.updateCoachMemoryStatus(memoryEvent.id, \"rejected\")"),"usuario puede descartar propuesta");
ok(ui.includes('tool.name === "adjust_session"'),"ajuste de sesión sigue representado como herramienta");
ok(ui.includes('t("coach.proposal.review")'),"ajuste requiere revisión explícita");
ok(!ui.includes("applyAdjustedPlan(tool"),"no existe aplicación silenciosa inventada");

ok(ai.includes("memoryPromptLines(d, 12)"),"contexto del Coach incluye memoria etiquetada");
ok(core.includes("MEMORIA RELEVANTE"),"prompt separa memoria relevante");
ok(core.includes("[REGISTRADO]")&&core.includes("[DERIVADO]")&&core.includes("[COACH]"),"reglas explican los tres orígenes");
ok(core.includes("la presentes como medición directa"),"inferencia no puede venderse como dato medido");
ok(core.includes("herramientas son propuestas visibles"),"prompt prohíbe cambios silenciosos");

ok(state.includes("coachMemory: memoryDefaults()"),"estado nuevo incluye memoria vacía");
ok(state.includes("rememberCoachEvent(event"),"estado tiene escritura canónica de memoria");
ok(state.includes("updateCoachMemoryStatus(id, status)"),"estado tiene transición explícita");
ok(memory.includes("events.length")||memory.includes("slice(-250)"),"memoria está acotada");
ok(!memory.includes("Math.random"),"memoria no usa IDs aleatorios opacos");
ok(memory.includes("x.sleep!=null")&&memory.includes("x.energy!=null"),"ausentes no entran como cero en medias");

ok(css.includes("COACH MEMORY · origen"),"Coach Memory tiene capa visual");
ok(css.includes(".coach-memory-row")&&css.includes(".coach-evidence-row"),"memoria y evidencia tienen estilos");
ok(css.includes(".coach-proposal-status.pending")&&css.includes(".coach-proposal-status.rejected"),"estados de propuesta tienen estilos");

ok(sw.includes("./js/coach/memory.js"),"memoria funciona offline");
ok(/CACHE = "bayona-shell-v40"/.test(sw),"shell PWA subió a v40");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
