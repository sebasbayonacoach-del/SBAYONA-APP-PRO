// ============================================================
// BAYONA · instalación PWA
// Captura el prompt nativo cuando el navegador lo ofrece y expone
// un estado pequeño para que la UI no dependa de APIs concretas.
// ============================================================

let deferredPrompt = null;
const listeners = new Set();

function nav() {
  return typeof navigator !== "undefined" ? navigator : null;
}

function loc() {
  return typeof location !== "undefined" ? location : null;
}

export function isStandalone() {
  const n = nav();
  const standaloneIOS = Boolean(n && "standalone" in n && n.standalone);
  const standaloneDisplay = typeof matchMedia === "function"
    ? matchMedia("(display-mode: standalone)").matches
    : false;
  return standaloneIOS || standaloneDisplay;
}

export function isIOS() {
  const ua = nav()?.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua);
}

export function installState() {
  const l = loc();
  const secure = !l || l.protocol === "https:" || ["localhost", "127.0.0.1", "::1"].includes(l.hostname);
  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferredPrompt),
    ios: isIOS(),
    secure,
  };
}

function notify() {
  const snapshot = installState();
  for (const fn of listeners) {
    try { fn(snapshot); } catch { /* un listener visual nunca rompe la app */ }
  }
}

export function onInstallState(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function requestInstall() {
  if (isStandalone()) return { status: "installed" };

  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    deferredPrompt = null;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      notify();
      return { status: choice?.outcome || "dismissed" };
    } catch {
      notify();
      return { status: "manual" };
    }
  }

  return { status: isIOS() ? "manual-ios" : "manual" };
}

if (typeof addEventListener === "function") {
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });

  addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}
