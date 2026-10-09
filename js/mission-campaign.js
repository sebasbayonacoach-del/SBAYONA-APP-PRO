import { t } from "./i18n.js";
import { PLAN_META } from "./entitlements.js";
// BAYONA · misión comercial pública (no requiere cuentas ni permisos de Coach OS).
// Única persistencia: 7 booleanos en este navegador. Sin analytics y sin datos personales.
const KEY="bayona.mision7.v1";
const DAYS=7;
const WHATSAPP="34641698332"; // Verificado en sitio comercial público: bayona-jet.vercel.app
const PLANS=Object.freeze(Object.fromEntries(
  ["raiz","performance","elite"].map(id=>[id,{label:PLAN_META[id].label,price:PLAN_META[id].priceEur}])
));
const safeStore={
  read(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||"[]");
      return Array.isArray(saved)?[1,2,3,4,5,6,7].filter(day=>saved.includes(day)):[];
    }catch{return []}
  },
  write(days){try{localStorage.setItem(KEY,JSON.stringify(days));return true}catch{return false}}
};
export const missionMessage=(plan)=>{
  const tier=PLANS[plan];
  if(!tier)return "Hola, he visto la Misión 7 días de BAYONA. Quiero información sobre entrenamiento y disponibilidad.";
  return "Hola, he visto la Misión 7 días de BAYONA. Quiero consultar el plan "+tier.label+" ("+tier.price+" €/mes), qué incluye y la disponibilidad. Gracias.";
};
export const salesUrl=plan=>"https://wa.me/"+WHATSAPP+"?text="+encodeURIComponent(missionMessage(plan));
export const validatedPlan=plan=>Object.hasOwn(PLANS,plan)?plan:null;
export function missionProgress(days){
  const value=new Set(Array.isArray(days)?days:[]);
  const complete=[1,2,3,4,5,6,7].filter(d=>value.has(d)).length;
  return{complete,total:DAYS,percent:Math.round(complete/DAYS*100)};
}
function updateProgress(){
  const selected=[...document.querySelectorAll("[data-mission-day]:checked")].map(x=>Number(x.dataset.missionDay));
  const p=missionProgress(selected);
  document.getElementById("progress-count").textContent=p.complete+" de "+p.total+" misiones";
  document.getElementById("progress-percent").textContent=p.percent+" %";
  document.getElementById("progress-track").setAttribute("aria-valuenow",String(p.complete));
  document.getElementById("progress-fill").style.width=p.percent+"%";
  const saved=safeStore.write(selected);
  if(!saved)document.getElementById("share-feedback").textContent=t("mission.storage.unavailable");
}
function init(){
  const saved=new Set(safeStore.read());
  for(const item of document.querySelectorAll("[data-mission-day]")){
    item.checked=saved.has(Number(item.dataset.missionDay));
    item.addEventListener("change",updateProgress);
  }
  updateProgress();
  const requested=validatedPlan(new URLSearchParams(location.search).get("plan"));
  for(const a of document.querySelectorAll(".sales-cta")){
    a.href=salesUrl(a.dataset.plan);
    if(requested&&a.dataset.plan===requested)a.setAttribute("aria-current","true");
  }
  document.getElementById("hero-contact").href=salesUrl(null);
  document.getElementById("share-mission").addEventListener("click",async()=>{
    const url=new URL("/misiones.html",location.href).href;
    const text="Misión BAYONA: 7 días de movimiento y hábitos a tu ritmo.";
    let message="Comparte este enlace: "+url;
    try{
      if(navigator.share){await navigator.share({title:t("mission.share.title"),text,url});message="Misión compartida."; }
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);message="Enlace copiado.";}
    }catch{message="Enlace de la misión: "+url}
    document.getElementById("share-feedback").textContent=message;
  });
}
if(typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
}
