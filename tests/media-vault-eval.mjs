import { strict as assert } from "node:assert";
import {
  MEDIA_DB, MEDIA_STORE, MAX_RECORDING_MS, MAX_VIDEO_BYTES,
  supportsLocalRecording, preferredVideoMime, videoObjectUrl,
} from "../js/media-vault.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};
console.log("\n🎥 MEDIA VAULT · VÍDEO LOCAL\n");

ok(MEDIA_DB==="bayona-media-v1"&&MEDIA_STORE==="exercise-videos","vault tiene nombres estables");
ok(MAX_RECORDING_MS===60000,"grabación se limita a 60 segundos");
ok(MAX_VIDEO_BYTES===12*1024*1024,"vídeo tiene techo de 12 MB");
ok(!supportsLocalRecording({}),"sin APIs no promete grabación");
ok(supportsLocalRecording({indexedDB:{},MediaRecorder:function(){},navigator:{mediaDevices:{getUserMedia(){}}}}),"detecta entorno compatible");
const Fake={isTypeSupported:(x)=>x.includes("vp8")};
ok(preferredVideoMime(Fake).includes("vp8"),"elige mime compatible");
const fakeBlob=new Blob(["x"],{type:"video/webm"});
const url=videoObjectUrl({blob:fakeBlob},{createObjectURL:()=> "blob:test"});
ok(url==="blob:test","crea URL local sin subir el vídeo");

console.log(`\n📊 RESULTADO: ${pass} pass · 0 fail\n`);
