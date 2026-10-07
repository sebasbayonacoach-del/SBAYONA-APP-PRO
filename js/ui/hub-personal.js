// BAYONA — Hub Personal UI.
// Pinta exclusivamente datos del estado canónico; no crea economía ni progreso paralelo.
import { S } from "../state.js";
import { t, esc, fmtNum } from "../i18n.js";
import { PLAN_META, planFromProfile } from "../entitlements.js";
import { hubSnapshot } from "../hub.js";
import { el, openSection } from "./shared.js";

const COACH_LABEL = Object.freeze({
  sebastian:"Sebastián",
  mara:"Mara",
  minimal:"BAYONA",
});

const JOURNEY_LABEL = Object.freeze({
  checkin:"hub.journey.checkin",
  session:"hub.journey.session",
  close:"hub.journey.close",
  reward:"hub.journey.reward",
});

function model() {
  return hubSnapshot({
    data:S.data,
    level:S.level(),
    rank:S.rank(),
    workout:S.todayWorkout(),
    active:S.getActiveSession(),
    now:new Date(),
  });
}

function fmtDate(value) {
  if (!value) return t("hub.review.unscheduled");
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return t("hub.review.unscheduled");
  return d.toLocaleDateString("es",{day:"numeric",month:"short"});
}

function coachName(profile=S.data.profile) {
  return COACH_LABEL[String(profile?.coachPersona||"sebastian").toLowerCase()]||"Sebastián";
}

export function characterStage() {
  const m=model(), p=S.data.profile, plan=PLAN_META[planFromProfile(p)]||PLAN_META.free;
  const stage=el("section","fit-character-stage");
  const face=p.face
    ? `<img src="${esc(p.face)}" alt="${esc(t("hub.character.photoAlt"))}">`
    : '<span class="fit-character-silhouette" aria-hidden="true"><i></i><b></b></span>';
  const reviewLabel=m.review.status==="today"
    ? t("hub.review.today")
    : m.review.status==="overdue"
      ? t("hub.review.overdue")
      : fmtDate(m.review.nextAt);

  stage.innerHTML=`
    <div class="fit-character-visual">
      ${face}
      <span class="fit-character-plan">${esc(plan.label)}</span>
    </div>
    <div class="fit-character-copy">
      <span class="fit-character-kicker">${esc(t("hub.character.kicker"))}</span>
      <h3>${esc(t("hub.character.level",{level:m.level,rank:m.rank||t("hub.character.rankBase")}))}</h3>
      <div class="fit-character-xp" aria-label="${esc(t("hub.character.xpAria",{current:m.xp.current,need:m.xp.need}))}">
        <i style="width:${m.xp.pct}%"></i>
      </div>
      <div class="fit-character-economy">
        <span><small>${esc(t("hub.fitcoins"))}</small><b>${fmtNum(m.fitCoins)}</b></span>
        <span><small>${esc(t("hub.points"))}</small><b>${fmtNum(m.points)}</b></span>
        <span><small>${esc(t("hub.review"))}</small><b>${esc(reviewLabel)}</b></span>
      </div>
      <div class="fit-character-actions">
        <button type="button" data-hub-go="armory">${esc(t("hub.character.visit"))}</button>
        <button type="button" data-hub-go="core">${esc(t("hub.character.coach"))}</button>
      </div>
    </div>`;
  stage.querySelectorAll("[data-hub-go]").forEach((b)=>b.onclick=()=>openSection(b.dataset.hubGo));
  return stage;
}

export function coachPulseCard() {
  const m=model(), card=el("button","fit-coach-pulse");
  card.type="button";
  card.innerHTML=`
    <span class="fit-coach-pulse-avatar">${esc(coachName().slice(0,1))}</span>
    <span><small>${esc(t("hub.coach.kicker",{coach:coachName()}))}</small><strong>${esc(t(m.coachPulse.key))}</strong></span>
    <i>→</i>`;
  card.onclick=()=>openSection("core");
  return card;
}

export function journeyPath() {
  const m=model(), wrap=el("section","fit-journey");
  wrap.setAttribute("aria-label",t("hub.journey.aria"));
  m.journey.forEach((step,index)=>{
    const b=el("button",`fit-journey-step ${step.state}`);
    b.type="button";
    b.dataset.checkpoint=step.id;
    const pct=typeof step.progress==="number"?step.progress:null;
    b.innerHTML=`
      <span class="fit-journey-node">${step.state==="done"||step.state==="claimable"?"✓":index+1}</span>
      <span><strong>${esc(t(JOURNEY_LABEL[step.id]))}</strong>${pct!=null&&step.id==="session"?`<small>${pct}%</small>`:""}</span>`;
    b.disabled=step.state==="locked";
    b.onclick=()=>{
      if(step.id==="checkin"){
        document.querySelector(".fit-mood")?.scrollIntoView({behavior:"smooth",block:"center"});
        return;
      }
      if(step.id==="session"||step.id==="close") return openSection("training");
      if(step.id==="reward") return openSection("progress");
    };
    wrap.append(b);
  });
  return wrap;
}

export function progressPeek() {
  const m=model(), photos=Array.isArray(S.data.photos)?S.data.photos:[];
  const card=el("section","fit-progress-peek");
  const latest=photos[0];
  card.innerHTML=`
    <div class="fit-progress-peek-head">
      <span><small>${esc(t("hub.progress.kicker"))}</small><strong>${esc(t("hub.progress.title"))}</strong></span>
      <button type="button">${esc(t("hub.progress.open"))}</button>
    </div>
    <div class="fit-progress-peek-grid">
      <span><b>${fmtNum(m.workouts)}</b><small>${esc(t("hub.progress.sessions"))}</small></span>
      <span><b>${fmtNum(m.sets)}</b><small>${esc(t("hub.progress.sets"))}</small></span>
      <span><b>${fmtNum(m.prs)}</b><small>${esc(t("hub.progress.prs"))}</small></span>
      <span><b>${fmtNum(m.streak)}</b><small>${esc(t("hub.progress.streak"))}</small></span>
    </div>
    ${latest?`<button type="button" class="fit-progress-photo"><img src="${esc(latest.dataUrl)}" alt="${esc(t("hub.progress.latestPhoto"))}"><span>${esc(t("hub.progress.privatePhoto"))}</span></button>`:""}`;
  card.querySelector(".fit-progress-peek-head button").onclick=()=>openSection("progress");
  card.querySelector(".fit-progress-photo")?.addEventListener("click",()=>openSection("progress"));
  return card;
}

export function hubPersonalModel() {
  return model();
}
