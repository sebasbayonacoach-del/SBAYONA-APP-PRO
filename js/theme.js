// BAYONA — Theme Engine v1
// Tema visual independiente de membresía y contexto Coach/Personal.
import { BRAND, brandTheme } from "./brand.js";

export const THEMES = Object.freeze(["dark", "light", "system"]);
export const THEME_KEY = "bayona.theme.v1";
const BRAND_LIGHT_META = "#F7F3EC";

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
    const palette = brandTheme(resolved);
    root.dataset.bayonaTheme = preferred;
    root.dataset.surfaceTheme = resolved;
    root.style.colorScheme = resolved;
    root.style.setProperty?.("--brand-black", BRAND.black);
    root.style.setProperty?.("--brand-black-2", BRAND.black2);
    root.style.setProperty?.("--brand-black-3", BRAND.black3);
    root.style.setProperty?.("--brand-white", BRAND.white);
    root.style.setProperty?.("--brand-orange", BRAND.orange);
    root.style.setProperty?.("--brand-orange-fire", BRAND.orangeFire);
    root.style.setProperty?.("--brand-orange-deep", BRAND.orangeDeep);
    root.style.setProperty?.("--brand-accent-text", palette.accentText);
    root.style.setProperty?.("--brand-bg", palette.bg);
    root.style.setProperty?.("--brand-surface", palette.surface);
    root.style.setProperty?.("--brand-elevated", palette.elevated);
    root.style.setProperty?.("--brand-ink", palette.ink);
    root.style.setProperty?.("--brand-muted", palette.muted);
    const meta = root.ownerDocument?.querySelector?.('meta[name="theme-color"]');
    meta?.setAttribute?.("content", resolved === "light" ? BRAND_LIGHT_META : BRAND.black);
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
