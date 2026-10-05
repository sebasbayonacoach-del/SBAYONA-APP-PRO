// ============================================================
// BAYONA — UI/SHELL: mundo persistente, drawer, modales, HUD helpers
// "BAYONA vive alrededor del personaje": el avatar NO se desmonta
// entre secciones; viaja con el usuario (travel = cambio de lugar).
// ============================================================
import { S, on } from "../state.js";
import { t, esc } from "../i18n.js";

export const $ = (sel) => document.querySelector(sel);

/** elemento con HTML de plantilla (los datos dinámicos DEBEN ir con esc()) */
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
/** elemento con TEXTO (seguro para datos de usuario) */
export function elT(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.textContent = text;
  return e;
}

/** contexto compartido de UI */
export const UI = {
  W: null,          // World 3D
  session: null,    // sesión de entrenamiento activa (espejo de S.data.activeSession)
  restTimer: null,
  breathTimer: null,
  lastFocus: null,
  actions: {},      // { openTraining, startWorkout, showDayRecap, ... } registrados por módulos
};

/** registro de constructores por mundo */
export const BUILDERS = {};

// ============================================================
// MUNDOS (el personaje viaja; no "abrimos pantallas")
// ============================================================
export const PLACES = {
  home:      { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  hoy:       { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  training:  { env: "gym",      action: "idle",     cam: [1.2, 1.35, 3.6], tgt: [0, 0.95, 0] },
  library:   { env: "gym",      action: "idle",     cam: [1.2, 1.35, 3.6], tgt: [0, 0.95, 0] },
  nutrition: { env: "kitchen",  action: "sit",      cam: [0.6, 1.25, 3.1], tgt: [0.2, 0.9, 0] },
  work:      { env: "work",     action: "sit",      cam: [0.9, 1.3, 3.1],  tgt: [0.1, 0.85, 0] },
  trabajo:   { env: "work",     action: "sit",      cam: [0.9, 1.3, 3.1],  tgt: [0.1, 0.85, 0] },
  recovery:  { env: "recovery", action: "stretch",  cam: [0, 1.35, 3.4],   tgt: [0, 0.85, 0] },
  mind:      { env: "mind",     action: "meditate", cam: [0, 1.0, 2.9],    tgt: [0, 0.7, 0] },
  plan:      { env: "lab",      action: "idle",     cam: [-0.6, 1.4, 3.8], tgt: [0, 1.1, -1] },
  coachos:   { env: "lab",      action: "idle",     cam: [0.2, 1.35, 3.6], tgt: [0, 1.0, -0.5] },
  centro:    { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  socios:    { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  cuotas:    { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  agenda:    { env: "gym",      action: "idle",     cam: [1.2, 1.35, 3.6], tgt: [0, 0.95, 0] },
  acceso:    { env: "gym",      action: "idle",     cam: [1.2, 1.35, 3.6], tgt: [0, 0.95, 0] },
  portal:    { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  informes:  { env: "work",     action: "sit",      cam: [0.9, 1.3, 3.1],  tgt: [0.1, 0.85, 0] },
  armory:    { env: "locker",   action: "idle",     cam: [0, 1.1, 2.7],    tgt: [0, 0.95, 0] },
  core:      { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  progress:  { env: "home",     action: "idle",     cam: [0.8, 1.2, 3.2],  tgt: [0, 0.95, 0] },
  appearance:{ env: "locker",   action: "idle",     cam: [0, 1.1, 2.7],    tgt: [0, 0.95, 0] },
  account:   { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
  more:      { env: "home",     action: "idle",     cam: [0, 1.15, 3.3],   tgt: [0, 0.95, 0] },
};

export function travel(placeKey, after) {
  const p = PLACES[placeKey] || PLACES.home;
  if (!UI.W) { after && after(); return; }
  UI.W.goTo(p.env, { avatarAction: p.action, camPos: p.cam, camTarget: p.tgt, onMid: after });
  UI.W.setCameraGoal(p.cam, p.tgt);
}

export function enterHome(first) {
  openSection("hoy");
  if (UI.W) UI.W.avatar.setAction(S.data.today.trained ? "wave" : "idle");
  if (!first) setTimeout(() => UI.W?.avatar.setAction("idle"), 1800);
  document.querySelectorAll(".rail-btn").forEach((x) => x.classList.toggle("active", x.dataset.go === "hoy"));
}

// ============================================================
// DRAWER (panel contextual alrededor del personaje)
// ============================================================
export function openDrawer(title, sub) {
  $("#drawer-title").textContent = title;
  $("#drawer-sub").textContent = sub || "";
  const body = $("#drawer-body");
  body.textContent = "";
  // el panel entra en escena solo cuando se ha cruzado el ingreso
  if (document.body.classList.contains("entered")) {
    $("#drawer").classList.remove("hidden");
    requestAnimationFrame(() => $("#drawer").classList.add("open"));
  }
  return body;
}

export function closeDrawer() {
  if (document.body.classList.contains("fitness-app")) return openSection("hoy");
  if (UI.session) UI.actions.pauseSession?.("Has cerrado el panel");
  $("#drawer").classList.remove("open");
  document.body.classList.remove("modo-sesion"); // el foco de sesión se cierra con el panel
  document.querySelectorAll(".rail-btn").forEach((x) => x.classList.remove("active"));
  if (!UI.session) travel("home");
}

/** Reabre el panel lateral (desde el HUD o tras el ingreso). */
export function reopenPanel() {
  $("#drawer").classList.remove("hidden");
  requestAnimationFrame(() => $("#drawer").classList.add("open"));
}

/**
 * Abre una sección. Si hay sesión activa en otra sección: se PAUSA y persiste
 * (nunca se pierde; se reanuda desde ENTRENAMIENTO).
 */
export function openSection(name) {
  if (document.body.classList.contains("fitness-app") && name === "home") name = "hoy";
  document.body.classList.toggle("avatar-view", name === "armory");
  document.body.dataset.section = name;
  $("#drawer").dataset.section = name;
  if (UI.session && name !== "training") {
    UI.actions.pauseSession?.("Has salido del entrenamiento");
  }
  document.querySelectorAll(".rail-btn").forEach((x) =>
    x.classList.toggle("active", x.dataset.go === name)
  );
  document.querySelectorAll(".nav-btn").forEach((x) =>
    x.classList.toggle("active", x.dataset.nav === name)
  );
  const title = TITLES[name] || TITLES.more;
  if (!document.body.classList.contains("fitness-app") || name === "armory") travel(name); // el personaje viaja; la UI se construye YA (sin pisar vistas por carrera)
  const body = openDrawer(title[0], title[1]);
  const build = BUILDERS[name] || BUILDERS.home;
  if (build) build(body);
  body.scrollTop = 0;
  const group = name === "library"
    ? (document.body.dataset.oneContext === "coach" ? "profile" : "training")
    : ["nutrition","recovery","mind","rhythm","daily"].includes(name) ? "wellbeing"
    : ["appearance","account","more","armory","core","trabajo","coachos"].includes(name) ? "profile"
    : name === "plan" ? "training" : name;
  document.querySelectorAll("#panel-nav [data-go]").forEach(node => {
    const active = node.dataset.go === group; node.classList.toggle("active", active);
    if (active) node.setAttribute("aria-current", "page"); else node.removeAttribute("aria-current");
  });
  if (document.body.classList.contains("entered")) $("#drawer-title").focus({preventScroll:true});
}

export const TITLES = {
  wellbeing: ["Bienestar", "RECUPERAR TAMBIÉN ES AVANZAR"],
  daily: ["Mi día", "TUS HÁBITOS Y REGISTROS"],
  rhythm: ["MI RITMO", "TU CUERPO · TUS DECISIONES"],
  profile: ["Perfil", "UN PLAN QUE ENCAJA CONTIGO"],
  home:      ["INICIO", "TU MUNDO"],
  hoy:       ["Hoy", "ENTRENA A TU RITMO"],
  training:  ["Entrenar", "TU PLAN · TU SIGUIENTE SERIE"],
  library:   ["PROPLAYER", "3.141 EJERCICIOS · BIBLIOTECA TÉCNICA"],
  nutrition: ["NUTRICIÓN", "COCINA · ENERGÍA"],
  trabajo:   ["TRABAJO", "FOCO Y POSTURA"],
  recovery:  ["RECUPERACIÓN", "LABORATORIO"],
  mind:      ["MENTE", "SILENCIO"],
  progress:  ["Progreso", "CADA SERIE CUENTA"],
  plan:      ["PLAN", "MACROCICLO"],
  coachos:   ["COACH OS", "CENTRO DE MANDO"],
  centro:    ["Centro", "TU GIMNASIO, DE UN VISTAZO"],
  socios:    ["Socios", "FICHAS · ACTIVIDAD · MEMBRESÍA"],
  cuotas:    ["Cuotas", "PLANES · COBROS · DEUDA"],
  agenda:    ["Agenda", "CLASES · RESERVAS · AFORO"],
  acceso:    ["Puerta", "CÓDIGOS · BLOQUEO POR IMPAGO"],
  portal:    ["Portal del socio", "LO QUE VE QUIEN SE APUNTA"],
  informes:  ["Informes", "EL MES, EN CIFRAS"],
  armory:    ["ARMARIO", "VESTIDOR BAYONA"],
  core:      ["CORE", "ASISTENTE LOCAL"],
  more:      ["MÁS", "SISTEMA BAYONA"],
};

// ============================================================
// MODALES (foco, teclado, retorno al control que los abrió)
// ============================================================
const FOCALIZABLES = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Los controles que se pueden tabular dentro de un contenedor. */
export function focalizables(raiz) {
  if (!raiz || typeof raiz.querySelectorAll !== "function") return [];
  return [...raiz.querySelectorAll(FOCALIZABLES)]
    .filter((n) => !n.hidden && n.getAttribute?.("aria-hidden") !== "true");
}

/**
 * Mantiene el foco DENTRO de la capa mientras esté abierta: si el
 * Tab se sale por debajo, el teclado del usuario empieza a recorrer
 * la página que hay detrás del modal y no sabe volver.
 */
export function trapFoco(raiz, e) {
  const f = focalizables(raiz);
  if (!f.length) return;
  const primero = f[0], ultimo = f[f.length - 1];
  const activo = document.activeElement;
  const dentro = activo && typeof raiz.contains === "function" && raiz.contains(activo);
  if (e.shiftKey) {
    if (activo === primero || !dentro) { ultimo.focus(); e.preventDefault(); }
  } else if (activo === ultimo || !dentro) {
    primero.focus();
    e.preventDefault();
  }
}

export function showModal(html, after) {
  UI.lastFocus = document.activeElement;
  $("#modal-box").innerHTML = html;
  $("#modal-layer").classList.remove("hidden");
  if (S.data?.settings.haptics && navigator.vibrate) navigator.vibrate(18);
  const first = $("#modal-box button, #modal-box input, #modal-box select");
  first && first.focus();
  after && after();
}

export function hideModal() {
  $("#modal-layer").classList.add("hidden");
  $("#modal-box").textContent = "";
  if (UI.lastFocus && UI.lastFocus.focus) UI.lastFocus.focus();
}

export function wireModalLayer() {
  const layer = $("#modal-layer");
  layer && layer.addEventListener("click", (e) => { if (e.target === layer) hideModal(); });
  document.addEventListener("keydown", (e) => {
    if (!layer || layer.classList.contains("hidden")) return;
    if (e.key === "Escape") { hideModal(); return; }
    // el Tab no se sale del modal hacia lo que hay detrás
    if (e.key === "Tab") trapFoco($("#modal-box"), e);
  });
}

// ============================================================
// FEEDBACK (toasts, XP, sonido, háptica)
// ============================================================
export function toast(kind, text, cls) {
  const box = $("#toasts");
  if (!box) return;
  const tt = el("div", "toast " + (cls || ""));
  tt.appendChild(elT("span", "t-k", kind));
  tt.append(document.createTextNode(text));
  box.appendChild(tt);
  setTimeout(() => { tt.style.opacity = "0"; tt.style.transition = "opacity .4s"; }, 2400);
  setTimeout(() => tt.remove(), 2900);
}

export function xpBurst(amount) {
  const b = el("div", "xp-burst", `+${esc(amount)} XP`);
  b.style.cssText += "right:24px;top:120px";
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1500);
}

let audioCtx = null;
export function playTone(freq, dur, done) {
  if (!S.data?.settings.sound) return done && done();
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = "sine";
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
    setTimeout(() => done && done(), dur * 1000);
  } catch (e) { done && done(); }
}

export function haptic(ms = 15) {
  if (S.data?.settings.haptics && navigator.vibrate) navigator.vibrate(ms);
}

/** aviso de error de almacenamiento (una sola vez por sesión) */
let storageWarned = false;
on("storage-error", () => {
  if (storageWarned) return;
  storageWarned = true;
  toast(t("state.error"), t("err.storage"), "danger");
});

// los módulos autocontenidos (salud, diario, cámara, bridge) avisan con el evento de ventana
if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
  window.addEventListener("bayona:storage-error", () => {
    if (storageWarned) return;
    storageWarned = true;
    toast(t("state.error"), t("err.storage"), "danger");
  });
}
