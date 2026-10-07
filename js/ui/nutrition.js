// ============================================================
// BAYONA — COCINA: nutrición e hidratación (registro real)
// El usuario come/bebe en la vida real y lo registra: el avatar reacciona.
// Nada de comida virtual sin comer.
// ============================================================
import { S } from "../state.js";
import { MEALS } from "../data.js";
import { adherenciaPlan, RECETAS } from "../nutricion.js";
import {
  NUTRITION_FEELINGS, MEAL_SLOTS, nutritionContext, weeklyNutritionSnapshot,
  mealAtFromLocal, normalizeMealPlanEntry,
} from "../nutrition-calendar.js";
import { hasFeature, planFromProfile, PLAN_META } from "../entitlements.js";
import { pedirImagen, ilustracion, imagenDisponible } from "../recipeImage.js";
import { esc, fmtDec, fmtInt, t } from "../i18n.js";
import {
  UI, $, el, elT, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";



const FEELING_KEY = {
  hungry:"nut.feeling.hungry",
  neutral:"nut.feeling.neutral",
  satisfied:"nut.feeling.satisfied",
  heavy:"nut.feeling.heavy",
  low_energy:"nut.feeling.lowEnergy",
};

const PRESET_SLOT = {
  m_breakfast:"DESAYUNO",
  m_lunch:"ALMUERZO",
  m_dinner:"CENA",
  m_snack:"SNACK",
  m_shake:"SNACK",
};

function gapText(minutes){
  if(minutes == null) return "—";
  if(minutes < 60) return t("nut.minutes",{minutes});
  const hours=Math.floor(minutes/60), rest=minutes%60;
  return t("nut.hours",{hours,minutes:rest});
}

function nutritionAdvanced(){
  return hasFeature(planFromProfile(S.data.profile),"nutrition.advanced");
}

function advancedModal(){
  const required=PLAN_META.performance.label;
  showModal(`
    <div class="cine-tag">${esc(required)}</div>
    <div class="cine-title" style="font-size:22px">${esc(t("nut.plan.locked"))}</div>
    <div class="cine-sub">${esc(t("nut.plan.preview"))}</div>
    <button class="btn btn-primary btn-block" id="nut-lock-close">OK</button>`,()=>{
      $("#nut-lock-close").onclick=hideModal;
    });
}

function contextHero(td){
  const ctx=nutritionContext({today:td,nutrition:S.data.nutrition,now:new Date()});
  const last=ctx.lastMeal.meal;
  const lastTime=last?.at?new Date(last.at).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):null;
  const card=el("section","nut-now");
  card.innerHTML=`
    <div class="nut-now-copy">
      <small>${esc(t("nut.calendar.kicker"))}</small>
      <h3>${esc(t("nut.calendar.title"))}</h3>
      <p>${esc(t("nut.calendar.sub"))}</p>
    </div>
    <div class="nut-now-grid">
      <article><small>${esc(t("nut.now"))}</small><strong>${esc(ctx.now||"—")}</strong><span>${esc(td.date||"")}</span></article>
      <article><small>${esc(t("nut.lastMeal"))}</small><strong>${esc(last?.name||t("nut.noMeal"))}</strong><span>${esc(lastTime||"—")}</span></article>
      <article><small>${esc(t("nut.since"))}</small><strong>${esc(gapText(ctx.lastMeal.gapMinutes))}</strong><span>${esc(last?last.slot||"":"")}</span></article>
      <article><small>${esc(t("nut.water"))}</small><strong>${esc(t("nut.glasses",{current:ctx.hydration.glasses,target:ctx.hydration.targetGlasses}))}</strong><span>${ctx.hydration.waterMl} / ${ctx.hydration.goalMl} ml</span></article>
    </div>`;
  return card;
}

function feelingCard(td){
  const card=el("section","nut-feeling");
  card.innerHTML=`<span>${esc(t("nut.feeling.label"))}</span><div></div>`;
  const row=card.querySelector("div");
  NUTRITION_FEELINGS.forEach((id)=>{
    const b=el("button","nut-feeling-btn"+(td.nutritionFeeling===id?" on":""),t(FEELING_KEY[id]));
    b.type="button";
    b.setAttribute("aria-pressed",String(td.nutritionFeeling===id));
    b.onclick=()=>{
      S.setNutritionFeeling(td.nutritionFeeling===id?null:id);
      BUILDERS.nutrition();
    };
    row.appendChild(b);
  });
  return card;
}

function weekCard(){
  const days=weeklyNutritionSnapshot({
    today:S.data.today,
    history:S.data.history,
    nutrition:S.data.nutrition,
    now:new Date(),
  });
  const wrap=el("section","nut-week");
  wrap.innerHTML=`
    <div class="nut-week-head"><span><small>${esc(t("nut.week.label"))}</small><strong>${esc(t("nut.week.sub"))}</strong></span></div>
    <div class="nut-week-grid"></div>`;
  const grid=wrap.querySelector(".nut-week-grid");
  const fmt=new Intl.DateTimeFormat("es-ES",{weekday:"short",day:"numeric"});
  days.forEach((day)=>{
    const b=el("button","nut-day"+(day.isToday?" today":""),`
      <small>${esc(fmt.format(day.date).replace(".","").toUpperCase())}</small>
      <strong>${day.recordedMeals}</strong>
      <span>${esc(t("nut.week.recorded",{count:day.recordedMeals}))}</span>
      <em>${day.plannedMeals?esc(t("nut.week.planned",{count:day.plannedMeals})):esc(t("nut.week.none"))}</em>`);
    b.type="button";
    b.onclick=()=>nutritionAdvanced()?editDayPlan(day.index):advancedModal();
    grid.appendChild(b);
  });
  return wrap;
}

function sourceLabel(goals){
  return t(goals.source==="coach"?"nut.goals.coach":goals.source==="user"?"nut.goals.user":"nut.goals.base");
}

function goalsHeader(goals){
  const wrap=el("section","nut-goals-head");
  wrap.innerHTML=`
    <span><small>${esc(t("nut.goals.label"))}</small><strong>${esc(sourceLabel(goals))}</strong><em>${esc(t("nut.goals.note"))}</em></span>
    <button type="button">${esc(t("nut.goals.edit"))}</button>`;
  wrap.querySelector("button").onclick=()=>nutritionAdvanced()?editGoals():advancedModal();
  return wrap;
}

function preferencesCard(){
  const p=S.data.nutrition?.preferences||{};
  const groups=[
    [t("nut.preferences.allergies"),p.allergies],
    [t("nut.preferences.intolerances"),p.intolerances],
    [t("nut.preferences.avoid"),p.avoid],
    [t("nut.preferences.preferred"),p.preferred],
  ];
  const wrap=el("section","nut-preferences");
  wrap.innerHTML=`
    <div><small>${esc(t("nut.preferences.label"))}</small><strong>${esc(t("nut.preferences.sub"))}</strong></div>
    <div class="nut-pref-grid"></div>
    <button type="button" class="btn btn-block">${esc(t("nut.preferences.edit"))}</button>`;
  const grid=wrap.querySelector(".nut-pref-grid");
  groups.forEach(([label,values])=>{
    const row=el("article","",`<small>${esc(label)}</small><span>${esc(Array.isArray(values)&&values.length?values.join(" · "):t("nut.preferences.none"))}</span>`);
    grid.appendChild(row);
  });
  const pattern=el("article","",`<small>${esc(t("nut.preferences.pattern"))}</small><span>${esc(p.dietaryPattern||t("nut.preferences.none"))}</span>`);
  grid.appendChild(pattern);
  wrap.querySelector("button").onclick=editPreferences;
  return wrap;
}

function editPreferences(){
  const p=S.data.nutrition?.preferences||{};
  showModal(`
    <div class="cine-tag">${esc(t("nut.preferences.label"))}</div>
    <div class="cine-title" style="font-size:21px">${esc(t("nut.preferences.edit"))}</div>
    <div class="sf-row">
      <label>${esc(t("nut.preferences.allergies"))}<input id="np-all" value="${esc((p.allergies||[]).join(", "))}" /></label>
      <label>${esc(t("nut.preferences.intolerances"))}<input id="np-int" value="${esc((p.intolerances||[]).join(", "))}" /></label>
    </div>
    <div class="sf-row">
      <label>${esc(t("nut.preferences.avoid"))}<input id="np-avoid" value="${esc((p.avoid||[]).join(", "))}" /></label>
      <label>${esc(t("nut.preferences.preferred"))}<input id="np-pref" value="${esc((p.preferred||[]).join(", "))}" /></label>
    </div>
    <div class="sf-row">
      <label>${esc(t("nut.preferences.pattern"))}<input id="np-pattern" maxlength="40" value="${esc(p.dietaryPattern||"")}" /></label>
    </div>
    <label>${esc(t("nut.preferences.notes"))}<textarea id="np-notes" maxlength="240">${esc(p.notes||"")}</textarea></label>
    <div style="height:10px"></div>
    <button class="btn btn-primary btn-block" id="np-save">${esc(t("nut.preferences.save"))}</button>`,()=>{
      const list=(id)=>$(id).value.split(",").map((x)=>x.trim()).filter(Boolean);
      $("#np-save").onclick=()=>{
        S.updateNutritionPreferences({
          allergies:list("#np-all"),
          intolerances:list("#np-int"),
          avoid:list("#np-avoid"),
          preferred:list("#np-pref"),
          dietaryPattern:$("#np-pattern").value,
          notes:$("#np-notes").value,
        });
        hideModal(); BUILDERS.nutrition();
      };
    });
}

function editGoals(){
  const g=S.data.nutrition.goals;
  showModal(`
    <div class="cine-tag">${esc(t("nut.goals.label"))}</div>
    <div class="cine-title" style="font-size:21px">${esc(t("nut.goals.edit"))}</div>
    <div class="sf-row">
      <label>KCAL<input id="ng-kcal" type="number" min="0" value="${g.kcal}" /></label>
      <label>P (g)<input id="ng-p" type="number" min="0" value="${g.p}" /></label>
      <label>C (g)<input id="ng-c" type="number" min="0" value="${g.c}" /></label>
    </div>
    <div class="sf-row">
      <label>F (g)<input id="ng-f" type="number" min="0" value="${g.f}" /></label>
      <label>FIBRA (g)<input id="ng-fib" type="number" min="0" value="${g.fib}" /></label>
      <label>AGUA (ml)<input id="ng-water" type="number" min="250" value="${g.water}" /></label>
    </div>
    <div class="sub">${esc(t("nut.goals.note"))}</div>
    <button class="btn btn-primary btn-block" id="ng-save">${esc(t("nut.plan.save"))}</button>`,()=>{
      $("#ng-save").onclick=()=>{
        S.updateNutritionGoals({
          kcal:+$("#ng-kcal").value,p:+$("#ng-p").value,c:+$("#ng-c").value,
          f:+$("#ng-f").value,fib:+$("#ng-fib").value,water:+$("#ng-water").value,
        },"user");
        hideModal(); BUILDERS.nutrition();
      };
    });
}

function editDayPlan(dayIndex){
  const current=(S.data.nutrition?.weeklyPlan?.[dayIndex]||[]).map((x)=>({...x}));
  const draw=()=>{
    const rows=current.map((entry,i)=>`
      <div class="nut-plan-row"><span><b>${esc(entry.time||"—")}</b><strong>${esc(entry.name)}</strong><small>${esc(entry.slot)}</small></span><button type="button" data-rm="${i}">${esc(t("nut.plan.remove"))}</button></div>`).join("");
    showModal(`
      <div class="cine-tag">${esc(t("nut.week.label"))} · ${dayIndex+1}/7</div>
      <div class="cine-title" style="font-size:21px">${esc(t("nut.plan.edit"))}</div>
      <div id="np-rows">${rows||`<div class="sub">${esc(t("nut.week.none"))}</div>`}</div>
      <div class="sec-label">${esc(t("nut.plan.add"))}</div>
      <div class="sf-row">
        <label>${esc(t("nut.preferences.pattern"))}<select id="npl-slot">${MEAL_SLOTS.map((x)=>`<option>${x}</option>`).join("")}</select></label>
        <label>${esc(t("nut.now"))}<input id="npl-time" type="time" value="13:00" /></label>
        <label>NOMBRE<input id="npl-name" maxlength="80" /></label>
      </div>
      <div class="sf-row">
        <label>KCAL<input id="npl-kcal" type="number" min="0" /></label>
        <label>P<input id="npl-p" type="number" min="0" /></label>
        <label>C<input id="npl-c" type="number" min="0" /></label>
        <label>F<input id="npl-f" type="number" min="0" /></label>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn grow" id="npl-add">${esc(t("nut.plan.add"))}</button>
        <button class="btn btn-primary grow" id="npl-save">${esc(t("nut.plan.save"))}</button>
      </div>`,()=>{
        $("#modal-box").querySelectorAll("[data-rm]").forEach((b)=>b.onclick=()=>{current.splice(+b.dataset.rm,1);draw();});
        $("#npl-add").onclick=()=>{
          const name=$("#npl-name").value.trim();
          if(!name)return;
          current.push(normalizeMealPlanEntry({
            slot:$("#npl-slot").value,time:$("#npl-time").value,name,
            kcal:+$("#npl-kcal").value||null,p:+$("#npl-p").value||null,
            c:+$("#npl-c").value||null,f:+$("#npl-f").value||null,
          }));
          draw();
        };
        $("#npl-save").onclick=()=>{
          S.setNutritionDayPlan(dayIndex,current);
          hideModal(); BUILDERS.nutrition();
        };
      });
  };
  draw();
}

BUILDERS.nutrition = (body) => {
  body = body || $("#drawer-body");
  const td=S.data.today;
  const nutrition=S.data.nutrition;
  const goals=nutrition.goals;
  body.textContent="";

  body.append(contextHero(td),feelingCard(td),weekCard(),goalsHeader(goals));

  const macros=[
    ["ENERGÍA",td.kcal,goals.kcal,"kcal","var(--orange)"],
    ["PROTEÍNAS",td.p,goals.p,"g","var(--ink)"],
    ["CARBOHIDRATOS",td.c,goals.c,"g","var(--ink-soft)"],
    ["GRASAS",td.f,goals.f,"g","var(--ink-mute)"],
    ["FIBRA",td.fib||0,goals.fib,"g","var(--line-strong)"],
  ];
  macros.forEach(([k,v,g,u,col])=>{
    const m=el("div","macro");
    m.innerHTML=`<div class="top"><span>${k}</span><span class="mono">${fmtInt(v)} / ${fmtInt(g)} ${u}</span></div>
      <div class="mbar"><i style="width:${g?Math.min(100,(v/g)*100):0}%;background:${col}"></i></div>`;
    body.appendChild(m);
  });

  const ctx=nutritionContext({today:td,nutrition,now:new Date()});
  body.appendChild(el("div","sec-label",t("nut.water")));
  const hyd=el("div","card");
  hyd.innerHTML=`<div class="card-row"><h4>${fmtInt(td.water)} ml / ${fmtInt(goals.water)} ml</h4><span class="pill blue">${ctx.hydration.pct}% · ${esc(t("nut.glasses",{current:ctx.hydration.glasses,target:ctx.hydration.targetGlasses}))}</span></div>`;
  const hydRow=el("div","card-row"); hydRow.style.marginTop="10px";
  [250,500].forEach((ml)=>{
    const b=el("button","btn grow",`+${ml} ml`);
    b.onclick=()=>drinkAndReact(ml); hydRow.appendChild(b);
  });
  const bC=el("button","btn grow","PERSONALIZADO"); bC.onclick=customWater;
  hydRow.appendChild(bC); hyd.appendChild(hydRow); body.appendChild(hyd);

  body.appendChild(preferencesCard());

  body.appendChild(el("div","sec-label","ADHERENCIA AL PLAN"));
  const adh=adherenciaPlan(td);
  const adhCard=el("div","card shine");
  adhCard.innerHTML=`
    <div class="card-row"><h4>${esc(adh.cumplidas)}/${esc(adh.total)} COMIDAS DEL PLAN</h4><span class="pill gold">${esc(adh.pct)} %</span></div>
    ${adh.detalle.map((d)=>`<div class="kv"><span class="k">${d.hecha?"✓":"○"} ${esc(d.nombre)}</span><span class="v">${d.hecha?"REGISTRADA":"PENDIENTE"}</span></div>`).join("")}
    ${adh.extra?`<div class="media-caption">Además has registrado ${esc(adh.extra)} comida(s) fuera del plan: cuentan para tus macros, no para la adherencia.</div>`:""}`;
  body.appendChild(adhCard);

  body.appendChild(el("div","sec-label","REGISTRAR COMIDA"));
  const bAdd=el("button","btn btn-primary btn-block","＋ AÑADIR COMIDA REAL");
  bAdd.style.marginBottom="10px"; bAdd.onclick=customMeal; body.appendChild(bAdd);

  MEALS.forEach((meal)=>{
    const already=td.meals.some((x)=>x.id===meal.id);
    const c=el("div","card");
    c.innerHTML=`<div class="card-row"><div class="grow"><h4>${meal.icon} ${esc(meal.name)}</h4>
      <div class="sub mono">${esc(meal.kcal)} kcal · P${esc(meal.p)} · C${esc(meal.c)} · F${esc(meal.f)}</div></div>
      ${already?'<span class="pill green">REGISTRADA</span>':""}</div>`;
    if(!already){
      const b=el("button","btn btn-block","REGISTRAR");
      b.style.marginTop="10px";
      b.onclick=()=>{
        const r=S.eat({...meal,slot:PRESET_SLOT[meal.id]||"OTRO",feeling:td.nutritionFeeling});
        if(!r)return;
        UI.W?.avatar.setAction("eat");
        toast("COMIDA REGISTRADA",`${meal.name} · +${r.xp} XP`);
        setTimeout(()=>UI.W?.avatar.setAction("sit"),2200);
        BUILDERS.nutrition();
      };
      c.appendChild(b);
    }
    body.appendChild(c);
  });

  body.appendChild(el("div","sec-label","COMIDAS DE HOY"));
  const list=el("div","card");
  if(!td.meals.length) list.innerHTML=`<div class="sub">${esc(t("nut.noMeal"))}</div>`;
  else list.innerHTML=td.meals.map((m)=>{
    const tm=m.at?new Date(m.at).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):"—";
    return `<div class="kv"><span class="k">${esc(m.name)} · ${esc(tm)}${m.slot?" · "+esc(m.slot):""}</span><span class="v">${esc(m.kcal)} kcal · P${esc(m.p)} · C${esc(m.c)} · F${esc(m.f)}</span></div>`;
  }).join("");
  body.appendChild(list);

  body.appendChild(el("div","sec-label",t("nut.recetasLabel")));
  const recBox=el("div","card");
  recBox.appendChild(elT("p","sub",t("nut.recetasNote")));
  const grid=el("div","nut-recetas");
  RECETAS.forEach((r)=>grid.appendChild(tarjetaReceta(r)));
  recBox.appendChild(grid); body.appendChild(recBox);

  imagenDisponible().then((ok)=>{
    const nota=recBox.querySelector(".nut-foto-nota");
    if(nota)nota.textContent=ok?t("nut.fotoListo"):t("nut.fotosSinClave");
  });
};

/**
 * Tarjeta de receta con foto.
 *
 * La foto NO se pide sola: sale una ilustración estable y el usuario
 * decide si quiere la imagen generada. Pide una imagen cuesta dinero
 * y ancho de banda, y la app no gasta el uno ni el otro sin permiso.
 */
function tarjetaReceta(r) {
  const card = el("article", "nut-receta");

  const foto = el("div", "nut-receta-foto");
  foto.style.background = ilustracion(r);
  const img = el("img", "nut-receta-img");
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  foto.appendChild(img);

  const getBtn = el("button", "nut-foto-btn", t("nut.fotoPedir"));
  getBtn.type = "button";
  getBtn.setAttribute("aria-label", `${t("nut.fotoPedir")}: ${r.nombre}`);
  getBtn.onclick = async (ev) => {
    ev.stopPropagation();
    getBtn.disabled = true;
    getBtn.textContent = t("nut.fotoGenerando");
    const src = await pedirImagen(r);
    if (src) {
      img.src = src;
      foto.classList.add("tiene-foto");
      getBtn.remove();
    } else {
      getBtn.disabled = false;
      getBtn.textContent = t("nut.fotoReintentar");
    }
  };
  foto.appendChild(getBtn);

  const cuerpo = el("div", "nut-receta-body");
  cuerpo.appendChild(elT("h4", "", r.nombre));
  const meta = elT("p", "nut-receta-meta", `${r.tipo} · ${r.kcal} kcal · P${r.p} · C${r.c} · F${r.f}`);
  cuerpo.appendChild(meta);
  cuerpo.appendChild(elT("p", "nut-receta-ingr", r.ingredientes.join(" · ")));
  const btn = el("button", "btn btn-block", t("nut.verReceta"));
  btn.onclick = () => recetaModal(r);
  cuerpo.appendChild(btn);
  card.append(foto, cuerpo);
  return card;
}

function drinkAndReact(ml) {
  const r = S.drink(ml);
  UI.W?.avatar.setAction("drink");
  toast("HIDRATACIÓN REGISTRADA", `+${ml} ml bebidos · +${r.xp} XP`);
  setTimeout(() => UI.W?.avatar.setAction("sit"), 2200);
  BUILDERS.nutrition();
}

function customWater() {
  showModal(`
    <div class="cine-tag">HIDRATACIÓN</div>
    <div class="cine-title" style="font-size:22px">¿CUÁNTO HAS BEBIDO?</div>
    <div class="sub">Registra el agua real que acabas de tomar.</div>
    <input id="w-ml" type="number" inputmode="numeric" min="1" max="2000" placeholder="ml (p. ej. 330)" />
    <div style="height:10px"></div>
    <button class="btn btn-primary btn-block" id="w-ok">REGISTRAR</button>
  `, () => {
    $("#w-ok").onclick = () => {
      const ml = Math.round(+$("#w-ml").value);
      if (!ml || ml < 1) return toast("REVISA", "Indica los mililitros bebidos.", "danger");
      hideModal();
      drinkAndReact(Math.min(2000, ml));
    };
  });
}

function customMeal() {
  showModal(`
    <div class="cine-tag">REGISTRAR COMIDA</div>
    <div class="cine-title" style="font-size:22px">AÑADIR ALIMENTO</div>
    <div class="sf-row">
      <label>NOMBRE<input id="cm-name" maxlength="40" placeholder="p. ej. pollo con arroz" /></label>
      <label>CANTIDAD<input id="cm-qty" type="number" inputmode="decimal" min="0" placeholder="250" /></label>
      <label>UNIDAD
        <select id="cm-unit"><option>g</option><option>ml</option><option>ud.</option><option>ración</option></select>
      </label>
    </div>
    <div class="sf-row">
      <label>COMIDA
        <select id="cm-slot">${MEAL_SLOTS.map((s) => `<option>${s}</option>`).join("")}</select>
      </label>
      <label>HORA<input id="cm-time" type="time" value="${new Date().toTimeString().slice(0, 5)}" /></label>
      <label>KCAL<input id="cm-kcal" type="number" inputmode="numeric" min="0" placeholder="420" /></label>
    </div>
    <div class="sf-row">
      <label>PROTEÍNAS (g)<input id="cm-p" type="number" inputmode="decimal" min="0" placeholder="30" /></label>
      <label>CARBOS (g)<input id="cm-c" type="number" inputmode="decimal" min="0" placeholder="45" /></label>
      <label>GRASAS (g)<input id="cm-f" type="number" inputmode="decimal" min="0" placeholder="12" /></label>
      <label>FIBRA (g)<input id="cm-fib" type="number" inputmode="decimal" min="0" placeholder="6" /></label>
    </div>
    <button class="btn btn-primary btn-block" id="cm-ok">GUARDAR COMIDA</button>
  `, () => {
    $("#cm-ok").onclick = () => {
      const name = $("#cm-name").value.trim();
      const kcal = +$("#cm-kcal").value || 0;
      if (!name) return toast("REVISA", "Ponle nombre al alimento.", "danger");
      if (!kcal) return toast("REVISA", "Indica las kilocalorías aproximadas.", "danger");
      const qty = +$("#cm-qty").value || null;
      const unit = $("#cm-unit").value;
      const slot = $("#cm-slot").value;
      const time = $("#cm-time").value;
      const r = S.eat({
        custom: true,
        name: `${name}${qty ? ` · ${fmtDec(qty)} ${unit}` : ""} (${slot} ${time})`,
        kcal, p: +$("#cm-p").value || 0, c: +$("#cm-c").value || 0,
        f: +$("#cm-f").value || 0, fib: +$("#cm-fib").value || 0,
      });
      hideModal();
      if (!r) return toast("ERROR", "No se pudo registrar la comida.", "danger");
      UI.W?.avatar.setAction("eat");
      toast("COMIDA REGISTRADA", `${name} · +${r.xp} XP`);
      setTimeout(() => UI.W?.avatar.setAction("sit"), 2600);
      BUILDERS.nutrition();
    };
  });
}

// ---------- RECETA (detalle + registro real) ----------
function recetaModal(r) {
  showModal(`
    <div class="cine-tag">RECETA · ${esc(r.tipo)}</div>
    <div class="cine-title" style="font-size:20px">${esc(r.nombre)}</div>
    <div class="cine-sub">${esc(r.kcal)} kcal · P ${esc(r.p)} g · C ${esc(r.c)} g · F ${esc(r.f)} g</div>
    <div class="sec-label">INGREDIENTES</div>
    ${r.ingredientes.map((i) => `<div class="kv"><span class="v" style="font-family:inherit">· ${esc(i)}</span></div>`).join("")}
    <div class="sec-label">PREPARACIÓN</div>
    ${r.pasos.map((p, i) => `<div class="kv"><span class="k">${i + 1}</span><span class="v" style="font-family:inherit">${esc(p)}</span></div>`).join("")}
    <div style="height:12px"></div>
    <button class="btn btn-primary btn-block" id="rc-eat">LA HE COCINADO · REGISTRAR</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="rc-close">CERRAR</button>
  `, () => {
    $("#rc-close").onclick = hideModal;
    $("#rc-eat").onclick = () => {
      hideModal();
      const res = S.eat({ custom: true, name: r.nombre, kcal: r.kcal, p: r.p, c: r.c, f: r.f });
      toast("COMIDA REGISTRADA", res ? `${r.nombre} · +${res.xp} XP` : `${r.nombre}`);
      UI.W?.avatar.setAction("eat");
      setTimeout(() => UI.W?.avatar.setAction("idle"), 2200);
      BUILDERS.nutrition();
    };
  });
}
