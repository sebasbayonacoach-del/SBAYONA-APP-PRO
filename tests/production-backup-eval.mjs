import { strict as assert } from "node:assert";
import { portableBackup } from "../js/cloud-backup.js";

let pass=0;
const ok=(cond,msg)=>{assert.ok(cond,msg);pass++;console.log("  ✅ "+msg);};

console.log("\nPRODUCTION BACKUP CLOUD\n");

const sample={
  schema:11,
  profile:{name:"Ana",goal:"Fuerza"},
  stats:{workouts:12},
  voice:[{id:"v1",label:"nota",dataUrl:"data:audio/webm;base64,SECRET"}],
  photos:[{id:"p1",at:"2026-10-08",dataUrl:"data:image/jpeg;base64,SECRET"}],
  nested:{blobUrl:"blob:https://example.test/abc",safe:"ok"},
};

const one=await portableBackup(sample);
const two=await portableBackup(sample);
ok(one.schemaVersion===11,"backup conserva schema");
ok(one.checksum===two.checksum&&/^[a-f0-9]{64}$/.test(one.checksum),"checksum SHA-256 es determinista");
ok(one.bytes>0&&one.bytes<1_000_000,"backup mide tamaño antes de subir");
ok(!("dataUrl" in one.payload.voice[0]),"backup excluye binario de voz");
ok(!("dataUrl" in one.payload.photos[0]),"backup excluye binario de foto");
ok(!("blobUrl" in one.payload.nested)&&one.payload.nested.safe==="ok","backup elimina URL blob y conserva estado");
ok(sample.voice[0].dataUrl.includes("SECRET"),"sanitización no muta estado original");

let rejected=false;
try{await portableBackup({schema:11,huge:"x".repeat(1_050_000)});}catch(e){rejected=e.message==="backup_too_large";}
ok(rejected,"backup superior a 1 MB se rechaza");

console.log(`\nRESULTADO: ${pass} pass · 0 fail\n`);
