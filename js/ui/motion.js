// ============================================================
// BAYONA · MOTION — motor de movimiento e interacción
// ------------------------------------------------------------
// Sin dependencias. Se auto-inicia al cargar como módulo.
//  · Onda de toque (ripple) en todo control interactivo
//  · Contadores animados (data-count-to)
//  · Revelado escalonado opt-in (data-reveal) por visibilidad
//  · Inclinación 3D sutil en tarjetas (data-tilt / .tilt-card)
//  · Chispas doradas en XP y recompensas
//  · Velo cinematográfico + destello al viajar de mundo
// La intensidad global la gobierna data-motion (css/motion.css).
// ============================================================
import { initAppearance } from "./appearance.js";
import { openSection } from "./shared.js";

const motionLevel = () => document.documentElement.dataset.motion || "pleno";
const alive = () => motionLevel() !== "off";

/* ---------------- onda de toque ---------------- */
const RIPPLE_SEL =
  ".btn, .chip, .rail-btn, .nav-btn, .item, .swatch-btn, .opt, .metric, .cal-day, .quickq button, .btn-mini, #drawer-close, .cal-head .cal-nav button";

function ripple(e) {
  if (!alive() || !e.target.closest) return;
  const host = e.target.closest(RIPPLE_SEL);
  if (!host) return;
  const r = host.getBoundingClientRect();
  const d = Math.max(r.width, r.height) * 1.9;
  const s = document.createElement("span");
  s.className = "ripple";
  s.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:${d}px;height:${d}px`;
  host.appendChild(s);
  setTimeout(() => s.remove(), 750);
}

/* ---------------- contadores ---------------- */
export function countTo(node, to, ms) {
  const from = Number(node.dataset.countFrom || 0);
  const dur = ms || 900;
  node.classList.add("count-to");
  if (!alive()) {
    node.textContent = String(to);
    node.dataset.countFrom = String(to);
    return;
  }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    node.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
    else {
      node.dataset.countFrom = String(to);
      node.classList.remove("tick");
      void node.offsetWidth;
      node.classList.add("tick");
    }
  };
  requestAnimationFrame(step);
}

export function runCounters(root) {
  (root || document).querySelectorAll("[data-count-to]").forEach((n) => {
    if (n.dataset.counted === "1") return;
    n.dataset.counted = "1";
    countTo(n, Number(n.dataset.countTo) || 0, Number(n.dataset.countDur) || 900);
  });
}

/* ---------------- revelado escalonado (opt-in) ---------------- */
let io = null;
function indexStagger(root) {
  root.querySelectorAll("[data-reveal]").forEach((n) => {
    if (n.style.getPropertyValue("--rd")) return;
    const parent = n.parentElement;
    const sibs = parent ? [...parent.children].filter((c) => c.hasAttribute("data-reveal")) : [n];
    n.style.setProperty("--rd", String(Math.max(0, Math.min(sibs.indexOf(n), 12))));
  });
}
function observe(root) {
  const nodes = [...root.querySelectorAll("[data-reveal]")].filter((n) => !n.classList.contains("in"));
  if (!nodes.length) return;
  indexStagger(root);
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((n) => n.classList.add("in"));
    return;
  }
  io = io || new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      io.unobserve(en.target);
    });
  }, { threshold: 0.1 });
  nodes.forEach((n) => io.observe(n));
}

/* ---------------- inclinación 3D ---------------- */
function bindTilt(node) {
  if (node.dataset.tiltBound) return;
  node.dataset.tiltBound = "1";
  node.classList.add("tilt");
  const max = 3.5;
  node.addEventListener("pointermove", (e) => {
    if (!alive() || matchMedia("(hover: none)").matches) return;
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    node.style.transform =
      `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) translateY(-2px)`;
  });
  node.addEventListener("pointerleave", () => { node.style.transform = ""; });
}

/* ---------------- chispas y destellos ---------------- */
export function sparkBurst(x, y, n) {
  if (!alive()) return;
  const total = n || 12;
  for (let i = 0; i < total; i++) {
    const s = document.createElement("span");
    s.className = "spark";
    const a = (Math.PI * 2 * i) / total + Math.random() * 0.5;
    const d = 46 + Math.random() * 62;
    s.style.cssText = `left:${x}px;top:${y}px;--sx:${(Math.cos(a) * d).toFixed(1)}px;--sy:${(Math.sin(a) * d - 24).toFixed(1)}px`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1350);
  }
}

export function flare() {
  if (!alive()) return;
  const f = document.createElement("div");
  f.className = "flare";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1150);
}

/* ---------------- observadores del shell ---------------- */
function watchShell() {
  const drawer = document.getElementById("drawer");
  if (drawer) {
    new MutationObserver(() => {
      document.getElementById("hud")?.classList.toggle("panel-open", drawer.classList.contains("open"));
    }).observe(drawer, { attributes: true, attributeFilter: ["class"] });
    document.getElementById("hud")?.classList.toggle("panel-open", drawer.classList.contains("open"));
  }

  const veil = document.getElementById("transition-veil");
  if (veil) {
    let last = false;
    new MutationObserver(() => {
      const on = veil.classList.contains("on");
      if (on !== last && on) flare();
      last = on;
    }).observe(veil, { attributes: true, attributeFilter: ["class"] });
  }

  // burbujas de XP: chispas al aparecer
  new MutationObserver((muts) => {
    if (!alive()) return;
    muts.forEach((m) => {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList && n.classList.contains("xp-burst")) {
          const r = n.getBoundingClientRect();
          sparkBurst(r.left + r.width / 2, r.top + r.height / 2, 14);
        }
      });
    });
  }).observe(document.body, { childList: true });
}

/* ---------------- enlace directo a un mundo (#entrenamiento, ?go=plan…) ------- */
const GO_ALIASES = {
  hoy: "hoy", dia: "hoy", "mi-dia": "hoy", "midia": "hoy",
  trabajo: "trabajo", oficina: "trabajo", foco: "trabajo", estudio: "trabajo",
  entrenamiento: "training", gimnasio: "training", nutricion: "nutrition", cocina: "nutrition",
  recuperacion: "recovery", mente: "mind", plan: "plan", laboratorio: "plan",
  armario: "armory", vestidor: "armory", progreso: "progress", core: "core",
  mas: "more", apariencia: "appearance", atelier: "appearance", diseno: "appearance",
  coachos: "coachos", "coach-os": "coachos", entrenador: "coachos", "centro-de-mando": "coachos",
};
function openFromUrl() {
  const q = new URLSearchParams(location.search).get("go");
  const raw = (q || location.hash.replace(/^#\/??/, "") || "").trim().toLowerCase();
  if (!raw) return;
  const key = GO_ALIASES[raw] || raw;
  if (!key) return;
  requestAnimationFrame(() => openSection(key));
}

/* ---------------- arranque ---------------- */
function initMotion() {
  initAppearance();
  watchShell();

  document.addEventListener("pointerdown", ripple, { passive: true });

  const body = document.getElementById("drawer-body");
  if (body) {
    new MutationObserver(() => {
      runCounters(body);
      observe(body);
      body.querySelectorAll(".tilt-card").forEach(bindTilt);
    }).observe(body, { childList: true, subtree: true });
  }

  runCounters(document);
  observe(document.body);
  document.querySelectorAll(".tilt-card").forEach(bindTilt);
  openFromUrl();
}

if (document.readyState === "loading") {
  addEventListener("DOMContentLoaded", initMotion, { once: true });
} else {
  initMotion();
}

export const MOTION = { sparkBurst, countTo, runCounters, flare };
