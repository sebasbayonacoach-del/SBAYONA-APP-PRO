import {t} from "../i18n.js";
// BAYONA PROPLAYER · real frame previews from existing video origins.
// Lazy: no video bytes downloaded until its card is visible.
// One hover animation at a time to protect RAM/GPU. No media republishing.
let playing = null;
const motionReduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

const observer = typeof IntersectionObserver === "undefined" ? null :
  new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      entry.target.__loadPreview?.();
    }
  }, {rootMargin:"100px 0px",threshold:0.01});

export function makeProplayerPreview({url, name="", openVideo=()=>{}}) {
  if (typeof url !== "string" || !/^https?:\/\//.test(new URL(url, location.href).href)) {
    throw new Error("Vídeo sin URL HTTP válida");
  }
  const wrap=document.createElement("div");
  wrap.className="proplayer-teaser";
  wrap.dataset.preview="pending";
  const video=document.createElement("video");
  video.className="proplayer-teaser-video";
  video.muted=true;
  video.defaultMuted=true;
  video.loop=true;
  video.playsInline=true;
  video.autoplay=false;
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
  open.setAttribute("aria-label",t("proplayer.preview.open", {name}));
  const icon=document.createElement("span");
  icon.className="proplayer-teaser-play";
  icon.textContent="▶";
  icon.setAttribute("aria-hidden","true");
  const word=document.createElement("span");
  word.className="proplayer-teaser-open-text";
  word.textContent=t("proplayer.preview.watch");
  open.append(icon,word);
  open.addEventListener("click",openVideo);
  wrap.append(video,status,open);

  let disposed=false,started=false;
  function freeze() {
    if (playing===video)playing=null;
    video.pause();
    // Preserve the selected poster frame when playback stops.
    if (video.readyState>=2) {
      try {video.currentTime=Math.min(0.45,video.duration>0?video.duration*.1:0.45)}catch{}
    }
  }
  function load() {
    if (started||disposed)return;
    started=true;
    video.preload="metadata";
    video.src=url;
    video.load();
  }
  function ready() {
    if(disposed)return;
    wrap.dataset.preview="ready";
    status.textContent=t("proplayer.preview.ready");
    if (playing!==video) video.pause();
  }
  function failure() {
    if(disposed)return;
    wrap.dataset.preview="error";
    status.textContent=t("proplayer.preview.error");
    video.pause();
  }
  video.addEventListener("loadedmetadata",()=>{
    if(disposed)return;
    // Seek to a meaningful early frame; unlike the original placeholder,
    // the actual frame is decoded from the referenced MP4.
    const target=video.duration>0?Math.min(0.45,Math.max(0,video.duration*.1)):0;
    if (target>0) {
      try {video.currentTime=target}catch{ready()}
    }
  });
  video.addEventListener("loadeddata",ready);
  video.addEventListener("seeked",ready);
  video.addEventListener("error",failure);
  wrap.addEventListener("pointerenter",()=>{
    if(disposed||motionReduced())return;
    if(!started)load();
    if(playing&&playing!==video)playing.pause();
    playing=video;
    if(video.readyState>=2) {
      video.play().catch(()=>{if(playing===video)playing=null;});
    } else {
      video.addEventListener("loadeddata",()=>{if(!disposed && wrap.matches(":hover"))video.play().catch(()=>{});},{once:true});
    }
  });
  wrap.addEventListener("pointerleave",freeze);
  wrap.addEventListener("focusout",freeze);
  wrap.__pausePreview=freeze;
  wrap.__loadPreview=load;
  wrap.__disposePreview=()=>{
    disposed=true;
    observer?.unobserve(wrap);
    freeze();
    video.removeAttribute("src");
    video.load();
  };
  if(observer)observer.observe(wrap);
  else load();
  return wrap;
}

export function disposeProplayerPreviews(parent) {
  parent.querySelectorAll(".proplayer-teaser").forEach(node => node.__disposePreview?.());
}
