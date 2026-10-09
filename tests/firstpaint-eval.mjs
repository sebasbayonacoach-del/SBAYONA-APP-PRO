import {strict as assert} from "node:assert";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const html=read("index.html"),boot=read("js/ui/landing-boot.js"),sw=read("sw.js");
let checks=0;
function ok(value,label){assert.ok(value,label);checks++;console.log("PASS "+label)}
ok(html.includes('class="fitness-app bayona-boot-pending"'),"estado de inicialización en HTML, antes de JS");
ok(html.includes('body.bayona-boot-pending #entry'),"puerta oculta por CSS crítico de primer render");
ok(html.includes('body.bayona-boot-pending #hud'),"HUD privado oculto antes del arranque");
ok(html.includes('body.bayona-boot-pending #drawer'),"panel cliente oculto antes de seleccionar contexto");
ok(html.includes('body.bayona-boot-pending #scene-wrap'),"mundo 3D no aparece sobre la portada");
ok(html.includes('id="bayona-initial-load"')&&html.includes('role="status"'),"indicador de carga accesible y no promocional");
ok(boot.includes('releaseFirstPaint();')&&boot.includes('document.body.classList.remove("bayona-boot-pending")'),"el arranque libera la máscara explícitamente");
ok(boot.includes('montarLanding({')&&boot.includes('    releaseFirstPaint();'),"portada terminada antes de mostrar contenido");
ok(boot.includes('loadApp()\n      .then(() => {\n        releaseFirstPaint();'),"usuarios recurrentes ven app solo después de inicializar");
ok(boot.includes('firstPaintFailure(error)')&&boot.includes('retry.addEventListener'),"si falla la red se muestra Reintentar en vez de acceso inútil");
ok(sw.includes('bayona-shell-v57'),"service worker invalida HTML/CSS en actualizaciones");
console.log("RESULTADO "+checks+" comprobaciones del primer render, cero fallos");
