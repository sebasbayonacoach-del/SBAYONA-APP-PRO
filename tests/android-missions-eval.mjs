import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(join(root,name),'utf8');
let n=0;const ok=(v,m)=>{assert.ok(v,m);n++;console.log('PASS '+m)};
const fit=read('js/ui/fitness.js'),pack=read('mobile/pack-web.mjs'),sw=read('sw.js');
ok(fit.includes('function campaignMissionCard()'),'tarjeta de misiones integrada en Inicio');
ok(fit.includes('body.insertBefore(campaignMissionCard()'),'tarjeta visible antes de estadísticas secundarias');
ok(fit.includes("link.href='./misiones.html'"),'enlace interno local en la app');
ok(fit.includes("localStorage.getItem('bayona.mision7.v1')"),'progreso lee mismas casillas que campaña');
ok(fit.includes('filter(d=>Number.isInteger(d)&&d>=1&&d<=7)'),'solo días válidos cuentan');
ok(pack.includes("'index.html', 'misiones.html'"),'Capacitor empaqueta la página en APK');
for(const p of ['misiones.html','css/mission-campaign.css','js/mission-campaign.js']){
 ok(existsSync(join(root,p)),p+' existe');
 ok(sw.includes('"./'+p+'"'),p+' precacheado offline');
}
ok(sw.includes('bayona-shell-v58'),'PWA versionada para misiones offline');
ok(read('mobile/android/app/build.gradle').includes('versionCode 2'),'incrementada versión Android');
console.log('ANDROID_MISSIONS '+n+' comprobaciones OK');
