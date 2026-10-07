// BAYONA — Brand System v1
// Espejo de SBAYONA-WEB-PRO/src/styles.css + engine/config/theme.js.
// La paleta DARK es literal. LIGHT es una adaptación de producto accesible
// porque la web editorial actual es dark-only, mientras la app soporta Día/Noche.

export const BRAND = Object.freeze({
  black: "#050505",
  black2: "#0C0C0D",
  black3: "#141416",
  white: "#FFFFFF",
  muted: "#C4C4C4",
  grayDim: "#949494",
  orange: "#F4A261",
  orangeFire: "#E76F51",
  orangeDeep: "#D45D38",
  orangeOnDark: "#FFC08A",
  orangeOnLight: "#9C4F1F",
});

export const BRAND_DARK = Object.freeze({
  bg: BRAND.black,
  surface: BRAND.black2,
  elevated: BRAND.black3,
  ink: BRAND.white,
  muted: BRAND.muted,
  dim: BRAND.grayDim,
  accent: BRAND.orange,
  accentStrong: BRAND.orangeFire,
  accentDeep: BRAND.orangeDeep,
  accentText: BRAND.orangeOnDark,
});

export const BRAND_LIGHT = Object.freeze({
  // Adaptación del producto; mantiene el naranja BAYONA y contraste AA en texto.
  bg: "#F7F3EC",
  surface: "#FFFFFF",
  elevated: "#EFE8DE",
  ink: "#111111",
  muted: "#665F58",
  dim: "#81766C",
  accent: BRAND.orange,
  accentStrong: BRAND.orangeFire,
  accentDeep: BRAND.orangeDeep,
  accentText: BRAND.orangeOnLight,
});

export function brandTheme(mode = "dark") {
  return mode === "light" ? BRAND_LIGHT : BRAND_DARK;
}
