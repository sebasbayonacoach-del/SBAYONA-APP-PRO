// ============================================================
// BAYONA · APARIENCIA — centro de personalización "ATELIER"
// ------------------------------------------------------------
// Todo el gusto del producto se decide aquí: aura de color, luz,
// tipografía, densidad, escala, esquinas, cristal, brillo y movimiento.
// Se aplica en <html> como data-* (ver css/aurum.css y css/motion.css)
// y se persiste de forma independiente al estado del juego.
// ============================================================
import { S } from "../state.js";
import { UI, $, el, elT, toast, BUILDERS, TITLES, openSection } from "./shared.js";

const KEY = "bayona.appearance.v1";

/** catálogo de identidades visuales */
export const THEMES = [
  { id: "onyx",      name: "ONYX ORO",    dot: "linear-gradient(120deg,#fff8e6,#e9cd92 40%,#c39a4d 70%,#8a6524)" },
  { id: "amanecer",  name: "AMANECER",    dot: "linear-gradient(120deg,#ffd0b3,#ff9a63 40%,#ff7a3c 70%,#e8500a)" },
  { id: "zafiro",    name: "ZAFIRO",      dot: "linear-gradient(120deg,#dce8ff,#8fb6ff 40%,#4a86ff 70%,#1f4fc4)" },
  { id: "esmeralda", name: "ESMERALDA",   dot: "linear-gradient(120deg,#d9ffef,#7ce3b4 40%,#2fce8f 70%,#12855a)" },
  { id: "rubi",      name: "RUBÍ",        dot: "linear-gradient(120deg,#ffd6e0,#ff87a6 40%,#ef4b6f 70%,#a51232)" },
  { id: "violeta",   name: "VIOLETA",     dot: "linear-gradient(120deg,#e8dcff,#c4a2ff 40%,#8f66ff 70%,#5326c4)" },
  { id: "aurora",    name: "AURORA",      dot: "linear-gradient(120deg,#eaffff,#8ef0e6 34%,#6ea8ff 66%,#a06bff)" },
];

const DEFAULTS = {
  theme: "onyx",
  mode: "noche",
  font: "titan",
  density: "comoda",
  radius: "suave",
  glass: "on",
  glow: "medio",
  scale: "100",
  motion: "pleno",
};

let AP = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) { /* almacenamiento no disponible */ }
  return { ...DEFAULTS };
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
  r.dataset.font = AP.font;
  r.dataset.density = AP.density;
  r.dataset.radius = AP.radius;
  r.dataset.glass = AP.glass;
  r.dataset.glow = AP.glow;
  r.dataset.scale = AP.scale;
  r.dataset.motion = AP.motion;
  r.style.colorScheme = AP.mode === "marfil" ? "light" : "dark";

  // el mundo 3D respeta el mismo interruptor de movimiento
  if (S.data?.settings) {
    S.data.settings.motion = AP.motion !== "off";
    if (UI.W) UI.W.reducedMotion = AP.motion === "off";
  }
  // color del tema de sistema del navegador (barra móvil)
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", AP.mode === "marfil" ? "#efeae0" : "#05060a");
}

export function getAppearance() { return { ...AP }; }

export function setAppearance(patch, silent) {
  AP = { ...AP, ...patch };
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
      <h4>BAYONA ATELIER</h4>
      <span class="pill gold">EN VIVO</span>
    </div>
    <div class="sub">Cada cambio se aplica al instante y queda guardado en este dispositivo.</div>
    <div class="stat-grid" style="margin-top:12px">
      <div class="stat-cell"><div class="k">AURA</div><div class="v" id="ap-prev-aura">—</div></div>
      <div class="stat-cell"><div class="k">FIJEZA</div><div class="v count-to" id="ap-prev-num" data-count-to="100">0</div></div>
    </div>
    <div class="mbar" style="margin-top:12px"><i style="width:72%"></i></div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-primary" type="button">PRINCIPAL</button>
      <button class="btn btn-gold" type="button">ORO</button>
      <button class="btn btn-ghost" type="button">SECUNDARIO</button>
    </div>`;
  body.appendChild(prev);
  liveBox = el("div", "media-caption count-to", "Ajusta cualquier control: lo verás aquí mismo.");
  body.appendChild(liveBox);

  const th = THEMES.find((x) => x.id === AP.theme) || THEMES[0];
  const pa = prev.querySelector("#ap-prev-aura");
  if (pa) pa.textContent = th.name.split(" ")[0];

  // ---------- AURA DE COLOR ----------
  body.appendChild(el("div", "sec-label", "AURA DE COLOR"));
  const sw = el("div", "swatches");
  THEMES.forEach((t) => {
    const b = el("button", "swatch-btn" + (AP.theme === t.id ? " on" : ""));
    b.type = "button";
    b.innerHTML = `<span class="dot" style="background:${t.dot}"></span><span class="nm">${t.name}</span>`;
    b.addEventListener("click", () => {
      setAppearance({ theme: t.id }, true);
      sw.querySelectorAll(".swatch-btn").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      const p2 = prev.querySelector("#ap-prev-aura");
      if (p2) p2.textContent = t.name.split(" ")[0];
      live(`Aura «${t.name}» aplicada.`);
    });
    sw.appendChild(b);
  });
  body.appendChild(sw);

  // ---------- LUZ ----------
  options(body, "LUZ", "mode", [["noche", "NOCHE"], ["marfil", "MARFIL"]],
    "Luz actualizada.");

  // ---------- TIPOGRAFÍA ----------
  options(body, "TIPOGRAFÍA DE TÍTULOS", "font", [["titan", "TITÁN"], ["atelier", "ATELIER"]],
    "Tipografía de titulares actualizada.");

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

  // ---------- CRISTAL ----------
  options(body, "CRISTAL (DESENFOQUE)", "glass", [["on", "ACTIVADO"], ["off", "SOLIDO"]],
    "Acabado de superficies actualizado.");

  // ---------- BRILLO ----------
  options(body, "BRILLO DE ACENTOS", "glow", [["bajo", "BAJO"], ["medio", "MEDIO"], ["alto", "ALTO"]],
    "Intensidad del brillo actualizada.");

  // ---------- MOVIMIENTO ----------
  options(body, "MOVIMIENTO", "motion", [["pleno", "PLENO"], ["sereno", "SERENO"], ["off", "NINGUNO"]],
    "Intensidad de animación actualizada.");

  // ---------- RESTABLECER ----------
  body.appendChild(el("div", "sec-label", "DISEÑO"));
  const rz = el("div", "card");
  rz.innerHTML = `<h4>RESTABLECER DISEÑO</h4><div class="sub">Vuelve a la firma original «ONYX ORO · NOCHE». No toca tus datos de juego.</div>`;
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
