// ============================================================
// BAYONA — CATÁLOGO DE MEDIOS DEL EJERCICIO
// Vídeos y pósters de demostración PREGRABADOS (no son transmisiones en vivo
// ni capturas del usuario). Si un ejercicio no tiene vídeo, se dice y se dan
// instrucciones escritas: nunca se reutiliza una demostración de otro ejercicio.
// ============================================================

// nombre base del archivo en media/ por cada clave de ejercicio (null = sin vídeo)
export const MEDIA_MAP = {
  squat:     { media: "squat",     tip: "Pecho arriba, rodillas siguiendo la punta del pie. Baja controlado 2s, sube explosivo." },
  bench:     { media: "bench",     tip: "Escápulas retraídas, barra al tercio inferior del pecho. Codos a 45°." },
  deadlift:  { media: "deadlift",  tip: "Espalda neutra, cadera y rodillas juntas. La barra roza las piernas." },
  ohp:       { media: "ohp",       tip: "Glúteos y abdomen firmes. No arquees la lumbar al empujar." },
  pullup:    { media: "pullup",    tip: "Escápulas abajo antes de tirar. Pecho a la barra, descenso controlado." },
  row:       { media: "row",       tip: "Bisagra de cadera firme. Tira al ombligo, sin balancear el torso." },
  lunge:     { media: "lunge",     tip: "Paso firme, rodilla trasera al suelo. Torso vertical todo el rato." },
  curl:      { media: "curl",      tip: "Codos pegados al cuerpo. Sin impulso de cadera." },
  plank:     { media: "plank",     tip: "Cadera alineada con hombros y tobillos. Respira profundo." },
  pushup:    { media: null,        tip: "Cuerpo como una tabla. Baja hasta el pecho casi al suelo. Sin vídeo: sigue la técnica escrita." },
  hipthrust: { media: null,        tip: "Barra sobre la cadera, barbilla metida. Aprieta el glúteo arriba 1s. Sin vídeo: sigue la técnica escrita." },
  burpee:    { media: null,        tip: "Flujo continuo: baja, estira, salta. No pares en el suelo. Sin vídeo: sigue la técnica escrita." },
  mobility:  { media: "mobility",  tip: "Sin rebotes. Mantén cada posición respirando 30-45s." },
  breathing: { media: "breathing", tip: "Inhala nariz 4s, retén, exhala boca 4s. Espalda recta, ojos cerrados." },
};

export const mediaSrc = (name, ext = "mp4") => `media/${name}.${ext}`;
export const posterSrc = (name) => `media/${name}.jpg`;

// Para el bundle single-file estas rutas se reemplazan por data URIs.
export const MEDIA_BASE64 = (typeof window !== "undefined" && window.__BAYONA_MEDIA__) || null;
export function hasVideo(exKey) {
  const m = MEDIA_MAP[exKey];
  return !!(m && m.media);
}
export function videoFor(exKey) {
  const m = MEDIA_MAP[exKey];
  if (!m || !m.media) return null;
  if (MEDIA_BASE64 && MEDIA_BASE64[m.media]) {
    const a = MEDIA_BASE64[m.media];
    return a.mp4 || a.webm || null;
  }
  return mediaSrc(m.media);
}
export function posterFor(exKey) {
  const m = MEDIA_MAP[exKey];
  if (!m || !m.media) return null;
  if (MEDIA_BASE64 && MEDIA_BASE64[m.media]) return MEDIA_BASE64[m.media].jpg || null;
  return posterSrc(m.media);
}
export function tipFor(exKey) { return MEDIA_MAP[exKey]?.tip || ""; }

// etiqueta de tipo de sesión → emoji de calendario
export const DAY_ICONS = {
  op_upper: "🏋️", op_lower: "🦵", op_full: "⚡",
  bodyweight: "🤸", mobility_flow: "🧘", rest: "🌙",
};
