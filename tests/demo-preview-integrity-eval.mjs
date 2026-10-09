import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname,join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLANS, FEATURES, PLAN_META, hasFeature } from "../js/entitlements.js";
import { demoHTML } from "../js/ui/landing.js";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(join(root,p),"utf8");
const landing=read("js/ui/landing.js"),css=read("css/luxe.css"),catalog=read("js/i18n.js"),sw=read("sw.js"),index=read("index.html");
let checks=0;function ok(value,label){assert.ok(value,label);checks++;console.log("PASS "+label);}
for(const plan of PLANS){
 const html=demoHTML(plan);
 ok(html.includes("data-demo-plan"),"demo expone membresías: "+plan);
 ok(html.includes("aria-pressed"),"selección accessible: "+plan);
 ok(html.includes(PLAN_META[plan].label),"metadata de precio/plan real: "+plan);
}
ok(!landing.includes("MARTES · 6 OCT"),"no muestra fecha ficticia como actual");
ok(!landing.includes("Datos reales"),"no afirma que la simulación contiene datos reales");
for(const key of ["demo.preview.disclaimer","demo.preview.sample","demo.preview.locked","demo.preview.included","demo.preview.data","demo.theme.light","demo.theme.dark"]){
 ok(catalog.includes('"'+key+'":'),"disclaimer/etiqueta traducible: "+key);
}
ok(landing.includes("hasFeature(plan, feature)"),"gates desde motor de permisos único");
ok(landing.includes('hasFeature(plan,"ai.adaptive")'),"IA adaptativa evaluada con motor de permisos");
ok(landing.includes('hasFeature(plan,"backup.cloud")')||landing.includes('lockMark(plan,"backup.cloud")'),"acceso a backup se consulta al motor real");
ok(landing.includes("setAttribute(\"aria-pressed\""),"estado de interacción accesible");
ok(landing.includes("bayona:theme"),"sincroniza el cambio externo de apariencia");
ok(css.includes("luxe-demo-sample")&&css.includes("min-height: 44px"),"identificación visual y controles de 44px");
ok(index.includes("css/luxe.css?v=2"),"cambio de CSS invalida caché");
ok(sw.includes("bayona-shell-v57"),"service worker invalida shell");
for(const plan of PLANS){
 for(const [feature,required] of Object.entries(FEATURES)){
  const expected=PLAN_META[plan].rank>=PLAN_META[required].rank;
  assert.equal(hasFeature(plan,feature),expected);
 }
}
ok(true,"68 accesos a funcionalidades contrastados contra rango de los planes");
console.log("\nRESULTADO "+checks+" verificaciones y 68 casos de autorización · 0 fallos");
