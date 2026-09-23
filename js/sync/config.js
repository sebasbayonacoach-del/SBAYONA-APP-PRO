// ============================================================
// BAYONA · SYNC/config — el ÚNICO sitio donde va tu credencial
// ------------------------------------------------------------
// ⚠️  La `anon` public key va aquí. Es pública por diseño (está en el
//    navegador de tus usuarios) y está protegida por RLS.
// 🚫 NUNCA pongas la `service_role` key en este fichero ni en el cliente:
//    salta TODAS las políticas RLS y dejaría los datos de todos al aire.
//
// CÓMO RELLENARLO (30 segundos):
//   Supabase Dashboard → Project Settings → API
//     · Project URL              → SUPABASE_URL
//     · Project API keys → anon  → SUPABASE_ANON_KEY
//
// Alternativa sin tocar código (útil en desarrollo):
//   define window.BAYONA_SUPABASE = { url, anonKey } ANTES de js/main.js,
//   o guárdalo en localStorage["bayona.supabase.v1"] como JSON.
// ============================================================

const INLINE = {
  url: "https://bppjzewgqdrghexazgcj.supabase.co",
  anonKey: "PEGA_AQUI_TU_ANON_KEY",
};

/** resuelve la configuración: inline → window → localStorage */
export function supabaseConfig() {
  const fromWindow = (typeof window !== "undefined" && window.BAYONA_SUPABASE) || null;
  let fromStore = null;
  try {
    fromStore = JSON.parse(localStorage.getItem("bayona.supabase.v1") || "null");
  } catch (e) { /* sin almacenamiento */ }

  const url = INLINE.url || fromWindow?.url || fromStore?.url;
  const anonKey = (INLINE.anonKey && !INLINE.anonKey.startsWith("PEGA_AQUI"))
    ? INLINE.anonKey
    : (fromWindow?.anonKey || fromStore?.anonKey);

  return { url, anonKey, ready: Boolean(url && anonKey) };
}
