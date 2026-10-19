// BAYONA Character AI MVP: photo -> stylized reusable character -> real WebM.
// Consent before photo processing; original picture never uploaded here.
import {S} from "../state.js";
import {t} from "../i18n.js";
import {processFace,loadFaceImage} from "../face.js";
import {RECETAS} from "../nutricion.js";
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
  make("h2","","Una foto. Tu personaje. Tu receta."),
  make("p","","Transforma una foto que tengas permiso para utilizar en un personaje ilustrado. Crea un vídeo vertical de cocina con él, sin subir la fotografía original."));
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
  make("h3","","Elige una receta"),
  make("p","","Tu personaje te acompaña en una historia breve con ingredientes y pasos. Los valores nutricionales son estimaciones, no un plan clínico."));
 const select=make("select","character-recipe");
 select.setAttribute("aria-label",t("character.recipeAria"));
 for(const recipe of RECETAS){
  const o=make("option","",recipe.nombre);o.value=recipe.id;select.append(o);
 }
 const ingredients=make("div","character-recipe-details");
 recipeCard.append(select,ingredients);
 const actionCard=make("div","character-box character-actions");
 actionCard.append(make("span","character-step","03 / CREA"),
  make("h3","","Tu reel de cocina"),
  make("p","","Vídeo de 8 segundos en vertical, con tu personaje, pasos y subtítulos. Se guarda como WebM sin voz sintética."));
 const record=press("Crear vídeo de mi receta","character-primary",()=>recordVideo());
 const poster=press("Guardar portada PNG","character-secondary",()=>savePoster());
 const progress=make("div","character-progress");
 progress.setAttribute("role","progressbar");progress.setAttribute("aria-label",t("character.progressAria"));
 progress.setAttribute("aria-valuemin","0");progress.setAttribute("aria-valuemax","100");progress.setAttribute("aria-valuenow","0");
 const progressFill=make("i","");progress.append(progressFill);
 const result=make("p","character-status","");
 result.setAttribute("role","status");result.setAttribute("aria-live","polite");
 actionCard.append(record,poster,progress,result);
 setup.append(photoCard,recipeCard,actionCard);
 const stage=make("div","character-stage");
 const frame=make("div","character-stage-inner");
 const canvas=make("canvas","character-canvas");
 canvas.width=CHARACTER_WIDTH;canvas.height=CHARACTER_HEIGHT;
 canvas.setAttribute("aria-label",t("character.canvasAria"));
 const stamp=make("span","character-stage-caption","VISTA PREVIA · 9:16");
 frame.append(canvas,stamp);stage.append(frame);
 const foot=make("p","character-privacy","Vídeos creados localmente. No hay subida automática ni clonación de voz. Si un archivo incluye tu rostro, evita compartirlo sin revisar el resultado.");
 stage.append(foot);
 grid.append(setup,stage);root.append(grid);
 parent.append(root);

 const ctx=canvas.getContext("2d",{alpha:false});
 let avatar=null,recipe=RECETAS[0],running=false,alive=true,frameId=0,started=performance.now(),lastDraw=0;
 const notice=(value,error=false)=>{
  status.textContent=value;status.dataset.error=String(error);
 };
 const refreshRecipe=()=>{
  recipe=RECETAS.find(r=>r.id===select.value)||RECETAS[0];
  ingredients.replaceChildren(make("strong","",recipe.tipo+" · "+recipe.kcal+" kcal aprox."));
  const ul=make("ul","");
  for(const item of recipe.ingredientes){ul.append(make("li","",item));}
  ingredients.append(ul);
  started=performance.now();
 };
 select.addEventListener("change",refreshRecipe);refreshRecipe();

 const draw=(elapsed=0)=>drawCharacterFrame(ctx,{
  recipe,image:avatar,elapsed,displayName:S.data?.profile?.name||"TU PERSONAJE"
 });
 const loop=(now)=>{
  if(!alive || !root.isConnected || running)return;
  if(canUse() && now-lastDraw>56){draw((now-started)%CHARACTER_DURATION_MS);lastDraw=now;}
  frameId=requestAnimationFrame(loop);
 };
 frameId=requestAnimationFrame(loop);
 // Clean up when parent content is replaced, with no persistent global listener.
 const watcher=new MutationObserver(()=>{
  if(!root.isConnected){
   alive=false;cancelAnimationFrame(frameId);watcher.disconnect();
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
  result.textContent=t("character.recording");
  let device;
  try{
   draw(0);
   device=createVideoRecorder(canvas,{mime});
   const start=performance.now();
   await new Promise((resolve,reject)=>{
    const advance=now=>{
     const elapsed=Math.min(now-start,CHARACTER_DURATION_MS);
     if(!root.isConnected){
      device.recorder.stop();reject(new Error("Se cerró el estudio."));return;
     }
     draw(elapsed);
     const percent=Math.round(elapsed/CHARACTER_DURATION_MS*100);
     progressFill.style.width=percent+"%";
     progress.setAttribute("aria-valuenow",String(percent));
     if(elapsed<CHARACTER_DURATION_MS){frameId=requestAnimationFrame(advance);}
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
   running=false;record.disabled=false;select.disabled=false;poster.disabled=false;
   started=performance.now();frameId=requestAnimationFrame(loop);
  }
 }
 return {root,canvas,select,input,permission,store,record,poster,status,result};
}
