// BAYONA PROPLAYER previews. Budget: at most ONE MP4 metadata/thumbnail decoder
// at a time; all other cards display a small canvas frame without keeping
// a network video source alive. No new files, client data or media reuploads.
import {t} from "../i18n.js";

const queue=[];
let loading=false;
let playing=null;
const MAX_FRAME_WIDTH=320;
const isReduced=()=>globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
const isValidUrl=(value)=>{
  if(typeof value!=="string")return false;
  try { const u=new URL(value,globalThis.location?.href||"http://localhost"); return ["https:","http:"].includes(u.protocol); }
  catch {return false;}
};
const observer=typeof IntersectionObserver==="undefined"?null:new IntersectionObserver(entries=>{
 for(const entry of entries){
  if(entry.isIntersecting){
   observer.unobserve(entry.target);
   entry.target.__queuePreview?.();
  }
 }
},{rootMargin:"80px 0px",threshold:0.01});
function pump(){
 if(loading)return;
 while(queue.length){
  const task=queue.shift();
  if(task.disposed())continue;
  loading=true;
  task.start(()=>{loading=false;queueMicrotask(pump);});
  return;
 }
}
const stopPlayback=()=>{
 if(playing){
   playing.__stopPreview?.();
   playing=null;
 }
};
if(typeof document!=="undefined"){
 document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==="v")stopPlayback();
 },{capture:true});
 document.addEventListener("visibilitychange",()=>{if(document.hidden)stopPlayback();});
}

export function makeProplayerPreview({url,name="",openVideo=()=>{}}){
 if(!isValidUrl(url))throw new Error("Vídeo sin URL HTTP válida");
 const wrap=document.createElement("div");
 wrap.className="proplayer-teaser";
 wrap.dataset.preview="pending";
 const canvas=document.createElement("canvas");
 canvas.className="proplayer-teaser-frame";
 canvas.width=320;canvas.height=180;
 canvas.setAttribute("aria-hidden","true");
 const video=document.createElement("video");
 video.className="proplayer-teaser-video";
 video.muted=video.defaultMuted=true;
 video.playsInline=true;
 video.loop=true;
 video.preload="none";
 video.setAttribute("aria-hidden","true");
 video.tabIndex=-1;
 video.disablePictureInPicture=true;
 const status=document.createElement("span");
 status.className="proplayer-teaser-state";
 status.textContent=t("proplayer.preview.loading");
 const open=document.createElement("button");
 open.type="button";
 open.className="proplayer-teaser-open";
 open.setAttribute("aria-label",t("proplayer.preview.open",{name}));
 const icon=document.createElement("span");
 icon.className="proplayer-teaser-play";
 icon.textContent="▶";
 icon.setAttribute("aria-hidden","true");
 const label=document.createElement("span");
 label.className="proplayer-teaser-open-text";
 label.textContent=t("proplayer.preview.watch");
 open.append(icon,label);
 open.addEventListener("click",openVideo);
 wrap.append(canvas,video,status,open);

 let disposed=false,queued=false,hover=false,pendingDone=null,timer=null;
 const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
 const releaseSource=()=>{
   video.pause();
   video.removeAttribute("src");
   video.load();
   video.style.opacity="0";
 };
 const complete=(cb)=>{
   clearTimer();
   if(pendingDone===cb){pendingDone=null;cb();}
 };
 const drawFrame=()=>{
   if(disposed||video.videoWidth<1||video.videoHeight<1)return false;
   try{
     const height=Math.round(MAX_FRAME_WIDTH*video.videoHeight/video.videoWidth);
     canvas.width=MAX_FRAME_WIDTH;
     canvas.height=Math.max(1,height);
     canvas.getContext("2d",{alpha:false}).drawImage(video,0,0,canvas.width,canvas.height);
     wrap.dataset.preview="ready";
     status.textContent=t("proplayer.preview.ready");
     return true;
   }catch{return false;}
 };
 const onError=()=>{
   if(disposed)return;
   if(pendingDone){
     const cb=pendingDone;pendingDone=null;clearTimer();
     wrap.dataset.preview="error";
     status.textContent=t("proplayer.preview.error");
     releaseSource();
     cb();
   } else if(hover) {
     wrap.dataset.preview=wrap.dataset.preview==="ready"?"ready":"error";
     releaseSource();
   }
 };
 const onFrame=()=>{
   if(!pendingDone||disposed)return;
   if(!video.videoWidth||video.readyState<2)return;
   const cb=pendingDone;
   drawFrame();
   releaseSource();
   complete(cb);
 };
 const onMetadata=()=>{
   if(disposed||!pendingDone)return;
   if(video.duration>0.5){
      try{video.currentTime=Math.min(0.42,video.duration*.08);}catch{}
   } else if(video.readyState>=2)onFrame();
 };
 video.addEventListener("loadedmetadata",onMetadata);
 video.addEventListener("loadeddata",()=>{if(pendingDone && !video.seeking)onFrame();});
 video.addEventListener("seeked",onFrame);
 video.addEventListener("error",onError);

 const queueFrame=()=>{
   if(disposed||queued||wrap.dataset.preview==="ready")return;
   queued=true;
   queue.push({wrap,disposed:()=>disposed,start:cb=>{
      if(disposed){cb();return;}
      pendingDone=cb;
      timer=setTimeout(onError,8000);
      video.preload="metadata";
      video.src=url;
      video.load();
   }});
   pump();
 };
 wrap.__queuePreview=queueFrame;
 const pauseHover=()=>{
   hover=false;
   if(playing===wrap)playing=null;
   if(!pendingDone)releaseSource();
 };
 const beginHover=()=>{
   if(disposed||isReduced())return;
   hover=true;
   if(playing&&playing!==wrap)playing.__stopPreview?.();
   playing=wrap;
   if(pendingDone)return;
   video.preload="auto";
   video.src=url;
   video.style.opacity="1";
   video.play().catch(()=>{video.style.opacity="0";});
 };
 wrap.addEventListener("pointerenter",beginHover);
 wrap.addEventListener("pointerleave",pauseHover);
 wrap.addEventListener("focusout",pauseHover);
 wrap.__stopPreview=pauseHover;
 wrap.__disposePreview=()=>{
   disposed=true;
   observer?.unobserve(wrap);
   const position=queue.findIndex(x=>x.wrap===wrap);
   if(position>=0)queue.splice(position,1);
   if(pendingDone){const cb=pendingDone;pendingDone=null;clearTimer();cb();}
   pauseHover();
   releaseSource();
 };
 if(observer)observer.observe(wrap);else queueFrame();
 return wrap;
}
export function disposeProplayerPreviews(parent){
 parent.querySelectorAll(".proplayer-teaser").forEach(node=>node.__disposePreview?.());
}
