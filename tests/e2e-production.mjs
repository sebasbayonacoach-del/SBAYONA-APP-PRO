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
  // Sprint 16A · plan-preview is a real interactive simulation, never fake user data.
  await page.locator("#luxe-demo").scrollIntoViewIfNeeded();
  check(await page.locator("[data-demo-plan]").count()===4,"Demo: cuatro planes comparables");
  check(await page.locator("[data-demo-surface-btn]").count()===5,"Demo: cinco pantallas navegables");
  const planList=["free","raiz","performance","elite"];
  for(const demoPlan of planList){
    await page.locator('[data-demo-plan="'+demoPlan+'"]').click();
    check((await page.locator('[data-demo-plan="'+demoPlan+'"]').getAttribute("aria-pressed"))==="true",
      "Demo: selección accesible "+demoPlan);
    check(await page.locator('[data-demo-plan][aria-pressed="true"]').count()===1,
      "Demo: un solo plan activo "+demoPlan);
    check(await page.locator(".luxe-device-screen .luxe-demo-sample").count()===1,
      "Demo: vista se declara simulación "+demoPlan);
    await page.locator('[data-demo-surface-btn="training"]').click();
    check((await page.locator(".luxe-device-screen").getAttribute("data-demo-surface"))==="training",
      "Demo: cambia contenido entrenar "+demoPlan);
    const trainingLocked=await page.locator(".luxe-demo-focus .luxe-demo-lock").count();
    check(trainingLocked===(demoPlan==="free"?1:0),"Demo: acceso entrenar según membresía "+demoPlan);
  }
  await page.locator('[data-demo-plan="free"]').click();
  await page.locator('[data-demo-surface-btn="progress"]').click();
  check(await page.locator(".luxe-demo-focus .luxe-demo-lock").count()===1,
    "Demo: analítica de FREE se muestra bloqueada");
  await page.locator('[data-demo-plan="performance"]').click();
  check(await page.locator(".luxe-demo-focus .luxe-demo-ok").count()===1,
    "Demo: analítica incluida desde PERFORMANCE");
  await page.locator('[data-demo-surface-btn="home"]').click();
  const fakeCopy=await page.locator(".luxe-device-screen").innerText();
  check(!fakeCopy.includes("Datos reales")&&!fakeCopy.includes("MARTES · 6 OCT"),
    "Demo: sin fecha inventada ni afirmación de datos reales");
  check(await page.locator(".luxe-demo-disclaimer").count()===1,
    "Demo: advertencia de simulación visible");
  const plansTouch=await page.locator("[data-demo-plan]").first().evaluate(el=>el.getBoundingClientRect().height);
  check(plansTouch>=44,"Demo: pestañas de plan tienen 44px táctiles");
  await page.evaluate(async()=>{const{applyTheme}=await import("./js/theme.js");applyTheme("light");});
  check(await page.locator('[data-demo-theme="light"]').getAttribute("aria-pressed")==="true",
    "Demo: selector día se sincroniza con tema global");
  await page.evaluate(async()=>{const{applyTheme}=await import("./js/theme.js");applyTheme("dark");});
  check(await page.locator('[data-demo-theme="dark"]').getAttribute("aria-pressed")==="true",
    "Demo: selector noche se sincroniza con tema global");
  await noOverflow(page,"Demo interactiva desktop");
  await page.locator("#luxe-nav-entrar").click();
  await page.waitForSelector("#entry-go",{state:"visible",timeout:20000});
  check(await page.locator("#entry-go").isVisible(),"puerta afiliado visible");
  check(await page.locator("#entry-coach").isVisible(),"puerta coach visible");

  await page.locator("#entry-go").click();
  await page.waitForSelector("#ob-name",{state:"visible",timeout:15000});
  await page.locator("#ob-name").fill("Persona de prueba");
  for(let step=0;step<8;step++){
    if(step===1){
      await page.locator("#ob-custom-goal").fill("Preparar carrera de 10 km");
      await page.locator('[data-toggle="goals"]').nth(1).click();
      check(await page.locator("#ob-custom-goal").inputValue()==="Preparar carrera de 10 km",
        "Onboarding: objetivo propio sobrevive a selección múltiple");
      check(await page.locator('[data-toggle="goals"]').nth(1).evaluate(el=>el===document.activeElement),
        "Onboarding: foco permanece sobre la opción seleccionada");
    }
    if(step===2){
      await page.locator("#ob-custom-place").fill("Garaje con barra y discos");
      await page.locator('[data-toggle="trainingPlaces"]').nth(2).click();
      check(await page.locator("#ob-custom-place").inputValue()==="Garaje con barra y discos",
        "Onboarding: material escrito sobrevive a selección de entorno");
      check(await page.locator('[data-toggle="trainingPlaces"]').nth(2).evaluate(el=>el===document.activeElement),
        "Onboarding: foco permanece en el entorno elegido");
    }
    if(step===5){
      check(await page.locator("#ob-next").count()===0,
        "Screening: no se presupone NO ni permite avanzar sin responder");
      for(let i=0;i<7;i++) await page.locator('[data-safety][data-value="false"]').nth(i).click();
      check((await page.locator(".ob-safety-result").innerText()).includes("Sin alertas"),
        "Screening: siete respuestas explícitas sin alerta");
    }
    await page.locator("#ob-next").click();
  }
  check(await page.locator("#ob-done").isVisible(),"onboarding de nueve etapas completo");
  await page.locator("#ob-done").click();
  await page.waitForFunction(()=>!document.querySelector("#ob-layer"),null,{timeout:15000});
  const completedProfile=await page.evaluate(async()=>{
    const {S}=await import("./js/state.js");return S.data.profile;
  });
  check(completedProfile.customGoals?.includes("Preparar carrera de 10 km"),
    "Onboarding: objetivo propio persiste tras terminar");
  check(completedProfile.customPlaces?.includes("Garaje con barra y discos"),
    "Onboarding: entorno/material propio persiste tras terminar");
  check(completedProfile.healthScreening?.clearance==="cleared" ||
    (await page.evaluate(async()=>{const {S}=await import("./js/state.js");return S.data.healthScreening?.clearance}))==="cleared",
    "Onboarding: cribado completado sin presuponer respuestas");
  check(completedProfile.membershipPlan==="free",
    "Onboarding: ninguna preferencia concede membresía premium");
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
  // Sprint 15A: assertions against the rendered result, not CSS source text.
  const readable = async(selector) => page.locator(selector).first()
    .evaluate(node => parseFloat(getComputedStyle(node).fontSize))
    .catch(() => 0);
  const touchHeight = async(selector) => page.locator(selector).first()
    .evaluate(node => node.getBoundingClientRect().height)
    .catch(() => 0);

  await openSection(page,"hoy");
  check(await readable(".fit-hub-economy small") >= 11,"Inicio: KPI legible en móvil");
  check(await touchHeight(".fit-hub-spatial button") >= 44,"Inicio: navegación de foco táctil");
  await noOverflow(page,"Inicio premium móvil");

  await openSection(page,"training");
  check(await readable(".proplayer-gateway-stats small") >= 11,"Entrenar: biblioteca sin microtexto");
  check(await touchHeight(".cal-head .cal-nav button") >= 44,"Entrenar: calendario accesible al tacto");
  await noOverflow(page,"Entrenar premium móvil");
  check(await page.locator(".cal-grid button.cal-day").count()===7,"Entrenar: siete días son botones con teclado");
  const weekIsScrollable=await page.locator(".cal-grid").evaluate(el=>el.scrollWidth>el.clientWidth);
  check(weekIsScrollable,"Entrenar: días legibles con desplazamiento horizontal");
  const secondDay=page.locator(".cal-grid button.cal-day").nth(1);
  check((await secondDay.getAttribute("aria-label"))?.length>8,"Entrenar: día anuncia la fecha y la sesión");
  await secondDay.focus(); await page.keyboard.press("Enter");
  check(await secondDay.getAttribute("aria-pressed")==="true","Entrenar: Enter selecciona la sesión");
  check(await page.locator("#cal-detail .card").count()>0,"Entrenar: el detalle de la sesión funciona");
  const weekBefore=await page.locator(".cal-head .cal-title").innerText();
  const dayBefore=await page.locator(".cal-grid button.cal-day").first().getAttribute("aria-label");
  const prevWeek=page.locator(".cal-head .cal-nav button").first();
  const nextWeek=page.locator(".cal-head .cal-nav button").last();
  check(await prevWeek.isDisabled(),"Calendario: semana 1 no permite navegar a semana cero");
  await nextWeek.click();
  const weekAfter=await page.locator(".cal-head .cal-title").innerText();
  const dayAfter=await page.locator(".cal-grid button.cal-day").first().getAttribute("aria-label");
  check(weekAfter!==weekBefore&&dayAfter!==dayBefore,
    "Calendario: semana siguiente cambia número y fechas de los siete días");
  check(await page.locator('.cal-grid button.cal-day[aria-pressed="true"]').count()===1,
    "Calendario: la semana avanzada selecciona un único día visible");
  await page.locator(".cal-head .cal-nav button").first().click();
  check((await page.locator(".cal-head .cal-title").innerText())===weekBefore,
    "Calendario: semana anterior devuelve la fase de partida");
  await openSection(page,"library");
  await page.waitForSelector(".proplayer-card,.proplayer-load-error",{timeout:16000});
  check(await page.locator(".proplayer-card").count()>0,"PROPLAYER: biblioteca real disponible");
  check(await readable(".proplayer-metric-label")>=11,"PROPLAYER: estadísticas legibles");
  const exerciseName=(await page.locator(".proplayer-card h3").first().innerText()).trim();
  await page.locator("#proplayer-search").fill(exerciseName.split(" ")[0]);
  const filtered=Number((await page.locator(".proplayer-count").innerText()).split(" ")[0].replaceAll(".",""));
  check(filtered>0&&filtered<3141,"PROPLAYER: búsqueda filtra las fichas reales");
  await page.locator(".proplayer-filter-actions button.secondary").click();
  check((await page.locator(".proplayer-count").innerText()).startsWith("3.141"),
    "PROPLAYER: restablecer recupera el catálogo completo");
  await noOverflow(page,"PROPLAYER premium móvil");

  await openSection(page,"nutrition");
  check(await readable(".nut-now-grid small") >= 11,"Nutrición: estadísticas legibles");
  check(await touchHeight(".nut-feeling-btn") >= 44,"Nutrición: selección táctil");
  await noOverflow(page,"Nutrición premium móvil");

  await openSection(page,"recovery");
  check(await readable(".recovery-hero-grid small") >= 11,"Recuperación: KPIs legibles");

  await openSection(page,"progress");
  check(await readable(".progress-hero-stats small") >= 11,"Progreso: KPIs legibles");

  await openSection(page,"plan");
  check(await readable(".entitlement-kicker") >= 11,"Plan: precio y preview identificables");
  check(await touchHeight(".entitlement-compare") >= 44,"Plan: comparar membresías es táctil");

  await openSection(page,"social");
  check(await readable(".community-kpis small") >= 11,"Comunidad: indicadores legibles");
  check(await readable(".community-empty") >= 11,"Comunidad: estado vacío legible");

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
  await openSection(page,"training");
  const trainingInk=await page.locator(".today-recovery-card h4,.today-workout-card h4").first()
    .evaluate(el=>getComputedStyle(el).color).catch(()=>"");
  check(trainingInk==="rgb(23, 23, 23)","Entrenar día: título oscuro y legible");
  await openSection(page,"library");
  await page.waitForSelector(".proplayer-card,.proplayer-load-error",{timeout:16000});
  const libraryInk=await page.locator(".proplayer-metric-value").first().evaluate(el=>{
    const f=getComputedStyle(el).color,b=getComputedStyle(el.closest(".proplayer-metric")).backgroundColor;
    const luminance=color=>{
      const rgb=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(n=>{
        const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
      });
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    const a=luminance(f),c=luminance(b);return (Math.max(a,c)+.05)/(Math.min(a,c)+.05);
  });
  check(libraryInk>=4.5,"PROPLAYER día: cifras y tarjetas cumplen WCAG AA");
  const searchBg=await page.locator("#proplayer-search").evaluate(el=>getComputedStyle(el).backgroundColor);
  check(searchBg==="rgb(255, 250, 244)","PROPLAYER día: buscador claro y coherente");
  await noOverflow(page,"PROPLAYER móvil · modo día");
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
  const desktopCoachAction = await cp.locator(".one-coach-hero .one-action").first()
    .evaluate(el=>el.getBoundingClientRect().height).catch(()=>0);
  check(desktopCoachAction>=44,"Coach desktop: botones de estudio con altura táctil");
  await cp.screenshot({path:"artifacts/e2e/coach.png",fullPage:false});
  // Sprint 15B: Coach light theme must not place white typography on white cards.
  await cp.setViewportSize({width:390,height:844});
  await cp.evaluate(async()=>{const {applyTheme}=await import("./js/theme.js");applyTheme("light");});
  await cp.waitForTimeout(200);
  check(await cp.locator("html").getAttribute("data-surface-theme")==="light","Coach OS permite modo día");
  const coachReadability = await cp.evaluate(()=>{
    const lum=(color)=>{
      const rgb=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      const linear=rgb.map(n=>{const x=n/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
      return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
    };
    const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
    const selectorToCard=[
      [".one-coach-hero-copy h3",".one-coach-hero"],
      [".one-coach-pulse > strong",".one-coach-hero"],
      [".one-coach-ops-copy > strong",".one-coach-ops"],
      [".one-metric-value",".one-metric"],
    ];
    return selectorToCard.map(([selector,card])=>{
      const el=document.querySelector(selector),box=el?.closest(card);
      return {selector,ratio:el&&box?contrast(getComputedStyle(el).color,getComputedStyle(box).backgroundColor):0};
    });
  });
  for(const data of coachReadability)check(data.ratio>=4.5,"Coach día: contraste WCAG AA "+data.selector);
  const coachTouch = await cp.locator(".one-coach-hero .one-action").first()
    .evaluate(el=>el.getBoundingClientRect().height).catch(()=>0);
  check(coachTouch>=44,"Coach día: acciones con 44px táctiles");
  await noOverflow(cp,"Coach móvil · modo día");
  await cp.screenshot({path:"artifacts/e2e/coach-light-mobile.png",fullPage:false});
  await cp.evaluate(async()=>{const {applyTheme}=await import("./js/theme.js");applyTheme("dark");});
  check(await cp.locator("html").getAttribute("data-surface-theme")==="dark","Coach conserva modo noche");
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
