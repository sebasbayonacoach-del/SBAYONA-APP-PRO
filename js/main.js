// ============================================================
// BAYONA — BOOTSTRAP
// AppShell → WorldScene → PersistentAvatar → InterfaceOverlay
// "BAYONA vive alrededor del personaje." · ingreso cinematográfico
// → mundo limpio → TODO el contenido en el PANEL LATERAL.
// ============================================================
import { S } from "./state.js";
import { World } from "./world.js";
import { initUI } from "./ui.js";
import { openSection, enterHome } from "./ui/shared.js";
import { installFitnessUI } from "./ui/fitness.js";
import { installDashboard, dashboardActivo } from "./ui/dashboard.js";
import { installOneShell } from "./ui/one.js";
import { ITEMS } from "./data.js";
import { t } from "./i18n.js";
import { applyTheme } from "./theme.js";
import { loadFaceImage } from "./face.js";

function boot() {
  S.init();

  const canvas = document.getElementById("scene");
  const world = new World(canvas);
  world.setMood("noche");
  window.dispatchEvent(new CustomEvent("bayona:world-ready", { detail: world }));

  // reduced motion desde ajustes o sistema
  const prefersReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  world.reducedMotion = prefersReduce || !S.data.settings.motion;

  // avatar con el outfit persistido
  const itemsById = {};
  ITEMS.forEach((i) => (itemsById[i.id] = i));
  world.avatar.setSkin(["#e0e0e0", "#c9c9c9", "#a6a6a6", "#808080", "#5c5c5c", "#3a3a3a"][S.data.profile.skin] || S.data.profile.skinHex || "#c9c9c9");
  world.avatar.setOutfit(S.data.inventory.equipped, itemsById);

  // avatar 3D (Avaturn): si falla, el de la foto sigue — nunca pantalla rota
  if (S.data.profile.avatar3d) {
    import("./avatar3d.js").then(({ attachAvatar3d }) =>
      attachAvatar3d(world, S.data.profile.avatar3d).catch((e) => {
        toastUi("3D NO CARGÓ", `Tu foto sigue en escena (${e?.message || "red"}). Reintenta en APARIENCIA.`, "danger");
      }));
  }

  // cara real del usuario (foto → avatar)
  if (S.data.profile.face) {
    world.avatar.setFace(S.data.profile.face);
    loadFaceImage(S.data.profile.face).then((im) => {
      if (im && world.fallback2d) world.fallback2d.avatar.faceImg = im;
      if (im) world.avatar.faceImg = im; // usado por fallback al crearse
    });
  }

  // outfit reactivo
  let lastOutfit = JSON.stringify(S.data.inventory.equipped);
  setInterval(() => {
    const now = JSON.stringify(S.data.inventory.equipped);
    if (now !== lastOutfit) {
      lastOutfit = now;
      world.avatar.setOutfit(S.data.inventory.equipped, itemsById);
    }
  }, 500);

  // CORE clickable en modo fallback 2.5D (en 3D lo gestiona js/move.js)
  canvas.addEventListener("pointerdown", (e) => {
    if (world.fallback2d && world.fallback2d.coreHit(e.clientX, e.clientY)) openSection("core");
  });

  installFitnessUI();
  initUI(world);
  installOneShell();
  wireEntry(world);
  // DASHBOARD DE ESCRITORIO · el personaje al centro, con el resumen vivo
  // alrededor. Se enciende al entrar y se apaga solo por debajo de 1100 px.
  installDashboard();

  // depuración / agentes: manija pública al mundo (escena, no datos personales)
  window.BAYONA = { world };

  // loop: el mundo se dibuja cuando se ve el personaje — en el vestidor
  // o en el tablero de escritorio.
  const loop = () => {
    const visible = document.body.classList.contains("avatar-view") || dashboardActivo();
    if (!document.hidden && visible) world.update();
    requestAnimationFrame(loop);
  };
  loop();

  // estado de día por si la app lleva abierta mucho
  setInterval(() => { S.rollDay(); }, 60000);

  console.log("%cBAYONA · TU VIDA ES EL JUEGO", "color:#ff6a00;font-weight:bold");

  // PWA: service worker (offline del shell de la app). ?nosw=1 lo desactiva (diagnóstico).
  if ("serviceWorker" in navigator && location.protocol !== "file:" && !location.search.includes("nosw=1")) {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* sin SW en este entorno */ });
  }
}

// ============================================================
// INGRESO · portada cinematográfica (nada se muestra de golpe:
// primero la portada, luego el mundo, el contenido vive en el panel)
// ============================================================
function wireEntry(world) {
  const entry = document.getElementById("entry");
  const affiliate = document.getElementById("entry-go");
  const coach = document.getElementById("entry-coach");
  const resume = document.getElementById("entry-resume");
  const resumeLabel = document.getElementById("entry-resume-label");
  const modeName = document.getElementById("mode-name");
  if (!entry || !affiliate || !coach) return;

  // El vídeo de la tarjeta no forma parte del coste de la landing pública.
  // Solo se activa cuando el producto completo ya fue solicitado.
  const previewVideo = affiliate.querySelector("video[data-src]");
  if (previewVideo) {
    const poster = previewVideo.dataset.poster;
    if (poster) previewVideo.poster = poster;
    const saveData = Boolean(navigator.connection?.saveData);
    if (!saveData) {
      previewVideo.src = previewVideo.dataset.src || "";
      previewVideo.load();
      previewVideo.play().catch(() => { /* autoplay puede estar bloqueado */ });
    }
  }

  // El selector aplica realmente los dos temas a la app, no solo a la portada.
  const themeButtons=[...entry.querySelectorAll("[data-entry-theme]")];
  const syncEntryTheme=()=>{
    const active=document.documentElement.dataset.surfaceTheme||"dark";
    themeButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.entryTheme===active)));
  };
  themeButtons.forEach(button=>button.addEventListener("click",()=>applyTheme(button.dataset.entryTheme)));
  addEventListener("bayona:theme",syncEntryTheme);
  syncEntryTheme();

  // Tema siempre disponible también dentro del dashboard Cliente y Coach.
  const appThemeToggle=document.getElementById("global-theme-switch");
  const appThemeLabel=document.getElementById("global-theme-label");
  const syncAppTheme=()=>{
    const isLight=document.documentElement.dataset.surfaceTheme==="light";
    if(appThemeToggle){
      appThemeToggle.setAttribute("aria-label",isLight?"Activar modo noche":"Activar modo día");
      appThemeToggle.setAttribute("aria-pressed",String(isLight));
    }
    if(appThemeLabel)appThemeLabel.textContent=isLight?"NOCHE":"DÍA";
  };
  appThemeToggle?.addEventListener("click",()=>applyTheme(
    document.documentElement.dataset.surfaceTheme==="light"?"dark":"light"
  ));
  addEventListener("bayona:theme",syncAppTheme);
  syncAppTheme();

  const roleKey = "bayona.entry.role.v1";
  const storedRole = localStorage.getItem(roleKey);
  const lastRole = storedRole || "affiliate";
  entry.dataset.lastRole = lastRole;
  entry.querySelectorAll("[data-entry-role]").forEach((b) => {
    // Un usuario nuevo no tiene «último acceso»: no marcamos uno inventado.
    b.setAttribute("aria-pressed", String(Boolean(storedRole) && b.dataset.entryRole === storedRole));
  });
  if (resume && resumeLabel) {
    resume.hidden = !storedRole;
    if (storedRole) {
      resumeLabel.textContent = t(storedRole === "coach" ? "one.entry.resumeCoach" : "one.entry.resumeAthlete");
    }
  }

  if (S.data.profile.onboarded) {
    const rawName = String(S.data.profile.name || "").trim();
    const name = rawName && rawName.toUpperCase() !== "TÚ" ? rawName : "";
    entry.querySelector(".e-sub").textContent = name
      ? t("one.entry.welcome", { name })
      : t("one.entry.welcomeGeneric");
    affiliate.querySelector(".e-role-copy strong").textContent =
      t(S.getActiveSession() ? "one.entry.session" : "one.entry.experience");
  }

  const syncChrome = (m) => {
    if (modeName) modeName.textContent = m === "noche" ? "NOCHE" : "CINE";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",
      document.documentElement.dataset.surfaceTheme === "light" ? "#F7F3EC" : "#050505");
  };
  syncChrome("noche");

  const enter = (role = "affiliate") => {
    if (document.body.classList.contains("entered")) return;
    const safeRole = role === "coach" ? "coach" : "affiliate";
    localStorage.setItem(roleKey, safeRole);
    document.body.dataset.entryRole = safeRole;
    document.body.classList.toggle("entry-coach", safeRole === "coach");
    document.body.classList.toggle("entry-affiliate", safeRole === "affiliate");
    document.body.classList.add("entered");
    document.body.classList.remove("pwa-shell-entry");
    entry.classList.add("gone");
    window.dispatchEvent(new CustomEvent("bayona:entered", { detail:{ role:safeRole } }));

    setTimeout(() => {
      if (safeRole === "coach") {
        openSection("coachos");
        return;
      }
      if (S.data.profile.onboarded) {
        openSection(S.getActiveSession() ? "training" : "hoy");
      } else {
        enterHome(false);
      }
    }, 380);
  };

  affiliate.addEventListener("click", () => enter("affiliate"));
  coach.addEventListener("click", () => enter("coach"));
  resume?.addEventListener("click", () => storedRole && enter(lastRole));
  addEventListener("keydown", (e) => {
    if (document.body.classList.contains("entered")) return;
    if (e.target.closest("button, input, select, textarea")) return;
    if (e.key === "1") return enter("affiliate");
    if (e.key === "2") return enter("coach");
    if ((e.key === "Enter" || e.key === " ") && storedRole) enter(lastRole);
  });
}

function toastUi(kind, text, cls) {
  import("./ui/shared.js").then(({ toast }) => toast(kind, text, cls));
}

if (document.readyState === "loading") {
  addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
