// BAYONA — vault local de vídeo por ejercicio.
// El Blob vive en IndexedDB del dispositivo. No se sube a red desde este módulo.

export const MEDIA_DB = "bayona-media-v1";
export const MEDIA_STORE = "exercise-videos";
export const MAX_RECORDING_MS = 60_000;
export const MAX_VIDEO_BYTES = 12 * 1024 * 1024;

export function supportsLocalRecording(env = globalThis) {
  return Boolean(env?.indexedDB && env?.MediaRecorder && env?.navigator?.mediaDevices?.getUserMedia);
}

export function preferredVideoMime(MediaRecorderCtor = globalThis.MediaRecorder) {
  const candidates=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
  return candidates.find((x)=>MediaRecorderCtor?.isTypeSupported?.(x)) || "";
}

function openDb(indexedDBImpl = globalThis.indexedDB) {
  return new Promise((resolve,reject)=>{
    if (!indexedDBImpl) return reject(new Error("indexeddb-unavailable"));
    const req=indexedDBImpl.open(MEDIA_DB,1);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE,{keyPath:"exKey"});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error("indexeddb-open-failed"));
  });
}

export async function putExerciseVideo(exKey, blob, meta = {}, indexedDBImpl = globalThis.indexedDB) {
  const key=String(exKey||"").trim();
  if(!key) throw new Error("exercise-required");
  if(!(blob instanceof Blob)) throw new Error("blob-required");
  if(blob.size<=0||blob.size>MAX_VIDEO_BYTES) throw new Error("video-size-invalid");
  const db=await openDb(indexedDBImpl);
  const record={
    exKey:key,
    blob,
    mimeType:blob.type||meta.mimeType||"video/webm",
    size:blob.size,
    durationMs:Math.max(0,Number(meta.durationMs)||0),
    createdAt:new Date().toISOString(),
  };
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readwrite");
    tx.objectStore(MEDIA_STORE).put(record);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error("video-save-failed"));
    tx.onabort=()=>reject(tx.error||new Error("video-save-aborted"));
  });
  db.close();
  return { ...record, blob:undefined };
}

export async function latestExerciseVideo(exKey, indexedDBImpl = globalThis.indexedDB) {
  const key=String(exKey||"").trim();
  if(!key) return null;
  const db=await openDb(indexedDBImpl);
  const rec=await new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readonly");
    const req=tx.objectStore(MEDIA_STORE).get(key);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error||new Error("video-read-failed"));
  });
  db.close();
  return rec;
}

export async function deleteExerciseVideo(exKey, indexedDBImpl = globalThis.indexedDB) {
  const key=String(exKey||"").trim();
  if(!key) return false;
  const db=await openDb(indexedDBImpl);
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(MEDIA_STORE,"readwrite");
    tx.objectStore(MEDIA_STORE).delete(key);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error||new Error("video-delete-failed"));
  });
  db.close();
  return true;
}

export function videoObjectUrl(record, URLImpl = globalThis.URL) {
  return record?.blob && URLImpl?.createObjectURL ? URLImpl.createObjectURL(record.blob) : null;
}
