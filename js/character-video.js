// BAYONA Character Studio · private, browser-only storyboard video.
// No backend calls, cloned voice, generative identity spoofing or asset upload.
export const CHARACTER_DURATION_MS=8000;
export const CHARACTER_WIDTH=540;
export const CHARACTER_HEIGHT=960;
export const PHOTO_MAX_BYTES=8*1024*1024;
export const ACCEPTED_IMAGES=Object.freeze(["image/jpeg","image/png","image/webp"]);
export function validateAvatarPhoto(file){
 if(!file||!ACCEPTED_IMAGES.includes(file.type))return "Selecciona una foto JPG, PNG o WebP.";
 if(file.size>PHOTO_MAX_BYTES)return "La foto supera 8 MB. Elige una imagen más pequeña.";
 if(file.size<=0)return "La foto está vacía.";
 return "";
}
export function storyboard(recipe){
 if(!recipe || !Array.isArray(recipe.pasos) || !Array.isArray(recipe.ingredientes))throw Error("Receta no válida");
 return [
  {at:0,label:"HOY COCINAMOS",headline:recipe.nombre,sub:"TU PERSONAJE · TU RECETA"},
  {at:1700,label:"INGREDIENTES",headline:"Lo que necesitas",sub:recipe.ingredientes.slice(0,4).join(" • ")},
  {at:3400,label:"PASO 01",headline:recipe.pasos[0]||"Prepara tus ingredientes.",sub:"COCINAMOS JUNTOS"},
  {at:4800,label:"PASO 02",headline:recipe.pasos[1]||"Combina todo con cuidado.",sub:"COCINAMOS JUNTOS"},
  {at:6100,label:"PASO 03",headline:recipe.pasos[2]||"Sirve y disfruta.",sub:"CASI LISTO"},
  {at:7350,label:"HECHO PARA TI",headline:"¡Buen provecho!",sub:"BAYONA · CONTINÚA TU AVENTURA"}
 ];
}
export function pickStage(recipe,elapsed){
 const frames=storyboard(recipe);
 return frames.reduce((current,frame)=>elapsed>=frame.at?frame:current,frames[0]);
}
export function videoMime(MediaRecorderClass=globalThis.MediaRecorder){
 if(!MediaRecorderClass)return null;
 for(const type of ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"]){
  if(MediaRecorderClass.isTypeSupported?.(type))return type;
 }
 return null;
}
export function safeVideoName(recipe){
 return "BAYONA_"+String(recipe?.nombre||"RECETA").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,65)+".webm";
}
function rr(ctx,x,y,w,h,r,fill){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
}
function line(ctx,text,x,y,maxWidth,size=26,weight=800,color="#fff"){
 ctx.fillStyle=color;ctx.font=weight+" "+size+"px Inter, Arial, sans-serif";
 const words=String(text).split(/\s+/);
 let lines=[],row="";
 for(const word of words){
  const proposal=row?row+" "+word:word;
  if(ctx.measureText(proposal).width>maxWidth&&row){lines.push(row);row=word;}
  else row=proposal;
 }
 if(row)lines.push(row);
 for(const [i,content] of lines.slice(0,5).entries())ctx.fillText(content,x,y+i*size*1.28);
 return Math.min(lines.length,5)*size*1.28;
}
function drawAvatar(ctx,img,t,{speaking=false,voiceLevel=0,kind="food"}={}){
 ctx.save();
 const bounce=Math.sin(t/300)*7;
 ctx.translate(273,390+bounce);
 const gym=kind==="exercise";
 // torso + two cooking arms
 ctx.fillStyle="#171f23";
 ctx.beginPath();ctx.ellipse(0,142,122,135,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#f3a46b";
 const armOffset=gym?Math.sin(t/440)*28:0;
 ctx.beginPath();ctx.ellipse(-117,160-armOffset,27,72,-.43,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.ellipse(118,150+armOffset,27,70,.48,0,Math.PI*2);ctx.fill();
 rr(ctx,-84,73,168,130,24,"#f1f1ea");
 ctx.fillStyle="#171f23";ctx.font="900 41px Inter,Arial,sans-serif";ctx.textAlign="center";ctx.fillText("B",0,155);
 // stylized frame, user's real features stay in consented image.
 ctx.beginPath();ctx.arc(0,0,105,0,Math.PI*2);ctx.fillStyle="#f7b17d";ctx.fill();
 if(img){
  ctx.save();ctx.beginPath();ctx.arc(0,0,95,0,Math.PI*2);ctx.clip();
  ctx.filter="contrast(1.16) saturate(.85)";
  ctx.drawImage(img,-96,-96,192,192);ctx.restore();
 }else{
  ctx.fillStyle="#172024";ctx.font="900 112px Inter,Arial";ctx.fillText("B",0,37);
 }
 // Stylized microphone/mouth indicator: volume-reactive, not phoneme-level lip sync.
 if(speaking){
   const mouth=Math.max(5,Math.round(voiceLevel*36));
   rr(ctx,-19,48,38,mouth,Math.min(12,mouth/2),"#401e21");
   ctx.strokeStyle="#fbc3a0";ctx.lineWidth=3;
   ctx.beginPath();ctx.moveTo(-15,49);ctx.lineTo(15,49);ctx.stroke();
 }
 ctx.lineWidth=7;ctx.strokeStyle="#ffd6ac";ctx.beginPath();ctx.arc(0,0,101,0,Math.PI*2);ctx.stroke();
 ctx.restore();
}
function drawKitchen(ctx,t,{kind="food"}={}){
 // illustrated kitchen; no external images or copyrighted third-party media.
 rr(ctx,0,0,540,960,0,"#10181c");
 const grad=ctx.createLinearGradient(0,0,540,720);
 grad.addColorStop(0,"#29383e");grad.addColorStop(1,"#111b1f");
 ctx.fillStyle=grad;ctx.fillRect(0,0,540,720);
 rr(ctx,30,186,480,395,28,"#253339");
 for(let i=0;i<4;i++)rr(ctx,60+i*115,207,98,15,5,"#3c5054");
 rr(ctx,0,604,540,356,0,"#161d21");
 rr(ctx,0,666,540,7,0,"#efa56c");
 if(kind==="exercise"){
  rr(ctx,25,682,490,24,9,"#7d8e88");
  rr(ctx,40,704,460,9,4,"#f0ab76");
  ctx.fillStyle="#efd0a5";ctx.font="900 27px Inter,Arial";ctx.fillText("ENTRENA CON TU PERSONAJE",62,778);
  return;
 }
 ctx.fillStyle="#a76e4a";ctx.beginPath();ctx.ellipse(270,742,178,52,0,0,2*Math.PI);ctx.fill();
 ctx.fillStyle="#e6d5ba";ctx.beginPath();ctx.ellipse(270,722,145,43,0,0,2*Math.PI);ctx.fill();
 ctx.fillStyle="#64966c";ctx.beginPath();ctx.ellipse(255,713,78,19,.4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#ec9a57";ctx.beginPath();ctx.ellipse(301,730,50,16,-.35,0,Math.PI*2);ctx.fill();
 for(let i=0;i<4;i++){
  const x=220+i*25;
  ctx.strokeStyle="#d9e0d4";ctx.lineWidth=4;ctx.globalAlpha=.3;
  ctx.beginPath();ctx.moveTo(x,649);ctx.bezierCurveTo(x-12,619+Math.sin(t/400+i)*4,x+15,600,x,574);ctx.stroke();
 }
 ctx.globalAlpha=1;
}
export function drawCharacterFrame(ctx,{recipe,image=null,elapsed=0,displayName="TU PERSONAJE",speaking=false,voiceLevel=0,kind="food",durationMs=CHARACTER_DURATION_MS}){
 if(!ctx || !recipe)throw Error("Falta lienzo o receta");
 const t=Math.max(0,Math.min(elapsed,durationMs));
 const stage=pickStage(recipe,t/Math.max(1,durationMs)*CHARACTER_DURATION_MS);
 const W=CHARACTER_WIDTH,H=CHARACTER_HEIGHT;
 if(ctx.canvas.width!==W)ctx.canvas.width=W;
 if(ctx.canvas.height!==H)ctx.canvas.height=H;
 drawKitchen(ctx,t,{kind});
 ctx.fillStyle="#ffbc86";ctx.font="900 22px Inter,Arial,sans-serif";ctx.textAlign="left";
 ctx.fillText("BAYONA / CHARACTER STUDIO",32,52);
 rr(ctx,32,74,476,5,3,"#486065");
 rr(ctx,32,74,476*t/Math.max(1,durationMs),5,3,"#f3a16a");
 drawAvatar(ctx,image,t,{speaking,voiceLevel,kind});
 rr(ctx,20,773,500,166,24,"#182327");
 rr(ctx,36,791,6,99,3,"#ffad76");
 ctx.fillStyle="#ffbc86";ctx.font="800 20px Inter,Arial,sans-serif";ctx.fillText(stage.label,58,820);
 line(ctx,stage.headline,58,867,422,29,900,"#fff4e5");
 // A simple per-scene typographic video, not falsely presented as lip-synced speech.
 ctx.fillStyle="#bacbd0";ctx.font="700 15px Inter,Arial,sans-serif";
 ctx.fillText(String(displayName).slice(0,34).toUpperCase()+" · "+Math.ceil(durationMs/1000)+" S",32,946);
 return stage;
}
export function createVideoRecorder(canvas,{mime,Recorder=globalThis.MediaRecorder,audioTracks=[]}={}){
 if(!canvas?.captureStream || !Recorder)throw Error("Este navegador no admite grabación de lienzo.");
 const supported=mime||videoMime(Recorder);
 if(!supported)throw Error("No hay codificador WebM compatible.");
 const stream=canvas.captureStream(24);
 for(const track of audioTracks)if(track?.kind==="audio")stream.addTrack(track);
 const recorder=new Recorder(stream,{mimeType:supported,videoBitsPerSecond:1_500_000});
 const parts=[];
 const done=new Promise((resolve,reject)=>{
  recorder.addEventListener("dataavailable",e=>{if(e.data?.size>0)parts.push(e.data);});
  recorder.addEventListener("error",e=>reject(e.error||new Error("No se pudo grabar.")),{once:true});
  recorder.addEventListener("stop",()=>{stream.getTracks().forEach(track=>track.stop());
    parts.length?resolve(new Blob(parts,{type:supported})):reject(new Error("No se recibieron fotogramas del vídeo."));
  },{once:true});
 });
 recorder.start(200);
 return {recorder,done};
}
