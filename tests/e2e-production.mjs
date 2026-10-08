import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const base=process.env.BAYONA_E2E_URL||"http://127.0.0.1:8094/?nosw=1";
const coachUrl=new URL(base);coachUrl.searchParams.set("source","pwa");
mkdirSync("artifacts/e2e",{recursive:true});

const checks=[];
const errors=[];
const check=(cond,label)=>{
  checks.push({label,pass:Boolean(cond)});
  if(!cond)errors.push(label);
};

async function openSection(page,section){
  await page.evaluate(async(section)=>{
    const m=await import("./js/ui/shared.js");
    m.openSection(section);
  },section);
  await page.waitForTimeout(250);
  check((await page.locator("#drawer").getAttribute("data-section"))===section,`abre sección ${section}`);
}

async function noOverflow(page,label){
  const d=await page.evaluate(()=>({vw:innerWidth,sw:document.documentElement.scrollWidth}));
  check(d.sw<=d.vw+1,`${label}: sin overflow horizontal`);
}

const browser=await chromium.launch({headless:true,...(process.env.BAYONA_E2E_CHROME?{executablePath:process.env.BAYONA_E2E_CHROME,args:["--no-sandbox"]}:{})});
try{
  // ---------- affiliate ----------
  const ctx=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:"reduce"});
  const page=await ctx.newPage();
  page.on("pageerror",(e)=>errors.push("PAGE "+e.name));
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForSelector("#luxe-nav-entrar",{state:"visible",timeout:10000});
  check(await page.locator("#luxe-landing").isVisible(),"landing pública visible");
  await noOverflow(page,"Landing desktop");
  await page.screenshot({path:"artifacts/e2e/landing-desktop.png",fullPage:false});
  await page.locator("#luxe-nav-entrar").click();
  await page.waitForSelector("#entry-go",{state:"visible",timeout:20000});
  check(await page.locator("#entry-go").isVisible(),"puerta afiliado visible");
  check(await page.locator("#entry-coach").isVisible(),"puerta coach visible");

  await page.locator("#entry-go").click();
  await page.waitForSelector("#ob-name",{state:"visible",timeout:15000});
  await page.locator("#ob-name").fill("Persona de prueba");
  for(let step=0;step<8;step++){
    await page.locator("#ob-next").click();
  }
  check(await page.locator("#ob-done").isVisible(),"onboarding de nueve etapas completo");
  await page.locator("#ob-done").click();
  await page.waitForFunction(()=>!document.querySelector("#ob-layer"),null,{timeout:15000});
  await page.locator('[data-tour="skip"]').click({timeout:7000}).catch(()=>{});
  await page.locator('[data-checkin-action="skip"]').click({timeout:1500}).catch(()=>{});

  await openSection(page,"social");
  check(await page.locator(".community-hero").count()===1,"Comunidad real renderiza");
  check(await page.locator(".community-store-grid").count()===1,"tienda FitCoin renderiza");
  await noOverflow(page,"Comunidad desktop");

  await openSection(page,"more");
  check(await page.locator(".prod-billing").count()===1,"controles billing visibles en Más");
  check(await page.locator(".prod-backup").count()===1,"controles backup visibles en Más");
  check(await page.locator(".more-tools .opt").count()>=10,"herramientas de Más tienen botones dedicados");
  await noOverflow(page,"Más desktop");

  // IDs duplicados suelen romper labels/foco/modales.
  const duplicateIds=await page.evaluate(()=>{
    const ids=[...document.querySelectorAll("[id]")].map((n)=>n.id).filter(Boolean);
    return ids.filter((id,i)=>ids.indexOf(id)!==i);
  });
  check(duplicateIds.length===0,"sin IDs duplicados en DOM activo");

  // Navegación teclado: el foco debe salir del body y caer en un control.
  await page.keyboard.press("Tab");
  const focus=await page.evaluate(()=>({
    tag:document.activeElement?.tagName||"",
    body:document.activeElement===document.body,
    visible:document.activeElement?getComputedStyle(document.activeElement).visibility!=="hidden":false,
  }));
  check(!focus.body&&focus.visible,"teclado obtiene foco visible");

  await page.setViewportSize({width:390,height:844});
  await openSection(page,"social");
  await noOverflow(page,"Comunidad móvil");
  await openSection(page,"more");
  await noOverflow(page,"Más móvil");
  const touch=await page.locator(".more-tools .opt").first().evaluate((b)=>({
    height:b.getBoundingClientRect().height,
    background:getComputedStyle(b).backgroundColor,
    color:getComputedStyle(b).color,
  }));
  check(touch.height>=44,"herramientas móviles tienen zona táctil de al menos 44 px");
  check(touch.background!=="rgba(0, 0, 0, 0)","herramientas móviles no son botones transparentes ilegibles");
  await page.screenshot({path:"artifacts/e2e/mobile-more.png",fullPage:false});
  await page.evaluate(async()=>{const {applyTheme}=await import("./js/theme.js");applyTheme("light");});
  check(await page.locator("html").getAttribute("data-surface-theme")==="light","modo día se activa y persiste");
  const lightContrast=await page.locator("#drawer-body .card .kv .v").first().evaluate((node)=>{
    const fg=getComputedStyle(node).color;
    const bg=getComputedStyle(node.closest(".card")).backgroundColor;
    const lum=(css)=>{
      const rgb=(css.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      const linear=rgb.map((n)=>{const x=n/255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;});
      return linear[0]*0.2126+linear[1]*0.7152+linear[2]*0.0722;
    };
    const a=lum(fg),b=lum(bg);
    return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  });
  check(lightContrast>=4.5,"modo día: texto del perfil alcanza contraste WCAG AA");
  await noOverflow(page,"Más móvil · modo día");
  await page.screenshot({path:"artifacts/e2e/mobile-more-light.png",fullPage:false});
  await page.evaluate(async()=>{const {applyTheme}=await import("./js/theme.js");applyTheme("dark");});
  check(await page.locator("html").getAttribute("data-surface-theme")==="dark","modo noche se restaura");
  await ctx.close();

  // ---------- coach ----------
  const coach=await browser.newContext({viewport:{width:1440,height:960}});
  const cp=await coach.newPage();
  cp.on("pageerror",(e)=>errors.push("COACH "+e.name));
  await cp.goto(coachUrl.toString(),{waitUntil:"domcontentloaded",timeout:30000});
  await cp.waitForSelector("#entry-coach",{state:"visible",timeout:10000});
  // PWA shows the role buttons before the lazy product finishes booting.
  // Wait for the real application handler, not only for static HTML.
  await cp.waitForFunction(()=>Boolean(window.BAYONA?.world),null,{timeout:20000});
  await cp.locator("#entry-coach").click();
  await cp.waitForFunction(()=>document.body.dataset.entryRole==="coach",null,{timeout:10000});
  await cp.waitForFunction(()=>document.querySelector("#drawer")?.dataset.section==="coachos",null,{timeout:10000});
  check(await cp.evaluate(()=>document.body.dataset.entryRole)==="coach","rol Coach queda explícito");
  check((await cp.locator("#drawer").getAttribute("data-section"))==="coachos","Coach aterriza en Coach OS");
  check(await cp.locator(".one-coach-hero").count()===1,"Coach OS renderiza");
  await noOverflow(cp,"Coach desktop");
  await cp.screenshot({path:"artifacts/e2e/coach.png",fullPage:false});
  await coach.close();

  check(errors.filter((x)=>x.startsWith("PAGE ")||x.startsWith("COACH ")).length===0,"sin pageerror en recorridos");
} catch(e){
  errors.push("EXCEPTION "+String(e?.message||e));
} finally {
  await browser.close();
}

const report={at:new Date().toISOString(),passed:checks.filter((x)=>x.pass).length,total:checks.length,checks,errors};
writeFileSync("artifacts/e2e/report.json",JSON.stringify(report,null,2));
console.log("PRODUCTION_E2E",JSON.stringify({passed:report.passed,total:report.total,errors}));
if(errors.length||report.passed!==report.total)process.exit(1);
