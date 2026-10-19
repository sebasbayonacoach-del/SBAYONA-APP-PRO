// BAYONA voice module: user's own recording, never cloning, server upload or identity impersonation.
// Consent must precede access to microphone; capped size/duration to protect devices.
export const MAX_VOICE_SECONDS=30;
export const MIN_VOICE_SECONDS=3;
export const MAX_VOICE_BYTES=6*1024*1024;
export const AUDIO_TYPES=["audio/webm;codecs=opus","audio/webm","audio/mp4"];
export function voiceCaptureMime(Recorder=globalThis.MediaRecorder){
 if(!Recorder)return null;
 return AUDIO_TYPES.find(type=>Recorder.isTypeSupported?.(type))||null;
}
export function canUseVoice(file){
 if(!file||file.size===0)return "La grabación está vacía.";
 if(file.size>MAX_VOICE_BYTES)return "La grabación supera 6 MB.";
 if(!/^audio\/(webm|mp4|mpeg|wav|ogg)/.test(file.type||""))return "Elige un audio válido.";
 return "";
}
export async function microphoneSession({mediaDevices=globalThis.navigator?.mediaDevices,Recorder=globalThis.MediaRecorder}={}){
 if(!mediaDevices?.getUserMedia)throw Error("Este navegador no tiene acceso al micrófono.");
 const mime=voiceCaptureMime(Recorder);
 if(!mime)throw Error("No hay un formato de audio compatible.");
 const stream=await mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
 let rec,parts=[],ended=false;
 try{rec=new Recorder(stream,{mimeType:mime,audioBitsPerSecond:96000});}catch(error){stream.getTracks().forEach(t=>t.stop());throw error;}
 const done=new Promise((resolve,reject)=>{
  rec.addEventListener("dataavailable",e=>{if(e.data?.size)parts.push(e.data)});
  rec.addEventListener("error",e=>reject(e.error||new Error("Grabación fallida")),{once:true});
  rec.addEventListener("stop",()=>{
   stream.getTracks().forEach(track=>track.stop());
   const blob=new Blob(parts,{type:mime});
   const issue=canUseVoice(blob);
   issue?reject(new Error(issue)):resolve(blob);
  },{once:true});
 });
 rec.start(250);
 const stop=()=>{if(!ended){ended=true;if(rec.state!=="inactive")rec.stop();}};
 const cancel=()=>{ended=true;if(rec.state!=="inactive")rec.stop();stream.getTracks().forEach(t=>t.stop())};
 return {stop,cancel,done,recorder:rec};
}
export async function prepareVoiceTrack(blob,{AudioContextClass=globalThis.AudioContext}={}){
 if(!AudioContextClass)throw Error("AudioContext no disponible.");
 const ctx=new AudioContextClass();
 try{
  const data=await blob.arrayBuffer();
  const buffer=await ctx.decodeAudioData(data);
  if(buffer.duration<MIN_VOICE_SECONDS)throw Error("Graba al menos 3 segundos.");
  if(buffer.duration>MAX_VOICE_SECONDS+1)throw Error("El audio supera el máximo de 30 segundos.");
  const source=ctx.createBufferSource();
  source.buffer=buffer;
  const analyser=ctx.createAnalyser();
  analyser.fftSize=512;
  const dest=ctx.createMediaStreamDestination();
  source.connect(analyser);
  analyser.connect(dest); // the recording gets audio, speakers do not echo
  const fft=new Uint8Array(analyser.frequencyBinCount);
  const volume=()=>{
    analyser.getByteFrequencyData(fft);
    let sum=0;for(let i=1;i<Math.min(fft.length,80);i++)sum+=fft[i];
    return Math.min(1,sum/79/100);
  };
  let started=false;
  return {
   tracks:dest.stream.getAudioTracks(),
   durationMs:Math.min(MAX_VOICE_SECONDS*1000,buffer.duration*1000),
   volume,
   start(){if(!started){started=true;source.start();}},
   async dispose(){try{source.stop()}catch{};await ctx.close();}
  };
 }catch(e){await ctx.close();throw e;}
}
