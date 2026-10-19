// BAYONA Character AI MVP: photo -> stylized reusable character -> real WebM.
// Consent before photo processing; original picture never uploaded here.
import {S} from "../state.js";
import {t} from "../i18n.js";
import {processFace,loadFaceImage} from "../face.js";
import {RECETAS} from "../nutricion.js";
import {AVATAR_EXERCISES,narrationFor} from "../character-exercises.js";
import {MAX_VOICE_SECONDS,MIN_VOICE_SECONDS,canUseVoice,microphoneSession,prepareVoiceTrack} from "../character-voice.js";
import {CHARACTER_WIDTH,CHARACTER_HEIGHT,CHARACTER_DURATION_MS,validateAvatarPhoto,
  drawCharacterFrame,videoMime,createVideoRecorder,safeVideoName} from "../character-video.js";

const make=(tag,cls="",text)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(text!==undefined)el.textContent=String(text);
 return el;
};
const press=(text,cls,callback)=>{
 const el=make("button",cls,text);
 el.type="button";el.addEventListener("click",callback);
 return el;
};
const canUse=()=>!document.hidden;
export function mountCharacterStudio(parent){
 const root=make("section","character-studio");
 root.setAttribute("aria-label",t("character.aria"));
 const intro=make("div","character-studio-intro");
 const heading=make("div","");
 heading.append(make("span","character-eyebrow","BAYONA / CHARACTER AI · LABORATORIO"),
  make("h2","","Tu foto. Tu voz. Tu personaje."),
  make("p","","Crea tu personaje ilustrado, graba tu propia voz y presenta recetas o rutinas en vídeos verticales privados sin enviar tus medios a un servidor externo."));
 intro.append(heading,make("span","character-privacy-chip","LOCAL · CONTROLADO POR TI"));
 root.append(intro);
 const grid=make("div","character-studio-grid");
 const setup=make("div","character-studio-controls");
 const photoCard=make("div","character-box");
 photoCard.append(make("span","character-step","01 / IDENTIDAD"),
  make("h3","","Construye tu personaje"),
  make("p","","Usa una foto tuya, o una que estés autorizado a utilizar. No se genera una copia realista hablando: es un personaje gráfico animado."));
 const consent=make("label","character-consent");
 const permission=make("input");
 permission.type="checkbox";permission.id="character-photo-consent";
 consent.append(permission,make("span","","Confirmo que puedo usar esta foto para crear un personaje. Si soy menor, cuento con autorización de mi responsable."));
 const input=make("input","character-file");
 input.type="file";input.accept="image/png,image/jpeg,image/webp";
 input.setAttribute("aria-label",t("character.uploadAria"));
 const uploader=make("label","character-upload","Elegir una foto");
 uploader.htmlFor="character-upload-file";input.id="character-upload-file";
 const files=make("div","character-photo-input");
 files.append(uploader,input);
 const storeLabel=make("label","character-consent");
 const store=make("input");store.type="checkbox";
 storeLabel.append(store,make("span","","Guardar mi avatar recortado en mi perfil. Podría sincronizarse con mi cuenta; la foto original no se conserva aquí."));
 const useSaved=press("Usar avatar de mi perfil","character-secondary",()=>useExisting());
 const status=make("p","character-status","Tu foto permanece en tu dispositivo hasta que decidas guardarla en el perfil.");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 photoCard.append(consent,files,storeLabel,useSaved,status);
 const recipeCard=make("div","character-box");
 recipeCard.append(make("span","character-step","02 / HISTORIA"),
  make("h3","","Elige qué hará tu avatar"),
  make("p","","Tu personaje te acompaña en una historia breve con ingredientes y pasos. Los valores nutricionales son estimaciones, no un plan clínico."));
 const mode=make("div","character-mode");
 const mealMode=press("Cocina y alimentación","character-mode-choice selected",()=>setMode("food"));
 const exerciseMode=press("Entrenamiento y movimiento","character-mode-choice",()=>setMode("exercise"));
 mode.append(mealMode,exerciseMode);
 const select=make("select","character-recipe");
 select.setAttribute("aria-label",t("character.recipeAria"));
 for(const recipe of RECETAS){
  const o=make("option","",recipe.nombre);o.value=recipe.id;select.append(o);
 }
 const ingredients=make("div","character-recipe-details");
 const lines=make("p","character-script");
 lines.setAttribute("aria-label",t("character.voiceScriptAria"));
 recipeCard.append(mode,select,ingredients,make("strong","character-script-title","GUION SUGERIDO PARA TU VOZ"),lines);
 const voiceCard=make("div","character-box character-voice");
 voiceCard.append(make("span","character-step","03 / TU VOZ"),
   make("h3","","Ponle tu voz a tu personaje"),
   make("p","","Graba un mensaje de 3 a 30 segundos leyendo el guion, o adjunta un archivo de audio propio. Nunca clonamos tu voz."));
 const voiceConsent=make("label","character-consent");
 const voicePermission=make("input");voicePermission.type="checkbox";
 voicePermission.setAttribute("aria-label",t("character.voiceConsentAria"));
 voiceConsent.append(voicePermission,make("span","","Autorizo usar mi voz para generar este vídeo. Solo grabaré mi propia voz o una con autorización expresa."));
 const startVoice=press("Grabar mi voz","character-secondary",()=>startRecording());
 const stopVoice=press("Detener grabación","character-secondary",()=>stopRecording());
 stopVoice.disabled=true;
 const voiceFile=make("input","character-audio-file");voiceFile.type="file";
 voiceFile.accept="audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/ogg";
 voiceFile.setAttribute("aria-label",t("character.voiceFileAria"));
 const voiceStatus=make("p","character-status","Todavía no hay una grabación de voz.");
 voiceStatus.setAttribute("role","status");
 const voicePreview=make("audio","character-audio-preview");
 voicePreview.controls=true;voicePreview.hidden=true;
 const forgetVoice=press("Eliminar la voz cargada","character-secondary",()=>clearVoice());
 const voiceButtons=make("div","character-voice-buttons");voiceButtons.append(startVoice,stopVoice);
 voiceCard.append(voiceConsent,voiceButtons,voiceFile,voicePreview,voiceStatus,forgetVoice);
 voiceFile.addEventListener("change",async()=>{
   const file=voiceFile.files?.[0];if(!file)return;
   if(!voicePermission.checked){voiceStatus.textContent=t("character.voiceNeedConsent");voiceFile.value="";return;}
   const problem=canUseVoice(file);
   if(problem){voiceStatus.textContent=problem;voiceFile.value="";return;}
   const ok=await setVoice(file);
   if(!ok)voiceStatus.textContent=t("character.voiceInvalid");
   voiceFile.value="";
 });
 const actionCard=make("div","character-box character-actions");
 const videoTitle=make("h3","","Tu reel de cocina");
 const videoDescription=make("p","","Vídeo vertical WebM con tu avatar hablando con tu grabación original. Sin audio, genera una versión silenciosa de 8 segundos.");
 actionCard.append(make("span","character-step","04 / CREA"),videoTitle,videoDescription);
 const record=press("Crear vídeo de mi receta","character-primary",()=>recordVideo());
 const poster=press("Guardar portada PNG","character-secondary",()=>savePoster());
 const progress=make("div","character-progress");
 progress.setAttribute("role","progressbar");progress.setAttribute("aria-label",t("character.progressAria"));
 progress.setAttribute("aria-valuemin","0");progress.setAttribute("aria-valuemax","100");progress.setAttribute("aria-valuenow","0");
 const progressFill=make("i","");progress.append(progressFill);
 const result=make("p","character-status","");
 result.setAttribute("role","status");result.setAttribute("aria-live","polite");
 actionCard.append(record,poster,progress,result);
 setup.append(photoCard,recipeCard,voiceCard,actionCard);
 const stage=make("div","character-stage");
 const frame=make("div","character-stage-inner");
 const canvas=make("canvas","character-canvas");
 canvas.width=CHARACTER_WIDTH;canvas.height=CHARACTER_HEIGHT;
 canvas.setAttribute("aria-label",t("character.canvasAria"));
 const stamp=make("span","character-stage-caption","VISTA PREVIA · 9:16");
 frame.append(canvas,stamp);stage.append(frame);
 const foot=make("p","character-privacy","Grabación, foto y voz procesadas localmente. La voz no se guarda en tu perfil. Esto no es clonación de voz ni una demostración biomecánica real.");
 stage.append(foot);
 grid.append(setup,stage);root.append(grid);
 parent.append(root);

 const ctx=canvas.getContext("2d",{alpha:false});
 let avatar=null,recipe=RECETAS[0],currentMode="food",running=false,alive=true,frameId=0,started=performance.now(),lastDraw=0;
 let voiceBlob=null,voiceUrl=null,voiceHandle=null,recordTimer=0,voiceDuration=0,latestLevel=0;
 const notice=(value,error=false)=>{
  status.textContent=value;status.dataset.error=String(error);
 };
 function setMode(next){
  if(running)return;
  currentMode=next==="exercise"?"exercise":"food";
  mealMode.classList.toggle("selected",currentMode==="food");
  exerciseMode.classList.toggle("selected",currentMode==="exercise");
  select.replaceChildren();
  const training=currentMode==="exercise";
  videoTitle.textContent=training?"Tu mensaje de entrenamiento":"Tu reel de cocina";
  videoDescription.textContent=training?
    "Vídeo vertical con el avatar presentando indicaciones generales. Los gestos son ilustrativos; para técnica real consulta la biblioteca PROPLAYER.":
    "Vídeo vertical con tu avatar narrando la receta. Sin audio, genera una versión silenciosa de 8 segundos.";
  record.textContent=training?"Crear vídeo de entrenamiento":"Crear vídeo de mi receta";
  const collection=training?AVATAR_EXERCISES:RECETAS;
  for(const item of collection){const opt=make("option","",item.nombre);opt.value=item.id;select.append(opt);}
  refreshRecipe();
 }
 const refreshRecipe=()=>{
  const all=currentMode==="food"?RECETAS:AVATAR_EXERCISES;
  recipe=all.find(r=>r.id===select.value)||all[0];
  ingredients.replaceChildren(make("strong","",currentMode==="food"?
    recipe.tipo+" · "+recipe.kcal+" kcal aprox.":recipe.tipo+" · ORIENTACIÓN GENERAL"));
  const ul=make("ul","");
  for(const item of recipe.ingredientes){ul.append(make("li","",item));}
  ingredients.append(ul);
  lines.textContent=narrationFor(recipe);
  started=performance.now();
 };
 select.addEventListener("change",refreshRecipe);setMode("food");

 const draw=(elapsed=0)=>drawCharacterFrame(ctx,{
  recipe,image:avatar,elapsed,displayName:S.data?.profile?.name||"TU PERSONAJE",
  speaking:Boolean(voiceBlob),voiceLevel:latestLevel,kind:currentMode,
  durationMs:voiceDuration?voiceDuration*1000:CHARACTER_DURATION_MS
 });
 const loop=(now)=>{
  if(!alive || !root.isConnected || running)return;
  if(canUse() && now-lastDraw>56){draw((now-started)%(voiceDuration?voiceDuration*1000:CHARACTER_DURATION_MS));lastDraw=now;}
  frameId=requestAnimationFrame(loop);
 };
 frameId=requestAnimationFrame(loop);
 async function setVoice(blob){
  let decoded;
  try{decoded=await prepareVoiceTrack(blob);}catch(e){
   voiceStatus.textContent=e.message;return false;
  }
  const duration=decoded.durationMs/1000;
  await decoded.dispose();
  if(voiceUrl)URL.revokeObjectURL(voiceUrl);
  voiceBlob=blob;
  voiceDuration=duration;
  voiceUrl=URL.createObjectURL(blob);
  voicePreview.src=voiceUrl;
  voicePreview.hidden=false;
  voiceStatus.textContent=t("character.voiceReady")+duration.toFixed(1)+" s.";
  draw(0);
  return true;
 }
 function clearVoice(){
   if(voiceUrl)URL.revokeObjectURL(voiceUrl);
   voiceUrl=null;voiceBlob=null;voiceDuration=0;voicePreview.pause();
   voicePreview.removeAttribute("src");voicePreview.hidden=true;
   voiceStatus.textContent=t("character.voiceCleared");
   draw(0);
 }
 async function startRecording(){
  if(!voicePermission.checked){voiceStatus.textContent=t("character.voiceNeedConsent");return;}
  if(running||voiceHandle)return;
  try{
   voiceHandle=await microphoneSession();
   voiceStatus.textContent=t("character.voiceRecording");
   startVoice.disabled=true;stopVoice.disabled=false;
   recordTimer=setTimeout(()=>stopRecording(),MAX_VOICE_SECONDS*1000);
  }catch(e){voiceStatus.textContent=t("character.voiceMicError")+e.message;}
 }
 async function stopRecording(){
  if(!voiceHandle)return;
  const session=voiceHandle;voiceHandle=null;
  clearTimeout(recordTimer);startVoice.disabled=false;stopVoice.disabled=true;
  session.stop();
  try{const blob=await session.done;await setVoice(blob);}
  catch(e){voiceStatus.textContent=t("character.voiceSaveError")+e.message;}
 }
 // Clean up when parent content is replaced, with no persistent global listener.
 const watcher=new MutationObserver(()=>{
  if(!root.isConnected){
   alive=false;cancelAnimationFrame(frameId);watcher.disconnect();
   clearTimeout(recordTimer);voiceHandle?.cancel();voiceHandle=null;
   if(voiceUrl)URL.revokeObjectURL(voiceUrl);
  }
 });
 watcher.observe(parent,{childList:true});
 async function useExisting(){
  if(!permission.checked){notice("Marca primero la autorización de uso de la imagen.",true);return;}
  const url=S.data?.profile?.face;
  if(!url){notice("No hay un avatar guardado en el perfil. Selecciona una foto.",true);return;}
  avatar=await loadFaceImage(url);
  if(!avatar){notice("No se pudo cargar el avatar guardado.",true);return;}
  notice("Personaje de tu perfil listo.");draw();
 }
 input.addEventListener("change",async()=>{
  const file=input.files?.[0];if(!file)return;
  if(!permission.checked){notice("Confirma primero el permiso para usar la fotografía.",true);input.value="";return;}
  const issue=validateAvatarPhoto(file);
  if(issue){notice(issue,true);input.value="";return;}
  notice("Preparando tu personaje…");
  try{
   const processed=await processFace(file);
   const image=await loadFaceImage(processed.face);
   if(!image)throw Error("No se pudo procesar la imagen.");
   avatar=image;
   if(store.checked){
    S.data.profile.face=processed.face;
    S.save();
    notice("Personaje creado y guardado en tu perfil. Puede sincronizarse con la cuenta.");
   }else notice("Personaje creado solo para esta sesión. No se guardó la fotografía.");
   draw();
  }catch(e){notice("No se pudo leer esa fotografía. Prueba con un PNG o JPG.",true);}
  finally{input.value="";}
 });
 function download(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
 }
 function savePoster(){
  if(!permission.checked||!avatar){result.textContent=t("character.requirePhoto");return;}
  draw(2200);
  canvas.toBlob(blob=>{
   if(blob){download(blob,safeVideoName(recipe).replace(/\.webm$/,".png"));result.textContent=t("character.savedPoster");}
   else result.textContent=t("character.posterError");
  },"image/png");
 }
 async function recordVideo(){
  if(running)return;
  if(!permission.checked||!avatar){result.textContent=t("character.requirePhoto");return;}
  const mime=videoMime();
  if(!mime){
   result.textContent=t("character.noWebm");
   return;
  }
  running=true;cancelAnimationFrame(frameId);
  record.disabled=true;select.disabled=true;poster.disabled=true;
  mealMode.disabled=true;exerciseMode.disabled=true;
  result.textContent=t("character.recording");
  let device,voice=null;
  try{
   draw(0);
   if(voiceBlob)voice=await prepareVoiceTrack(voiceBlob);
   const durationMs=voice?.durationMs||CHARACTER_DURATION_MS;
   device=createVideoRecorder(canvas,{mime,audioTracks:voice?.tracks||[]});
   voice?.start();
   const start=performance.now();
   await new Promise((resolve,reject)=>{
    const advance=now=>{
     const elapsed=Math.min(now-start,durationMs);
     latestLevel=voice?.volume()||0;
     if(!root.isConnected){
      device.recorder.stop();reject(new Error("Se cerró el estudio."));return;
     }
     draw(elapsed);
     const percent=Math.round(elapsed/durationMs*100);
     progressFill.style.width=percent+"%";
     progress.setAttribute("aria-valuenow",String(percent));
     if(elapsed<durationMs){frameId=requestAnimationFrame(advance);}
     else{device.recorder.stop();resolve();}
    };
    frameId=requestAnimationFrame(advance);
   });
   const video=await device.done;
   download(video,safeVideoName(recipe));
   result.textContent=t("character.savedVideo");
  }catch(error){
   result.textContent=t("character.error")+(error?.message||"error del navegador");
   if(device?.recorder?.state==="recording")device.recorder.stop();
  }finally{
   await voice?.dispose().catch(()=>{});
   running=false;latestLevel=0;record.disabled=false;select.disabled=false;poster.disabled=false;
   mealMode.disabled=false;exerciseMode.disabled=false;
   started=performance.now();frameId=requestAnimationFrame(loop);
  }
 }
 return {root,canvas,select,input,permission,store,record,poster,status,result,
   voicePermission,startVoice,stopVoice,voiceFile,voicePreview,voiceStatus,mealMode,exerciseMode};
}
