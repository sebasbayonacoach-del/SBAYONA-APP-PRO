// ============================================================
// BAYONA · APARIENCIA — firma visual «MONO NARANJA»
// ------------------------------------------------------------
// Paleta ESTRICTA: naranja · blanco · negro. Sin auras alternativas.
// Quedan controles mínimos de LUZ, DENSIDAD, TEXTO, ESQUINAS y
// MOVIMIENTO. Se aplica en <html> como data-* (css/aurum.css,
// css/motion.css) y se persiste aparte del estado del juego.
// ============================================================
import { S } from "../state.js";
import { processFace } from "../face.js";
import { setConsent, isGranted } from "../consents.js";
import { applyTheme, readTheme } from "../theme.js";
import { UI, $, el, elT, toast, BUILDERS, TITLES, openSection, closeDrawer } from "./shared.js";

const KEY = "bayona.appearance.v1";

/** firma única de identidad visual (sin variantes de color) */
export const THEMES = [
  { id: "naranja", name: "MONO NARANJA", dot: "linear-gradient(120deg,#ff6a00 0 50%,#ffffff 50% 75%,#000000 75% 100%)" },
];

const DEFAULTS = {
  theme: "naranja",
  mode: "noche",        // noche / cine (día)
  font: "claude",       // firma tipográfica CLAUDE (Styrene B / Tiempos Text)
  density: "comoda",
  radius: "suave",
  glass: "on",          // cristal (glassmorphism) activo por defecto
  glow: "bajo",
  scale: "100",
  motion: "pleno",
};

let AP = load();

function load() {
  let ap = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) ap = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) { /* almacenamiento no disponible */ }
  ap.theme = "naranja"; // paleta estricta: nunca se desvía
  ap.font = "claude";
  // Theme v1 es la fuente de verdad de luz. La apariencia conserva "cine/noche"
  // porque el mundo 3D ya usa esos nombres.
  ap.mode = readTheme() === "light" ? "cine" : "noche";
  return ap;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(AP)); }
  catch (e) { window.dispatchEvent(new CustomEvent("bayona:storage-error")); }
}

/** aplica la configuración al documento (idempotente, en vivo) */
export function applyAppearance() {
  const r = document.documentElement;
  r.dataset.theme = AP.theme;
  r.dataset.mode = AP.mode;
  applyTheme(AP.mode === "cine" ? "light" : "dark", { root:r, persist:true });
  r.dataset.font = AP.font;
  r.dataset.density = AP.density;
  r.dataset.radius = AP.radius;
  r.dataset.glass = AP.glass;
  r.dataset.glow = AP.glow;
  r.dataset.scale = AP.scale;
  r.dataset.motion = AP.motion;
  r.style.colorScheme = AP.mode === "noche" ? "dark" : "light";

  // el mundo 3D usa la MISMA luz (CINE / NOCHE) y el mismo movimiento
  if (S.data?.settings) {
    S.data.settings.motion = AP.motion !== "off";
    if (UI.W) UI.W.reducedMotion = AP.motion === "off";
  }
  if (UI.W?.setMood) UI.W.setMood(AP.mode);
  const mn = document.getElementById("mode-name");
  if (mn) mn.textContent = AP.mode === "noche" ? "NOCHE" : "CINE";
  // color del tema de sistema del navegador (barra móvil)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", AP.mode === "noche" ? "#0a0806" : "#f1ede5");
}

/** interruptor rápido CINE / NOCHE (HUD y portada) */
export function setMode(mode) {
  const next = mode === "cine" ? "cine" : "noche";
  setAppearance({ mode: next }, true);
}

export function getAppearance() { return { ...AP }; }

export function setAppearance(patch, silent) {
  AP = { ...AP, ...patch, theme: "naranja" };
  AP.mode = AP.mode === "cine" ? "cine" : "noche";
  save();
  applyAppearance();
  if (!silent) {
    const b = document.querySelector("#drawer-body");
    if (b && !$("#drawer").classList.contains("hidden")) BUILDERS.appearance(b);
  }
}

export function resetAppearance() {
  AP = { ...DEFAULTS };
  save();
  applyAppearance();
}

// ---- título del mundo en el cajón ----
TITLES.appearance = ["APARIENCIA", "ATELIER · DISEÑO DE LA INTERFAZ"];

// ---- arranque temprano (evita destello de tema incorrecto) ----
export function initAppearance() {
  applyAppearance();
}

// ============================================================
// PANEL
// ============================================================
function group(body, label) { body.appendChild(el("div", "opt-label", label)); }

function options(body, label, key, values, note) {
  group(body, label);
  const row = el("div", "opt-row");
  values.forEach(([id, txt]) => {
    const b = el("button", "opt" + (AP[key] === id ? " on" : ""), txt);
    b.type = "button";
    b.setAttribute("aria-pressed", String(AP[key] === id));
    b.addEventListener("click", () => {
      setAppearance({ [key]: id }, true);
      row.querySelectorAll(".opt").forEach((x) => {
        x.classList.remove("on");
        x.setAttribute("aria-pressed", "false");
      });
      b.classList.add("on");
      b.setAttribute("aria-pressed", "true");
      if (note) live(note);
    });
    row.appendChild(b);
  });
  body.appendChild(row);
}

let liveBox = null;
function live(text) {
  if (!liveBox) return;
  liveBox.textContent = text;
  liveBox.classList.remove("tick");
  void liveBox.offsetWidth;
  liveBox.classList.add("tick");
}

BUILDERS.appearance = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";

  // ---------- VISTA PREVIA EN VIVO ----------
  body.appendChild(el("div", "sec-label", "VISTA PREVIA EN VIVO"));
  const prev = el("div", "card shine");
  prev.innerHTML = `
    <div class="card-row">
      <h4>BAYONA</h4>
      <span class="pill gold">EN VIVO</span>
    </div>
    <div class="sub">Cada cambio se aplica al instante.</div>
    <div class="stat-grid" style="margin-top:12px">
      <div class="stat-cell"><div class="k">LUZ</div><div class="v" id="ap-prev-aura">CINE</div></div>
      <div class="stat-cell"><div class="k">FIJEZA</div><div class="v count-to" id="ap-prev-num" data-count-to="100">0</div></div>
    </div>
    <div class="mbar" style="margin-top:12px"><i style="width:72%"></i></div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-primary" type="button">PRINCIPAL</button>
      <button class="btn btn-gold" type="button">NARANJA</button>
      <button class="btn btn-ghost" type="button">SECUNDARIO</button>
    </div>`;
  body.appendChild(prev);
  liveBox = el("div", "media-caption count-to", "Ajusta cualquier control: lo verás aquí mismo.");
  body.appendChild(liveBox);

  // ---------- PALETA (fija, sin variantes) ----------
  body.appendChild(el("div", "sec-label", "PALETA"));
  const sw = el("div", "swatches");
  [
    ["NARANJA", "#ff6a00"],
    ["BLANCO", "#ffffff"],
    ["NEGRO", "#000000"],
  ].forEach(([nm, col], i) => {
    const b = el("button", "swatch-btn" + (i === 0 ? " on" : ""));
    b.type = "button";
    b.disabled = true;
    b.innerHTML = `<span class="dot" style="background:${col};border:1px solid var(--line)"></span><span class="nm">${nm}</span>`;
    sw.appendChild(b);
  });
  body.appendChild(sw);

  // ---------- FIRMA VISUAL FIJA ----------
  options(body, "LUZ", "mode", [["noche", "NOCHE · NEGRO"]],
    "BAYONA ONE mantiene negro + naranja en toda la experiencia.");

  // ---------- CRISTAL ----------
  options(body, "CRISTAL", "glass", [["on", "CRISTAL"], ["off", "PLANO"]],
    "Acabado actualizado.");

  // ---------- DENSIDAD ----------
  options(body, "DENSIDAD DE INTERFAZ", "density",
    [["compacta", "COMPACTA"], ["comoda", "CÓMODA"], ["amplia", "AMPLIA"]],
    "Densidad actualizada.");

  // ---------- TEXTO ----------
  options(body, "TAMAÑO DE TEXTO", "scale",
    [["90", "90 %"], ["100", "100 %"], ["110", "110 %"], ["120", "120 %"]],
    "Tamaño de texto actualizado.");

  // ---------- ESQUINAS ----------
  options(body, "ESQUINAS", "radius", [["recto", "RECTO"], ["suave", "SUAVE"], ["redondo", "REDONDO"]],
    "Forma de las superficies actualizada.");

  // ---------- MOVIMIENTO ----------
  options(body, "MOVIMIENTO", "motion", [["pleno", "PLENO"], ["sereno", "SERENO"], ["off", "NINGUNO"]],
    "Intensidad de animación actualizada.");

  // ---------- CARA DEL PERSONAJE (CREA A TI MISMO) ----------
  body.appendChild(el("div", "sec-label", "CARA DEL PERSONAJE"));
  const fc = el("div", "card");
  fc.innerHTML = `<h4>CREA A TI MISMO</h4><div class="sub">Tu foto → la cara de tu personaje. Se procesa SOLO en este dispositivo: la imagen nunca sale de aquí.</div>`;
  const cur = S.data.profile.face;
  if (cur) {
    const img = el("img");
    img.src = cur; img.alt = "Cara actual de tu personaje";
    img.style.cssText = "width:72px;height:72px;border-radius:50%;margin-top:12px;display:block;border:1px solid var(--line)";
    fc.appendChild(img);
  }
  const fi = el("input"); fi.type = "file"; fi.accept = "image/*";
  fi.style.marginTop = "12px";
  fi.setAttribute("aria-label", "Elegir foto para la cara de tu personaje");
  fi.addEventListener("change", async () => {
    const f = fi.files && fi.files[0];
    if (!f) return;
    try {
      const { face, skin } = await processFace(f);
      S.data.profile.face = face;
      if (skin) S.data.profile.skinHex = skin;
      S.save();
      UI.W?.avatar.setFace(face);
      toast("PERSONAJE ACTUALIZADO", "Tu cara acompaña al personaje en todos los contextos.");
      BUILDERS.appearance(body);
    } catch (e) {
      toast("NO SE PUDO LEER LA FOTO", "Prueba con otra imagen (JPG o PNG). Tu personaje anterior se conserva.", "danger");
    }
  });
  fc.appendChild(fi);
  body.appendChild(fc);

  // ---------- AVATAR 3D (AVATURN: selfie → cuerpo completo) ----------
  body.appendChild(el("div", "sec-label", "AVATAR 3D"));
  const ac = el("div", "card");
  const a3ready = S.data.profile.avatar3d;
  ac.innerHTML = `<h4>TU 3D</h4><div class="sub">${a3ready
    ? "Avatar 3D activo: tu cuerpo completo en el juego."
    : "Tu selfie se procesa en Avaturn (permiso Avatar 3D, revocable en MÁS → Privacidad). Sin red o si falla, sigues con tu foto."}</div>`;
  const ab3d = el("button", "btn btn-gold btn-block", a3ready ? "ACTUALIZAR AVATAR 3D" : "CREAR MI AVATAR 3D ◈");
  ab3d.style.marginTop = "12px";
  ab3d.type = "button";
  ab3d.addEventListener("click", async () => {
    try {
      const { openCreatorModal, attachAvatar3d } = await import("../avatar3d.js");
      if (!isGranted("avatar_3d")) {
        setConsent("avatar_3d", true); // el clic en CREAR es el OK informado (texto de arriba)
        toast("PERMISO AVATAR 3D", "Activado para crear tu 3D. Revocable en MÁS → Privacidad.");
      }
      openCreatorModal({
        onNeedConsent: () => isGranted("avatar_3d"),
        onExport: (desc) => {
          S.data.profile.avatar3d = desc;
          S.save();
          if (UI.W) attachAvatar3d(UI.W, desc).catch(() =>
            toast("3D PENDIENTE", "Se activará solo al reabrir con conexión.", "danger"));
          toast("AVATAR 3D ACTIVO", "Mira tu personaje en el mundo.");
          closeDrawer(); // revela el 3D: nada de paneles tapándolo
        },
      });
    } catch {
      toast("SIN CONEXIÓN AL CREADOR", "Tu foto sigue contigo. Inténtalo con red.", "danger");
    }
  });
  ac.appendChild(ab3d);
  if (a3ready) {
    const back3d = el("button", "btn btn-ghost btn-block", "VOLVER AL DE LA FOTO");
    back3d.style.marginTop = "8px";
    back3d.type = "button";
    back3d.addEventListener("click", async () => {
      try {
        const { detachAvatar3d } = await import("../avatar3d.js");
        detachAvatar3d(UI.W);
      } catch { /* el de la foto ya estaba */ }
      S.data.profile.avatar3d = null;
      S.save();
      toast("FOTO ACTIVA", "Tu 3D queda guardado para cuando quieras.");
      BUILDERS.appearance(body);
    });
    ac.appendChild(back3d);
  }
  body.appendChild(ac);

  // ---------- RESTABLECER ----------
  body.appendChild(el("div", "sec-label", "DISEÑO"));
  const rz = el("div", "card");
  rz.innerHTML = `<h4>RESTABLECER DISEÑO</h4><div class="sub">Vuelve a la firma original «MONO NARANJA · NEGRO». No toca tus datos de juego.</div>`;
  const rb = el("button", "btn btn-ghost btn-block", "VOLVER A LA FIRMA ORIGINAL");
  rb.style.marginTop = "12px";
  rb.type = "button";
  rb.addEventListener("click", () => {
    resetAppearance();
    BUILDERS.appearance(body);
    toast("DISEÑO", "Firma original restaurada.");
  });
  rz.appendChild(rb);
  body.appendChild(rz);
};

// ---- apertura del panel desde cualquier punto ----
export function openAppearance() { openSection("appearance"); }
