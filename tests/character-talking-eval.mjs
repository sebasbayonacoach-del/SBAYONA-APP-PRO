import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {AVATAR_EXERCISES,narrationFor} from "../js/character-exercises.js";
import {MAX_VOICE_SECONDS,MIN_VOICE_SECONDS,MAX_VOICE_BYTES,canUseVoice,voiceCaptureMime} from "../js/character-voice.js";
import {RECETAS} from "../js/nutricion.js";
import {drawCharacterFrame,createVideoRecorder} from "../js/character-video.js";
assert.equal(MAX_VOICE_SECONDS,30);assert.equal(MIN_VOICE_SECONDS,3);
assert.equal(AVATAR_EXERCISES.length,6);
assert.equal(AVATAR_EXERCISES.filter(e=>e.pasos.length===3).length,6);
assert.match(narrationFor(AVATAR_EXERCISES[0]),/SENTADILLA/);
assert.equal(canUseVoice({type:"audio/webm",size:12000}),"");
assert.equal(canUseVoice({type:"audio/wav",size:100}),"");
assert.match(canUseVoice({type:"audio/png",size:100}),/audio válido/);
assert.match(canUseVoice({type:"audio/webm",size:MAX_VOICE_BYTES+1}),/6 MB/);
assert.match(canUseVoice(null),/vacía/);
assert.equal(voiceCaptureMime(null),null);
assert.equal(voiceCaptureMime({isTypeSupported:t=>t==="audio/webm"}),"audio/webm");
const lines=[];
const fake={
 canvas:{width:540,height:960},
 beginPath(){},roundRect(){},fill(){},ellipse(){},arc(){},fillRect(){},
 stroke(){},moveTo(){},lineTo(){},bezierCurveTo(){},translate(){},save(){},restore(){},
 clip(){},createLinearGradient(){return{addColorStop(){}}},measureText(t){return{width:t.length*13}},fillText(){},
 set fillStyle(v){lines.push(v)},set font(v){},set textAlign(v){},set strokeStyle(v){},set lineWidth(v){},
 set globalAlpha(v){},set filter(v){}
};
const frame=drawCharacterFrame(fake,{recipe:AVATAR_EXERCISES[0],elapsed:1700,kind:"exercise",speaking:true,voiceLevel:.8,durationMs:4000});
assert.equal(frame.label,"PASO 01");
assert.ok(lines.length>15);
const video=readFileSync(new URL("../js/character-video.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../js/ui/character-studio.js",import.meta.url),"utf8");
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
assert.match(video,/stream.addTrack\(track\)/);
assert.match(video,/speaking/);
assert.match(ui,/await microphoneSession\(\)/);
assert.match(ui,/voicePermission\.checked/);
assert.match(ui,/prepareVoiceTrack\(voiceBlob\)/);
assert.match(ui,/await voice\?\.dispose/);
assert.match(ui,/voiceHandle\?\.cancel/);
assert.doesNotMatch(ui,/fetch\(|WebSocket|XMLHttpRequest/);
assert.match(sw,/character-voice\.js/);
assert.match(sw,/character-exercises\.js/);
assert.equal(RECETAS.length,6);
console.log("BAYONA Avatar speaking: 29 assertions PASS");
