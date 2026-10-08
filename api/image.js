// ============================================================
// BAYONA — api/image.js · FOTOS DE RECETA
// ------------------------------------------------------------
// Genera la imagen de una receta con un modelo de imágenes.
//
// DECISIÓN IMPORTANTE: el cliente NUNCA envía el prompt. Solo pide
// «dame la foto de la receta r_bowl_pollo». El prompt lo construye
// aquí, desde el catálogo real de js/nutricion.js. Si el navegador
// pudiera mandar texto libre, esto sería un generador de imágenes
// abierto y pagado por alguien, con el riesgo de que la app se
// usara para producir cualquier cosa.
//
// Tampoco se sale ningún dato del usuario: la receta es pública y
// está en el repo. Lo único que viaja es lo que tú registraste.
//
// Si no hay clave, responde { ok:false } y la tarjeta de receta
// sigue mostrando su ilustración determinista. La cocina no se
// rompe nunca por falta de una clave.
//
//   GET /api/meal-image?id=r_bowl_pollo
// ============================================================
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { RECETAS } from "../js/nutricion.js";
import { applyCors, clientIp, json, rateLimited, verifySupabaseUser } from "./_security.js";

const IMAGEN_URL = process.env.BAYONA_IMAGE_UPSTREAM || "https://api.openai.com/v1/images/generations";
const API_KEY = process.env.BAYONA_IMAGE_API_KEY || process.env.OPENAI_API_KEY;
const MODEL = process.env.BAYONA_IMAGE_MODEL || "gpt-image-1";
const SIZE = process.env.BAYONA_IMAGE_SIZE || "1024x1024";

/* ---------- catálogo: única fuente de la verdad ---------- */
const porId = new Map(RECETAS.map((r) => [r.id, r]));

/**
 * Prompt de la foto. Sale de la receta, no del cliente.
 * @param {{nombre:string,tipo:string,ingredientes:string[],kcal:number}} r
 */
export function promptDeReceta(r) {
  return [
    `Fotografía de comida real y casera: ${r.nombre.toLowerCase()}.`,
    `Plato ${(r.tipo || "").toLowerCase()}, ${r.kcal} kcal por ración.`,
    `Ingredientes visibles: ${r.ingredientes.join(", ")}.`,
    "Estilo: luz natural de ventana, fondo de mesa de madera clara,",
    "comida healthy, colores cálidos, profundidad de campo corta, vista cenital a 45°.",
    "Sin texto, sin logotipos, sin manos, sin personas.",
  ].join(" ");
}

export default async function handler(req, res) {
  if (!applyCors(req, res, "GET,OPTIONS")) return json(res, 403, { ok: false, error: "origen no permitido" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "método no permitido" });

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/meal-image/health") {
    return json(res, 200, { ok: Boolean(API_KEY), model: API_KEY ? MODEL : null });
  }

  const id = url.searchParams.get("id") || "";
  const receta = porId.get(id);
  if (!receta) return json(res, 404, { ok: false, error: "receta desconocida" });

  if (!API_KEY) {
    return json(res, 503, { ok: false, error: "imágenes sin configurar", fallback: "ilustración" });
  }

  if (process.env.BAYONA_IMAGE_REQUIRE_AUTH !== "0") {
    const auth = await verifySupabaseUser(req);
    if (!auth.ok) return json(res, auth.status, { ok: false, error: "sesión requerida", fallback: "ilustración" });
  }

  const ip = clientIp(req);
  if (rateLimited(`meal-image:${ip}`, { max: 6, windowMs: 60_000 })) {
    return json(res, 429, { ok: false, error: "demasiadas imágenes seguidas" });
  }

  try {
    const r = await fetch(IMAGEN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        prompt: promptDeReceta(receta),
        n: 1,
        size: SIZE,
      }),
    });
    if (!r.ok) {
      return json(res, 502, { ok: false, error: `el modelo respondió ${r.status}`, fallback: "ilustración" });
    }
    const j = await r.json();
    const item = j?.data?.[0];
    const image = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url || null;
    if (!image) return json(res, 502, { ok: false, error: "respuesta sin imagen", fallback: "ilustración" });

    return json(res, 200, { ok: true, id, image, model: MODEL });
  } catch (e) {
    return json(res, 502, { ok: false, error: "no se pudo generar la imagen", fallback: "ilustración" });
  }
}

/* ---------- servidor local ---------- */
const esFichero = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (esFichero) {
  const port = Number(process.env.BAYONA_IMAGE_PORT || 8788);
  createServer(handler).listen(port, () => {
    console.log(`\n  IMÁGENES → http://localhost:${port}/api/meal-image?id=r_bowl_pollo`);
    console.log(`  ${API_KEY ? "IA lista" : "sin clave: las recetas usarán su ilustración"}\n`);
  });
}
