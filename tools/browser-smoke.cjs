const { chromium } = require(process.env.BAYONA_PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
require('node:fs').mkdirSync('work', {recursive:true});
(async()=>{
 const browser = await chromium.launch({headless:true,executablePath:process.env.BAYONA_BROWSER_BIN || undefined,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Madrid'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BAYONA_APP_URL || 'http://127.0.0.1:8086');await page.getByRole('button',{name:'ENTRAR',exact:true}).click();
 await page.locator('#ob-name').fill('Aurora');await page.locator('.ob-avatar-options summary').click();await page.locator('[data-skin="2"]').click();assert.equal(await page.locator('#ob-name').inputValue(),'Aurora');
 await page.locator('#ob-next').click();await page.getByRole('button',{name:'SALUD',exact:true}).click();await page.getByRole('button',{name:'EMPIEZO AHORA',exact:true}).click();await page.locator('#ob-next').click();
 await page.getByRole('button',{name:'3 DÍAS/SEMANA',exact:true}).click();await page.getByRole('button',{name:'SIN EQUIPAMIENTO',exact:true}).click();await page.getByRole('button',{name:'15',exact:true}).click();await page.locator('#ob-next').click();await page.locator('#ob-done').click();await page.waitForTimeout(1000);
 await page.getByRole('button',{name:'PAUSAR',exact:true}).click();await page.locator('[data-go="profile"]').click();await page.locator('#sessionMinutes').selectOption('30');await page.getByRole('button',{name:'GUARDAR MI PERFIL',exact:true}).click();await page.getByText('Perfil guardado. Tu calendario ya está actualizado.').waitFor();
 console.log('Profile passed');await page.screenshot({path:'work/profile-mobile.png'});
 await page.locator('[data-go="rhythm"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('bayona.cycle.v1')),null);
 await page.locator('#cycle-start').fill('2026-09-20');await page.locator('[name="regular"]').check();await page.locator('[name="consent"]').check();await page.getByRole('button',{name:'ACTIVAR DIARIO',exact:true}).click();
 await page.locator('#pain').selectOption('leve');await page.locator('#energy').selectOption('media');await page.locator('#mode').selectOption('suave');await page.getByRole('button',{name:'GUARDAR MI DÍA',exact:true}).click();
 assert.equal(await page.locator('#mode').inputValue(),'suave');await page.waitForTimeout(3100);await page.locator('#drawer-body').evaluate(n=>n.scrollTop=0);await page.screenshot({path:'work/rhythm-mobile.png'});
 await page.reload();await page.locator('#entry-go').click();await page.waitForTimeout(700);if(await page.getByRole('button',{name:'PAUSAR',exact:true}).isVisible())await page.getByRole('button',{name:'PAUSAR',exact:true}).click();await page.waitForTimeout(500);await page.locator('[data-go="rhythm"]').click();assert.equal(await page.locator('#mode').inputValue(),'suave');
 for(const width of [360,390,768,1440]) { await page.setViewportSize({width,height:900});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,'viewport '+width); }
 await page.screenshot({path:'work/rhythm-desktop.png'});
 await page.locator('[data-go="progress"]').click();await page.locator('#measure-pesoKg').fill('65.5');await page.getByRole('button',{name:'GUARDAR MEDICIÓN DE HOY',exact:true}).click();assert.equal(await page.locator('#measure-pesoKg').inputValue(),'65.5');
 // All sections render with real application state.
 for (const section of ['hoy','training','nutrition','trabajo','recovery','mind','plan','progress','core','more','profile','rhythm']) {await page.locator(`[data-go="${section}"]`).click();await page.waitForTimeout(80);if(section==='training' && await page.getByRole('button',{name:'PAUSAR',exact:true}).isVisible())await page.getByRole('button',{name:'PAUSAR',exact:true}).click();}
 await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise((_,r)=>setTimeout(()=>r(new Error("SW install timed out")),15000))]);});await page.waitForTimeout(500);
 console.log('SW:',await page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL));
 await context.setOffline(true);await page.reload();await page.locator('#entry-go').click();await page.waitForTimeout(700);if(await page.getByRole('button',{name:'PAUSAR',exact:true}).isVisible())await page.getByRole('button',{name:'PAUSAR',exact:true}).click();await page.waitForTimeout(500);await page.locator('[data-go="rhythm"]').click();assert.equal(await page.locator('#mode').inputValue(),'suave');assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.personal-hero')).borderBottomStyle),'solid','personal styles available offline');
 await page.getByText('DESACTIVAR Y BORRAR EL DIARIO',{exact:true}).click();await page.getByRole('button',{name:'CONFIRMAR BORRADO DEL DIARIO',exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('bayona.cycle.v1')),null);
 assert.deepEqual(errors,[]);console.log('PASS: guided onboarding, profile edit, optional consent, daily diary, reload, 4 viewport widths, navigation, offline reload, deletion, no JS errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
