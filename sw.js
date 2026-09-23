// ============================================================
// BAYONA — Service Worker (PWA offline)
// Shell precacheado + cache con revalidación para el resto (media, wasm…).
// Con esto la app abre sin red y el registro de series funciona offline
// (los datos viven en el dispositivo y se sincronizan después).
// ============================================================
const CACHE = "bayona-shell-v5";
const SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/main.js", "./js/state.js", "./js/data.js", "./js/engine.js", "./js/rewards.js",
  "./js/i18n.js", "./js/consents.js", "./js/phygital.js", "./js/media.js", "./js/bridge.js",
  "./js/onboarding.js", "./js/face.js", "./js/ui.js", "./js/avatar.js", "./js/world.js", "./js/fallback2d.js",
  "./js/ui/shared.js", "./js/ui/cinematics.js", "./js/ui/training.js", "./js/ui/nutrition.js",
  "./js/ui/recovery.js", "./js/ui/mind.js", "./js/ui/plan.js", "./js/ui/armory.js",
  "./js/ui/progress.js", "./js/ui/core.js", "./js/ui/more.js",
  "./js/coach/coachStub.js", "./js/coach/replies.js", "./js/data/offlineQueue.js",
  "./js/diary/sessionDiary.js", "./js/health/healthMap.js", "./js/health/healthUI.js",
  "./js/vision/boot.js", "./js/vision/pose.js", "./js/vision/repCounter.js", "./js/vision/angles.js",
  "./js/vision/formScore.js", "./js/vision/retarget.js",
  "./vendor/three.module.js",
  "./icon-192.png", "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const path = new URL(req.url).pathname;
  const isCode = /\.(js|css|html|webmanifest|json)$/.test(path) || req.mode === "navigate";
  if (isCode) {
    // NETWORK-FIRST para código: una app que evoluciona nunca debe servir JS/CSS viejos
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => { /* cuota */ });
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }
  // media/wasm: cache primero (son estables y pesados)
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => { /* cuota */ });
        }
        return res;
      }).catch(() => hit || caches.match("./index.html"));
      return hit || net;
    })
  );
});
