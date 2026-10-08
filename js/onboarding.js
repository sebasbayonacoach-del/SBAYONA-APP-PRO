// ============================================================
// BAYONA — ONBOARDING v3 · conocer sin interrogar
// ------------------------------------------------------------
// 9 pantallas cortas. Perfil v4 por dentro, compatibilidad v2 por fuera.
// Seguridad = screening, nunca diagnóstico. Permisos del sistema se piden
// después, cuando existe contexto.
// ============================================================
import { S } from "./state.js";
import { esc, t } from "./i18n.js";
import {
  GOALS, EXPERIENCE, TRAINING_PLACES, validateProfile,
  legacyEquipmentFromPlaces, availabilityFromDays,
} from "./personalization.js";
import { PLAN_META, normalizePlan } from "./entitlements.js";
import { scoreParQ, PAR_Q_ITEMS } from "./health/healthMap.js";

const TOTAL = 9;
const DAYS = ["L","M","X","J","V","S","D"];
const WINDOWS = [
  ["morning","Mañana"],
  ["afternoon","Tarde"],
  ["evening","Noche"],
];
const DURATIONS = [15,30,45,60];

const GOAL_LABEL = {
  "COMPOSICIÓN CORPORAL": ["◒","Composición corporal"],
  "HIPERTROFIA MUSCULAR": ["⬡","Ganar músculo"],
  "FUERZA Y POTENCIA": ["⚡","Fuerza y potencia"],
  "RESISTENCIA Y CONDICIÓN FÍSICA": ["∞","Resistencia"],
  "MOVILIDAD Y FUNCIÓN": ["↔","Moverme mejor"],
  "RENDIMIENTO DEPORTIVO": ["◆","Rendimiento"],
  "BIENESTAR Y ADHERENCIA": ["○","Sentirme mejor"],
  "VOLVER A ENTRENAR": ["↺","Volver a entrenar"],
  "PREPARAR UNA PRUEBA": ["◎","Preparar una prueba"],
};

const PLACE_LABEL = {
  "CASA · SIN MATERIAL": ["⌂","Casa · sin material"],
  "CASA · CON MATERIAL": ["▣","Casa · con material"],
  "GIMNASIO": ["▦","Gimnasio"],
  "PARQUE / CALISTENIA": ["⌁","Parque / calistenia"],
  "PISTA / CAMPO": ["◇","Pista / campo"],
  "PISCINA": ["≈","Piscina"],
  "BOX / ESTUDIO": ["⬒","Box / estudio"],
  "CLUB DEPORTIVO": ["◈","Club deportivo"],
  "TRABAJO": ["□","Trabajo"],
  "VIAJO MUCHO": ["↗","Viajo mucho"],
};

const COACHES = [
  {
    id:"sebastian", initials:"SB", name:"Sebastián", role:"Coach",
    copy:"Directo, técnico y cercano. Te explica el porqué y te mantiene enfocado.",
  },
  {
    id:"mara", initials:"M", name:"Mara", role:"Coach digital",
    copy:"Calma, claridad y acompañamiento. Misma ciencia, otro estilo de conversación.",
  },
  {
    id:"minimal", initials:"◌", name:"Minimal", role:"Sin personaje",
    copy:"Solo datos, acciones y recordatorios. Sin conversación innecesaria.",
  },
];

const PLANS = ["free","raiz","performance","elite"];

const st = {
  step:0,
  name:"",
  goals:["BIENESTAR Y ADHERENCIA"],
  goalPrimary:"BIENESTAR Y ADHERENCIA",
  customGoal:"",
  trainingPlaces:["CASA · CON MATERIAL"],
  customPlace:"",
  weeklyDays:["L","X","V"],
  preferredWindows:[],
  sessionMinutes:"30",
  birthDate:"",
  physiologySex:"unspecified",
  safety:Object.fromEntries(PAR_Q_ITEMS.map((x)=>[x.id,false])),
  coachPersona:"sebastian",
  membershipPlan:"free",
  experience:EXPERIENCE[1],
};

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
};

function progress() {
  const pct=Math.round(((st.step+1)/TOTAL)*100);
  return `
    <div class="ob-top">
      <span>BAYONA</span>
      <span>${st.step+1} / ${TOTAL}</span>
    </div>
    <div class="ob-progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <span class="sr-only">Paso ${st.step+1} de ${TOTAL}</span>`;
}

function footer({done=false,back=true,next=true}={}) {
  return `<div class="ob-actions">
    ${back?'<button class="ob-back" id="ob-back" type="button" aria-label="'+esc(t("onboarding.back"))+'">←</button>':'<span></span>'}
    ${done
      ? '<button class="ob-primary" id="ob-done" type="button">ENTRAR A MI ESPACIO</button>'
      : next?'<button class="ob-primary" id="ob-next" type="button">CONTINUAR</button>':''}
  </div>`;
}

function toggleGrid(key, rows, selected, label) {
  return `<div class="ob-choice-grid" role="group" aria-label="${esc(label)}">${rows.map(([value,icon,title])=>`
    <button type="button" class="ob-choice ${selected.includes(value)?"on":""}" data-toggle="${key}" data-v="${esc(value)}" aria-pressed="${selected.includes(value)}">
      <span class="ob-choice-icon" aria-hidden="true">${icon}</span>
      <strong>${esc(title)}</strong>
    </button>`).join("")}</div>`;
}

function singleGrid(key, rows, value, label) {
  return `<div class="ob-choice-grid" role="group" aria-label="${esc(label)}">${rows.map(([v,icon,title])=>`
    <button type="button" class="ob-choice ${value===v?"on":""}" data-single="${key}" data-v="${esc(v)}" aria-pressed="${value===v}">
      <span class="ob-choice-icon" aria-hidden="true">${icon}</span>
      <strong>${esc(title)}</strong>
    </button>`).join("")}</div>`;
}

function ageInfo() {
  if (!st.birthDate) return {age:null,ageBand:null,minor:false};
  const d=new Date(st.birthDate+"T12:00:00");
  if (Number.isNaN(d.getTime())) return {age:null,ageBand:null,minor:false};
  const now=new Date();
  let age=now.getFullYear()-d.getFullYear();
  const beforeBirthday=(now.getMonth()<d.getMonth())||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate());
  if (beforeBirthday) age--;
  if (age<0||age>110) return {age:null,ageBand:null,minor:false};
  const ageBand=age<13?"child":age<18?"adolescent":age<35?"adult-young":age<60?"adult":"older-adult";
  return {age,ageBand,minor:age<18};
}

function safetyResult() {
  return scoreParQ(st.safety);
}

function view() {
  if (st.step===0) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-symbol">◈</div>
      <div class="ob-kicker">PRIMERO, TÚ</div>
      <h2>¿Cómo quieres que te llamemos?</h2>
      <p>Nombre o apodo. Lo usamos para que BAYONA se sienta tuya.</p>
      <label class="sr-only" for="ob-name">Nombre o apodo</label>
      <input id="ob-name" maxlength="18" autocomplete="given-name" placeholder="Tu nombre o apodo" value="${esc(st.name)}" />
    </div>
    ${footer({back:false})}`;

  if (st.step===1) {
    const rows=GOALS.map((g)=>[g,GOAL_LABEL[g]?.[0]||"○",GOAL_LABEL[g]?.[1]||g]);
    const selected=st.goals.length?st.goals:["BIENESTAR Y ADHERENCIA"];
    return `
      ${progress()}
      <div class="ob-stage">
        <div class="ob-kicker">LO QUE IMPORTA AHORA</div>
        <h2>¿Qué quieres conseguir?</h2>
        <p>Puedes elegir varias. Marca una como prioridad principal abajo.</p>
        ${toggleGrid("goals",rows,selected,"Objetivos")}
        <div class="ob-inline-field">
          <label for="ob-custom-goal">¿Algo distinto?</label>
          <input id="ob-custom-goal" maxlength="80" placeholder="Ej. volver a correr una 10K" value="${esc(st.customGoal)}">
        </div>
        <label class="ob-select-label" for="ob-primary-goal">PRIORIDAD PRINCIPAL</label>
        <select id="ob-primary-goal">${selected.map((g)=>`<option value="${esc(g)}" ${st.goalPrimary===g?"selected":""}>${esc(GOAL_LABEL[g]?.[1]||g)}</option>`).join("")}</select>
      </div>
      ${footer()}`;
  }

  if (st.step===2) {
    const rows=TRAINING_PLACES.map((p)=>[p,PLACE_LABEL[p]?.[0]||"○",PLACE_LABEL[p]?.[1]||p]);
    return `
      ${progress()}
      <div class="ob-stage">
        <div class="ob-kicker">TU ENTORNO REAL</div>
        <h2>¿Dónde entrenas de verdad?</h2>
        <p>Elige todo lo que uses. BAYONA adapta los ejercicios al contexto disponible.</p>
        ${toggleGrid("trainingPlaces",rows,st.trainingPlaces,"Lugares de entrenamiento")}
        <div class="ob-inline-field">
          <label for="ob-custom-place">Otro lugar o material</label>
          <input id="ob-custom-place" maxlength="80" placeholder="Ej. garaje con barra y discos" value="${esc(st.customPlace)}">
        </div>
      </div>
      ${footer()}`;
  }

  if (st.step===3) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">TU SEMANA REAL</div>
      <h2>¿Cuándo suele caber entrenar?</h2>
      <p>No tienes que acertar para siempre. Marca días posibles y una duración aproximada; BAYONA puede reajustarlo después.</p>
      <div class="ob-days" role="group" aria-label="${esc(t("onboarding.days.aria"))}">
        ${DAYS.map((d)=>`<button type="button" data-day="${d}" class="${st.weeklyDays.includes(d)?"on":""}" aria-pressed="${st.weeklyDays.includes(d)}">${d}</button>`).join("")}
      </div>
      <div class="ob-mini-title">MOMENTO PREFERIDO · OPCIONAL</div>
      <div class="ob-chips" role="group" aria-label="${esc(t("onboarding.windows.aria"))}">
        ${WINDOWS.map(([v,l])=>`<button type="button" data-window="${v}" class="${st.preferredWindows.includes(v)?"on":""}" aria-pressed="${st.preferredWindows.includes(v)}">${l}</button>`).join("")}
      </div>
      <div class="ob-mini-title">EN UN DÍA NORMAL, ¿QUÉ SUELE CABER?</div>
      <div class="ob-duration" role="group" aria-label="${esc(t("onboarding.duration.aria"))}">
        ${DURATIONS.map((m)=>`<button type="button" data-minutes="${m}" class="${String(m)===st.sessionMinutes?"on":""}" aria-pressed="${String(m)===st.sessionMinutes}"><b>${m}</b><span>min</span></button>`).join("")}
      </div>
    </div>
    ${footer()}`;

  if (st.step===4) {
    const a=ageInfo();
    return `
      ${progress()}
      <div class="ob-stage">
        <div class="ob-kicker">TU ETAPA</div>
        <h2>El mismo plan no sirve para todos.</h2>
        <p>La edad y la etapa de desarrollo cambian cómo interpretamos carga, recuperación y progresión. Puedes dejarlo para más tarde.</p>
        <div class="ob-inline-field">
          <label for="ob-birth">Fecha de nacimiento · opcional</label>
          <input id="ob-birth" type="date" value="${esc(st.birthDate)}">
        </div>
        ${a.age!==null?`<div class="ob-context-note"><b>${a.age} años</b><span>${a.minor?"Ruta de desarrollo juvenil: BAYONA limitará recomendaciones adultas y pedirá revisión apropiada.":"Usaremos tu etapa como contexto, no como etiqueta."}</span></div>`:""}
        <div class="ob-mini-title">CONTEXTO FISIOLÓGICO · OPCIONAL</div>
        ${singleGrid("physiologySex",[
          ["female","♀","Mujer"],
          ["male","♂","Hombre"],
          ["unspecified","—","Prefiero no indicarlo"],
        ],st.physiologySex,"Contexto fisiológico")}
        <p class="ob-privacy-line">Solo se usa cuando una diferencia fisiológica es relevante. No determina por sí sola tu entrenamiento.</p>
      </div>
      ${footer()}`;
  }

  if (st.step===5) {
    const result=safetyResult();
    return `
      ${progress()}
      <div class="ob-stage ob-safety-stage">
        <div class="ob-kicker">ANTES DE CARGAR</div>
        <h2>Primero, entrenar con criterio.</h2>
        <p>Esto es un cribado de seguridad, no un diagnóstico. Responde SÍ solo si aplica actualmente o te lo ha indicado un profesional.</p>
        <div class="ob-safety-list">
          ${PAR_Q_ITEMS.map((item)=>`
            <div class="ob-safety-row">
              <span>${esc(item.q)}</span>
              <div role="group" aria-label="${esc(item.q)}">
                <button type="button" data-safety="${item.id}" data-value="false" class="${st.safety[item.id]===false?"on":""}" aria-pressed="${st.safety[item.id]===false}">NO</button>
                <button type="button" data-safety="${item.id}" data-value="true" class="${st.safety[item.id]===true?"yes":""}" aria-pressed="${st.safety[item.id]===true}">SÍ</button>
              </div>
            </div>`).join("")}
        </div>
        <div class="ob-safety-result ${result.clearance}">
          <b>${result.clearance==="cleared"?"Sin alertas detectadas en este cribado":result.clearance==="conditional"?"Hay algo que debemos adaptar":"Antes de intensidad, hace falta valoración profesional"}</b>
          <span>${esc(result.note)}</span>
        </div>
      </div>
      ${footer()}`;
  }

  if (st.step===6) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">QUIÉN TE ACOMPAÑA</div>
      <h2>Elige el estilo de tu Coach.</h2>
      <p>La ciencia no cambia. Cambia la forma de hablarte y guiarte.</p>
      <div class="ob-coaches" role="group" aria-label="${esc(t("onboarding.coach.aria"))}">
        ${COACHES.map((c)=>`
          <button type="button" data-coach="${c.id}" class="${st.coachPersona===c.id?"on":""}" aria-pressed="${st.coachPersona===c.id}">
            <span class="ob-coach-avatar">${c.initials}</span>
            <span><small>${esc(c.role)}</small><strong>${esc(c.name)}</strong><em>${esc(c.copy)}</em></span>
            <i>${st.coachPersona===c.id?"✓":"→"}</i>
          </button>`).join("")}
      </div>
    </div>
    ${footer()}`;

  if (st.step===7) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">TU ACCESO</div>
      <h2>Empieza donde tenga sentido.</h2>
      <p>Indica el plan que te interesa. No se cobra ni se activa aquí: el acceso de pago requiere una suscripción verificada.</p>
      <div class="ob-plans" role="group" aria-label="${esc(t("onboarding.plan.aria"))}">
        ${PLANS.map((id)=>{
          const p=PLAN_META[id];
          const price=id==="free"?"0 €":`≈ ${p.priceEur} € / mes`;
          const bullets={
            free:["Inicio y registro","Progreso básico"],
            raiz:["Plan mensual","Seguimiento y comunidad"],
            performance:["IA adaptativa","Analítica y planificación avanzada"],
            elite:["Prioridad humana","Sesiones privadas según plan"],
          }[id];
          return `<button type="button" data-plan="${id}" class="${st.membershipPlan===id?"on":""}" aria-pressed="${st.membershipPlan===id}">
            <span><small>${p.label}</small><strong>${price}</strong></span>
            <em>${p.tagline}</em>
            <i>${bullets.map((x)=>"✓ "+x).join(" · ")}</i>
          </button>`;
        }).join("")}
      </div>
    </div>
    ${footer()}`;

  const a=ageInfo();
  const health=safetyResult();
  const selectedGoals=[...st.goals, ...(st.customGoal.trim()?[st.customGoal.trim()]:[])];
  const selectedPlaces=[...st.trainingPlaces, ...(st.customPlace.trim()?[st.customPlace.trim()]:[])];
  return `
    ${progress()}
    <div class="ob-stage ob-finish">
      <div class="ob-ready-mark">✓</div>
      <div class="ob-kicker">TU PUNTO DE PARTIDA</div>
      <h2>Ya tenemos suficiente para empezar.</h2>
      <p>No es un contrato con tu yo de hoy. BAYONA irá aprendiendo de lo que realmente haces.</p>
      <div class="ob-summary-v3">
        <span><small>PRIORIDAD</small><b>${esc(GOAL_LABEL[st.goalPrimary]?.[1]||st.goalPrimary)}</b></span>
        <span><small>SEMANA</small><b>${st.weeklyDays.length} día${st.weeklyDays.length===1?"":"s"} · ~${esc(st.sessionMinutes)} min</b></span>
        <span><small>ENTORNO</small><b>${esc(selectedPlaces.slice(0,2).join(" · ")||"Por definir")}</b></span>
        <span><small>COACH</small><b>${esc(COACHES.find((c)=>c.id===st.coachPersona)?.name||"Sebastián")}</b></span>
        <span><small>PLAN</small><b>${esc(PLAN_META[st.membershipPlan]?.label||"FREE")}</b></span>
        <span><small>SEGURIDAD</small><b>${health.clearance==="cleared"?"Sin alertas":health.clearance==="conditional"?"Adaptar":"Revisar antes"}</b></span>
      </div>
      ${a.minor?'<div class="ob-context-note"><b>Perfil juvenil</b><span>El sistema tratará la etapa de desarrollo como contexto específico y evitará aplicar reglas de adulto por defecto.</span></div>':""}
      <div class="ob-finish-line"><span>${selectedGoals.length} objetivo${selectedGoals.length===1?"":"s"}</span><span>${selectedPlaces.length} entorno${selectedPlaces.length===1?"":"s"}</span><span>Tour guiado al entrar</span></div>
    </div>
    ${footer({done:true})}`;
}

function toggle(array,value) {
  return array.includes(value)?array.filter((x)=>x!==value):[...array,value];
}

function render(box) {
  box.innerHTML=view();
  const q=(s)=>box.querySelector(s);

  box.querySelectorAll("[data-toggle]").forEach((button)=>{
    button.onclick=()=>{
      const key=button.dataset.toggle;
      st[key]=toggle(st[key],button.dataset.v);
      if (key==="goals") {
        if (!st.goals.length) st.goals=["BIENESTAR Y ADHERENCIA"];
        if (!st.goals.includes(st.goalPrimary)) st.goalPrimary=st.goals[0];
      }
      render(box);
    };
  });

  box.querySelectorAll("[data-single]").forEach((button)=>{
    button.onclick=()=>{st[button.dataset.single]=button.dataset.v;render(box);};
  });

  box.querySelectorAll("[data-day]").forEach((button)=>{
    button.onclick=()=>{
      st.weeklyDays=toggle(st.weeklyDays,button.dataset.day);
      if (!st.weeklyDays.length) st.weeklyDays=[button.dataset.day];
      render(box);
    };
  });

  box.querySelectorAll("[data-window]").forEach((button)=>{
    button.onclick=()=>{st.preferredWindows=toggle(st.preferredWindows,button.dataset.window);render(box);};
  });

  box.querySelectorAll("[data-minutes]").forEach((button)=>{
    button.onclick=()=>{st.sessionMinutes=button.dataset.minutes;render(box);};
  });

  box.querySelectorAll("[data-safety]").forEach((button)=>{
    button.onclick=()=>{st.safety[button.dataset.safety]=button.dataset.value==="true";render(box);};
  });

  box.querySelectorAll("[data-coach]").forEach((button)=>{
    button.onclick=()=>{st.coachPersona=button.dataset.coach;render(box);};
  });

  box.querySelectorAll("[data-plan]").forEach((button)=>{
    button.onclick=()=>{st.membershipPlan=button.dataset.plan;render(box);};
  });

  const name=q("#ob-name");
  if (name) {
    name.oninput=()=>{st.name=name.value;};
    name.onkeydown=(event)=>{if(event.key==="Enter"){event.preventDefault();q("#ob-next")?.click();}};
  }

  const customGoal=q("#ob-custom-goal");
  if (customGoal) customGoal.oninput=()=>{st.customGoal=customGoal.value;};
  const primary=q("#ob-primary-goal");
  if (primary) primary.onchange=()=>{st.goalPrimary=primary.value;};
  const customPlace=q("#ob-custom-place");
  if (customPlace) customPlace.oninput=()=>{st.customPlace=customPlace.value;};

  const birth=q("#ob-birth");
  if (birth) birth.onchange=()=>{st.birthDate=birth.value;render(box);};

  q("#ob-next")&&(q("#ob-next").onclick=()=>{
    if (st.step===0) st.name=q("#ob-name")?.value.trim()||"";
    if (st.step===1) {
      st.customGoal=q("#ob-custom-goal")?.value.trim()||st.customGoal;
      st.goalPrimary=q("#ob-primary-goal")?.value||st.goalPrimary;
    }
    if (st.step===2) st.customPlace=q("#ob-custom-place")?.value.trim()||st.customPlace;
    st.step=Math.min(TOTAL-1,st.step+1);
    render(box);
  });

  q("#ob-back")&&(q("#ob-back").onclick=()=>{st.step=Math.max(0,st.step-1);render(box);});

  q("#ob-done")&&(q("#ob-done").onclick=()=>{
    const a=ageInfo();
    const health=safetyResult();
    const customGoals=st.customGoal.trim()?[st.customGoal.trim()]:[];
    const customPlaces=st.customPlace.trim()?[st.customPlace.trim()]:[];
    const profile=validateProfile({
      name:st.name||"TÚ",
      goalPrimary:st.goalPrimary,
      goals:st.goals,
      customGoals,
      trainingPlaces:st.trainingPlaces,
      customPlaces,
      experience:st.experience,
      availability:availabilityFromDays(st.weeklyDays),
      equipment:legacyEquipmentFromPlaces([...st.trainingPlaces,...customPlaces]),
      sessionMinutes:Number(st.sessionMinutes),
      preferredSessionRange:[st.sessionMinutes],
      weeklyAvailability:{days:st.weeklyDays,preferredWindows:st.preferredWindows,difficultDays:[]},
      birthDate:st.birthDate||null,
      ageBand:a.ageBand,
      developmentProfile:a.age===null?null:{age:a.age,minor:a.minor,requiresGuardianReview:a.minor},
      physiologySex:st.physiologySex,
      coachPersona:st.coachPersona,
      // El plan elegido es intención, no una membresía pagada.
      membershipIntent:st.membershipPlan,
      membershipPlan:"free",
      onboardingVersion:3,
      onboardingCompletedAt:new Date().toISOString(),
    });
    completar({
      ...profile,
      healthScreening:{
        clearance:health.clearance,
        redFlags:health.redFlags,
        ambers:health.ambers,
        answers:{...st.safety},
        screenedAt:new Date().toISOString(),
      },
      skin:0,face:null,skinHex:null,avatar3d:null,
      consents:{vision:false,health:false,avatar_3d:false},
      firstRunTour:{version:1,completed:false,skipped:false,step:0},
    });
  });

  (q("#ob-name")||q(".ob-choice.on")||q("#ob-done")||q("#ob-next"))?.focus?.({preventScroll:true});
}

function completar(perfil) {
  S.onboard(perfil);
  S.addXP(25,"discipline");
  document.getElementById("ob-layer")?.remove();

  import("./ui.js").then(({toast})=>{
    toast("TODO LISTO",perfil.name&&perfil.name!=="TÚ"?`Bienvenido, ${perfil.name}.`:"Tu día empieza aquí.","gold");
  });

  import("./ui/shared.js").then(({openSection})=>{
    setTimeout(()=>{
      openSection("hoy");
      window.dispatchEvent(new CustomEvent("bayona:first-run-tour-request",{detail:{version:1}}));
    },180);
  });
}

export function perfilRapido() {
  return {
    name:"TÚ",
    goal:"BIENESTAR Y ADHERENCIA",
    goalPrimary:"BIENESTAR Y ADHERENCIA",
    goals:["BIENESTAR Y ADHERENCIA"],
    customGoals:[],
    experience:EXPERIENCE[1],
    availability:"3 DÍAS/SEMANA",
    equipment:"MANCUERNAS/BANDAS",
    trainingPlaces:["CASA · CON MATERIAL"],
    customPlaces:[],
    weeklyAvailability:{days:["L","X","V"],preferredWindows:[],difficultDays:[]},
    sessionMinutes:30,
    preferredSessionRange:["30"],
    coachPersona:"sebastian",
    membershipPlan:"free",
    onboardingVersion:3,
    skin:0,face:null,skinHex:null,avatar3d:null,
    consents:{vision:false,health:false,avatar_3d:false},
  };
}
export const G2_TOQUES_RAPIDO=null;

const css=`
#ob-layer{position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:18px;background:rgba(4,5,6,.96);font-family:var(--sans)}
#ob-box{width:min(650px,100%);max-height:calc(100dvh - 36px);min-height:min(720px,calc(100dvh - 36px));display:grid;grid-template-rows:auto minmax(0,1fr) auto;padding:22px;border:1px solid #292d30;border-radius:22px;background:#0b0d0e;color:#f3f1ec;overflow:hidden}
.ob-top{display:flex;justify-content:space-between;gap:12px;color:#777f84;font:800 8px/1 var(--sans);letter-spacing:.16em}.ob-top span:first-child{color:#e0ddd7}
.ob-progress{height:2px;margin-top:14px;background:#202427;overflow:hidden}.ob-progress i{display:block;height:100%;background:#ff6a00;transition:width .25s ease}
.ob-stage{min-height:0;overflow:auto;padding:30px 8px 22px;scrollbar-width:thin}.ob-symbol{width:48px;height:48px;display:grid;place-items:center;margin-bottom:24px;border:1px solid #34393c;border-radius:14px;color:#ff7416;background:#111416;font-size:20px}
.ob-kicker,.ob-mini-title{color:#ff7a1a;font:800 8px/1.3 var(--sans);letter-spacing:.16em}.ob-kicker{margin-bottom:10px}.ob-mini-title{margin:26px 0 10px;color:#777f84}
#ob-box h2{max-width:560px;margin:0;color:#f5f3ee;font:650 clamp(28px,6vw,44px)/1 var(--serif);letter-spacing:-.04em}
#ob-box p{max-width:520px;margin:12px 0 0;color:#8b9296;font:450 13px/1.55 var(--sans)}
#ob-name,.ob-inline-field input,#ob-birth,#ob-primary-goal{width:100%;box-sizing:border-box;border:1px solid #2b3033;background:#0e1112;color:#f6f3ed;outline:none}
#ob-name{margin-top:30px;padding:16px;border-width:0 0 1px;font:600 24px/1 var(--serif);background:transparent}
#ob-name:focus,.ob-inline-field input:focus,#ob-birth:focus,#ob-primary-goal:focus{border-color:#ff6a00}
.ob-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:24px}
.ob-choice{min-height:74px;padding:12px;display:grid;grid-template-columns:30px 1fr;align-items:center;gap:10px;border:1px solid #293034;border-radius:10px;background:#0f1213;color:#e8e5df;text-align:left;cursor:pointer}
.ob-choice:hover,.ob-choice:focus-visible{border-color:#80512f;outline:none}.ob-choice.on{border-color:#ff6a00;background:#17130f}
.ob-choice-icon{display:grid;place-items:center;color:#ff7416;font:650 18px/1 var(--sans)}.ob-choice strong{display:block;color:inherit;font:650 12px/1.25 var(--sans)}
.ob-inline-field{display:grid;gap:7px;margin-top:14px}.ob-inline-field label,.ob-select-label{color:#8b9296;font:700 9px/1.3 var(--sans);letter-spacing:.08em}
.ob-inline-field input,#ob-birth,#ob-primary-goal{min-height:42px;padding:0 12px;border-radius:8px;font:550 13px var(--sans)}
.ob-select-label{display:block;margin:16px 0 7px}#ob-primary-goal{appearance:auto}
.ob-days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:24px}.ob-days button,.ob-chips button{min-height:42px;border:1px solid #293034;border-radius:8px;background:#0f1213;color:#9ea5a9;cursor:pointer}.ob-days button.on,.ob-chips button.on{border-color:#ff6a00;color:#fff;background:#17130f}
.ob-chips{display:flex;gap:8px;flex-wrap:wrap}.ob-chips button{padding:0 14px;font:650 11px var(--sans)}
.ob-duration{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.ob-duration button{min-height:62px;display:grid;place-items:center;border:1px solid #293034;border-radius:9px;background:#0f1213;color:#9ea5a9;cursor:pointer}.ob-duration button.on{border-color:#ff6a00;background:#17130f;color:#fff}.ob-duration b{font-size:20px;color:#ff7416}.ob-duration span{font-size:9px;text-transform:uppercase}
.ob-context-note{display:grid;gap:4px;margin-top:14px;padding:12px;border:1px solid #2b3033;border-radius:9px;background:#101314}.ob-context-note b{font-size:12px}.ob-context-note span{color:#8b9296;font-size:11px;line-height:1.45}.ob-privacy-line{font-size:10px!important;color:#6f777b!important}
.ob-safety-stage{padding-top:22px}.ob-safety-list{display:grid;gap:7px;margin-top:18px}.ob-safety-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #202427}.ob-safety-row>span{color:#d7d4ce;font:500 11px/1.4 var(--sans)}.ob-safety-row>div{display:flex;gap:4px}.ob-safety-row button{min-width:42px;height:30px;border:1px solid #30363a;border-radius:6px;background:#101314;color:#8d9599;font:750 9px var(--sans);cursor:pointer}.ob-safety-row button.on{border-color:#4b6a58;color:#8bd7aa}.ob-safety-row button.yes{border-color:#ff8a3d;color:#ff9e5c;background:#1b120d}
.ob-safety-result{display:grid;gap:4px;margin-top:14px;padding:12px;border:1px solid #2e363a;border-radius:9px}.ob-safety-result b{font-size:11px}.ob-safety-result span{color:#8b9296;font-size:10px;line-height:1.45}.ob-safety-result.refer_required{border-color:#8c4039}.ob-safety-result.conditional{border-color:#8b6339}
.ob-coaches{display:grid;gap:8px;margin-top:24px}.ob-coaches button{display:grid;grid-template-columns:50px 1fr 24px;align-items:center;gap:12px;padding:12px;border:1px solid #293034;border-radius:11px;background:#0f1213;color:#fff;text-align:left;cursor:pointer}.ob-coaches button.on{border-color:#ff6a00;background:#17130f}.ob-coach-avatar{width:46px;height:46px;display:grid;place-items:center;border-radius:50%;background:#1b1f22;color:#ff7416;font:800 12px var(--sans)}.ob-coaches small{display:block;color:#777f84;font:700 8px var(--sans);letter-spacing:.08em}.ob-coaches strong{display:block;margin-top:2px;font:700 14px var(--sans)}.ob-coaches em{display:block;margin-top:4px;color:#8b9296;font:400 10px/1.4 var(--sans);font-style:normal}.ob-coaches i{color:#ff7416;font-style:normal}
.ob-plans{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:24px}.ob-plans button{min-height:118px;display:grid;gap:9px;padding:13px;border:1px solid #293034;border-radius:11px;background:#0f1213;color:#fff;text-align:left;cursor:pointer}.ob-plans button.on{border-color:#ff6a00;background:#17130f}.ob-plans button>span{display:flex;justify-content:space-between;gap:8px}.ob-plans small{color:#ff7a1a;font:800 9px var(--sans);letter-spacing:.08em}.ob-plans strong{font:700 12px var(--sans)}.ob-plans em{color:#d3d0ca;font:550 11px/1.4 var(--sans);font-style:normal}.ob-plans i{color:#777f84;font:500 9px/1.45 var(--sans);font-style:normal}
.ob-ready-mark{width:54px;height:54px;display:grid;place-items:center;margin-bottom:22px;border-radius:50%;background:#ff6a00;color:#08090a;font-size:22px;font-weight:900}.ob-summary-v3{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;margin-top:24px;border:1px solid #252a2d;border-radius:10px;overflow:hidden;background:#252a2d}.ob-summary-v3 span{display:grid;gap:6px;padding:12px;background:#0e1011}.ob-summary-v3 small{color:#697175;font:750 7px var(--sans);letter-spacing:.1em}.ob-summary-v3 b{color:#ece9e3;font:650 11px/1.3 var(--sans)}.ob-finish-line{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ob-finish-line span{padding:6px 8px;border:1px solid #293034;border-radius:999px;color:#7f878b;font:650 8px var(--sans)}
.ob-actions{display:grid;grid-template-columns:48px 1fr;gap:10px;align-items:center;padding-top:14px;border-top:1px solid #202427}.ob-actions>span{width:48px}.ob-back,.ob-primary{min-height:44px;border-radius:8px;cursor:pointer}.ob-back{border:1px solid #30363a;background:#0d0f10;color:#9ca3a6;font-size:16px}.ob-primary{border:1px solid #ff6a00;background:#ff6a00;color:#090909;font:850 9px var(--sans);letter-spacing:.12em}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:620px){#ob-layer{padding:0;place-items:stretch}#ob-box{width:100%;min-height:100dvh;max-height:100dvh;border:0;border-radius:0;padding:17px 14px 14px}.ob-stage{padding:24px 2px 18px}#ob-box h2{font-size:clamp(29px,9vw,38px)}.ob-choice-grid{margin-top:20px}.ob-choice{min-height:64px;padding:10px}.ob-plans{grid-template-columns:1fr}.ob-plans button{min-height:94px}.ob-summary-v3{margin-top:18px}.ob-safety-row{grid-template-columns:1fr}.ob-safety-row>div{justify-content:flex-start}}
`;

function boot(retries=20) {
  if (document.getElementById("ob-layer")) return;
  if (!S.data) {
    if (retries>0) setTimeout(()=>boot(retries-1),250);
    return;
  }
  if (S.data.profile?.onboarded) return;
  if (document.body.dataset.entryRole==="coach") return;
  if (!document.body.classList.contains("entered")) {
    window.addEventListener("bayona:entered",()=>boot(retries),{once:true});
    return;
  }
  if (document.body.dataset.entryRole==="coach") return;

  try {
    const intent = localStorage.getItem("bayona.plan.intent.v1");
    if (intent) st.membershipPlan = normalizePlan(intent);
  } catch { /* storage opcional */ }

  if (!document.getElementById("ob-v3-style")) {
    const style=el(`<style id="ob-v3-style">${css}</style>`);
    document.head.appendChild(style);
  }
  const layer=el(`<div id="ob-layer" role="dialog" aria-modal="true" aria-label="${esc(t("onboarding.dialog.aria"))}"><div id="ob-box"></div></div>`);
  layer.addEventListener("keydown",(event)=>{
    if(event.key!=="Tab") return;
    const controls=[...layer.querySelectorAll("button,input,select,[tabindex]")].filter((n)=>!n.disabled&&n.tabIndex>=0&&n.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  document.body.appendChild(layer);
  render(layer.querySelector("#ob-box"));
}

if (typeof document!=="undefined") {
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
  else boot();
}

export { st as __obState, view as __obView, ageInfo as __obAgeInfo, safetyResult as __obSafetyResult };
