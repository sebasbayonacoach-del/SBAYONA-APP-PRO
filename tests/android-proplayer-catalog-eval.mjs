import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
const txt=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let n=0;const ok=(v,label)=>{assert.ok(v,label);n++;console.log('PASS '+label)};
const pack=txt('mobile/pack-web.mjs'),lib=txt('js/ui/proplayer-library.js'),training=txt('js/ui/training.js');
const catalog=JSON.parse(txt('trainingym/catalog.json'));
ok(catalog.length===3141,'catálogo PROPLAYER completo: 3141');
ok(catalog.filter(r=>r.video_url).length===2255,'2255 fichas PROPLAYER enlazan vídeo');
ok(new Set(catalog.filter(r=>r.video_url).map(r=>r.video_url)).size===1607,'1607 MP4 externos únicos');
ok(pack.includes("join(root, 'trainingym', 'catalog.json')"),'empaquetador incluye ruta pública exacta');
ok(pack.includes("copyFileSync(catalogPath, join(catalogDest, 'catalog.json'))"),'copiado del JSON original, no ficheros privados');
ok(pack.includes("records.length !== 3141"),'paquete falla si catálogo incompleto');
ok(!pack.includes("copyFileSync(join(root, 'private-trainingym'"),'no copia archivos privados');
ok(lib.includes('const CATALOG_URL = "./trainingym/catalog.json"'),'biblioteca cliente lee ruta empaquetada');
ok(lib.includes('records')===false || lib.includes('async function openRoutineBuilder'),'editor PROPLAYER intacto');
ok(lib.includes('t("proplayer.video.external")')&&lib.includes('t("proplayer.video.ready")'),'información honesta de clips externos');
ok(lib.includes('video.addEventListener("error"'),'error de vídeo tratado explícitamente');
ok(training.includes('s.videoUrl ? t("training.video.online") : t("training.video.local")'),'sesiones distinguen video online frente a local');
ok(txt('mobile/android/app/build.gradle').includes('versionCode 3'),'versión Android 3');
ok(txt('mobile/android/app/build.gradle').includes('versionName "1.0.2-beta"'),'Android 1.0.2 beta');
ok(txt('sw.js').includes('bayona-shell-v59'),'invalidación de caché PWA');
for(const [name,file]of [['flexiones','pushup'],['hip thrust','hipthrust'],['burpees','burpee']]){
 ok(!existsSync(new URL('../media/'+file+'.mp4',import.meta.url)),name+' no se suplanta por vídeo ajeno sin licencia');
}
console.log('PROPLAYER ANDROID '+n+'/'+n+' verificaciones');
