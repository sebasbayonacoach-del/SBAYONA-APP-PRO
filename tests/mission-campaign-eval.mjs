import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import {PLAN_META} from "../js/entitlements.js";
import {missionProgress,missionMessage,salesUrl,validatedPlan} from "../js/mission-campaign.js";
const html=readFileSync(new URL("../misiones.html",import.meta.url),"utf8");
const main=readFileSync(new URL("../js/ui/landing.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../css/mission-campaign.css",import.meta.url),"utf8");
let n=0;function ok(v,label){assert.ok(v,label);n++;console.log("PASS "+label)}
ok(html.includes("<html lang=\"es\">"),"campaña accesible en español");
ok(html.includes("<title>Misiones BAYONA"),"título SEO específico");
ok(html.includes('name="description"'),"descripción social/metadatos");
ok(html.includes("Misión BAYONA"),"marca y propósito");
ok((html.match(/data-mission-day=/g)||[]).length===7,"siete acciones y solo siete");
ok(html.includes('id="progress-track"')&&html.includes('role="progressbar"'),"progreso accesible");
ok(html.includes('sin cobros automáticos aquí'),"no presenta pagos simulados como operativos");
ok(html.includes('No se procesan pagos en esta página'),"aviso claro sobre contratación");
ok(!/type="(email|tel|text|password)"/i.test(html),"no captura datos personales");
ok(html.includes('data-plan="raiz"')&&html.includes('data-plan="performance"')&&html.includes('data-plan="elite"'),"botones por plan");
for(const plan of ["raiz","performance","elite"]){
  ok(validatedPlan(plan)===plan,plan+" plan permitido");
  ok(missionMessage(plan).includes(PLAN_META[plan].priceEur+" €/mes"),plan+" precio coherente con entitlements");
  const url=new URL(salesUrl(plan));
  ok(url.protocol==="https:"&&url.hostname==="wa.me"&&url.pathname==="/34641698332",plan+" enlace directo verificado");
  ok(url.searchParams.get("text")?.includes(PLAN_META[plan].label),plan+" mensaje específico");
}
ok(validatedPlan("admin")===null&&validatedPlan('<script>')===null,"no incorpora valores arbitrarios a los enlaces");
ok(missionProgress([]).percent===0,"avance inicial real 0%");
ok(missionProgress([1,2,3,4,5,6,7]).percent===100,"avance real completo 100%");
ok(missionProgress([1,1,2,99]).complete===2,"no premia duplicados ni días inexistentes");
ok(main.includes('href: "/misiones.html"'),"la landing enlaza campaña pública");
ok(main.includes('misiones.html?plan='),"planes llevan a consulta específica");
ok(css.includes("@media(max-width:760px)"),"layout móvil diseñado");
ok(css.includes("prefers-reduced-motion"),"reducción de movimiento disponible");
ok(readFileSync(new URL("../tools/serve.mjs",import.meta.url),"utf8").includes('"misiones.html"'),"servidor local permite solo el HTML de campaña");
console.log("RESULTADO "+n+" verificaciones de campaña sin errores");
