// ============================================================
// BAYONA — BOOTSTRAP
// AppShell → WorldScene → PersistentAvatar → InterfaceOverlay
// "BAYONA vive alrededor del personaje."
// ============================================================
import { S } from "./state.js";
import { World } from "./world.js";
import { initUI } from "./ui.js";
import { openSection } from "./ui/shared.js";
import { ITEMS } from "./data.js";
import { loadFaceImage } from "./face.js";

function boot() {
  S.init();

  const canvas = document.getElementById("scene");
  const world = new World(canvas);

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

  // CORE clickable en 3D (o por posición proyectada en fallback 2.5D)
  canvas.addEventListener("pointerdown", (e) => {
    if (world.fallback2d) {
      if (world.fallback2d.coreHit(e.clientX, e.clientY)) {
        openSection("core");
      }
      return;
    }
    const x = (e.clientX / innerWidth) * 2 - 1;
    const y = -(e.clientY / innerHeight) * 2 + 1;
    const hits = world.raycastNDC(x, y, [world.core.group]);
    if (hits.length) {
      openSection("core");
    }
  });

  initUI(world);

  // loop
  const loop = () => { world.update(); requestAnimationFrame(loop); };
  loop();

  // estado de día por si la app lleva abierta mucho
  setInterval(() => { S.rollDay(); }, 60000);

  console.log("%cBAYONA · TU VIDA ES EL JUEGO", "color:#ff6a00;font-weight:bold");

  // PWA: service worker (offline del shell de la app). ?nosw=1 lo desactiva (diagnóstico).
  if ("serviceWorker" in navigator && location.protocol !== "file:" && !location.search.includes("nosw=1")) {
    navigator.serviceWorker.register("./sw.js").catch(() => { /* sin SW en este entorno */ });
  }
}

addEventListener("DOMContentLoaded", boot);
