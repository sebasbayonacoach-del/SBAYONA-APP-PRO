// ============================================================
// BAYONA · APP LOADER
// ------------------------------------------------------------
// La landing pública no necesita descargar el mundo 3D ni toda la app.
// Este módulo mantiene el primer render ligero y carga el producto real
// únicamente cuando el usuario entra (o cuando es un usuario recurrente).
// ============================================================

let appPromise = null;
let visionScheduled = false;

function scheduleVision() {
  if (visionScheduled || typeof window === "undefined") return;
  visionScheduled = true;
  const load = () => import("./vision/boot.js").catch(() => null);
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 1200);
}

export function isAppLoaded() {
  return Boolean(globalThis.window?.BAYONA?.world);
}

export function loadApp() {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    // La configuración cloud tampoco forma parte del coste de la landing.
    // En local puede no existir como runtime JS; el cliente tiene fallback seguro.
    try { await import("/api/runtime-config.js"); } catch { /* local/offline */ }

    // main crea estado, mundo, UI y cablea la puerta de entrada.
    await import("./main.js");

    // Capas funcionales que deben estar listas antes del primer clic real.
    const settled = await Promise.allSettled([
      import("./ui/motion.js"),
      import("./move.js"),
      import("./health/healthUI.js"),
      import("./bridge.js"),
      import("./onboarding.js"),
      import("./diary/sessionDiary.js"),
    ]);

    // Un módulo complementario no debe dejar al usuario frente a una pantalla
    // muerta. El núcleo ya está cargado; reportamos degradación y seguimos.
    const rejected = settled.filter((x) => x.status === "rejected");
    if (rejected.length && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bayona:optional-load-error", {
        detail: { count: rejected.length },
      }));
    }

    scheduleVision();
    return { ok: true, optionalFailures: rejected.length };
  })().catch((error) => {
    appPromise = null; // permite reintentar
    throw error;
  });

  return appPromise;
}
