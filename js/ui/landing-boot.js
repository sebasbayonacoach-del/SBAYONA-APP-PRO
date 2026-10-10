// ============================================================
// BAYONA · LUXE — boot ligero de la landing pública
// ------------------------------------------------------------
// La landing se puede pintar sin descargar Three.js ni el producto completo.
// El núcleo BAYONA se importa únicamente al entrar o para un usuario recurrente.
// ============================================================
import { t, esc } from "../i18n.js";
import { loadApp } from "../app-loader.js";
import { montarLanding } from "./landing.js";
import { initTheme } from "../theme.js";

function yaDentro() {
  try {
    const save = localStorage.getItem("bayona.save.v2");
    const onboarded = save && JSON.parse(save)?.profile?.onboarded;
    return Boolean(onboarded) || document.body.classList.contains("entered");
  } catch {
    return false;
  }
}

function removeLanding() {
  document.body.classList.remove("luxe-activo");
  document.getElementById("luxe-landing")?.remove();
  document.getElementById("luxe-nav")?.remove();
}

function setLoading(on) {
  document.querySelectorAll("#luxe-landing button, #luxe-nav button").forEach((button) => {
    button.disabled = Boolean(on);
    if (on) {
      if (!button.dataset.beforeLoad) button.dataset.beforeLoad = button.textContent || "";
      button.textContent = t("luxe.load.loading");
    } else if (button.dataset.beforeLoad) {
      button.textContent = button.dataset.beforeLoad;
      delete button.dataset.beforeLoad;
    }
  });
}

function showLoadError() {
  setLoading(false);
  const root = document.getElementById("luxe-landing");
  if (!root) return;
  let msg = root.querySelector("[data-luxe-load-error]");
  if (!msg) {
    msg = document.createElement("div");
    msg.dataset.luxeLoadError = "1";
    msg.className = "luxe-load-error";
    msg.setAttribute("role", "status");
    root.prepend(msg);
  }
  msg.textContent = t("luxe.load.error");
}

async function enterApp(plan = null, role = null) {
  setLoading(true);
  try {
    const personalPlans = new Set(["free","raiz","performance","elite","atleta","pro"]);
    if (personalPlans.has(plan)) {
      try { localStorage.setItem("bayona.plan.intent.v1", plan); } catch { /* opcional */ }
    }

    await loadApp();
    removeLanding();

    // Un CTA genérico abre el portal de acceso para que el usuario elija
    // su espacio. Los planes personales conservan su intención para onboarding.
    const inferredRole = role || (plan === "centro" ? "coach" : (personalPlans.has(plan) ? "affiliate" : null));
    if (!inferredRole) {
      document.getElementById("entry")?.focus?.({ preventScroll: true });
      return;
    }

    const safeRole = inferredRole === "coach" ? "coach" : "affiliate";
    const target = document.getElementById(safeRole === "coach" ? "entry-coach" : "entry-go");
    if (target) {
      target.click();
      return;
    }

    window.dispatchEvent(new CustomEvent("bayona:luxe-entrar", {
      detail: { plan, role: safeRole },
    }));
  } catch (error) {
    console.error("BAYONA: no se pudo cargar la app", error);
    showLoadError();
  }
}

function directTarget() {
  const search = globalThis.location?.search || "";
  const hash = (globalThis.location?.hash || "").replace(/^#\/?/, "");
  const go = new URLSearchParams(search).get("go");
  const target = String(go || hash || "").trim().toLowerCase();
  return target || null;
}

function boot() {
  initTheme();
  const direct = directTarget();
  const source = new URLSearchParams(globalThis.location?.search || "").get("source");
  const appShell = source === "pwa";
  const nativeShell = Boolean(
    globalThis.Capacitor?.isNativePlatform?.()
    || globalThis.Capacitor?.getPlatform?.() === "android"
    || globalThis.Capacitor?.getPlatform?.() === "ios"
  );
  document.body.classList.toggle("pwa-shell-entry", appShell || nativeShell);
  const platformLabel = document.getElementById("entry-platform");
  if (platformLabel) {
    const nativePlatform = String(globalThis.Capacitor?.getPlatform?.() || "").toUpperCase();
    const surface = nativeShell ? (nativePlatform || "APP") : (appShell ? "PWA" : "WEB");
    platformLabel.textContent = `ESPAÑOL · ${surface}`;
  }

  // Una instalación real (PWA o APK/iOS) ya es producto, no página de venta:
  // salta marketing y entra al selector Atleta / Coach. La web pública conserva
  // la landing para visitantes nuevos.
  if (yaDentro() || direct || appShell || nativeShell) {
    removeLanding();
    const role = direct === "coachos" || direct === "coach-os"
      ? "coach"
      : (localStorage.getItem("bayona.entry.role.v1") || "affiliate");
    loadApp()
      .then(() => {
        if (direct && !document.body.classList.contains("entered")) {
          document.getElementById(role === "coach" ? "entry-coach" : "entry-go")?.click();
        }
      })
      .catch((error) => {
        console.error("BAYONA: arranque diferido falló", error);
      });
    return;
  }

  document.body.classList.add("luxe-activo");
  addEventListener("bayona:entered", removeLanding, { once: true });

  montarLanding({
    t,
    esc,
    onEntrar: (plan) => enterApp(plan),
  });
}

if (document.readyState === "loading") {
  addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
