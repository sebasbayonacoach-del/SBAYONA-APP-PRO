#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🥗 NUTRITION CALENDAR · CONTRATO DE UI\n");

const ui=read("js/ui/nutrition.js");
const state=read("js/state.js");
const domain=read("js/nutrition-calendar.js");
const css=read("css/pro.css");
const i18n=read("js/i18n.js");
const sw=read("sw.js");
const entitlements=read("js/entitlements.js");

ok(ui.includes("nutritionContext"),"pantalla usa contexto temporal canónico");
ok(ui.includes("weeklyNutritionSnapshot"),"pantalla usa snapshot semanal canónico");
ok(ui.includes("mealAtFromLocal"),"registro manual convierte hora local a instante estructurado");
ok(ui.includes("contextHero(td)")&&ui.includes("feelingCard(td)")&&ui.includes("weekCard()"),"Inicio nutricional prioriza ahora, sensación y semana");
ok(ui.includes("preferencesCard()"),"preferencias declaradas forman parte de la experiencia");
ok(ui.includes('hasFeature(planFromProfile(S.data.profile),"nutrition.advanced")'),"edición avanzada usa entitlement real");
ok(entitlements.includes('"nutrition.advanced": "performance"'),"planificación avanzada exige PERFORMANCE");
ok(ui.includes("advancedModal()"),"planes inferiores pueden ver explicación sin usar función premium");
ok(ui.includes("qty,unit,slot,at"),"cantidad, unidad, slot y hora viajan como campos");
ok(ui.includes('feeling:$("#cm-feeling").value||null'),"sensación post-comida viaja estructurada");
ok(ui.includes('note:$("#cm-note").value'),"nota de comida viaja estructurada");
ok(!ui.includes('name: `${name}${qty'),"hora/cantidad ya no se incrustan en el nombre");
ok(state.includes("nutrition: nutritionDefaults()"),"estado nuevo incluye dominio nutricional");
ok(state.includes("d.nutrition = nutritionDefaults"),"saves antiguos migran conservadoramente");
ok(state.includes("nutritionFeeling"),"sensación actual persiste");
ok(state.includes("setNutritionDayPlan"),"plan semanal tiene escritura canónica");
ok(state.includes("updateNutritionGoals"),"objetivos tienen escritura canónica");
ok(state.includes("updateNutritionPreferences"),"preferencias tienen escritura canónica");
ok(domain.includes('configured: false')&&domain.includes('source: "base"'),"objetivos base se declaran como referencia, no personalizados");
ok(!/gen[eé]tic/i.test(ui)&&!/gen[eé]tic/i.test(domain),"no se promete nutrición genética sin fuente real");
ok(css.includes("40 · NUTRITION CALENDAR"),"capa visual dedicada existe");
ok(css.includes(".nut-now-grid")&&css.includes(".nut-week-grid")&&css.includes(".nut-pref-grid"),"contexto, semana y preferencias tienen estilos");
ok(css.includes('html[data-surface-theme="light"]')&&css.includes('html[data-surface-theme="dark"]'),"Nutrición respeta Día/Noche");
ok(sw.includes("./js/nutrition-calendar.js"),"dominio nutricional funciona offline");
{
  const version=Number((sw.match(/bayona-shell-v(\d+)/)||[])[1]||0);
  ok(version>=37,`shell PWA conserva Nutrition (v${version} >= v37)`);
}
ok(i18n.includes('"nut.calendar.title"')&&i18n.includes('"nut.plan.locked"'),"copy nuevo vive en catálogo");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
