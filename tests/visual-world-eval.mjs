import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";
import {SCENES,PAGE_SCENES,mountVisualWorld} from "../js/ui/visual-world.js";
const art=Object.keys(SCENES);
assert.equal(art.length,9);
for(const k of art){
 const svg=readFileSync(new URL("../media/visual-world/"+k+".svg",import.meta.url),"utf8");
 assert.match(svg,/<svg /);
 assert.match(svg,/viewBox="0 0 960 400"/);
 assert.doesNotMatch(svg,/<script|<foreignObject|onload\s*=|href\s*=\s*["']https?:/i);
 assert.ok(statSync(new URL("../media/visual-world/"+k+".svg",import.meta.url)).size<10000);
 assert.equal(typeof SCENES[k].go,"string");
}
for(const [section,kind] of Object.entries(PAGE_SCENES)){
 assert.ok(SCENES[kind],"Invalid scene "+section);
}
assert.equal(PAGE_SCENES.coachos,"coach");
assert.equal(PAGE_SCENES.training,"training");
assert.equal(PAGE_SCENES.nutrition,"nutrition");
assert.equal(PAGE_SCENES.profile,"avatar");
assert.equal(mountVisualWorld(null,"nutrition",{navigate:()=>{}}),null);
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
for(const k of art)assert.match(sw,new RegExp('media/visual-world/'+k+'\\.svg'));
const shared=readFileSync(new URL("../js/ui/shared.js",import.meta.url),"utf8");
assert.match(shared,/if \(!personalLocked && document\.body\.classList\.contains\("fitness-app"\)\)/);
assert.match(shared,/mountVisualWorld\(body,name/);
const style=readFileSync(new URL("../css/visual-world.css",import.meta.url),"utf8");
assert.match(style,/prefers-reduced-motion/);
assert.match(style,/\.bayona-world-directory/);
console.log("BAYONA Visual World: 64+ assertions PASS");
