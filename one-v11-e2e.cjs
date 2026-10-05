'use strict';
const fs=require('node:fs');
const {chromium}=require('/home/sebastian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
 const base='http://127.0.0.1:8094/?nosw=1';
 const browser=await chromium.launch({
  headless:true,
  executablePath:'/opt/brave.com/brave/brave',
  args:['--no-sandbox','--disable-dev-shm-usage']
 });
 const checks=[],errors=[];
 const check=(ok,label)=>{checks.push({label,pass:!!ok});if(!ok)errors.push(label);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push('PAGE '+e.message));

  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#entry-go',{timeout:12000});
  await page.locator('#entry-go').click();
  await page.waitForSelector('#ob-fast',{timeout:9000});
  await page.locator('#ob-fast').click();
  await page.waitForFunction(()=>document.body.classList.contains('entered'),{timeout:9000});
  await page.waitForSelector('#one-context-switch',{timeout:9000});

  check(await page.locator('#one-context-switch .one-context-btn').count()===2,'selector Atleta/Coach montado');
  check(await page.locator('.one-edition').count()===1,'marca BAYONA ONE montada');
  check(await page.locator('#panel-nav [data-go=coachos]').count()===1,'Coach visible en rail oficial');

  await page.waitForTimeout(700);
  check(await page.locator('body').evaluate(el=>el.classList.contains('one-athlete-mode')),'arranque en contexto atleta');
  const athleteDims=await page.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
  check(athleteDims.sw<=athleteDims.vw+1,'Atleta desktop sin overflow horizontal');
  await page.screenshot({path:'docs-one-v11/one-athlete-desktop.png',fullPage:false});

  await page.locator('[data-one-context=coach]').click();
  await page.waitForSelector('.one-coach-hero',{timeout:9000});
  check(await page.locator('body').evaluate(el=>el.classList.contains('one-coach-mode')),'modo Coach activa contexto oscuro');
  check(await page.locator('.one-metrics .one-metric').count()===4,'Coach Studio muestra cuatro KPI');
  check(await page.locator('.one-client-row').count()===4,'cartera muestra ficha local + tres demos');
  check(await page.locator('.one-phase').count()>=4,'timeline de macrociclo visible');
  check((await page.locator('.one-coach-hero').innerText()).includes('Dirige la próxima adaptación'),'hero editorial Coach Studio');
  const coachDims=await page.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
  check(coachDims.sw<=coachDims.vw+1,'Coach desktop sin overflow horizontal');
  await page.screenshot({path:'docs-one-v11/one-coach-desktop.png',fullPage:false});

  await page.locator('.one-client-row .one-row-open').first().click();
  await page.waitForSelector('.one-profile-head',{timeout:7000});
  check(await page.locator('.one-profile-kpis .one-data-tile').count()===4,'ficha coach con cuatro KPI');
  check(await page.locator('.one-week-editor').count()===1,'ficha local conserva editor semanal');
  check(await page.locator('.one-day-editor').count()===7,'microciclo semanal tiene siete días');
  await page.screenshot({path:'docs-one-v11/one-coach-client-desktop.png',fullPage:false});

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  const coachMobile=await page.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
  check(coachMobile.sw<=coachMobile.vw+1,'Coach móvil sin overflow horizontal');
  check(await page.locator('.one-profile-head').isVisible(),'ficha Coach visible en móvil');
  await page.screenshot({path:'docs-one-v11/one-coach-mobile.png',fullPage:false});

  await page.locator('[data-one-context=athlete]').click();
  await page.waitForTimeout(500);
  check(await page.locator('body').evaluate(el=>el.classList.contains('one-athlete-mode')),'retorno a Atleta desde switch');
  const athleteMobile=await page.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
  check(athleteMobile.sw<=athleteMobile.vw+1,'Atleta móvil sin overflow horizontal');
  await page.screenshot({path:'docs-one-v11/one-athlete-mobile.png',fullPage:false});

  check(errors.filter(x=>x.startsWith('PAGE ')).length===0,'sin errores JavaScript de página');
 }catch(e){
  errors.push('EXCEPTION '+e.stack.split('\n').slice(0,4).join(' | '));
 }finally{
  await browser.close();
 }
 const report={at:new Date().toISOString(),passed:checks.filter(x=>x.pass).length,total:checks.length,checks,errors};
 fs.writeFileSync('ONE_V11_QA_REPORT.json',JSON.stringify(report,null,2));
 console.log('ONE_V11_E2E',JSON.stringify({passed:report.passed,total:report.total,errors}));
 if(errors.length||report.passed!==report.total)process.exitCode=1;
})().catch(e=>{console.error('FATAL',e.message);process.exitCode=1});
