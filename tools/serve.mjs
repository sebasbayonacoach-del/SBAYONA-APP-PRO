#!/usr/bin/env node
// ============================================================
// BAYONA · serve — servidor estático mínimo, sin dependencias
// ------------------------------------------------------------
// Sustuye a `python3 -m http.server`: la app son módulos ES, así
// que necesita un servidor real (nada de abrir el index con
// file://). Hecho en Node para que funcione en cualquier entorno
// sin depender de Python.
//
//   node tools/serve.mjs            → http://localhost:8080
//   PORT=3000 node tools/serve.mjs  → http://localhost:3000
//
// También monta el proxy del coach en /api/coach (api/coach.js),
// para que la app funcione contra la IA en local sin desplegar.
// En Vercel eso lo resuelve solo la convención api/.
// ============================================================
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import coachHandler from "../api/coach.js";
import imageHandler from "../api/image.js";

const ROOT = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

/** Rutas que no son ficheros estáticos. Se comparan por prefijo para
 *  que las comprobaciones de salud (/api/meal-image/health) lleguen también. */
const API = [
  { prefijo: "/api/coach", handler: coachHandler },
  { prefijo: "/api/meal-image", handler: imageHandler },
];
const notFound = (res) => {
  res.statusCode = 404;
  res.setHeader("content-type", "text/plain; charset=utf-8");
  res.end("No encontrado");
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // ---- el coach y las imágenes viven aquí, no en el disco ----
  const ruta = API.find((r) => pathname === r.prefijo || pathname.startsWith(`${r.prefijo}/`));
  if (ruta) {
    Promise.resolve(ruta.handler(req, res)).catch((e) => {
      console.error("  ✖ api:", e?.message || e);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, error: "error interno de la API" }));
      } else if (!res.writableEnded) {
        res.end();
      }
    });
    return;
  }

  let path = decodeURIComponent(pathname);
  if (path.endsWith("/")) path += "index.html";

  // nunca salir del directorio del proyecto
  const target = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  if (!target.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end("Prohibido");
  }

  let stat;
  try { stat = statSync(target); } catch { stat = null; }
  if (!stat || stat.isDirectory()) return notFound(res);

  res.statusCode = 200;
  res.setHeader("content-type", MIME[extname(target).toLowerCase()] || "application/octet-stream");
  res.setHeader("content-length", stat.size);
  // el service worker no debe quedar cacheado en el navegador
  if (target.endsWith("sw.js")) res.setHeader("cache-control", "no-cache");
  createReadStream(target).pipe(res);
});

server.listen(PORT, HOST, () => {
  // mismo criterio que los proxies: las dos variables valen
  const key = process.env.BAYONA_COACH_API_KEY || process.env.OPENAI_API_KEY;
  const coach = key ? "coach con IA en /api/coach" : "coach local en /api/coach (sin clave: motor de reglas)";
  const img = key ? "fotos de receta en /api/meal-image" : "fotos de receta: ilustraciones locales (sin clave)";
  console.log(`\n  ◈ BAYONA — TU VIDA ES EL JUEGO`);
  console.log(`  ► http://localhost:${PORT}`);
  console.log(`  ◈ ${coach}`);
  console.log(`  ◈ ${img}\n`);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\n  ✖ el puerto ${PORT} ya está ocupado. Usa otro:  PORT=8081 node tools/serve.mjs\n`);
    process.exit(1);
  }
  throw e;
});
