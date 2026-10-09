import {chromium} from "playwright";
import {mkdirSync,writeFileSync} from "node:fs";
const chromiumPath=process.env.BAYONA_E2E_CHROME||undefined;
const base=process.env.BAYONA_CAMPAIGN_URL||"http://127.0.0.1:8130";
const browser=await chromium.launch({headless:true,executablePath:chromiumPath,args:["--no-sandbox"]});
mkdirSync("artifacts/mission-campaign",{recursive:true});
let pass=0;const results=[];
const ok=(test,label)=>{if(!test)throw Error("FAIL "+label);pass++;results.push(label);console.log("PASS "+label)};
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width<=390?780:900},reducedMotion:"reduce"});
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const r=await page.goto(base+"/misiones.html",{waitUntil:"domcontentloaded"});
  ok(r?.status()===200,"Campaña "+width+": responde 200");
  ok(await page.locator("[data-mission-day]").count()===7,"Campaña "+width+": siete misiones");
  const layout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    checked:document.querySelectorAll('[data-mission-day]:checked').length,
    mobile:getComputedStyle(document.querySelector(".cards")).gridTemplateColumns,
    href:document.querySelector('[data-plan="raiz"]').href,
  }));
  ok(layout.overflow<=1,"Campaña "+width+": sin desbordamiento horizontal");
  ok(layout.checked===0,"Campaña "+width+": no inventa progreso");
  ok(layout.href.startsWith("https://wa.me/34641698332?text="),"Campaña "+width+": contacto comercial real");
  ok(errors.length===0,"Campaña "+width+": sin errores JS");
  if(width===390){
   await page.locator('[data-mission-day="1"]').check();
   await page.locator('[data-mission-day="3"]').check();
   ok((await page.locator("#progress-count").innerText()).includes("2 de 7"),"Progreso exacto de dos misiones");
   await page.reload();
   ok(await page.locator('[data-mission-day="1"]').isChecked() && await page.locator('[data-mission-day="3"]').isChecked(),"Persistencia en navegador tras recarga");
   ok((await page.locator("#progress-percent").innerText()).trim()==="29 %","Porcentaje real 2/7");
   await page.screenshot({path:"artifacts/mission-campaign/mobile-390.png",fullPage:true});
  }else if(width===1440){
   await page.screenshot({path:"artifacts/mission-campaign/desktop-1440.png",fullPage:true});
  }
  await ctx.close();
 }
 // Visibilidad del enlace comercial desde la landing actual.
 const ctx=await browser.newContext();
 const home=await ctx.newPage();
 await home.goto(base+"/?nosw=1",{waitUntil:"domcontentloaded"});
 await home.locator("#luxe-nav-entrar").waitFor({timeout:15000});
 ok(await home.locator("#luxe-nav a[href='/misiones.html']").count()===1,"Landing: misión visible en navegación");
 ok(await home.locator(".luxe-campaign-link").count()===4,"Landing: cuatro accesos a misión/asesoría según plan");
 await ctx.close();
 writeFileSync("artifacts/mission-campaign/audit.json",JSON.stringify({checks:pass,labels:results},null,2));
 console.log("MISIÓN COMERCIAL VALIDADA "+pass+"/"+pass);
}catch(e){console.error(e.stack||String(e));process.exitCode=1}
finally{await browser.close()}
