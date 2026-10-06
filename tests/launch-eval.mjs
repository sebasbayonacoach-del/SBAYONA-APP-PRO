#!/usr/bin/env node
// BAYONA · launch-eval
// Contrato mínimo de lanzamiento: SEO compartible, PWA instalable,
// APIs dinámicas fuera del caché y una ruta visible para instalar la app.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log("  ✅ " + label); }
  else { fail++; console.log("  ❌ " + label); }
};

const html = readFileSync(join(root, "index.html"), "utf8");
const sw = readFileSync(join(root, "sw.js"), "utf8");
const more = readFileSync(join(root, "js/ui/more.js"), "utf8");
const appLoader = readFileSync(join(root, "js/app-loader.js"), "utf8");
const i18n = readFileSync(join(root, "js/i18n.js"), "utf8");
const robots = readFileSync(join(root, "robots.txt"), "utf8");
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
const vercel = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const vercelIgnore = readFileSync(join(root, ".vercelignore"), "utf8");
const PROD = "https://bayona-app-one.vercel.app/";

console.log("\n🚀 BAYONA · LAUNCH READINESS\n");

console.log("— compartir / indexación —");
ok(html.includes(`rel="canonical" href="${PROD}"`), "canonical apunta a producción");
ok(html.includes(`property="og:url" content="${PROD}"`), "og:url apunta a producción");
ok(/property="og:image" content="https:\/\/bayona-app-one\.vercel\.app\//.test(html), "og:image es absoluta");
ok(/name="twitter:image" content="https:\/\/bayona-app-one\.vercel\.app\//.test(html), "twitter:image es absoluta");
ok(!html.includes("og-bayona.jpg"), "no queda referencia al OG inexistente");
ok(existsSync(join(root, "icon-512.png")), "la imagen social de respaldo existe");
ok(robots.includes(`Sitemap: ${PROD}sitemap.xml`), "robots publica el sitemap absoluto");
ok(sitemap.includes(`<loc>${PROD}</loc>`), "sitemap usa URL absoluta");
ok(!sitemap.includes("<loc>./"), "sitemap no usa URLs relativas");

console.log("\n— PWA —");
ok(manifest.display === "standalone", "manifest standalone");
ok(manifest.start_url === "./?source=pwa", "arranque PWA estable");
ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "manifest tiene iconos");
ok(manifest.icons.every((x) => existsSync(join(root, String(x.src).replace(/^\.\//, "")))), "todos los iconos del manifest existen");
ok(manifest.icons.some((x) => String(x.purpose || "").includes("maskable")), "hay icono maskable");
ok(manifest.shortcuts?.some((x) => x.url === "./?go=training"), "shortcut de entrenamiento");
ok(manifest.shortcuts?.some((x) => x.url === "./?go=coachos"), "shortcut de Coach Studio");

const shellVersion = Number((sw.match(/bayona-shell-v(\d+)/) || [])[1]);
ok(shellVersion >= 30, `service worker actualizado (v${shellVersion || "?"})`);
ok(sw.includes('"./js/pwa.js"'), "helper PWA precacheado");
ok(sw.includes('path.startsWith("/api/")'), "API dinámica fuera del caché del shell");
ok(more.includes('from "../pwa.js"'), "MÁS integra instalación PWA");
ok(more.includes('t("pwa.button.install")'), "botón de instalación usa catálogo i18n");
ok(i18n.includes('"pwa.button.install"'), "textos PWA existen en i18n");

console.log("\n— producción limpia y segura —");
for (const entry of ["tests/", "docs/", "docs-luxe/", "mobile/", "tools/", "BAYONA-preview.html", "trainingym/blob-manifest.json"]) {
  ok(vercelIgnore.includes(entry), "Vercel excluye " + entry);
}
const globalHeaders = vercel.headers?.find((x) => x.source === "/(.*)")?.headers || [];
const hasHeader = (key, valuePart = "") => globalHeaders.some((h) =>
  h.key === key && (!valuePart || String(h.value).includes(valuePart))
);
ok(hasHeader("X-Content-Type-Options", "nosniff"), "nosniff en producción");
ok(hasHeader("Referrer-Policy", "strict-origin-when-cross-origin"), "Referrer-Policy definida");
ok(hasHeader("X-Frame-Options", "DENY"), "clickjacking bloqueado");
ok(hasHeader("Permissions-Policy", "camera=(self)"), "cámara limitada al propio origen");
const catalogHeaders = vercel.headers?.find((x) => x.source === "/trainingym/catalog.json")?.headers || [];
ok(catalogHeaders.some((h) => h.key === "Cache-Control" && String(h.value).includes("s-maxage=3600")), "catálogo usa caché CDN corta");
ok(!vercelIgnore.includes("trainingym/catalog.json"), "catálogo público no queda excluido");

console.log("\n— arranque ligero —");
ok(html.includes('src="js/ui/landing-boot.js"'), "landing-boot es el único bootstrap visible de la app");
ok(!html.includes('src="js/main.js"'), "main 3D no se descarga antes de entrar");
ok(!html.includes('src="js/move.js"'), "movimiento se difiere hasta entrar");
ok(!html.includes('src="js/health/healthUI.js"'), "Health Map se difiere hasta entrar");
ok(html.includes('<video data-src="media/squat.mp4"') && !html.includes('<video src="media/squat.mp4"'), "vídeo de acceso se difiere hasta entrar");
ok(appLoader.includes('import("/api/runtime-config.js")'), "runtime cloud se carga bajo demanda");
ok(appLoader.includes('import("./main.js")'), "app-loader trae el núcleo bajo demanda");
ok(appLoader.indexOf('import("/api/runtime-config.js")') < appLoader.indexOf('import("./main.js")'), "runtime cloud se resuelve antes del núcleo");
ok(sw.includes('"./js/app-loader.js"'), "app-loader disponible offline");

console.log("\n— arranque seguro —");
ok(!html.includes("</div\n\n  <!-- ============ HUD"), "HTML de ingreso cierra correctamente");

const pwa = await import("../js/pwa.js");
const state = pwa.installState();
ok(state && state.installed === false, "helper PWA importa sin DOM");
const manual = await pwa.requestInstall();
ok(["manual", "manual-ios", "installed"].includes(manual.status), "fallback de instalación es explícito");

console.log("\n══════════════════════════════════");
if (fail) {
  console.log(`❌ LAUNCH: ${pass} pass · ${fail} fail`);
  process.exit(1);
}
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
