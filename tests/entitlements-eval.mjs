import { strict as assert } from "node:assert";
import {
  PLANS, PLAN_META, FEATURES, normalizePlan, hasFeature, featureTier,
  lockedFeatureCopy, planComparison, featureForSection, SECTION_FEATURES,
} from "../js/entitlements.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🔐 ENTITLEMENTS · PLANES Y ACCESO\n");

ok(JSON.stringify(PLANS)===JSON.stringify(["free","raiz","performance","elite"]),"orden de planes estable");
ok(PLAN_META.free.rank===0&&PLAN_META.elite.rank===3,"rango de plan monotónico");
ok(normalizePlan("RAÍZ")==="raiz","normaliza tildes y mayúsculas");
ok(normalizePlan("pro")==="performance","alias legado pro → performance");
ok(normalizePlan("desconocido")==="free","plan desconocido cae a FREE");
ok(hasFeature("free","training.basic"),"FREE entrena");
ok(!hasFeature("free","training.custom"),"FREE no recibe plan personalizado");
ok(hasFeature("raiz","training.custom"),"RAÍZ habilita entrenamiento personalizado");
ok(hasFeature("performance","ai.adaptive"),"PERFORMANCE habilita IA adaptativa");
ok(!hasFeature("performance","coach.call"),"llamada humana queda para ELITE");
ok(hasFeature("elite","coach.call"),"ELITE habilita llamada");
ok(featureTier("progress.advanced")==="performance","progreso avanzado exige PERFORMANCE");
const locked=lockedFeatureCopy("ai.adaptive","raiz");
ok(locked.locked&&locked.required==="PERFORMANCE","copy de bloqueo informa plan requerido");
ok(locked.text.includes("PERFORMANCE"),"copy de bloqueo explica el siguiente nivel");
const table=planComparison();
ok(table.length===4&&table[0].features["training.basic"]===true,"comparador completo");
ok(Object.keys(FEATURES).length>=15,"catálogo de features cubre el sprint");
ok(SECTION_FEATURES.plan==="planning.macrocycle","macrociclo se asocia a entitlement real");
ok(featureForSection("plan")==="planning.macrocycle","resolver de sección devuelve feature");
ok(featureForSection("nutrition")===null,"funciones básicas no se bloquean por sección");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
