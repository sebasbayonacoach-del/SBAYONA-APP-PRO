#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>readFileSync(join(root,p),"utf8");
let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\n🎨 BRAND SYSTEM · CONTRATO VISUAL\n");
const pro=read("css/pro.css");
const luxe=read("css/luxe.css");
const world=read("js/world.js");
const avatar=read("js/avatar.js");
const appearance=read("js/ui/appearance.js");
const theme=read("js/theme.js");
const index=read("index.html");
const sw=read("sw.js");

for(const [hex,label] of [
  ["#050505","negro"],["#0c0c0d","negro 2"],["#141416","negro 3"],
  ["#f4a261","orange"],["#e76f51","orange fire"],["#d45d38","orange deep"],
]){
  ok(pro.toLowerCase().includes(hex),`PRO contiene ${label} canónico`);
  ok(luxe.toLowerCase().includes(hex),`LUXE contiene ${label} canónico`);
}
ok(pro.includes("39 · BRAND SYSTEM"),"PRO tiene una capa final de paridad web");
ok(luxe.includes("BRAND PARITY · SBAYONA-WEB-PRO"),"landing declara paridad con la web");
ok(world.includes("0xf4a261")&&!world.includes("0xff6a00"),"mundo 3D retiró el naranja legado");
ok(world.includes("0x050505")&&world.includes("0x0c0c0d")&&world.includes("0x141416"),"mundo 3D usa negros de la web");
ok(world.includes('mood === "alert" ? 0xe76f51'),"alerta 3D usa Orange Fire");
ok(avatar.includes('"#F4A261"')&&!avatar.includes('"#ff6a00"'),"avatar usa acento de marca");
ok(appearance.includes("BRAND.orange")&&appearance.includes("BRAND.orangeFire"),"Apariencia pinta swatches desde tokens");
ok(appearance.includes("NOCHE · MARCA")&&appearance.includes("DÍA · CLARO"),"Día/Noche siguen disponibles");
ok(theme.includes('from "./brand.js"'),"Theme Engine consume Brand System");
ok(index.includes("ap.radius || 'recto'")&&index.includes("ap.glass === undefined ? 'off'"),"primer paint nace con geometría de marca");
ok(sw.includes("./js/brand.js"),"Brand System funciona offline");
ok(/--luxe-radius:\s*0px/.test(luxe)&&/--pro-radius:\s*0px/.test(pro),"superficies principales heredan geometría recta");
ok(pro.includes("--brand-orange-dark:#ffc08a")&&pro.includes("--brand-orange-light:#9c4f1f"),"acentos de texto respetan contraste por superficie");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
