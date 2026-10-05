// BAYONA ONE v12 · experiencia visual del afiliado + navegación por rol.
// Reutiliza dominio, videos y acciones existentes; no duplica lógica de negocio.
import { S, todayKey, on } from "../state.js";
import { WORKOUTS, EXERCISES } from "../data.js";
import { posterFor, videoFor, tipFor } from "../media.js";
import { esc, t } from "../i18n.js";
import { BUILDERS, UI, el, openSection } from "./shared.js";
import { checkInModal } from "./hoy.js";

const NAV_ICONS = {
  studio:"M5 20h14M7 20V9l5-3 5 3v11M9 13h6",
  centro:"M4 21h16 M6 21V9 M10 21V9 M14 21V9 M18 21V9 M3 9l9-5 9 5",
  agenda:"M5 4h14v16H5z M8 2v4 M16 2v4 M5 9h14",
  informes:"M4 20h16 M7 16v-5 M12 16V7 M17 16v-9",
};
const svg = (path) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  path.split(" M").map((d,i)=>'<path d="'+(i?'M':'')+d+'"/>').join("") + '</svg>';

const friendly = (w) => (w?.name || "").replace(/^OPERACIÓN:\s*/, "").toLocaleLowerCase("es").replace(/^./,x=>x.toUpperCase());
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

function installRoleNavigation() {
  const nav=document.getElementById("panel-nav");
  if(!nav || nav.querySelector(".one-role-coach-nav")) return;
  nav.querySelectorAll(".one-coach-launch").forEach((n)=>n.remove());
  const specs=[
    ["coachos","Studio","studio"],
    ["centro","Centro","centro"],
    ["agenda","Agenda","agenda"],
    ["informes","Informes","informes"],
  ];
  for(const [section,label,ico] of specs){
    const b=document.createElement("button");
    b.type="button";
    b.className="rail-btn one-role-coach-nav";
    b.dataset.go=section;
    b.innerHTML=svg(NAV_ICONS[ico])+"<span>"+label+"</span>";
    b.addEventListener("click",()=>openSection(section));
    nav.append(b);
  }
}

function weekStrip() {
  const now=new Date(),offset=(now.getDay()+6)%7,week=S.weekPlan();
  const strip=el("div","affiliate-week-v12");
  strip.setAttribute("aria-label",t("fitness.week"));
  for(let i=0;i<7;i++){
    const day=new Date(now);day.setDate(now.getDate()-offset+i);
    const key=dateKey(day);
    const done=key===todayKey()?S.data.today.trained:S.data.history.some(h=>h.date===key&&h.workouts);
    const planned=!!week[i];
    const cell=el("div",`affiliate-day-v12 ${i===offset?"current":""} ${done?"done":""}`);
    cell.innerHTML=`<span>${["L","M","X","J","V","S","D"][i]}</span><b>${day.getDate()}</b><i>${done?"✓":planned?"•":"·"}</i>`;
    strip.append(cell);
  }
  return strip;
}

function guideMessage(workout,pending,today){
  if(pending) return "Retoma donde lo dejaste. No necesitas empezar de cero.";
  if(today.trained) return "Sesión cerrada. Ahora gana recuperar bien y volver con energía.";
  if(workout.id==="op_upper") return "Empuja con control. Técnica limpia antes que velocidad.";
  if(workout.id==="op_lower") return "Pierna fuerte, repeticiones sólidas. Controla cada descenso.";
  if(workout.id==="op_full") return "Hoy conectamos todo el cuerpo. Calidad antes que cantidad.";
  if(workout.id==="bodyweight") return "Tu cuerpo es suficiente. Mantén ritmo y amplitud.";
  return "Hoy baja revoluciones. Respira, muévete y recupera.";
}

function guideCard(workout,pending,today){
  const card=el("section","affiliate-guide-v12");
  const head=el("div","affiliate-guide-head-v12");
  head.innerHTML='<span class="affiliate-guide-avatar-v12"><i></i>◈</span><span><small>'+esc(t("affiliate.guide.kicker"))+'</small><strong>'+esc(t("affiliate.guide.title"))+'</strong></span>';
  const message=el("p","",guideMessage(workout,pending,today));
  const actions=el("div","affiliate-guide-actions-v12");
  const core=el("button","affiliate-mini-action-v12","Hablar con guía");
  core.onclick=()=>openSection("core");
  const avatar=el("button","affiliate-mini-action-v12","Mi personaje");
  avatar.onclick=()=>openSection("armory");
  actions.append(core,avatar);
  card.append(head,message,actions);
  return card;
}

function exerciseCard(item,index){
  const ex=EXERCISES[item.ex]||{name:item.ex,muscle:""};
  const poster=posterFor(item.ex);
  const video=videoFor(item.ex);
  const card=el("button","affiliate-ex-card-v12");
  card.type="button";
  card.dataset.exercise=item.ex;
  const media=poster
    ? `<span class="affiliate-ex-media-v12"><img src="${poster}" loading="lazy" alt="${esc(ex.name)}"><i></i>${video?'<b>▶</b>':''}</span>`
    : '<span class="affiliate-ex-media-v12 missing"><em>◈</em></span>';
  const unit=item.timed||["plank","mobility","breathing"].includes(item.ex)?t("affiliate.unit.seconds"):t("affiliate.unit.reps");
  const mediaLabel=video?t("affiliate.exercise.video"):t("affiliate.exercise.technique");
  card.innerHTML=`${media}<span class="affiliate-ex-copy-v12"><small>${String(index+1).padStart(2,"0")} · ${esc(ex.muscle)}</small><strong>${esc(ex.name)}</strong><span>${item.sets} × ${item.reps}${esc(unit)}</span><em>${esc(mediaLabel)}</em></span>`;
  card.addEventListener("click",()=>{
    const mediaBox=card.querySelector(".affiliate-ex-media-v12");
    const current=mediaBox?.querySelector("video");
    if(current){
      current.paused?current.play().catch(()=>{}):current.pause();
      return;
    }
    if(video && mediaBox){
      mediaBox.innerHTML=`<video src="${video}" poster="${poster||""}" muted loop playsinline autoplay></video><i></i><b>Ⅱ</b>`;
      return;
    }
    openSection("training");
  });
  return card;
}

function heroMedia(exercises){
  const mediaEx=exercises.find((x)=>videoFor(x.ex))?.ex;
  if(!mediaEx) return '<div class="affiliate-hero-fallback-v12">◈</div>';
  return `<video class="affiliate-hero-video-v12" src="${videoFor(mediaEx)}" poster="${posterFor(mediaEx)||""}" autoplay muted loop playsinline preload="metadata"></video>`;
}

function statsStrip(){
  const stats=S.data.stats;
  const wrap=el("div","affiliate-stats-v12");
  [
    [stats.workouts,"sesiones"],
    [stats.sets,"series"],
    [stats.prs,"récords"],
  ].forEach(([value,label])=>{
    const box=el("div");
    box.innerHTML=`<strong>${value}</strong><span>${label}</span>`;
    wrap.append(box);
  });
  return wrap;
}

function nutritionVisual(){
  const card=el("button","affiliate-nutrition-v12");
  card.type="button";
  card.innerHTML='<img src="media/mobility.jpg" alt="" loading="lazy"><i></i><span><small>'+esc(t("affiliate.nutrition.kicker"))+'</small><strong>'+esc(t("affiliate.nutrition.title"))+'</strong><em>'+esc(t("affiliate.nutrition.open"))+'</em></span>';
  card.onclick=()=>openSection("nutrition");
  return card;
}

function homeV12(body){
  body.textContent="";
  body.classList.add("affiliate-home-v12");
  const p=S.data.profile,today=S.data.today,active=S.getActiveSession();
  const pending=active&&!["completada","abandonada"].includes(active.status)?active:null;
  const scheduled=S.todayWorkout();
  const workout=scheduled||WORKOUTS.mobility_flow;
  const exercises=pending?.exercises||workout.exercises;
  const title=pending?friendly(pending):today.trained?"Sesión completada":friendly(workout);

  const intro=el("div","affiliate-intro-v12");
  intro.innerHTML=`<span>${esc(new Date().toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"}))}</span><h3>${p.name?`Hola, ${esc(p.name)}.`:"Tu día empieza aquí."}</h3>`;
  body.append(intro,weekStrip());

  const hero=el("section","affiliate-session-v12");
  const visual=el("div","affiliate-session-visual-v12",heroMedia(exercises));
  const overlay=el("div","affiliate-session-overlay-v12");
  const state=pending?"CONTINUAR":today.trained?"COMPLETADA":scheduled?"HOY":"RECUPERACIÓN";
  overlay.innerHTML=`<span class="affiliate-session-kicker-v12">${state}</span><h2>${esc(title)}</h2><div class="affiliate-session-meta-v12"><span>${pending?pending.minutes:workout.min} MIN</span><span>${exercises.length} EJERCICIOS</span><span>${exercises.reduce((n,x)=>n+x.sets,0)} SERIES</span></div>`;
  const cta=el("button","affiliate-session-cta-v12",pending?"Continuar sesión →":today.trained?"Ver progreso →":scheduled?"Empezar →":"Moverme →");
  cta.id="fit-start";
  cta.onclick=()=>pending?UI.actions.resumeSession?.():today.trained?openSection("progress"):UI.actions.openTraining?.(workout.id);
  overlay.append(cta);
  hero.append(visual,overlay);
  body.append(hero);

  const guideAndStats=el("div","affiliate-guide-grid-v12");
  guideAndStats.append(guideCard(workout,pending,today),statsStrip());
  body.append(guideAndStats);

  const mediaHead=el("div","affiliate-section-head-v12");
  mediaHead.innerHTML='<span><small>'+esc(t("affiliate.media.kicker"))+'</small><strong>'+esc(t("affiliate.media.title"))+'</strong></span><button type="button">'+esc(t("affiliate.media.all"))+'</button>';
  mediaHead.querySelector("button").onclick=()=>openSection("library");
  const grid=el("div","affiliate-media-grid-v12");
  exercises.slice(0,4).forEach((x,i)=>grid.append(exerciseCard(x,i)));
  body.append(mediaHead,grid);

  const lower=el("div","affiliate-lower-grid-v12");
  const check=el("section","affiliate-checkin-v12");
  const checkTitle=today.energy==null?t("affiliate.checkin.question"):t("affiliate.checkin.energy",{value:today.energy});
  const checkNote=today.energy==null?t("affiliate.checkin.first"):t("affiliate.checkin.update");
  check.innerHTML=`<small>${esc(t("affiliate.checkin.kicker"))}</small><strong>${esc(checkTitle)}</strong><span>${esc(checkNote)}</span>`;
  const checkBtn=el("button","affiliate-mini-action-v12",today.energy==null?"Registrar sensaciones":"Actualizar");
  checkBtn.onclick=checkInModal;
  check.append(checkBtn);
  lower.append(check,nutritionVisual());
  body.append(lower);
}

function installReactivity(){
  on("today",()=>{
    const drawer=document.getElementById("drawer");
    if(drawer?.dataset.section==="hoy" && drawer.classList.contains("open")){
      homeV12(document.getElementById("drawer-body"));
    }
  });
}

export function installAffiliateV12(){
  installRoleNavigation();
  BUILDERS.home=homeV12;
  BUILDERS.hoy=homeV12;
  installReactivity();
}
