// BAYONA — primera guía contextual + preferencias de check-in.
// Solo aparece tras onboarding y nunca en Coach OS.
import { S } from "../state.js";
import { esc, t } from "../i18n.js";
import { openSection } from "./shared.js";

export const TOUR_VERSION = 1;
export const CHECKIN_MOMENTS = Object.freeze([
  ["morning","Al despertar","Empezar el día con contexto."],
  ["preTraining","Antes de entrenar","Ajustar mejor la sesión."],
  ["evening","Al final del déa","Cerrar el día y ver tendencias."],
]);

const COACH_NAMES = Object.freeze({
  sebastian:"Sebastián",
  mara:"Mara",
  minimal:"BAYONA",
});

const STEPS = Object.freeze([
  { key:"day", selector:".fit-app-head", titleKey:"tour.day.title", bodyKey:"tour.day.body" },
  { key:"mood", selector:".fit-mood", titleKey:"tour.mood.title", bodyKey:"tour.mood.body" },
  { key:"session", selector:".fit-today-hero", titleKey:"tour.session.title", bodyKey:"tour.session.body" },
  { key:"spaces", selector:".fit-room-grid", titleKey:"tour.spaces.title", bodyKey:"tour.spaces.body" },
  { key:"profile", selector:".fit-profile-chip", titleKey:"tour.profile.title", bodyKey:"tour.profile.body" },
  { key:"world", selector:"#scene-wrap", titleKey:"tour.world.title", bodyKey:"tour.world.body" },
]);

export function coachDisplayName(profile = {}) {
  return COACH_NAMES[String(profile.coachPersona || "sebastian").toLowerCase()] || "Sebastián";
}

export function shouldRunTour(profile = {}, role = "") {
  if (role === "coach" || !profile.onboarded) return false;
  const tour = profile.firstRunTour || {};
  return !(tour.completed || tour.skipped) || Number(tour.version || 0) < TOUR_VERSION;
}

export function shouldOfferCheckinNotifications(profile = {}) {
  return Boolean(profile.onboarded) && !profile.notificationPreferences?.asked;
}

export function normalizedNotificationPreferences(input = {}) {
  return {
    morning:Boolean(input.morning),
    preTraining:Boolean(input.preTraining),
    evening:Boolean(input.evening),
    asked:true,
  };
}

function ensureStyle() {
  if (document.getElementById("bayona-first-run-style")) return;
  const style=document.createElement("style");
  style.id="bayona-first-run-style";
  style.textContent=`
  #bayona-tour{position:fixed;inset:0;z-index:180;pointer-events:none;font-family:var(--sans)}
  #bayona-tour .tour-dim {position:absolute;inset:0;background:rgba(0,0,0,.58)}
  #bayona-tour .tour-focus{position:fixed;border:1px solid #ff6a00;border-radius:14px;box-shadow:0 0 0 6px rgba(255,106,0,.12);transition:.22s ease;pointer-events:none}
  #bayona-tour .tour-card{position:fixed;z-index:2;width:min(370px,calc(100vw - 24px));padding:14px;border:1px solid #33383b;border-radius:14px;background:#0d1011;color:#f4f1eb;pointer-events:auto}
  #bayona-tour .tour-coach{display:flex;align-items:center;gap:9px}.tour-coach-avatar{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:#1d1712;color:#ff7416;font-weight:800}
  #bayona-tour .tour-coach small{display:block;color:#777f83;font:700 7px/1 var(--sans);letter-spacing:.1em}.tour-coach strong{font-size:12px}
  #bayona-tour h3{margin:12px 0 0;font:650 20px/1.05 var(--serif);letter-spacing:-.025em}#bayona-tour p{margin:6px 0 0;color:#9ca2a6;font-size:11px;line-height:1.5}
  #bayona-tour .tour-count{margin-left:auto;color:#70787c;font:700 8px var(--mono)}
  #bayona-tour .tour-actions{display:flex;justify-content:space-between;gap:7px;margin-top:13px}.tour-actions button{min-height:34px;padding:0 12px;border:1px solid #30363a;border-radius:7px;background:#111416;color:#d9d6d0;font:750 9px var(--sans);cursor:pointer}.tour-actions .tour-next{margin-left:auto;border-color:#ff6a00;background:#ff6a00;color:#090909}
  #bayona-checkin-prompt{position:fixed;right:16px;bottom:16px;z-index:190;width:min(390px,calc(100vw - 32px));padding:15px;border:1px solid #33383b;border-radius:14px;background:#0d1011;color:#f2efe9;font-family:var(--sans)}
  #bayona-checkin-prompt h3{margin:0;font:650 19px/1.08 var(--serif)}#bayona-checkin-prompt>p{color:#939a9e;font-size:11px;line-height:1.5}
  .checkin-moments{display:grid;gap:7px;margin-top:12px}.checkin-moment{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:center;padding:9px;border:1px solid #292e31;border-radius:8px;cursor:pointer}.checkin-moment input{accent-color:#ff6a00}.checkin-moment strong{display:block;font-size:11px}.checkin-moment small{color:#7d8589;font-size:9px}
  .checkin-actions{display:flex;gap:7px;margin-top:12px}.checkin-actions button{min-height:34px;flex:1;border:1px solid #30363a;border-radius:7px;background:#111416;color:#ddd9d3;font:750 9px var(--sans);cursor:pointer}.checkin-actions .primary{border-color:#ff6a00;background:#ff6a00;color:#090909}
  html[data-surface-theme="light"] #bayona-tour .tour-card,html[data-surface-theme="light"] #bayona-checkin-prompt{background:#fffdf9;color:#191919;border-color:#d5cec3}
  html[data-surface-theme="light"] #bayona-checkin-prompt>p,html[data-surface-theme="light"] #bayona-tour p{color:#6c675f}
  @media(max-width:620px){#bayona-tour .tour-card{left:12px!important;right:12px!important;bottom:12px!important;top:auto!important;width:auto}.tour-focus{border-radius:10px!important}}
  `;
  document.head.appendChild(style);
}

function markTour({completed=false,skipped=false,step=0}={}) {
  if (!S.data?.profile) return;
  S.data.profile.firstRunTour={version:TOUR_VERSION,completed,skipped,step};
  S.save();
}

function targetRect(step) {
  const node=document.querySelector(step.selector);
  if (!node) return null;
  const r=node.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return { left:Math.max(6,r.left-5), top:Math.max(6,r.top-5), width:r.width+10, height:r.height+10, right:r.right+5, bottom:r.bottom+5 };
}

function cardPosition(rect) {
  if (!rect || innerWidth<620) return {left:12,bottom:12};
  const width=370;
  const left=Math.min(innerWidth-width-18,Math.max(18,rect.right+16));
  const fitsRight=rect.right+16+width<innerWidth;
  if (fitsRight) return {left,top:Math.min(innerHeight-240,Math.max(18,rect.top))};
  return {left:Math.min(innerWidth-width-18,Math.max(18,rect.left)),top:Math.min(innerHeight-240,rect.bottom+16)};
}

export function openFirstRunTour({force=false}={}) {
  const profile=S.data?.profile;
  if (!profile || document.body.dataset.entryRole==="coach") return false;
  if (!force && !shouldRunTour(profile,document.body.dataset.entryRole||"")) return false;
  ensureStyle();
  document.getElementById("bayona-tour")?.remove();

  let index=Math.max(0,Math.min(STEPS.length-1,Number(profile.firstRunTour?.step)||0));
  const layer=document.createElement("div");
  layer.id="bayona-tour";
  layer.innerHTML='<div class="tour-dim"></div><div class="tour-focus"></div><div class="tour-card"></div>';
  document.body.appendChild(layer);

  const paint=()=>{
    const step=STEPS[index];
    const rect=targetRect(step);
    if (!rect) {
      if (index<STEPS.length-1) { index++; paint(); }
      return;
    }
    const focus=layer.querySelector(".tour-focus");
    Object.assign(focus.style,{left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height+"px"});
    const pos=cardPosition(rect),card=layer.querySelector(".tour-card");
    card.style.left=pos.left!=null?pos.left+"px":"auto"; card.style.right="auto";
    card.style.top=pos.top!=null?pos.top+"px":"auto"; card.style.bottom=pos.bottom!=null?pos.bottom+"px":"auto";
    const coach=coachDisplayName(profile);
    card.innerHTML=`
      <div class="tour-coach"><span class="tour-coach-avatar">${esc(coach.slice(0,1))}</span><span><small>${esc(t("tour.coach.label"))}</small><strong>${esc(coach)}</strong></span><span class="tour-count">${index+1}/${STEPS.length}</span></div>
      <h3>${esc(t(step.titleKey))}</h3><p>${esc(t(step.bodyKey))}</p>
      <div class="tour-actions"><button type="button" data-tour="skip">SALTAR</button>${index?'<button type="button" data-tour="back">ATRÁS</button>':''}<button type="button" class="tour-next" data-tour="next">${index===STEPS.length-1?'TERMINAR':'SIGUIENTE'}</button></div>`;
    card.querySelector('[data-tour="skip"]').onclick=()=>{markTour({skipped:true,step:index});layer.remove();};
    card.querySelector('[data-tour="back"]')?.addEventListener("click",()=>{index=Math.max(0,index-1);markTour({step:index});paint();});
    card.querySelector('[data-tour="next"]').onclick=()=>{
      if(index>=STEPS.length-1){markTour({completed:true,step:STEPS.length-1});layer.remove();return;}
      index++; markTour({step:index}); paint();
    };
  };
  paint();
  addEventListener("resize",paint,{passive:true});
  return true;
}

async function requestSystemNotificationsIfUseful(prefs) {
  const wants=Object.entries(prefs).some(([k,v])=>k!=="asked"&&v);
  if (!wants || !("Notification" in globalThis) || Notification.permission!=="default") return globalThis.Notification?.permission || "unsupported";
  try { return await Notification.requestPermission(); } catch { return "error"; }
}

export function openCheckinNotificationPrompt() {
  const profile=S.data?.profile;
  if (!profile || !shouldOfferCheckinNotifications(profile) || document.body.dataset.entryRole==="coach") return false;
  ensureStyle();
  if (document.getElementById("bayona-checkin-prompt")) return false;

  const box=document.createElement("aside");
  box.id="bayona-checkin-prompt";
  box.setAttribute("role","dialog");
  box.setAttribute("aria-label",t("tour.notifications.aria"));
  box.innerHTML=`
    <div class="ob-kicker">${esc(t("tour.notifications.kicker"))}</div>
    <h3>${esc(t("tour.notifications.title"))}</h3>
    <p>${esc(t("tour.notifications.body"))}</p>
    <div class="checkin-moments">${CHECKIN_MOMENTS.map(([id,title,copy])=>`<label class="checkin-moment"><input type="checkbox" data-checkin="${id}"><span><strong>${esc(title)}</strong><small>${esc(copy)}</small></span></label>`).join("")}</div>
    <div class="checkin-actions"><button type="button" data-checkin-action="skip">AHORA NO</button><button type="button" class="primary" data-checkin-action="save">GUARDAR</button></div>`;
  document.body.appendChild(box);

  const finish=(prefs)=>{
    profile.notificationPreferences=prefs;
    S.save();
    box.remove();
  };
  box.querySelector('[data-checkin-action="skip"]').onclick=()=>finish(normalizedNotificationPreferences({}));
  box.querySelector('[data-checkin-action="save"]').onclick=async()=>{
    const values={};
    box.querySelectorAll("[data-checkin]").forEach((n)=>{values[n.dataset.checkin]=n.checked;});
    const prefs=normalizedNotificationPreferences(values);
    finish(prefs);
    await requestSystemNotificationsIfUseful(prefs);
  };
  return true;
}

function boot() {
  addEventListener("bayona:first-run-tour-request",()=>setTimeout(()=>openFirstRunTour(),450));
  addEventListener("bayona:first-mood-recorded",()=>setTimeout(()=>openCheckinNotificationPrompt(),350));
  addEventListener("bayona:restart-tour",()=>{openSection("hoy");setTimeout(()=>openFirstRunTour({force:true}),350);});
}
if (typeof window!=="undefined") boot();
