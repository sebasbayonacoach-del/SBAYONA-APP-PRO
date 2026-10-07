import { strict as assert } from "node:assert";
import { normalizeTheme, resolvedTheme, readTheme, applyTheme, THEME_KEY } from "../js/theme.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n◐ THEME · DÍA / NOCHE\n");

ok(normalizeTheme("LIGHT")==="light","normaliza light");
ok(normalizeTheme("x")==="dark","tema inválido cae a dark");
ok(resolvedTheme("dark")==="dark","dark resuelve dark");
ok(resolvedTheme("light")==="light","light resuelve light");
ok(resolvedTheme("system",{matches:true})==="light","system respeta preferencia clara");
ok(resolvedTheme("system",{matches:false})==="dark","system respeta preferencia oscura");

const store=new Map();
const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
ok(readTheme(storage)==="dark","sin preferencia inicia dark");
const root={dataset:{},style:{}};
const out=applyTheme("light",{root,storage,persist:true});
ok(out.resolved==="light","apply devuelve tema resuelto");
ok(root.dataset.bayonaTheme==="light"&&root.dataset.surfaceTheme==="light","tokens DOM actualizados");
ok(root.style.colorScheme==="light","color-scheme sincronizado");
ok(store.get(THEME_KEY)==="light","preferencia persistida");
ok(readTheme(storage)==="light","preferencia recuperable");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
