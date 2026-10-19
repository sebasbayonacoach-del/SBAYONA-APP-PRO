// BAYONA · explicit exit available from any signed-in context.
// This code does not clear user saves, health entries, backups or progress.
import {S} from "../state.js";
import {currentSession, signOut, onAuth} from "../sync/supabase.js";

export function loginEntryUrl(locationLike=globalThis.location){
  const url=new URL(locationLike.href);
  url.hash="";
  for (const key of ["go","auth_state","lifeRpg"]) url.searchParams.delete(key);
  url.searchParams.set("source","pwa");
  return url.toString();
}

// Purely a presentation label. Authorization is enforced by Supabase, not UI.
export function exitActionLabel(signedIn){return signedIn?"Cerrar sesión":"Iniciar sesión";}

let leaving=false;
export async function exitBayona({
  hasSession=()=>Boolean(currentSession()),
  ask=(message)=>globalThis.confirm(message),
  save=()=>S.data?S.save():true,
  logout=signOut,
  navigate=(url)=>globalThis.location.replace(url),
  locationLike=globalThis.location
}={}){
  if(leaving)return false;
  const signedIn=hasSession();
  if(signedIn&&!ask("¿Cerrar sesión en BAYONA? Tu progreso seguirá guardado para tu cuenta. Podrás entrar con otra cuenta."))return false;
  leaving=true;
  try{
    // Never destroy progress: refuse to exit if a local save fails.
    if(signedIn&&save()===false){
      globalThis.alert?.("No se pudo guardar el progreso local. Intenta cerrar sesión de nuevo.");
      return false;
    }
    if(signedIn)await logout();
    try{sessionStorage.removeItem("bayona.oauth.attempt.v1");}catch{}
    try{localStorage.removeItem("bayona.entry.role.v1");}catch{}
    navigate(loginEntryUrl(locationLike));
    return true;
  }finally{leaving=false;}
}
export function installSessionExit(){
 const top=document.querySelector("#topbar .top-right");
 const rail=document.getElementById("panel-nav");
 if(!top||!rail)return;
 const create=(className)=>{
   const b=document.createElement("button");
   b.type="button";b.className=className;b.dataset.sessionExit="1";
   b.setAttribute("aria-label","Salir de BAYONA o cambiar de cuenta");
   b.addEventListener("click",async()=>{
     if(b.disabled)return;
     b.disabled=true;
     b.textContent="Saliendo…";
     try{await exitBayona();}catch(err){
       globalThis.alert?.("No se pudo cerrar sesión. Vuelve a intentarlo.");
       console.error("BAYONA: fallo al salir",err);
     }finally{b.disabled=false;update();}
   });
   return b;
 };
 const topButton=document.getElementById("bayona-session-exit")||create("bayona-session-exit");
 topButton.id="bayona-session-exit";
 if(!topButton.isConnected)top.append(topButton);
 const athleteButton=rail.querySelector("[data-session-exit=athlete]")||create("rail-btn one-session-rail-exit");
 athleteButton.dataset.sessionExit="athlete";
 if(!athleteButton.isConnected)rail.append(athleteButton);
 const coachButton=rail.querySelector("[data-session-exit=coach]")||create("rail-btn one-session-rail-exit one-role-coach-nav");
 coachButton.dataset.sessionExit="coach";
 if(!coachButton.isConnected)rail.append(coachButton);
 const update=()=>{
   const text=exitActionLabel(Boolean(currentSession()));
   for(const item of [topButton,athleteButton,coachButton])item.textContent=text;
 };
 update();
 onAuth(update);
}
