// ============================================================
// BAYONA — AVATAR 3D (Avaturn: selfie → personaje de cuerpo completo)
// ------------------------------------------------------------
// Vía VIVA (verificada 2026-09-23): embed web gratis e ilimitado según
// docs.avaturn.me. Subdominio "demo" público sin registro [SUPUESTO];
// Sebastián puede usar el suyo gratis (developer.avaturn.me) cuando quiera
// su marca (override sin tocar código: configure() / window / localStorage).
//
// REGLA ANTI-FALLO: si Avaturn falla, no hay red o el GLB pesa demasiado,
// el personaje con FOTO local sigue en pantalla. Nunca pantalla rota.
//
// Nivel superior PURO (sin three, sin window): testeable en node.
// ============================================================

export const AVATAR3D_PROVIDER = "avaturn";
export const AVATAR3D_RIG_PROFILE = "avaturn-fullbody-v1";
export const AVATAR3D_CACHE = "bayona-avatar3d-v1";
export const AVATAR3D_STORE_KEY = "bayona.avatar3d.v1";
export const AVATAR3D_MAX_BYTES = 15 * 1024 * 1024;
export const AVATAR3D_FETCH_TIMEOUT_MS = 30000;
export const AVATAR3D_DEFAULT_SUBDOMAIN = "demo"; // demo pública de Avaturn [SUPUESTO]

// Las 18 acciones del mundo (mismo contrato que Avatar.setAction).
// El GLB no trae animaciones: el personaje respira, rebota y se agacha
// con la acción activa. Retarget esquelético = fase 2.
export const AVATAR3D_ACTIONS = {
  idle:      { y: 0,     amp: 0.008, freq: 1.5, rx: 0 },
  walk:      { y: 0.015, amp: 0.015, freq: 3.4, rx: 0 },
  squat:     { y: -0.17, amp: 0.17,  freq: 1.8, rx: 0 },
  bench:     { y: -0.3,  amp: 0,     freq: 1.7, rx: 0 },
  press:     { y: -0.01, amp: 0.01,  freq: 1.6, rx: 0 },
  row:       { y: -0.1,  amp: 0,     freq: 1.6, rx: 0.15 },
  pullup:    { y: 0.11,  amp: 0.11,  freq: 1.5, rx: 0 },
  lunge:     { y: -0.185, amp: 0.025, freq: 1.5, rx: 0 },
  curl:      { y: 0,     amp: 0.01,  freq: 1.7, rx: 0 },
  plank:     { y: -0.62, amp: 0.006, freq: 1.8, rx: 1.42 },
  stretch:   { y: 0,     amp: 0.02,  freq: 0.9, rx: 0 },
  meditate:  { y: -0.42, amp: 0.008, freq: 1.1, rx: 0 },
  sit:       { y: -0.38, amp: 0,     freq: 1.3, rx: 0 },
  eat:       { y: -0.38, amp: 0.01,  freq: 2.2, rx: 0 },
  drink:     { y: 0,     amp: 0.01,  freq: 1.2, rx: 0 },
  celebrate: { y: 0.05,  amp: 0.05,  freq: 6,   rx: 0 },
  wave:      { y: 0,     amp: 0.01,  freq: 4,   rx: 0 },
  sleep:     { y: -0.72, amp: 0.008, freq: 1,   rx: 1.5 },
};

// ---------------- CONFIG ----------------
let memSubdomain = "";

function store() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

export function configureAvatar3d({ subdomain } = {}) {
  memSubdomain = String(subdomain || "").trim().toLowerCase();
  const s = store();
  if (s) {
    try {
      if (memSubdomain) s.setItem(AVATAR3D_STORE_KEY, JSON.stringify({ subdomain: memSubdomain }));
      else s.removeItem(AVATAR3D_STORE_KEY);
    } catch { /* sin almacenamiento: sigue en memoria */ }
  }
  return memSubdomain;
}

export function avatar3dConfig() {
  if (memSubdomain) return { subdomain: memSubdomain };
  try {
    if (typeof window !== "undefined" && window.BAYONA_AVATAR3D?.subdomain) {
      return { subdomain: String(window.BAYONA_AVATAR3D.subdomain).trim().toLowerCase() };
    }
  } catch { /* nada */ }
  const s = store();
  if (s) {
    try {
      const raw = JSON.parse(s.getItem(AVATAR3D_STORE_KEY) || "null");
      if (raw?.subdomain) { memSubdomain = String(raw.subdomain); return { subdomain: memSubdomain }; }
    } catch { /* nada */ }
  }
  return { subdomain: AVATAR3D_DEFAULT_SUBDOMAIN };
}

/** URL del creador embebido (el SDK le añade sdk=true solo). */
export function creatorUrl() {
  const { subdomain } = avatar3dConfig();
  return `https://${subdomain}.avaturn.dev`;
}

// ---------------- RESULTADO DE EXPORTACIÓN ----------------
// ExportAvatarResult del SDK: { avatarId, url, urlType: "dataURL"|"httpURL", … }.
// Se valida la FORMA; el contenido se valida por magia GLB tras descargar.
export function parseExportResult(data) {
  if (!data || typeof data !== "object") return null;
  const { avatarId, url, urlType } = data;
  if (typeof avatarId !== "string" || !avatarId) return null;
  if (typeof url !== "string" || !url) return null;
  if (urlType !== "dataURL" && urlType !== "httpURL") return null;
  if (urlType === "dataURL" && !/^data:model\/[a-z0-9.+-]+;base64,/i.test(url)) return null;
  if (urlType === "httpURL") {
    try {
      if (new URL(url).protocol !== "https:") return null;
    } catch { return null; }
  }
  return { avatarId, url, urlType };
}

/** Magia GLB: los 4 primeros bytes son "glTF". */
export function isGlbBytes(buf) {
  if (!buf || buf.byteLength < 12) return false;
  const v = new Uint8Array(buf, 0, 4);
  return v[0] === 0x67 && v[1] === 0x6c && v[2] === 0x54 && v[3] === 0x46; // g l T F
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// ---------------- BYTES DEL AVATAR (solo navegador) ----------------
export async function resolveAvatarBytes(ref, { timeoutMs = AVATAR3D_FETCH_TIMEOUT_MS } = {}) {
  if (typeof window === "undefined") throw new Error("sin-navegador");
  const parsed = parseExportResult(ref);
  if (!parsed) throw new Error("export-invalido");
  let buf;
  if (parsed.urlType === "dataURL") {
    buf = base64ToBytes(parsed.url.split(",", 2)[1] || "");
  } else {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
    try {
      const res = await fetch(parsed.url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("descarga-" + res.status);
      const len = +(res.headers.get("content-length") || 0);
      if (len && len > AVATAR3D_MAX_BYTES) throw new Error("glb-pesado");
      buf = await res.arrayBuffer();
    } finally {
      clearTimeout(timer);
    }
  }
  if (buf.byteLength > AVATAR3D_MAX_BYTES) throw new Error("glb-pesado");
  if (!isGlbBytes(buf)) throw new Error("no-es-glb");
  return { avatarId: parsed.avatarId, bytes: buf };
}

/** Guarda los bytes en Cache API; el perfil solo guarda el descriptor. */
export async function storeAvatarBytes(avatarId, bytes) {
  const key = `avaturn:${avatarId}.glb`;
  try {
    const cache = await caches.open(AVATAR3D_CACHE);
    await cache.put(key, new Response(bytes, { headers: { "content-type": "model/gltf-binary" } }));
    return key;
  } catch {
    return ""; // sin Cache API: se re-descarga en cada arranque (httpURL) o se pierde (dataURL)
  }
}

export async function readAvatarBytes(cacheKey) {
  try {
    const cache = await caches.open(AVATAR3D_CACHE);
    const hit = await cache.match(cacheKey);
    if (!hit) return null;
    const buf = await hit.arrayBuffer();
    return isGlbBytes(buf) ? buf : null;
  } catch { return null; }
}

// ---------------- CARGA EN EL MUNDO (solo navegador) ----------------
async function loadThree() {
  const THREE = await import("three");
  let GLTFLoader;
  try {
    ({ GLTFLoader } = await import("../vendor/GLTFLoader.js"));
  } catch {
    ({ GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js"));
  }
  return { THREE, GLTFLoader };
}

function buildWrapper(THREE, model) {
  const wrap = {
    isAvatar3d: true,
    group: new THREE.Group(),
    action: "idle",
    time: 0,
    setAction(name) { this.action = AVATAR3D_ACTIONS[name] ? name : "idle"; },
    setSkin() { /* la piel vive en el modelo */ },
    setFace() { /* la cara vive en el modelo */ },
    setOutfit() { /* la ropa vive en el modelo (el vigilante de main.js la llama) */ },
    update(dt, reducedMotion) {
      this.time += dt * (reducedMotion ? 0.25 : 1);
      const cue = AVATAR3D_ACTIONS[this.action] || AVATAR3D_ACTIONS.idle;
      const k = reducedMotion ? 0.25 : 1;
      model.position.y = cue.y * k + Math.sin(this.time * cue.freq) * cue.amp * k;
      model.rotation.x = cue.rx * k;
    },
    dispose() {
      this.group.remove(model);
      model.traverse((o) => { if (o.isMesh) o.geometry?.dispose?.(); });
    },
  };
  wrap.group.add(model);
  return wrap;
}

/**
 * Coloca el 3D en el mundo desde un descriptor de perfil:
 * { provider, avatarId, urlType, cacheKey, httpUrl }.
 * ANTE CUALQUIER FALLO rechaza y el llamador conserva el de la foto.
 */
export async function attachAvatar3d(world, desc) {
  if (typeof window === "undefined" || !world) throw new Error("sin-navegador");
  if (!desc || desc.provider !== AVATAR3D_PROVIDER || !desc.avatarId) throw new Error("descriptor-invalido");

  let buf = desc.cacheKey ? await readAvatarBytes(desc.cacheKey) : null;
  if (!buf && desc.urlType === "httpURL" && desc.httpUrl) {
    const r = await resolveAvatarBytes({ avatarId: desc.avatarId, url: desc.httpUrl, urlType: "httpURL" });
    buf = r.bytes;
    const key = await storeAvatarBytes(desc.avatarId, buf);
    if (key) desc.cacheKey = key;
  }
  if (!buf) throw new Error("sin-bytes");

  const { THREE, GLTFLoader } = await loadThree();
  const gltf = await new GLTFLoader().parseAsync(buf, "");
  const model = gltf.scene;
  model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const wrap = buildWrapper(THREE, model);

  world.scene.remove(world.avatar.group);
  if (!world.avatarFallback) world.avatarFallback = world.avatar;
  world.avatar = wrap;
  world.scene.add(wrap.group);
  return wrap;
}

/** Vuelve al personaje de la foto. */
export function detachAvatar3d(world) {
  if (!world || !world.avatarFallback) return false;
  if (world.avatar?.isAvatar3d) {
    world.scene.remove(world.avatar.group);
    try { world.avatar.dispose?.(); } catch { /* nada */ }
  }
  world.avatar = world.avatarFallback;
  world.scene.add(world.avatar.group);
  return true;
}

// ---------------- MODAL DEL CREADOR (solo navegador) ----------------
// Siempre con CERRAR: nadie queda atrapado. Requiere consentimiento
// avatar_3d ANTES de abrir (la selfie se procesa en servidores Avaturn).
export function openCreatorModal({ onExport, onClose, onNeedConsent } = {}) {
  if (typeof document === "undefined") return null;
  const layer = document.createElement("div");
  layer.id = "a3d-layer";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-label", "Creador de avatar 3D");
  const st = document.createElement("style");
  st.textContent = `
    #a3d-layer{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.86);display:flex;
      align-items:center;justify-content:center;padding:12px;font:14px/1.5 Manrope,system-ui}
    #a3d-box{background:var(--paper-2,#0d0d0d);border:1px solid var(--hair,rgba(255,255,255,.14));border-radius:16px;
      width:min(480px,100%);height:min(720px,94vh);display:flex;flex-direction:column;overflow:hidden;color:var(--ink,#ffffff)}
    #a3d-bar{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--hair,rgba(255,255,255,.14))}
    #a3d-bar b{flex:1;font-size:13px;letter-spacing:.04em}
    #a3d-bar button{border:1px solid var(--hair-strong,rgba(255,255,255,.3));border-radius:10px;background:var(--panel,#111111);
      color:var(--ink,#ffffff);font-weight:700;font-size:12px;padding:9px 12px;cursor:pointer}
    #a3d-slot{flex:1;position:relative;background:#0d0d0d}
    #a3d-slot iframe{width:100%;height:100%;border:0}
    #a3d-note{padding:10px 12px;font-size:12px;color:var(--ink-soft,rgba(255,255,255,.6))}`;
  document.head.appendChild(st);

  const box = document.createElement("div");
  box.id = "a3d-box";
  const bar = document.createElement("div");
  bar.id = "a3d-bar";
  const title = document.createElement("b");
  title.textContent = "TU AVATAR 3D";
  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "CERRAR ✕";
  bar.append(title, close);
  const slot = document.createElement("div");
  slot.id = "a3d-slot";
  const note = document.createElement("div");
  note.id = "a3d-note";
  note.textContent = "Sube tu selfie, personaliza y pulsa SIGUIENTE: tu 3D entra solo.";
  box.append(bar, slot, note);
  layer.appendChild(box);
  document.body.appendChild(layer);

  let sdk = null;
  const done = (fn) => { try { sdk?.destroy?.(); } catch { /* nada */ } try { fn?.(); } catch { /* nada */ } layer.remove(); st.remove(); };
  close.onclick = () => done(() => onClose?.());

  (async () => {
    try {
      if (onNeedConsent && !onNeedConsent()) { note.textContent = "Falta el permiso Avatar 3D."; return; }
      const { AvaturnSDK } = await import("../vendor/avaturn-sdk.js");
      sdk = new AvaturnSDK();
      await sdk.init(slot, { url: creatorUrl() });
      sdk.on("export", async (data) => {
        const parsed = parseExportResult(data);
        if (!parsed) { note.textContent = "Exportación no válida: sigue editando o cierra."; return; }
        try {
          note.textContent = "Descargando tu 3D…";
          const { bytes } = await resolveAvatarBytes(parsed);
          const cacheKey = await storeAvatarBytes(parsed.avatarId, bytes);
          done(() => onExport?.({
            provider: AVATAR3D_PROVIDER,
            avatarId: parsed.avatarId,
            urlType: parsed.urlType,
            cacheKey,
            httpUrl: parsed.urlType === "httpURL" ? parsed.url : "",
            at: new Date().toISOString(),
          }));
        } catch (e) {
          note.textContent = "No se pudo descargar el 3D (" + (e?.message || "red") + "). Cierra e inténtalo con mejor conexión.";
        }
      });
      sdk.on("error", (e) => { note.textContent = "El creador dice: " + (e?.message || "error") + ". Puedes cerrar e intentarlo después."; });
    } catch {
      note.textContent = "Sin conexión al creador 3D. Cierra: tu personaje de la foto sigue contigo.";
    }
  })();
  return { close: () => done(() => onClose?.()) };
}
