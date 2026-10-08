import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { getConsents,isGranted,setConsent,revokeConsent,resetConsents } from "../js/consents.js";
let pass=0;
const ok=(yes,text)=>{assert.ok(yes,text);pass++;console.log("PASS "+text)};
const storage=new Map();
let blocked=false;
globalThis.window={};
globalThis.localStorage={
  getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>{if(blocked)throw Error("quota exceeded");storage.set(key,value)},
  removeItem:key=>{if(blocked)throw Error("storage blocked");storage.delete(key)},
};
resetConsents();
ok(!isGranted("recordings"),"grabación denegada inicialmente");
blocked=true;
ok(setConsent("recordings",true)===false,"almacenamiento rechazado implica consentimiento fallido");
ok(!isGranted("recordings"),"una escritura fallida no concede cámara en cache");
blocked=false;
ok(setConsent("recordings",true)===true,"permiso explícito y persistido sí queda concedido");
ok(isGranted("recordings"),"consentimiento exitoso permanece en memoria");
blocked=true;
ok(revokeConsent("recordings")===false,"fallo al persistir revocación es visible");
ok(!isGranted("recordings"),"revocación falla cerrada en esta sesión, nunca habilita cámara");
blocked=false;
ok(setConsent("recordings",true)===true,"se puede aceptar de nuevo explícitamente");
ok(isGranted("recordings"),"el permiso concedido se verifica");
resetConsents();
ok(!isGranted("recordings"),"borrar datos revoca la grabación");

const training=readFileSync(new URL("../js/ui/training.js",import.meta.url),"utf8");
const consent=readFileSync(new URL("../js/consents.js",import.meta.url),"utf8");
ok(training.includes("resolve(Boolean(saved))"),"fallo al guardar permiso bloquea acceso a cámara");
ok(training.includes("discarded=true; // CANCELAR nunca significa guardar"),"cancelar descarta grabación activa");
ok(training.includes("if(discarded){stopTracks();return;}"),"evento onstop cancelado no escribe Blob");
ok(training.includes("UI.session.pendingEvidence=")&&training.includes("persist(); // la referencia"),"vídeo pendiente persiste tras recarga");
ok(!consent.includes("cache = data;\n  const s = store()"),"el almacenamiento no puede conceder permiso de manera anticipada");
console.log("\nRESULTADO "+pass+" verificaciones, cero errores");
