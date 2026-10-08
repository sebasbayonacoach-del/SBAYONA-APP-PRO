import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(join(root,p),"utf8");
const training=read("js/ui/training.js");
const library=read("js/ui/proplayer-library.js");
const css=read("css/bayona-brand.css");
const i18n=read("js/i18n.js");
const sw=read("sw.js");
const index=read("index.html");
let n=0;
const ok=(yes,msg)=>{assert.ok(yes,msg);console.log("PASS "+msg);n++;};

console.log("\nBAYONA · SPRINT 15C · INTERFAZ Y SEMÁNTICA REAL\n");
ok(training.includes('const cell = el("button", `cal-day'),"calendario tiene botones reales");
ok(training.includes('cell.type = "button"'),"los días no envían formularios");
ok(training.includes('grid.setAttribute("role", "group")'),"semana anunciada como grupo");
ok(training.includes('cell.setAttribute("aria-pressed", "false")'),"estado inicial explícito");
ok(training.includes('String(c === cell)'),"estado aria-pressed cambia con la selección");
ok(training.includes('cal-scroll-hint'),"pista de deslizamiento móvil");
for(const key of ["training.weekScrollHint","training.weekAria","training.dayAria","training.restDay"]){
  ok(i18n.includes('"'+key+'":'),"mensaje traducible "+key);
}
ok(css.includes("SPRINT 15C · ENTRENAR Y PROPLAYER"),"capa estilística acotada");
ok(css.includes('html[data-surface-theme="light"] body.fitness-app #drawer[data-section="training"]'),"contraste Entrenar día por sección");
ok(css.includes('html[data-surface-theme="light"] body.fitness-app #drawer[data-section="library"]'),"biblioteca tiene tema día real");
ok(css.includes(".cal-grid {")&&css.includes("overflow-x: auto"),"días completos desplazables");
ok(css.includes("scroll-snap-type: x proximity"),"deslizamiento controlado");
ok(css.includes("min-height: 44px"),"objetivos táctiles mínimos");
ok(library.includes('const CATALOG_URL = "./trainingym/catalog.json"'),"catálogo no sustituido por datos inventados");
ok(library.includes("function mediaUrl(record)"),"reproducción original a demanda intacta");
ok(library.includes("async function openRoutineBuilder("),"editor de rutinas intacto");
ok(sw.includes("bayona-shell-v54"),"cache PWA invalidada");
ok(index.includes("css/bayona-brand.css?v=5"),"estilos nuevos no usan caché obsoleta");
console.log("\nRESULTADO "+n+" verificaciones \u00b7 0 fallos");
