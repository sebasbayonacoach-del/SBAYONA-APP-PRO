// Sprint 17 · recorrido real de entrenamiento en navegador, sin datos fingidos.
// Se invoca desde Production E2E y usa una sesión aislada nueva.
export async function runSessionLifecycle(browser,base,check,errors){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
  page.on("pageerror",e=>errors.push("SESSION "+e.message));
  const state=()=>page.evaluate(async()=>{const{S}=await import("./js/state.js");return{
    active:S.getActiveSession(),xp:S.data.xp,credits:S.data.credits,
    points:S.data.points,trained:S.data.today.trained,
    workoutDone:S.data.today.workoutDone,setLog:S.data.today.setLog,
    history:S.data.today.trainingSets
  }});
  const start=async(id)=>{
    await page.evaluate(async id=>{
      const{UI}=await import("./js/ui/shared.js");
      const{WORKOUTS}=await import("./js/data.js");
      UI.actions.startWorkout(WORKOUTS[id]);
    },id);
    await page.locator("#sf-ok").waitFor({state:"visible"});
  };
  // En runners lentos el descanso puede terminar mientras Playwright espera
  // que el botón sea "estable". Disparar el click DOM ejecuta exactamente el
  // handler real sin esperar a una animación ni a un nodo que desaparece.
  const skipTransientRest=async()=>{
    await page.evaluate(()=>document.querySelector("#rest-skip")?.click());
  };
  const log=async()=>{
    await page.locator("#sf-ok").click();
    await skipTransientRest();
  };
  try {
  await page.goto(base);
  await page.locator("#luxe-nav-entrar").click();
  await page.locator("#entry-go").click();
  await page.locator("#ob-name").fill("QA real session");
  for(let step=0;step<8;step++){
    if(step===5)for(let i=0;i<7;i++)await page.locator('[data-safety][data-value="false"]').nth(i).click();
    await page.locator("#ob-next").click();
  }
  await page.locator("#ob-done").click();
  await page.waitForFunction(()=>!document.querySelector("#ob-layer"));
  await page.locator('[data-tour="skip"]').click({timeout:2500}).catch(()=>{});
  await page.locator('[data-checkin-action="skip"]').click({timeout:1200}).catch(()=>{});
  const initial=await state();
  check(!initial.active&&!initial.trained,"estado inicial sin sesión activa ni entrenamiento marcado");
  await start("mobility_flow");
  const before=await state(),id=before.active?.id;
  check(Boolean(id)&&before.active.plannedSets===5,"inicio de movilidad registra plan real con cinco series");
  await log();
  let after=await state();
  check(after.active?.id===id&&after.active.logged===1&&after.history===1,"primera serie realmente guardada");
  check(after.xp>initial.xp&&!after.trained,"una serie concede XP sin marcar entrenamiento completo");
  check(after.setLog[0].effort===null,"esfuerzo omitido queda null en el histórico");
  await page.evaluate(async()=>{const{UI}=await import("./js/ui/shared.js");const{WORKOUTS}=await import("./js/data.js");UI.actions.startWorkout(WORKOUTS.op_upper)});
  after=await state();
  check(after.active.id===id&&after.active.workoutId==="mobility_flow","otro inicio no sobrescribe sesión pendiente");
  await page.locator("button").filter({hasText:"CORREGIR ÚLTIMA SERIE"}).click();
  after=await state();
  check(after.active?.logged===0&&after.history===0&&after.xp===initial.xp,
    "deshacer revierte serie y XP en la UI");
  await log();
  after=await state();
  check(after.active?.logged===1&&after.history===1,"serie corregida puede volver a registrarse");
  await page.evaluate(async()=>{const{UI}=await import("./js/ui/shared.js");UI.actions.pauseSession("Prueba de recuperación")});
  after=await state();
  check(after.active?.status==="pausada"&&after.active?.logged===1,"pausar persiste progreso y estado");
  await page.reload();
  const localSave=await page.evaluate(()=>JSON.parse(localStorage.getItem("bayona.save.v2")||"null"));
  check(localSave?.activeSession?.id===id&&localSave.activeSession.logged===1,
    "recargar preserva id y serie de sesión pausada");
  // Returning accounts load the full app asynchronously after the landing boot.
  await page.waitForFunction(()=>Boolean(window.BAYONA?.world),null,{timeout:20000});
  const resumeEntry=page.locator("#entry-resume");
  if(await resumeEntry.isVisible().catch(()=>false)) await resumeEntry.click();
  else if(await page.locator("#entry-go").isVisible().catch(()=>false)) await page.locator("#entry-go").click();
  await page.waitForFunction(()=>document.body.classList.contains("entered"),null,{timeout:15000});
  await page.evaluate(async()=>{
    const {UI}=await import("./js/ui/shared.js");
    UI.actions.resumeSession();
  });
  await page.locator("#sf-ok").waitFor({state:"visible"});
  let restored=await state();
  check(restored.active?.id===id&&restored.active.logged===1,"reanudar mantiene el mismo identificador");
  await page.locator("#sf-ok").click();
  await skipTransientRest();
  restored=await state();
  check(restored.active?.logged===2,"segunda serie se suma tras recuperación");
  await page.locator("button").filter({hasText:"FINALIZAR SESIÓN"}).click();
  const options=await page.locator("#modal-box button").allInnerTexts();
  check(options.some(s=>s.includes("GUARDAR Y SALIR")),"cierre parcial exige confirmación explícita");
  const partialBefore=await state();
  await page.locator("#modal-box button").filter({hasText:"GUARDAR Y SALIR"}).click();
  await page.locator(".fit-session-summary.partial").waitFor();
  let partialAfter=await state();
  check(!partialAfter.trained&&partialAfter.active===null&&partialAfter.workoutDone===null,
    "cierre parcial mantiene entrenado=false y libera sesión activa");
  check(partialAfter.xp===partialBefore.xp&&partialAfter.credits===partialBefore.credits&&partialAfter.points===partialBefore.points,
    "parcial conserva XP de series sin conceder bonos finales");
  check(partialAfter.history===2&&partialAfter.setLog.length===2,
    "parcial conserva exactamente dos series registradas");
  await page.locator("#m-ok").click();
  await start("mobility_flow");
  let completed=0;
  for(let i=0;i<5;i++){
    await page.locator("#sf-ok").click();
    await skipTransientRest();
    completed++;
    const value=await state();
    check(value.active?.logged===completed,"sesión completa: serie "+completed+" registrada");
  }
  check(await page.locator(".fit-session-close").count()===1,
    "todas las series abren cierre real, no recompensa automática");
  const beforeFull=await state();
  check(!beforeFull.trained&&beforeFull.credits===partialAfter.credits,
    "100% registrado sin confirmar aún no concede bono");
  await page.locator(".fit-session-close button").click();
  await page.locator(".fit-session-summary.complete").waitFor();
  const fully=await state();
  check(fully.trained&&fully.workoutDone==="mobility_flow"&&fully.active===null,
    "finalización real marca día entrenado y limpia sesión");
  check(fully.credits>beforeFull.credits&&fully.xp>beforeFull.xp,
    "FitCoins y XP de finalización se obtienen solo tras cierre completo");
  const duplicate=await page.evaluate(async()=>{
    const{S}=await import("./js/state.js");return S.completeWorkout("mobility_flow",{loggedSets:5,plannedSets:5,minutes:15});
  });
  const afterDouble=await state();
  check(duplicate===null&&afterDouble.credits===fully.credits&&afterDouble.xp===fully.xp,
    "reintento de cierre no duplica monedas ni XP");
  await page.screenshot({path:"artifacts/e2e/session-complete.png"});
  check(errors.length===0,"ciclo real de entrenamiento sin errores JavaScript");
  }finally{
    await page.close();
  }
}
