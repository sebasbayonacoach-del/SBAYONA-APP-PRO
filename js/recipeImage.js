// ============================================================
// BAYONA · IMÁGENES DE RECETA
// ------------------------------------------------------------
// La foto de cada receta la genera una IA en el servidor. Aquí solo
// se hace lo que toca al dispositivo:
//
//   1. CACHÉ.   La imagen se pide UNA vez. Sin conexión, la segunda
//               vez, o en otro momento sin clave, se ve la misma.
//   2. PESO.    La imagen cruda pesa cientos de KB. Se reescala en un
//               canvas a una miniatura y se guarda como JPEG: un
//               par de decenas de KB, no unournata de MB en localStorage.
//   3. HONESTIDAD. Sin clave o sin red, la tarjeta muestra una
//               ilustración determinista hecha con el color de la
//               receta. Nunca un hueco roto, nunca un «próximamente».
//   4. A PETICIÓN. Nada se descarga solo: el usuario pide la foto.
//
// El prompt lo construye el SERVIDOR desde el catálogo
// (api/image.js). Aquí solo se manda el id de la receta.
// ============================================================

const STORE = "bayona.receta.img.v1";
const MAX = 8;            // recetas en caché (LRU)
const THUMB = 360;        // lado de la miniatura en px
const inflight = new Map();

/* ---------- caché ---------- */
function leer() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}

function guardar(cache) {
  try {
    localStorage.setItem(STORE, JSON.stringify(cache));
    return true;
  } catch {
    // cuota llena: nos quedamos con las más recientes y reintentamos una vez
    const claves = Object.keys(cache);
    for (let i = 0; i < Math.max(0, claves.length - 3); i++) delete cache[claves[i]];
    try { localStorage.setItem(STORE, JSON.stringify(cache)); return true; } catch { return false; }
  }
}

/** Foto ya generada de esta receta, o null. */
export function imagenEnCache(id) {
  const v = leer()[id];
  if (!v) return null;
  return typeof v === "string" ? v : v.src || null;
}

/* ---------- ilustración de repuesto ---------- */
/**
 * Retrato estable por receta: mismo color, misma textura, siempre.
 * No pretende ser una foto: es una tarjeta, y se dice con el pie.
 */
export function ilustracion(receta) {
  const h = [...String(receta.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  return `linear-gradient(135deg, hsl(${h} 46% 62%), hsl(${(h + 38) % 360} 52% 44%))`;
}

/* ---------- reescalado ---------- */
function aMiniatura(src) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !document.createElement) return resolve(src);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const lado = Math.min(THUMB, img.naturalWidth || THUMB);
        const cv = document.createElement("canvas");
        cv.width = cv.height = lado;
        const cx = cv.getContext("2d");
        cx.drawImage(img, 0, 0, lado, lado);
        resolve(cv.toDataURL("image/jpeg", 0.72));
      } catch { resolve(src); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* ---------- salud del servicio ---------- */
// En el contenedor nativo (APK/IPA) no hay servidor local: BAYONA_API_BASE
// apunta las llamadas al despliegue público. Sin ella, degrada sin lanzar.
const apiBase = () => (typeof window !== "undefined" && window.BAYONA_API_BASE) || "";

let salud = null;
export async function imagenDisponible(timeoutMs = 2500) {
  if (salud !== null) return salud;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const r = await fetch(apiBase() + "/api/meal-image/health", { signal: ctrl?.signal });
    salud = Boolean(r.ok && (await r.json())?.ok);
  } catch { salud = false; }
  finally { if (t) clearTimeout(t); }
  return salud;
}

/* ---------- petición ---------- */
/**
 * Devuelve la miniatura de la receta, o null si no hay ninguna.
 * Nunca lanza: si falla, el llamador mantiene la ilustración.
 * @param {{id:string}} receta
 */
export async function pedirImagen(receta) {
  const id = receta?.id;
  if (!id) return null;

  const yaEsta = imagenEnCache(id);
  if (yaEsta) return yaEsta;

  // dos tarjetas que piden la misma receta a la vez → una sola petición
  if (inflight.has(id)) return inflight.get(id);

  const tarea = (async () => {
    if (navigator.onLine === false) return null;
    try {
      const r = await fetch(`${apiBase()}/api/meal-image?id=${encodeURIComponent(id)}`);
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok || !j.image) return null;
      const mini = await aMiniatura(j.image);
      if (!mini) return null;
      const cache = leer();
      // LRU: si hay más de MAX, se va la más antigua
      const claves = Object.keys(cache);
      if (claves.length >= MAX) delete cache[claves[0]];
      cache[id] = { src: mini, at: Date.now() };
      guardar(cache);
      return mini;
    } catch {
      return null;
    }
  })();

  inflight.set(id, tarea);
  // OJO: se limpia SIEMPRE, también cuando no había red. Si el marcador
  // se quedara con una promesa ya resuelta a null, un solo intento
  // offline dejaría esa receta sin foto para el resto de la sesión.
  const limpiar = () => { if (inflight.get(id) === tarea) inflight.delete(id); };
  tarea.then(limpiar, limpiar);
  return tarea;
}

/** ¿Cuántas fotos hay ya en el dispositivo? Para mostrarlo sin mentir. */
export function totalEnCache() {
  return Object.keys(leer()).length;
}

export function limpiarCache() {
  try { localStorage.removeItem(STORE); } catch { /* sin storage */ }
  salud = null;
}
