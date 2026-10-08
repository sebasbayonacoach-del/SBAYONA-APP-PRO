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
import { createReadStream, realpathSync, statSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import coachHandler from "../api/coach.js";
import imageHandler from "../api/image.js";

const ROOT = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const REAL_ROOT = realpathSync(ROOT);
const PORT = Number(process.env.PORT || 8080);
// Por defecto, la vista local solo escucha en el propio dispositivo.
// Para probar en una red de confianza: BAYONA_HOST=0.0.0.0 npm start
const HOST = process.env.BAYONA_HOST || "127.0.0.1";

const STATIC_ROOT_FILES = new Set([
  "index.html", "sw.js", "manifest.webmanifest", "robots.txt", "sitemap.xml",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "BAYONA-preview.html",
]);
const STATIC_DIRECTORIES = new Set(["css", "js", "fonts", "media", "vendor", "trainingym", "ml", "mobile"]);
function publicFile(relativePath){
  if(!relativePath || relativePath===".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath))return false;
  const parts=relativePath.split(sep);
  if(parts.some((part)=>!part || part.startsWith(".")))return false;
  return parts.length===1 ? STATIC_ROOT_FILES.has(parts[0]) : STATIC_DIRECTORIES.has(parts[0]);
}

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
  let url;
  try { url = new URL(req.url, "http://localhost"); }
  catch { res.statusCode=400; return res.end("Solicitud inválida"); }
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

  let path;
  try { path=decodeURIComponent(pathname); }
  catch { res.statusCode=400; return res.end("Ruta inválida"); }
  if(path.includes("\\") || path.includes("\0")){
    res.statusCode=403; return res.end("Prohibido");
  }
  if(path.endsWith("/"))path+="index.html";

  // Lista positiva: jamás exponer .env, .git, API fuente ni carpetas internas.
  const target=resolve(ROOT,"."+path);
  if(!publicFile(relative(ROOT,target))){
    res.statusCode=403;return res.end("Prohibido");
  }

  let stat,actual;
  try { actual=realpathSync(target);stat=statSync(actual); }
  catch { return notFound(res); }
  // Tampoco permitir symlinks que escapen o apunten a un archivo reservado.
  if(!publicFile(relative(REAL_ROOT,actual))){
    res.statusCode=403;return res.end("Prohibido");
  }
  if(!stat.isFile())return notFound(res);

  res.statusCode = 200;
  res.setHeader("content-type", MIME[extname(target).toLowerCase()] || "application/octet-stream");
  res.setHeader("content-length", stat.size);
  // el service worker no debe quedar cacheado en el navegador
  if (target.endsWith("sw.js")) res.setHeader("cache-control", "no-cache");
  createReadStream(actual).pipe(res);
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
