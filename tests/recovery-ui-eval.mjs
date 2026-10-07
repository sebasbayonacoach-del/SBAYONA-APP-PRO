#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🌙 RECOVERY + SLEEP · CONTRATO DE UI\n");

const ui=read("js/ui/recovery.js");
const state=read("js/state.js");
const domain=read("js/recovery-sleep.js");
const css=read("css/pro.css");
const sw=read("sw.js");
const entitlements=read("js/entitlements.js");

ok(ui.includes("recoverySnapshot"),"UI consume snapshot canónico");
ok(ui.includes("sleepRecordFromTimes"),"registro nocturno deriva horas desde tiempos reales");
ok(ui.includes("S.logSleepWindow"),"noche real persiste en estado");
ok(ui.includes("S.setSleepSchedule"),"horario personal se configura desde Recovery");
ok(ui.includes("S.setActivePauseSchedule"),"pausas activas tienen configuración real");
ok(ui.includes("S.logActivePause"),"pausas registran una acción real");
ok(ui.includes("S.addRecoveryPractice"),"prácticas de recuperación son datos estructurados");
ok(ui.includes("S.addOtherActivity"),"otros deportes/actividad se registran sin fingir entreno BAYONA");
ok(ui.includes('hasFeature(plan,"wearable.sync")'),"wearable respeta entitlement");
ok(entitlements.includes('"wearable.sync": "performance"'),"sincronización requiere PERFORMANCE");
ok(!ui.includes("S.setWearableState("),"la UI no puede fingir una conexión de wearable");
ok(!ui.includes("Notification.requestPermission"),"Recovery no promete alarmas del sistema");
ok(ui.includes("No crea una alarma del sistema operativo"),"interfaz explica límite de recordatorios");
ok(domain.includes("if(!connected)return {connected:false"),"dominio oculta métricas cuando no hay conexión");
ok(state.includes("integrations: { health: wearableSnapshot({}) }"),"estado nuevo nace sin integración falsa");
ok(state.includes("sleepSource: null"),"sueño empieza sin fuente inventada");
ok(state.includes("recoveryPractices: []")&&state.includes("otherActivities: []"),"contexto diario empieza vacío");
ok(state.includes("stress: d.today.stress"),"historial conserva estrés");
ok(css.includes("42 · RECOVERY + SLEEP"),"capa visual dedicada existe");
ok(css.includes(".recovery-hero-grid")&&css.includes(".recovery-trend-grid")&&css.includes(".recovery-night-grid"),"hero, tendencia y cierre tienen layout");
ok(css.includes('html[data-surface-theme="light"]')&&css.includes('html[data-surface-theme="dark"]'),"Recovery respeta Día/Noche");
ok(sw.includes("./js/recovery-sleep.js"),"dominio Recovery funciona offline");
ok(/CACHE = "bayona-shell-v39"/.test(sw),"shell PWA subió a v39");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
