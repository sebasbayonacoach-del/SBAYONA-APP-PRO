// BAYONA · onboarding v2 contract
// One question per screen, no role mixing, no avatar/permission wall.
import { readFileSync } from "node:fs";
import { __obState, __obView, perfilRapido } from "../js/onboarding.js";
import { GOALS } from "../js/personalization.js";

let pass=0,fail=0;
const assert=(cond,name,extra="")=>{
  if(cond){pass++;console.log("  ✅ "+name);}
  else{fail++;console.log("  ❌ "+name+" "+extra);}
};

console.log("\n🚪 ONBOARDING v2 · SIMPLE, APP-LIKE, ONE QUESTION PER SCREEN\n");

const vista=(step)=>{__obState.step=step;return __obView();};
const html=Array.from({length:6},(_,i)=>vista(i));
const index=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const src=readFileSync(new URL("../js/onboarding.js",import.meta.url),"utf8");
const main=readFileSync(new URL("../js/main.js",import.meta.url),"utf8");
const i18n=readFileSync(new URL("../js/i18n.js",import.meta.url),"utf8");

console.log("— entrada —");
assert(index.includes("BAYONA · TU APP DE SALUD Y ENTRENAMIENTO"),"la entrada comunica salud + entrenamiento");
assert(index.includes("01 · MI APP")&&index.includes("02 · COACH"),"la entrada separa MI APP y COACH");
assert(!index.includes("01 · ATLETA"),"la persona no se etiqueta como atleta");
assert(!i18n.includes('"one.entry.resumeAthlete": "CONTINUAR COMO ATLETA"'),"el acceso rápido tampoco llama atleta a la persona");
assert(i18n.includes('"one.entry.experience": "Entrar a BAYONA"'),"la llamada personal usa un nombre claro y consistente");
assert(main.includes('rawName.toUpperCase() !== "TÚ"'),"el saludo no muestra «Hola, TÚ» cuando falta un nombre real");
assert(main.includes('resume.hidden = !storedRole'),"el acceso rápido solo aparece con rol real previo");

console.log("\n— flujo guiado —");
assert(html.length===6,"seis pantallas cortas");
assert(html.every((h)=>h.includes("Paso ")&&h.includes("de 6")),"progreso accesible 1/6 → 6/6");
assert(html[0].includes('id="ob-name"')&&!html[0].includes("ob-choice-grid"),"paso 1 = solo nombre");
assert((html[1].match(/class="ob-choice /g)||[]).length===7,"paso 2 = siete objetivos Trainingym/BAYONA");
assert(html[1].includes("¿Qué quieres mejorar?")&&!html[1].includes("EXPERIENCIA"),"objetivo sin pregunta de experiencia");
assert((html[2].match(/class="ob-choice /g)||[]).length===4,"paso 3 = días disponibles");
assert((html[3].match(/class="ob-choice /g)||[]).length===3,"paso 4 = espacio/equipamiento");
assert((html[4].match(/class="ob-choice /g)||[]).length===4,"paso 5 = duración");
assert(html[5].includes("Tu espacio está preparado.")&&html[5].includes('id="ob-done"'),"paso 6 = resumen y entrada");
assert(html.slice(1,5).every((h)=>h.includes('id="ob-next"')&&h.includes('id="ob-back"')),"pasos intermedios conservan avanzar/volver");
assert(!html.join("\n").includes('id="ob-fast"'),"sin atajo que invente configuración");
assert(!html.join("\n").includes("AVATAR 3D")&&!html.join("\n").includes("TONO DE PIEL"),"avatar fuera del onboarding");
assert(!html.join("\n").includes("consentVision")&&!html.join("\n").includes('type="checkbox"'),"permisos se piden de forma contextual, no al inicio");

console.log("\n— objetivos —");
const expected=[
  "COMPOSICIÓN CORPORAL",
  "HIPERTROFIA MUSCULAR",
  "FUERZA Y POTENCIA",
  "RESISTENCIA Y CONDICIÓN FÍSICA",
  "MOVILIDAD Y FUNCIÓN",
  "RENDIMIENTO DEPORTIVO",
  "BIENESTAR Y ADHERENCIA",
];
assert(JSON.stringify(GOALS)===JSON.stringify(expected),"catálogo de objetivos completo y alineado");
assert(expected.every((goal)=>html[1].includes(goal)),"los siete objetivos existen como valores del selector");

console.log("\n— accesibilidad y salida —");
assert(src.includes('aria-modal="true"'),"diálogo modal declarado");
assert(src.includes("preventScroll:true")&&src.includes(".focus"),"cada pantalla mueve foco de forma controlada");
assert(src.includes('event.key === "Enter"'),"Enter avanza desde el nombre");
assert(html.slice(1,5).every((h)=>h.includes('role="group"')&&h.includes("aria-pressed=")),"opciones agrupadas y con estado ARIA");
assert(src.includes('openSection("hoy")'),"primera llegada aterriza en Inicio");
assert(!src.includes("UI.actions.openTraining"),"la primera llegada no abre una sesión sin contexto");

console.log("\n— compatibilidad segura —");
const p=perfilRapido();
assert(p.name==="TÚ"&&p.goal==="BIENESTAR Y ADHERENCIA"&&p.availability==="3 DÍAS/SEMANA","perfil de compatibilidad no usa ATLETA ni fuerza por defecto");
assert(p.consents.vision===false&&p.consents.health===false&&p.consents.avatar_3d===false,"ningún permiso se concede por defecto");
const saved=__obState.name;
__obState.name='<script>alert(1)</script>';
const escaped=vista(0);
assert(!escaped.includes("<script>")&&escaped.includes("&lt;script&gt;"),"nombre escapado sin HTML crudo");
__obState.name=saved;

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail?1:0);
