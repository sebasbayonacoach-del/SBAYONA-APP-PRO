#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🏋️ SESIÓN VIVA · CONTRATO DE UI\n");

const training=read("js/ui/training.js");
const state=read("js/state.js");
const engine=read("js/engine.js");
const vault=read("js/media-vault.js");
const consents=read("js/consents.js");
const css=read("css/pro.css");
const sw=read("sw.js");
const cine=read("js/ui/cinematics.js");

ok(training.includes("livePhaseCard(session)"),"la sesión muestra fase derivada del estado");
ok(training.includes("renderSessionClose(body)"),"la última serie lleva a fase final, no cierra automáticamente");
ok(training.includes("normalizeSetFeedback"),"feedback subjetivo se normaliza antes de guardar");
ok(training.includes("session.pendingEvidence"),"evidencia opcional se asocia a la serie");
ok(training.includes("recordExerciseVideo"),"la serie puede grabarse desde su propio formulario");
ok(training.includes("appendLatestUserVideo"),"el último vídeo personal reaparece en el ejercicio");
ok(training.includes('feeling==="pain"'),"dolor/molestia queda diferenciado");
ok(training.includes("completionDelta"),"el resumen calcula deltas reales");
ok(training.includes("fitCoinsGained"),"el resumen muestra FitCoins realmente ganados");
ok(training.includes("profile.face"),"el cierre usa la cara del perfil cuando existe");

const completeStart=state.indexOf("completeWorkout(workoutId");
const completeEnd=state.indexOf("/** Cierre parcial",completeStart);
const completeBlock=state.slice(completeStart,completeEnd);
ok(completeBlock.includes("loggedSets < plannedSets"),"dominio rechaza completar si faltan series");
ok(completeBlock.includes("closePartialWorkout"),"completado incompleto se desvía a parcial");
const partialStart=state.indexOf("closePartialWorkout(workoutId");
const partialEnd=state.indexOf("/** Abandono:",partialStart);
const partialBlock=state.slice(partialStart,partialEnd);
ok(!partialBlock.includes("t.trained = true"),"cierre parcial jamás marca trained");
ok(!partialBlock.includes("addXP(")&&!partialBlock.includes("addPoints("),"cierre parcial no concede bono");

ok(engine.includes("feeling: meta.feeling || null"),"histórico de series conserva sensación");
ok(engine.includes("evidenceId: meta.evidenceId || null"),"histórico conserva referencia local de vídeo");
ok(consents.includes('recordings: ["bayona.consent.recordings"]'),"grabación tiene consentimiento separado");
ok(vault.includes("indexedDBImpl.open"),"vídeo se guarda en IndexedDB");
ok(vault.includes("MAX_RECORDING_MS = 60_000"),"grabación tiene límite temporal");
ok(vault.includes("MAX_VIDEO_BYTES = 12 * 1024 * 1024"),"grabación tiene límite de tamaño");
ok(!vault.includes("fetch(")&&!vault.includes("XMLHttpRequest"),"vault no sube vídeos a red");
ok(cine.includes("no</b> se concede el bono final"),"UI explica que parcial no recibe bono");
ok(css.includes("38 · SESIÓN VIVA"),"capa visual dedicada existe");
ok(css.includes(".fit-session-summary")&&css.includes(".fit-set-feedback"),"resumen y feedback tienen estilos");
ok(sw.includes("./js/session-live.js")&&sw.includes("./js/media-vault.js"),"módulos de sesión funcionan offline");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
