import {mkdirSync} from 'node:fs';
export async function runExperience(browser,base,check,errors){
  mkdirSync('artifacts/e2e',{recursive:true});
  for(const width of [320,390,1440]){
    const page=await browser.newPage({viewport:{width,height:width===1440?900:820},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push('EXPERIENCE '+e.message));
    try{
      await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
      await page.locator('#luxe-nav-entrar').click({timeout:13000});
      await page.locator('#entry').waitFor({state:'visible',timeout:15000});
      check(await page.locator('#entry-go .e-role-copy strong').innerText()==='Soy cliente',
        'Acceso '+width+': espacio cliente diferenciado');
      check(await page.locator('#entry-coach .e-role-copy strong').innerText()==='Soy entrenador',
        'Acceso '+width+': espacio Coach diferenciado');
      check(await page.locator('.e-journey-visual').count()===1,
        'Acceso '+width+': presenta recorrido de cliente ilustrativo');
      check((await page.locator('.e-role-note').innerText()).includes('requiere una cuenta'),
        'Acceso '+width+': no confunde selector con autorización Coach');
      for(const theme of ['light','dark']){
        await page.locator('[data-entry-theme="'+theme+'"]').click();
        const test=await page.evaluate(()=>{
          const e=document.querySelector('#entry');
          const coach=document.querySelector('#entry-coach').getBoundingClientRect();
          const foot=document.querySelector('.e-entry-foot').getBoundingClientRect();
          const btn=document.querySelector('#entry .e-theme-switch button[aria-pressed="true"]');
          const box=getComputedStyle(document.querySelector('.e-role-card.affiliate'));
          return{mode:document.documentElement.dataset.surfaceTheme,roleTheme:btn?.dataset.entryTheme,
            cardSurface:box.backgroundColor,clientButtonHeight:document.querySelector('#entry-go').getBoundingClientRect().height,
            footerClear:coach.bottom<=foot.top+1,horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
            scrollable:e.scrollHeight>=e.clientHeight};
        });
        check(test.mode===theme&&test.roleTheme===theme,
          'Acceso '+width+'/'+theme+': selector de apariencia sincronizado');
        check(test.clientButtonHeight>=44&&test.footerClear,
          'Acceso '+width+'/'+theme+': tarjetas táctiles sin pie superpuesto');
        check(test.horizontalOverflow<=1&&test.scrollable,
          'Acceso '+width+'/'+theme+': sin overflow horizontal, contenido navegable');
        await page.screenshot({path:'artifacts/e2e/access-'+width+'-'+theme+'.png',fullPage:false});
      }
      await page.waitForFunction(()=>Boolean(window.BAYONA?.world),null,{timeout:20000});
      await page.locator('#entry-go').click();
      await page.locator('#ob-name').waitFor({state:'visible',timeout:15000});
      const mode=await page.locator('html').getAttribute('data-surface-theme');
      check(mode==='dark','Cliente '+width+': preferencia noche se mantiene al acceder');
      check(await page.locator('#global-theme-switch').count()===1,
        'Cliente '+width+': control Día/Noche disponible también dentro');
      // Durante la configuración inicial hay un diálogo modal que debe
      // bloquear clics sobre el HUD; comprobamos el handler sin eludirlo.
      await page.locator('#global-theme-switch').evaluate(button=>button.click());
      check((await page.locator('html').getAttribute('data-surface-theme'))==='light',
        'Cliente '+width+': control global alterna modo claro');
    } finally{await page.close();}
  }
}
