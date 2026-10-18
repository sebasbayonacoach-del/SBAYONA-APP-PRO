import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const training = read("../js/ui/training.js");
const affiliate = read("../js/ui/affiliate-v12.js");
const media = read("../js/media.js");
const library = read("../js/ui/proplayer-library.js");
const catalog = JSON.parse(read("../trainingym/catalog.json"));
const references = catalog.filter((x) => x.video_archivo_local || x.video_url).length;
const filenames = new Set(catalog.map((x) => x.video_archivo_local).filter(Boolean)).size;

assert.equal(catalog.length, 3141, "el total debe salir del catálogo integrado");
assert.equal(references, 2255, "el contador debe significar fichas con referencia, no reproducciones probadas");
assert.equal(filenames, 1607, "el contador debe medir nombres de archivo distintos en catálogo");
assert.match(training, /fichas con referencia a vídeo/i);
assert.doesNotMatch(training, /fichas reproducibles|propiedad BAYONA|MP4 ÚNICOS/i);
assert.match(library, /FICHAS CON REFERENCIA/);
assert.match(library, /NOMBRES DE ARCHIVO/);
assert.match(library, /el origen puede no responder/);
assert.doesNotMatch(library, /propiedad de BAYONA|Con vídeo reproducible|MP4 original verificado/i);
assert.match(media, /video\.preload = "metadata"/);
assert.match(media, /retryButton\?\.addEventListener\("click", retry\)/);
assert.match(media, /video\.pause\(\)/);
assert.match(training, /bindVideoRecovery/);
assert.match(training, /pauseVideoWhenRemoved/);
assert.match(affiliate, /bindVideoRecovery/);
assert.match(affiliate, /pauseVideoWhenRemoved/);
assert.doesNotMatch(affiliate, /\.play\(\)\.catch\(\(\)=>\{\}\)/);
assert.doesNotMatch(affiliate, /autoplay|loop/);

console.log("✅ Contadores describen referencias de catálogo, no disponibilidad reproducible.");
console.log("✅ Players de entrenamiento, afiliado y PROPLAYER tienen metadatos, reintento manual y pausa al retirarse.");
console.log("✅ No quedan afirmaciones de propiedad de vídeo en los módulos revisados.");
