'use strict';
const fs=require('node:fs');
const {chromium}=require('/home/sebastian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
 const base='http://127.0.0.1:8094/?nosw=1';
 const browser=await chromium.launch({headless:true,executablePath:'/opt/brave.com/brave/brave',args:['--no-sandbox','--disable-dev-shm-usage']});
 const checks=[],errors=[];
 const check=(ok,label)=>{checks.push({label,pass:!!ok});if(!ok)errors.push(label);};
 try{
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push('PAGE '+e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.locator('#entry-go').click();
  await page.waitForSelector('#ob-fast',{timeout:9000});
  await page.locator('#ob-fast').click();
  await page.waitForFunction(()=>document.body.classList.contains('entered'),{timeout:9000});
  await page.waitForSelector('#one-context-switch',{timeout:9000});
  await page.waitForTimeout(3800);

  async function open(section){
    await page.evaluate(async(section)=>{
      const m=await import('./js/ui/shared.js');
      m.openSection(section);
    },section);
    await page.waitForTimeout(450);
    const state=await page.locator('#drawer').evaluate(d=>({section:d.dataset.section,open:d.classList.contains('open')}));
    if(state.section!==section || !state.open) throw new Error('drawer no abrió '+section+' '+JSON.stringify(state));
  }
  async function noOverflow(label){
    const d=await page.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
    check(d.sw<=d.vw+1,label+' sin overflow horizontal');
  }

  await open('nutrition');
  check(await page.locator('#drawer[data-section=nutrition] .card.shine').count()>=1,'Nutrición conserva hero funcional');
  check(await page.locator('#drawer[data-section=nutrition] .macro').count()>=5,'Nutrición muestra macros reales');
  check(await page.locator('#drawer[data-section=nutrition] .nut-receta').count()>=1,'Nutrición conserva recetas');
  await noOverflow('Nutrición desktop');
  await page.screenshot({path:'docs-one-v11/one-nutrition-desktop.png',fullPage:false});

  await open('progress');
  check(await page.locator('#drawer[data-section=progress] .stat-cell').count()>=6,'Progreso muestra métricas');
  check(await page.locator('#drawer[data-section=progress] .card').count()>=1,'Progreso conserva analítica');
  await noOverflow('Progreso desktop');
  await page.screenshot({path:'docs-one-v11/one-progress-desktop.png',fullPage:false});

  await open('plan');
  check(await page.locator('#drawer[data-section=plan] .spark').count()===1,'Plan conserva macrociclo visual');
  check(await page.locator('#drawer[data-section=plan] .plan-detail').count()===1,'Plan conserva microciclo');
  await noOverflow('Plan desktop');
  await page.screenshot({path:'docs-one-v11/one-plan-desktop.png',fullPage:false});

  await open('wellbeing');
  check(await page.locator('#drawer[data-section=wellbeing] .fit-route').count()>=5,'Bienestar conserva rutas');
  await noOverflow('Bienestar desktop');
  await page.screenshot({path:'docs-one-v11/one-wellbeing-desktop.png',fullPage:false});

  await page.setViewportSize({width:390,height:844});
  await open('nutrition');
  await noOverflow('Nutrición móvil');
  check(await page.locator('#drawer[data-section=nutrition] .nut-recetas').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length===1),'Recetas colapsan a una columna');
  await page.screenshot({path:'docs-one-v11/one-nutrition-mobile.png',fullPage:false});

  await open('progress');
  await noOverflow('Progreso móvil');
  await page.screenshot({path:'docs-one-v11/one-progress-mobile.png',fullPage:false});

  await open('plan');
  await noOverflow('Plan móvil');
  await page.screenshot({path:'docs-one-v11/one-plan-mobile.png',fullPage:false});

  await open('wellbeing');
  await noOverflow('Bienestar móvil');
  await page.screenshot({path:'docs-one-v11/one-wellbeing-mobile.png',fullPage:false});

  check(errors.filter(x=>x.startsWith('PAGE ')).length===0,'sin errores JavaScript en superficies');
 }catch(e){
  errors.push('EXCEPTION '+e.stack.split('\n').slice(0,4).join(' | '));
 }finally{
  await browser.close();
 }
 const report={at:new Date().toISOString(),passed:checks.filter(x=>x.pass).length,total:checks.length,checks,errors};
 fs.writeFileSync('ONE_V11_SURFACES_QA_REPORT.json',JSON.stringify(report,null,2));
 console.log('ONE_V11_SURFACES',JSON.stringify({passed:report.passed,total:report.total,errors}));
 if(errors.length||report.passed!==report.total)process.exitCode=1;
})().catch(e=>{console.error('FATAL',e.stack);process.exitCode=1});
