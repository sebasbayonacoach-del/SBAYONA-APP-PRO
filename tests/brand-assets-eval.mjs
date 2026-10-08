import { strict as assert } from "node:assert";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(name)=>readFileSync(join(root,name),"utf8");
const css=read("css/bayona-brand.css");
const index=read("index.html");
const sw=read("sw.js");
let pass=0;
const ok=(condition,message)=>{assert.ok(condition,message);pass++;console.log("  PASS "+message);};
console.log("\nBAYONA · INTEGRIDAD DE FUENTES Y PALETA WEB\n");
for(const family of ["Bayona Display","Bayona Text","Bayona Label"]){
  ok(css.includes('font-family: "'+family+'"'),"familia de marca declarada: "+family);
}
for(const token of ["#050505","#f4a261","#e76f51","#ffc08a","#9c4f1f"]){
  ok(css.toLowerCase().includes(token),"token de la web conservado: "+token);
}
const fonts=[...new Set([...css.matchAll(/url\(\.\.\/fonts\/([^()]+\.woff2)\)/g)].map(m=>m[1]))];
ok(fonts.length>=20,"variantes tipográficas declaradas: "+fonts.length);
for(const name of fonts){
  const size=statSync(join(root,"fonts",name)).size;
  ok(size>1000,"fuente referenciada presente: "+name);
}
ok(index.includes('href="css/bayona-brand.css?v=5"'),"hoja de marca enlazada en la app");
ok(sw.includes('"./css/bayona-brand.css"'),"estilos de marca disponibles offline");
for(const file of ["montserrat-normal-800-latin.woff2","inter-normal-400-latin.woff2","dm-mono-normal-400-latin.woff2"]){
  ok(sw.includes('"./fonts/'+file+'"'),"fuente esencial precacheada: "+file);
}
ok(/bayona-shell-v51/.test(sw),"service worker versionado tras el cambio visual");
console.log("\nRESULTADO: "+pass+" verificaciones · 0 fallos\n");
