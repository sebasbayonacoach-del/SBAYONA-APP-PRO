// BAYONA · runtime config bootstrap.
// En Vercel /api/runtime-config.js devuelve JS ejecutable con URL + anon key.
// En desarrollo estático ese path puede ser el source del serverless function;
// se ignora de forma segura y la app continúa en modo local.
globalThis.BAYONA_SUPABASE_READY = (async () => {
  try {
    const res = await fetch("/api/runtime-config.js", { cache: "no-store" });
    if (!res.ok) return false;
    const text = await res.text();
    if (!text.trimStart().startsWith("window.BAYONA_SUPABASE =")) return false;
    Function(text)();
    return Boolean(globalThis.BAYONA_SUPABASE?.url && globalThis.BAYONA_SUPABASE?.anonKey);
  } catch {
    return false;
  }
})();
