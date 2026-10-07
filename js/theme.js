// BAYONA — Theme Engine v1
// Tema visual independiente de membresía y contexto Coach/Personal.

export const THEMES = Object.freeze(["dark", "light", "system"]);
export const THEME_KEY = "bayona.theme.v1";

export function normalizeTheme(theme) {
  const value = String(theme || "").toLowerCase();
  return THEMES.includes(value) ? value : "dark";
}

export function resolvedTheme(theme, media = globalThis.matchMedia?.("(prefers-color-scheme: light)")) {
  const value = normalizeTheme(theme);
  if (value !== "system") return value;
  return media?.matches ? "light" : "dark";
}

export function readTheme(storage = globalThis.localStorage) {
  try { return normalizeTheme(storage?.getItem(THEME_KEY) || "dark"); }
  catch { return "dark"; }
}

export function applyTheme(theme, { root = globalThis.document?.documentElement, storage = globalThis.localStorage, persist = true } = {}) {
  const preferred = normalizeTheme(theme);
  const resolved = resolvedTheme(preferred);
  if (root) {
    root.dataset.bayonaTheme = preferred;
    root.dataset.surfaceTheme = resolved;
    root.style.colorScheme = resolved;
  }
  if (persist) {
    try { storage?.setItem(THEME_KEY, preferred); } catch { /* storage opcional */ }
  }
  globalThis.dispatchEvent?.(new CustomEvent("bayona:theme", { detail: { preferred, resolved } }));
  return { preferred, resolved };
}

export function initTheme() {
  const preferred = readTheme();
  const out = applyTheme(preferred, { persist: false });
  if (preferred === "system" && globalThis.matchMedia) {
    const mq = matchMedia("(prefers-color-scheme: light)");
    mq.addEventListener?.("change", () => applyTheme("system", { persist: false }));
  }
  return out;
}
