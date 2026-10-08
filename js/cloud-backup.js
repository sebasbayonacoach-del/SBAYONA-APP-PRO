// BAYONA — cloud backup
// Copia estructurada, sin binarios de voz/fotos, con SHA-256 verificable.

import { insert, select, remove, currentUser, currentSession } from "./sync/supabase.js";
import { respaldar } from "./backup.js";
import { SCHEMA } from "./state.js";

const MAX_BYTES=1_000_000;

function stripBinary(value){
  if(Array.isArray(value))return value.map(stripBinary);
  if(!value||typeof value!=="object")return value;
  const out={};
  for(const [k,v] of Object.entries(value)){
    if(["dataUrl","blobUrl","objectUrl","imageData","audioData","rawFrames"].includes(k))continue;
    out[k]=stripBinary(v);
  }
  return out;
}

function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(",")}]`;
  if(value&&typeof value==="object"){
    return `{${Object.keys(value).sort().map((k)=>JSON.stringify(k)+":"+stable(value[k])).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256(text){
  const bytes=new TextEncoder().encode(text);
  if(globalThis.crypto?.subtle){
    const hash=await crypto.subtle.digest("SHA-256",bytes);
    return [...new Uint8Array(hash)].map((b)=>b.toString(16).padStart(2,"0")).join("");
  }
  throw new Error("crypto_unavailable");
}

export async function portableBackup(data){
  if(!data||typeof data!=="object"||Array.isArray(data))throw new Error("invalid_state");
  const payload=stripBinary(structuredClone(data));
  payload.schema=Number(payload.schema)||SCHEMA;
  const canonical=stable(payload);
  const bytes=new TextEncoder().encode(canonical).length;
  if(bytes>MAX_BYTES)throw new Error("backup_too_large");
  return {payload,bytes,checksum:await sha256(canonical),schemaVersion:payload.schema};
}

export async function saveCloudBackup(S){
  const user=currentUser();
  if(!currentSession()||!user)throw new Error("sign_in_required");
  const b=await portableBackup(S.data);
  const rows=await insert("user_backups",[{
    user_id:user.id,
    schema_version:b.schemaVersion,
    checksum:b.checksum,
    payload:b.payload,
    bytes:b.bytes,
  }]);
  return rows?.[0]||null;
}

export async function listCloudBackups(){
  const user=currentUser();
  if(!currentSession()||!user)return [];
  return await select("user_backups",{
    user_id:`eq.${user.id}`,
    select:"id,schema_version,checksum,bytes,created_at",
    order:"created_at.desc",limit:"5",
  });
}

export async function fetchCloudBackup(id){
  const user=currentUser();
  if(!currentSession()||!user)throw new Error("sign_in_required");
  const rows=await select("user_backups",{
    id:`eq.${id}`,user_id:`eq.${user.id}`,
    select:"id,schema_version,checksum,bytes,created_at,payload",limit:"1",
  });
  const row=rows?.[0];
  if(!row)throw new Error("backup_not_found");
  if(Number(row.schema_version)>SCHEMA)throw new Error("backup_from_newer_app");
  const canonical=stable(row.payload);
  const checksum=await sha256(canonical);
  if(checksum!==row.checksum)throw new Error("backup_checksum_mismatch");
  return row;
}

export async function restoreCloudBackup(S,id){
  const row=await fetchCloudBackup(id);
  if(!row.payload||typeof row.payload!=="object"||Array.isArray(row.payload))throw new Error("invalid_backup");
  respaldar(S.data);
  S.data=structuredClone(row.payload);
  S.migrate();
  if(!S.save())throw new Error("local_save_failed");
  return {ok:true,createdAt:row.created_at,schema:row.schema_version};
}

export async function deleteCloudBackup(id){
  const user=currentUser();
  if(!currentSession()||!user)throw new Error("sign_in_required");
  await remove("user_backups",{id:`eq.${id}`,user_id:`eq.${user.id}`});
  return true;
}
