// BAYONA · onboarding v3 contract
import { readFileSync } from "node:fs";
import { __obState, __obView, perfilRapido, __obAgeInfo, __obSafetyResult } from "../js/onboarding.js";
import { GOALS, TRAINING_PLACES } from "../js/personalization.js";
import { PLANS } from "../js/entitlements.js";

let pass=0,fail=0;
const assert=(cond,name,extra="")=>{
  if(cond){pass++;console.log("  ✅ "+name);}
  else{fail++;console.log("  ❌ "+name+" "+extra);}
};

console.log("\n🚪 ONBOARDING v3 · CONOCER SIN INTERROGAR\n");

const vista=(step)=>{__obState.step=step;return __obView();};
const html=Array.from({length:9},(_,i)=>vista(i));
const index=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const src=readFileSync(new URL("../js/onboarding.js",import.meta.url),"utf8");
const main=readFileSync(new URL("../js/main.js",import.meta.url),"utf8");
const i18n=readFileSync(new URL("../js/i18n.js",import.meta.url),"utf8");

console.log("— entrada —");
assert(index.includes("BAYONA · MOVIMIENTO CON DIRECCIÓN")&&index.includes("Entrena con un plan"),"la entrada comunica entrenamiento con propósito");
assert(index.includes("01 · PARA TI")&&index.includes("02 · ESPACIO PROFESIONAL"),"entrada diferencia Cliente y Coach OS");
assert(!index.includes("01 · ATLETA"),"la persona no se etiqueta como atleta");
assert(!i18n.includes('"one.entry.resumeAthlete": "CONTINUAR COMO ATLETA"'),"el acceso rápido tampoco llama atleta a la persona");
assert(main.includes('rawName.toUpperCase() !== "TÚ"'),"el saludo no muestra Hola, TÚ");
assert(main.includes('resume.hidden = !storedRole'),"acceso rápido solo con rol previo real");

console.log("\n— nueve pantallas —");
assert(html.length===9,"nueve pantallas progresivas");
assert(html.every((h)=>h.includes("Paso ")&&h.includes("de 9")),"progreso accesible 1/9 → 9/9");
assert(html[0].includes('id="ob-name"')&&!html[0].includes("ob-choice-grid"),"1 · nombre");
assert((html[1].match(/data-toggle="goals"/g)||[]).length===GOALS.length,"2 · todos los objetivos");
assert(html[1].includes('id="ob-custom-goal"')&&html[1].includes('id="ob-primary-goal"'),"2 · objetivo escrito + prioridad principal");
assert((html[2].match(/data-toggle="trainingPlaces"/g)||[]).length===TRAINING_PLACES.length,"3 · todos los entornos");
assert(html[2].includes('id="ob-custom-place"'),"3 · entorno/material escrito");
assert(html[3].includes("TU SEMANA REAL")&&(html[3].match(/data-day=/g)||[]).length===7,"4 · semana real, siete días");
assert((html[3].match(/data-minutes=/g)||[]).length===4,"4 · duración aproximada");
assert(!html[3].includes("sesión ideal"),"se elimina la pregunta ambigua sesión ideal");
assert(html[4].includes('id="ob-birth"')&&html[4].includes("CONTEXTO FISIOLÓGICO"),"5 · etapa + contexto fisiológico opcional");
assert((html[5].match(/class="ob-safety-row"/g)||[]).length===7,"6 · screening de seguridad completo");
assert(html[5].includes("no un diagnóstico"),"6 · declara límites clínicos");
assert((html[6].match(/data-coach=/g)||[]).length===3,"7 · tres estilos de Coach");
assert(html[6].includes("Sebastián")&&html[6].includes("Mara")&&html[6].includes("Minimal"),"7 · Sebastián, Coach femenina y minimal");
assert((html[7].match(/data-plan=/g)||[]).length===PLANS.length,"8 · cuatro membresías");
assert(PLANS.every((plan)=>html[7].includes('data-plan="'+plan+'"')),"8 · FREE/RAÍZ/PERFORMANCE/ELITE tienen contrato");
assert(html[8].includes("Ya tenemos suficiente para empezar.")&&html[8].includes('id="ob-done"'),"9 · resumen + entrada");

console.log("\n— privacidad, seguridad y accesibilidad —");
assert(src.includes('aria-modal="true"'),"diálogo modal");
assert(src.includes('event.key==="Enter"'),"Enter avanza desde nombre");
assert(src.includes("preventScroll:true"),"foco controlado por pantalla");
assert(src.includes("scoreParQ"),"reutiliza el motor de screening existente");
assert(!src.includes("Notification.requestPermission"),"onboarding no pide permisos del sistema");
assert(!html.join("\n").includes("AVATAR 3D"),"avatar técnico fuera del onboarding");
assert(!html.join("\n").includes('type="checkbox"'),"sin muro de consentimientos al inicio");

console.log("\n— datos v4 y compatibilidad —");
assert(GOALS.length===9&&GOALS.includes("VOLVER A ENTRENAR")&&GOALS.includes("PREPARAR UNA PRUEBA"),"objetivos ampliados");
assert(TRAINING_PLACES.length===10&&TRAINING_PLACES.includes("PISCINA")&&TRAINING_PLACES.includes("VIAJO MUCHO"),"entornos ampliados");
const p=perfilRapido();
assert(p.name==="TÚ"&&p.goalPrimary==="BIENESTAR Y ADHERENCIA","perfil compatible sin etiqueta atleta");
assert(Array.isArray(p.goals)&&Array.isArray(p.trainingPlaces)&&p.weeklyAvailability.days.length===3,"perfil v4 conserva estructura rica");
assert(p.membershipPlan==="free"&&p.coachPersona==="sebastian","defaults de plan y Coach explícitos");
assert(p.consents.vision===false&&p.consents.health===false&&p.consents.avatar_3d===false,"ningún permiso concedido por defecto");

const oldBirth=__obState.birthDate;
__obState.birthDate="2012-01-01";
const age=__obAgeInfo();
assert(age.minor===true&&age.ageBand==="adolescent","menor entra en ruta de desarrollo juvenil");
__obState.birthDate=oldBirth;
const safe=__obSafetyResult();
assert(safe.clearance==="pending"&&safe.answered===0,"el cribado no atribuye siete NO por defecto");
assert(!html[5].includes('id="ob-next"'),"no permite avanzar sin responder las siete preguntas");

const saved=__obState.name;
__obState.name='<script>alert(1)</script>';
const escaped=vista(0);
assert(!escaped.includes("<script>")&&escaped.includes("&lt;script&gt;"),"nombre escapado sin HTML crudo");
__obState.name=saved;

console.log("\n📊 RESULTADO: "+pass+" pass · "+fail+" fail\n");
process.exit(fail?1:0);
