'use strict';
const fs=require('node:fs');
const {chromium}=require('/home/sebastian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
 const base='http://127.0.0.1:8094/?nosw=1';
 const browser=await chromium.launch({headless:true,executablePath:'/opt/brave.com/brave/brave',args:['--no-sandbox','--disable-dev-shm-usage']});
 const checks=[],errors=[];
 const check=(ok,label)=>{checks.push({label,pass:!!ok});if(!ok)errors.push(label);};
 try{
  // --- COACH: no onboarding, direct Studio ---
  const coach=await browser.newContext({viewport:{width:1440,height:960}});
  const cp=await coach.newPage();
  cp.on('pageerror',e=>errors.push('COACH JS '+e.message));
  await cp.goto(base,{waitUntil:'domcontentloaded'});
  await cp.waitForSelector('#entry-coach',{timeout:10000});
  check(await cp.locator('#entry-go').isVisible(),'puerta muestra acceso afiliado');
  check(await cp.locator('#entry-coach').isVisible(),'puerta muestra acceso coach');
  check(await cp.locator('#entry .e-role-media video').count()===1,'puerta afiliado incorpora video');
  await cp.locator('#entry-coach').click();
  await cp.waitForTimeout(900);
  check(await cp.evaluate(()=>document.body.dataset.entryRole)==='coach','rol coach queda explícito');
  check(await cp.locator('#ob-layer').count()===0,'coach no recibe onboarding de atleta');
  check(await cp.locator('#drawer').getAttribute('data-section')==='coachos','coach aterriza en Studio');
  check(await cp.locator('.one-coach-hero').count()===1,'Coach Studio renderiza command center');
  check(await cp.locator('#panel-nav .one-role-coach-nav').count()===4,'coach tiene navegación profesional propia');
  const coachVisible=await cp.locator('#panel-nav .one-role-coach-nav').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').length);
  check(coachVisible===4,'las cuatro rutas coach son visibles');
  const athleteVisibleInCoach=await cp.locator('#panel-nav .rail-btn:not(.one-role-coach-nav)').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').length);
  check(athleteVisibleInCoach===0,'navegación atleta queda oculta en modo coach');
  await cp.screenshot({path:'docs-v12/v12-entry-coach.png',fullPage:false});
  await coach.close();

  // --- AFILIADO: onboarding + home multimedia ---
  const affiliate=await browser.newContext({viewport:{width:1440,height:960}});
  const ap=await affiliate.newPage();
  ap.on('pageerror',e=>errors.push('AFFILIATE JS '+e.message));
  await ap.goto(base,{waitUntil:'domcontentloaded'});
  await ap.waitForSelector('#entry-go',{timeout:10000});
  await ap.locator('#entry-go').click();
  await ap.waitForSelector('#ob-fast',{timeout:10000});
  check(await ap.evaluate(()=>document.body.dataset.entryRole)==='affiliate','rol afiliado queda explícito');
  check(await ap.locator('#ob-layer').count()===1,'afiliado nuevo recibe onboarding');
  await ap.locator('#ob-fast').click();
  await ap.waitForTimeout(1200);
  await ap.evaluate(async()=>{const m=await import('./js/ui/shared.js');m.openSection('hoy');});
  await ap.waitForTimeout(650);
  check(await ap.locator('#drawer').getAttribute('data-section')==='hoy','afiliado puede abrir su home');
  check(await ap.locator('.affiliate-session-v12').count()===1,'home tiene hero visual de sesión');
  check(await ap.locator('.affiliate-session-v12 video').count()===1,'hero usa video real del ejercicio');
  check(await ap.locator('.affiliate-guide-v12').count()===1,'personaje funciona como guía contextual');
  check(await ap.locator('.affiliate-media-grid-v12 .affiliate-ex-card-v12').count()>=2,'home tiene galería visual de ejercicios');
  const visualCards=await ap.locator('.affiliate-ex-card-v12 img').count();
  check(visualCards>=1,'ejercicios muestran thumbnails reales');
  const firstVideoCard=ap.locator('.affiliate-ex-card-v12').filter({hasText:'VER VIDEO'}).first();
  check(await firstVideoCard.count()===1,'hay ejercicio con acción VER VIDEO');
  await firstVideoCard.click();
  await ap.waitForTimeout(250);
  check(await firstVideoCard.locator('video').count()===1,'video preview se reproduce dentro de la tarjeta');
  const athleteCoachNavVisible=await ap.locator('#panel-nav .one-role-coach-nav').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').length);
  check(athleteCoachNavVisible===0,'afiliado no ve navegación coach');
  const centerVisible=await ap.locator('#panel-nav > [data-go="centro"]:not(.one-role-coach-nav)').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').length);
  check(centerVisible===0,'afiliado no ve Centro administrativo');
  await ap.screenshot({path:'docs-v12/v12-affiliate-home.png',fullPage:false});

  // switch role inside same app
  await ap.locator('[data-one-context=coach]').click();
  await ap.waitForTimeout(550);
  check(await ap.locator('#drawer').getAttribute('data-section')==='coachos','selector superior cambia de afiliado a coach');
  await ap.locator('[data-one-context=athlete]').click();
  await ap.waitForTimeout(450);
  check(await ap.locator('#drawer').getAttribute('data-section')==='hoy','selector superior vuelve a afiliado');

  // mobile
  await ap.setViewportSize({width:390,height:844});
  await ap.evaluate(async()=>{const m=await import('./js/ui/shared.js');m.openSection('hoy');});
  await ap.waitForTimeout(450);
  const dims=await ap.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
  check(dims.sw<=dims.vw+1,'home afiliado no desborda a 390 px');
  check(await ap.locator('.affiliate-media-grid-v12').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===1),'galería móvil colapsa a una columna');
  await ap.screenshot({path:'docs-v12/v12-affiliate-mobile.png',fullPage:false});
  await affiliate.close();
 }catch(e){
  errors.push('EXCEPTION '+(e.stack||e.message).split('\n').slice(0,5).join(' | '));
 }finally{
  await browser.close();
 }
 const report={at:new Date().toISOString(),passed:checks.filter(x=>x.pass).length,total:checks.length,checks,errors};
 fs.writeFileSync('ONE_V12_ROLE_MEDIA_QA_REPORT.json',JSON.stringify(report,null,2));
 console.log('ONE_V12_ROLE_MEDIA',JSON.stringify({passed:report.passed,total:report.total,errors}));
 if(errors.length||report.passed!==report.total)process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=1});
