// ============================================================
// BAYONA · LUXE — boot de la landing pública
// ------------------------------------------------------------
// Se carga como módulo independiente (antes de que main.js
// termine de bootear). Decide si la landing se muestra:
//   · usuario NUEVO (no onboarded) → landing visible, la puerta
//     #entry se apaga hasta que el usuario pida entrar.
//   · usuario que YA entró (body.entered) → landing oculta y
//     nada cambia respecto a v9.
// Nunca toca datos de juego: solo pinta y delega el clic.
// ============================================================
import { t, esc } from "../i18n.js";
import { montarLanding } from "./landing.js";

/** ¿El usuario ya está dentro de la app? (misma señal que usa main.js) */
function yaDentro() {
  try {
    const ap = JSON.parse(localStorage.getItem("bayona.appearance.v1") || "{}");
    // la puerta se salta cuando onboarded=true (main.js: wireEntry auto-enter)
    const save = localStorage.getItem("bayona.save.v2");
    const onboarded = save && JSON.parse(save)?.profile?.onboarded;
    return Boolean(onboarded) || document.body.classList.contains("entered");
  } catch {
    return false;
  }
}

function irALaApp(plan) {
  document.body.classList.remove("luxe-activo");
  document.body.classList.add("entered");
  const landing = document.getElementById("luxe-landing");
  if (landing) landing.remove();
  const nav = document.getElementById("luxe-nav");
  if (nav) nav.remove();
  // la puerta #entry sigue con su flujo de v9: el botón ENTRAR es el mismo
  const go = document.getElementById("entry-go");
  if (go) go.click();
  else window.dispatchEvent(new CustomEvent("bayona:luxe-entrar", { detail: { plan } }));
}

function boot() {
  if (yaDentro()) {
    // usuario recurrente: sin landing, la app arranca como siempre
    const l = document.getElementById("luxe-landing");
    if (l) l.remove();
    return;
  }

  // usuario nuevo: la landing manda y la puerta se apaga hasta pedir entrar
  document.body.classList.add("luxe-activo");
  // si el usuario entra por OTRA vía (Enter en la portada de main.js,
  // enlace ?go=…), la app avisa: retiramos la landing y cedemos el control
  addEventListener("bayona:entered", () => {
    document.body.classList.remove("luxe-activo");
    const l = document.getElementById("luxe-landing");
    if (l) l.remove();
  }, { once: true });
  montarLanding({
    t,
    esc,
    onEntrar: (plan) => irALaApp(plan),
  });
}

if (document.readyState === "loading") {
  addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
