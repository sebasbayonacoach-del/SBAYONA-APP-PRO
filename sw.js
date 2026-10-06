// ============================================================
// BAYONA — Service Worker (PWA offline)
// Shell precacheado + cache con revalidación para el resto (media, wasm…).
// Con esto la app abre sin red y el registro de series funciona offline
// (los datos viven en el dispositivo y se sincronizan después).
// ============================================================
const CACHE = "bayona-shell-v31";
const SHELL = [
  "./css/pro.css",
  "./css/luxe.css",
  "./js/ui/landing.js", "./js/ui/landing-boot.js", "./js/app-loader.js",
  "./js/gym/model.js", "./js/gym/store.js", "./js/gym/acceso.js", "./js/gym/informes.js", "./js/gym/pagos.js",
  "./js/ui/centro.js", "./js/ui/cuotas.js", "./js/ui/agenda.js",
  "./js/ui/acceso.js",  "./js/ui/portal.js", "./js/ui/informes.js",
  "./js/comandos.js", "./js/ui/command.js",
  "./css/fitness.css", "./js/ui/fitness.js",
  "./css/dashboard.css", "./js/ui/dashboard.js", "./js/recipeImage.js",
  "./css/coach.css", "./js/coach/ai-core.js", "./js/coach/ai.js",
  "./js/personalization.js", "./js/cycle.js", "./js/ui/personal.js", "./css/personal.css",
  "./js/pwa.js", "./js/sync/config.js", "./js/sync/supabase.js", "./js/sync/outbox.js", "./js/sync/coaching.js", "./js/nutricion-db.js", "./js/data/alimentos.json",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css", "./css/aurum.css", "./css/motion.css",
  "./fonts/fonts.css",
  "./fonts/instrument-sans-pxiTypc9vs.woff2",
  "./fonts/newsreader-cY9AfjOCX1.woff2", "./fonts/newsreader-cY9XfjOCX1.woff2",
  "./fonts/space-mono-i7dPIFZifj.woff2", "./fonts/space-mono-i7dMIFZifj.woff2",
  "./js/main.js", "./js/move.js", "./js/state.js", "./js/data.js", "./js/engine.js", "./js/rewards.js",
  "./js/i18n.js", "./js/consents.js", "./js/phygital.js", "./js/media.js", "./js/bridge.js",
  "./js/onboarding.js", "./js/face.js", "./js/avatar3d.js", "./js/ui.js", "./js/avatar.js", "./js/world.js", "./js/fallback2d.js",
  "./js/ui/shared.js", "./js/ui/one.js", "./js/ui/affiliate-v12.js", "./js/ui/cinematics.js", "./js/ui/training.js", "./js/ui/proplayer-library.js", "./trainingym/catalog.json", "./js/ui/nutrition.js",
  "./js/ui/recovery.js", "./js/ui/mind.js", "./js/ui/plan.js", "./js/ui/armory.js",
  "./js/ui/progress.js", "./js/ui/core.js", "./js/ui/more.js",
  "./js/ui/hoy.js", "./js/ui/trabajo.js", "./js/ui/coachos.js", "./js/ui/appearance.js", "./js/ui/motion.js",
  "./js/sync/account.js", "./js/hoy.js", "./js/contexto.js", "./js/coachos.js", "./js/medidas.js",
  "./js/timeline.js", "./js/nutricion.js", "./js/sync/mirror.js",
  "./js/coach/coachStub.js", "./js/coach/replies.js", "./js/seguridad-guion.js", "./js/data/offlineQueue.js",
  "./js/diary/sessionDiary.js", "./js/health/healthMap.js", "./js/health/healthUI.js",
  "./js/vision/boot.js", "./js/vision/pose.js", "./js/vision/repCounter.js", "./js/vision/angles.js",
  "./js/vision/formScore.js", "./js/vision/retarget.js",
  "./vendor/three.module.js",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png",
];

self.addEventListener("install", (e) => {
  // `cache.addAll()` es TODO O NADA: si UNA sola entrada da 404, la
  // promesa se rechaza, el `install` falla y la app se queda SIN
  // OFFLINE sin decir nada. Por eso se cachea de uno en uno: un
  // recurso que falte no puede tumbar el precache entero.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((ruta) =>
        c.add(new Request(ruta, { cache: "reload" })).catch(() => {
          console.warn("[sw] no se pudo precachear", ruta);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("bayona-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const path = new URL(req.url).pathname;
  // API dinámica y biblioteca privada: nunca cachear respuestas como si fueran shell.
  // Especialmente importante para /api/cloud-status.js: offline debe fallar como API,
  // no devolver index.html ni una respuesta obsoleta.
  if (path.startsWith("/api/") || path.includes("/private-trainingym/")) {
    e.respondWith(fetch(req));
    return;
  }
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
      }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : new Response("Sin conexión", { status: 503 }))))
    );
    return;
  }
  // media/wasm: cache primero (son estables y pesados)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
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
