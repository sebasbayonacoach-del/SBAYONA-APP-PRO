import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import {__obState,__obView,__obSafetyResult} from "../js/onboarding.js";
import {PAR_Q_ITEMS} from "../js/health/healthMap.js";
let n=0;const check=(pass,title)=>{assert.ok(pass,title);n++;console.log("PASS "+title)};
const source=readFileSync(new URL("../js/onboarding.js",import.meta.url),"utf8");
const existingSafety={...__obState.safety},step=__obState.step;
try {
 __obState.step=5;
 for(const item of PAR_Q_ITEMS)__obState.safety[item.id]=null;
 let view=__obView(),result=__obSafetyResult();
 check(result.clearance==="pending"&&result.answered===0,"sin respuesta no se declara que no haya contraindicaciones");
 check(!view.includes('id="ob-next"'),"avance bloqueado hasta responder las siete preguntas");
 check((view.match(/data-safety=/g)||[]).length===14,"dos opciones para cada una de las siete preguntas");
 check((view.match(/aria-pressed="true"/g)||[]).length===0,"no se presupone respuesta NO");
 __obState.safety.heart=true;
 result=__obSafetyResult();
 check(result.clearance==="refer_required"&&!result.complete,
   "bandera cardiaca roja se comunica incluso si faltan otras respuestas");
 __obState.safety.heart=false;
 for(const item of PAR_Q_ITEMS) __obState.safety[item.id]=false;
 result=__obSafetyResult();view=__obView();
 check(result.clearance==="cleared"&&result.answered===7,"siete NO explícitos dan cribado sin banderas");
 check(view.includes('id="ob-next"'),"continuar solo tras responder");
 __obState.safety.chest_pain=true;result=__obSafetyResult();
 check(result.clearance==="refer_required"&&result.redFlags.includes("chest_pain"),
   "dolor torácico no se clasifica como seguro");
} finally {
 __obState.safety=existingSafety;
 __obState.step=step;
}
check(source.includes("grid-template-rows: auto auto minmax(0,1fr) auto"),
  "layout cuatro filas corrige espacio vacío");
check(source.includes("function refreshChoice(box, button, selector)"),
  "cambiar múltiples opciones conserva foco y posición");
check(source.includes("stage.scrollTop=top"),
  "selección no devuelve desplazamiento al inicio");
check(source.includes('html[data-surface-theme="light"] body.fitness-app #ob-box strong'),
  "texto claro con prioridad sobre CSS legado");
check(source.includes('html[data-surface-theme="light"] body.fitness-app #ob-box input'),
  "inputs marfil y tinta oscura en modo día");
check(source.includes('membershipPlan:"free"'),"intención de pago no concede plan");
console.log("\nRESULTADO: "+n+" verificaciones, cero errores");
