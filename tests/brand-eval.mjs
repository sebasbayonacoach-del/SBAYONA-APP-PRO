import { strict as assert } from "node:assert";
import { BRAND, BRAND_DARK, BRAND_LIGHT, brandTheme } from "../js/brand.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🎨 BRAND SYSTEM · PARIDAD WEB → APP\n");

ok(BRAND.black==="#050505","negro coincide con la web");
ok(BRAND.black2==="#0C0C0D","superficie 2 coincide con la web");
ok(BRAND.black3==="#141416","superficie 3 coincide con la web");
ok(BRAND.orange==="#F4A261","naranja principal coincide con la web");
ok(BRAND.orangeFire==="#E76F51","naranja fuego coincide con la web");
ok(BRAND.orangeDeep==="#D45D38","naranja profundo coincide con la web");
ok(BRAND.orangeOnDark==="#FFC08A","texto naranja accesible sobre oscuro coincide");
ok(BRAND.orangeOnLight==="#9C4F1F","texto naranja accesible sobre claro coincide");
ok(BRAND_DARK.bg===BRAND.black&&BRAND_DARK.accent===BRAND.orange,"tema noche consume tokens de marca");
ok(BRAND_LIGHT.accent===BRAND.orange&&BRAND_LIGHT.accentText===BRAND.orangeOnLight,"tema día conserva identidad y contraste");
ok(brandTheme("dark")===BRAND_DARK&&brandTheme("light")===BRAND_LIGHT,"selector de tema determinista");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
