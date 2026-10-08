// Regression: nunca presentar «Soy cliente / Soy entrenador» antes de
// que el arranque decida si se muestra marketing o el acceso a la app.
// Simula una conexión lenta reteniendo deliberadamente el módulo bootstrap.
export async function runFirstPaint(browser,base,check,errors){
  const paths=[["public",null],["installed","pwa"]];
  for(const [name,source] of paths){
    const ctx=await browser.newContext({viewport:{width:390,height:844},reducedMotion:"reduce"});
    const page=await ctx.newPage();
    page.on("pageerror",e=>errors.push("FIRSTPAINT "+name+" "+e.message));
    let delayed=0;
    await page.route("**/js/ui/landing-boot.js",async route=>{
      delayed++;
      await new Promise(resolve=>setTimeout(resolve,1750));
      await route.continue();
    });
    try{
      const url=new URL(base);
      url.searchParams.set("nosw","1");
      if(source)url.searchParams.set("source",source);
      await page.goto(url.toString(),{waitUntil:"commit",timeout:30000});
      await page.waitForSelector("#entry",{state:"attached",timeout:15000});
      await page.waitForTimeout(400);
      const first=await page.evaluate(()=>{
        const visible=q=>{
          const e=document.querySelector(q);if(!e)return false;
          const r=e.getBoundingClientRect(),s=getComputedStyle(e);
          return r.width>0&&r.height>0&&s.display!=="none"&&s.visibility!=="hidden";
        };
        return {pending:document.body.classList.contains("bayona-boot-pending"),
          entry:visible("#entry"),hud:visible("#hud"),drawer:visible("#drawer"),
          brand:visible("#bayona-initial-load"),nav:visible("#luxe-nav")};
      });
      check(delayed===1&&first.pending,"Firstpaint "+name+": módulo retrasado y estado pending activo");
      check(!first.entry&&!first.hud&&!first.drawer,
        "Firstpaint "+name+": ninguna pantalla equivocada se muestra al cargar");
      check(first.brand&&!first.nav,"Firstpaint "+name+": solo indicador BAYONA, sin segunda portada");
      await page.waitForFunction(()=>!document.body.classList.contains("bayona-boot-pending"),null,{timeout:45000});
      const ready=await page.evaluate(()=>{
        const visible=q=>{const e=document.querySelector(q);if(!e)return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=="none"};
        return{loader:!!document.getElementById("bayona-initial-load"),
          landing:visible("#luxe-landing"),entry:visible("#entry"),
          nav:visible("#luxe-nav")};
      });
      check(!ready.loader,"Firstpaint "+name+": indicador desaparece cuando el destino está listo");
      if(source)check(ready.entry&&!ready.landing,
        "Firstpaint instalado: acceso visible después de inicializar app, sin marketing");
      else check(ready.landing&&ready.nav&&!ready.entry,
        "Firstpaint público: landing completa sin destello del selector");
    }finally{await ctx.close();}
  }
}
