#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n📈 PROGRESS VISUAL · CONTRATO DE UI\n");
const ui=read("js/ui/progress.js");
const domain=read("js/progress-visual.js");
const css=read("css/pro.css");
const sw=read("sw.js");
const entitlements=read("js/entitlements.js");

ok(ui.includes("progressSnapshot"),"UI consume snapshot canónico");
ok(ui.includes("progressHero(snapshot)"),"cabecera visual usa datos reales");
ok(ui.includes("periodCard(snapshot.period28)"),"compara ventana de 28 días");
ok(ui.includes("strengthHighlights(snapshot)"),"fuerza se resume visualmente");
ok(ui.includes("measurementSummary(snapshot)"),"medidas tienen resumen visual");
ok(ui.includes("medidasBlock(body)"),"panel de mediciones realmente entra en la pantalla");
ok(ui.includes("photosSummary(snapshot)"),"fotos tienen resumen visual");
ok(ui.includes("photosBlock(body)"),"panel de fotos realmente entra en la pantalla");
ok(ui.includes("snapshot.timeline"),"timeline usa historia unificada del snapshot");
ok(ui.includes('hasFeature(plan,"progress.advanced")'),"analítica avanzada usa entitlement real");
ok(entitlements.includes('"progress.advanced": "performance"'),"PERFORMANCE es el nivel de analítica avanzada");
ok(ui.includes('const canProject = hasFeature(planFromProfile(S.data.profile), "progress.advanced")'),"proyección de fuerza queda dentro de analítica avanzada");
ok(ui.includes("analyticsBlock()"),"carga/recuperación avanzada conserva su motor existente");
ok(domain.includes("previous.daysWithData>0"),"comparación solo se declara comparable con datos previos");
ok(!domain.includes("Math.random"),"dominio no fabrica progreso");
ok(domain.includes("volumeKg:volumeKnown?Math.round(volume):null"),"volumen desconocido queda null, no cero ficticio");
ok(css.includes("41 · PROGRESS VISUAL"),"capa visual dedicada existe");
ok(css.includes(".progress-period-grid")&&css.includes(".progress-strength-grid")&&css.includes(".progress-measure-grid"),"comparativa, fuerza y cuerpo tienen layouts visuales");
ok(css.includes('html[data-surface-theme="light"]')&&css.includes('html[data-surface-theme="dark"]'),"Progreso respeta Día/Noche");
ok(sw.includes("./js/progress-visual.js"),"dominio funciona offline");
{
  const version=Number((sw.match(/bayona-shell-v(\d+)/)||[])[1]||0);
  ok(version>=38,`shell PWA conserva Progreso (v${version} >= v38)`);
}

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
