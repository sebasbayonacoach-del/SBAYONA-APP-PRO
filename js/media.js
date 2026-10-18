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

/**
 * Gives a video an explicit loading/error state and a user-driven retry.
 * It never retries in a loop: a failed source stays in its fallback state
 * until the person presses the retry button.
 */
export function bindVideoRecovery(video, { status, retryButton, fallback } = {}) {
  if (!video) return () => {};
  video.preload = "metadata";
  video.controls = true;
  video.playsInline = true;
  const setHidden = (node, hidden) => {
    if (!node) return;
    node.hidden = hidden;
    // Component CSS may set display on video, image, or button elements and
    // override the browser's default [hidden] rule.
    node.style.display = hidden ? "none" : "";
  };

  let timeout = null;
  let disposed = false;
  const clearTimeoutIfNeeded = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  const setStatus = (message, failed = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("danger", failed);
    status.setAttribute("role", failed ? "alert" : "status");
    status.setAttribute("aria-live", "polite");
  };
  const beginLoad = () => {
    clearTimeoutIfNeeded();
    setHidden(video, true);
    setHidden(fallback, false);
    setHidden(retryButton, true);
    setStatus("Cargando demostración…");
    timeout = setTimeout(() => fail(), 12000);
  };
  const ready = () => {
    clearTimeoutIfNeeded();
    if (retryButton) {
      setHidden(retryButton, true);
      retryButton.disabled = false;
    }
    setHidden(video, false);
    setHidden(fallback, true);
    setStatus("Demostración lista. Usa los controles del vídeo para reproducirla.");
  };
  const fail = () => {
    if (disposed) return;
    clearTimeoutIfNeeded();
    video.pause();
    setHidden(video, true);
    setHidden(fallback, false);
    if (retryButton) {
      setHidden(retryButton, false);
      retryButton.disabled = false;
    }
    setStatus("No se pudo cargar este vídeo. Puedes seguir con la técnica escrita o reintentarlo.", true);
  };
  const retry = () => {
    if (disposed || !retryButton || retryButton.disabled) return;
    retryButton.disabled = true;
    const source = video.currentSrc || video.src;
    video.pause();
    beginLoad();
    video.removeAttribute("src");
    video.load();
    video.src = source;
    video.load();
  };

  video.addEventListener("loadstart", beginLoad);
  video.addEventListener("loadedmetadata", ready);
  video.addEventListener("error", fail);
  retryButton?.addEventListener("click", retry);
  if (video.readyState >= 1) ready();
  else beginLoad();

  return () => {
    disposed = true;
    clearTimeoutIfNeeded();
    video.pause();
    video.removeEventListener("loadstart", beginLoad);
    video.removeEventListener("loadedmetadata", ready);
    video.removeEventListener("error", fail);
    retryButton?.removeEventListener("click", retry);
  };
}

/** Stop playback when a modal or section removes its player from the page. */
export function pauseVideoWhenRemoved(video, container = document.body, cleanup = null) {
  if (!video || typeof MutationObserver === "undefined" || !container) return () => { video?.pause?.(); cleanup?.(); };
  const observer = new MutationObserver(() => {
    if (video.isConnected) return;
    video.pause();
    cleanup?.();
    observer.disconnect();
  });
  observer.observe(container, { childList: true, subtree: true });
  return () => {
    video.pause();
    cleanup?.();
    observer.disconnect();
  };
}

// etiqueta de tipo de sesión → emoji de calendario
export const DAY_ICONS = {
  op_upper: "▲", op_lower: "▼", op_full: "◆",
  bodyweight: "◇", mobility_flow: "○", rest: "☾",
};
