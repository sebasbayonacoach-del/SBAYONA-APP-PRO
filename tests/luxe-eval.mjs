// ============================================================
// BAYONA · v10 LUXE — evaluación de la capa premium
// ------------------------------------------------------------
// Comprueba sin navegador lo que la landing promete:
//   · index.html declara SEO (description, OG, twitter) y luxe.css
//   · la landing (js/ui/landing.js) es PURA: contenido desde el
//     catálogo, HTML generado con esc() y reveal sin dependencias
//   · luxe.css existe y NO pisa el lenguaje PRO dentro del panel
//   · sw.js v22 precachea los ficheros nuevos
//   · todo texto de la landing vive en i18n (nada a mano)
// ============================================================
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; console.log(`  ✅ ${msg}`); }
  else { fail++; console.log(`  ❌ ${msg}`); }
};

console.log("\n🧪 BAYONA · LUXE-EVAL\n");

/* ---------- 1 · index.html: SEO y wiring ---------- */
const html = readFileSync(join(root, "index.html"), "utf8");
console.log("— index.html · SEO y capas —");

ok(html.includes('name="description"'), "meta description presente");
ok(html.includes('property="og:title"'), "og:title presente");
ok(html.includes('property="og:description"'), "og:description presente");
ok(html.includes('property="og:image"'), "og:image presente");
ok(html.includes('name="twitter:card"'), "twitter:card presente");
ok(html.includes('lang="es"'), "html lang es");
ok(html.includes('id="luxe-landing"'), "#luxe-landing existe en el HTML");
ok(html.includes("css/luxe.css"), "luxe.css enlazado");
ok(
  html.indexOf("css/luxe.css") > html.indexOf("css/aurum.css") &&
    html.indexOf("css/luxe.css") < html.indexOf("css/pro.css"),
  "luxe.css carga ENTRE aurum y pro (pro sigue último y manda)"
);
ok(html.includes("js/ui/landing-boot.js"), "landing-boot.js cargado");

/* ---------- 2 · luxe.css: existe y no pisa PRO ---------- */
const luxePath = join(root, "css", "luxe.css");
ok(existsSync(luxePath), "css/luxe.css existe");
const luxe = existsSync(luxePath) ? readFileSync(luxePath, "utf8") : "";
console.log("\n— luxe.css · alcance —");

ok(luxe.includes("--luxe-bg"), "tokens luxe definidos");
ok(luxe.includes("#luxe-landing"), "estilos de la landing");
ok(luxe.includes("body.entered #luxe-landing"), "landing se oculta al entrar");
ok(!/#drawer-body\s*\{/.test(luxe), "luxe NO redefine #drawer-body (PRO manda dentro)");
ok(!/\.btn\s*\{/.test(luxe), "luxe NO redefine .btn global (usa .luxe-btn-*)");
ok(!/\.card\s*\{/.test(luxe), "luxe NO redefine .card global (usa .luxe-bento-card)");
ok(luxe.includes("prefers-reduced-motion"), "respeta prefers-reduced-motion");
ok(luxe.includes("backdrop-filter"), "glass con backdrop-filter");
ok(/#luxe-landing\s*\{[^}]*overflow-y:\s*auto/.test(luxe), "landing con scrollport propio (el shell deja body overflow hidden: sin esto no se puede bajar del hero en móvil)");
ok(/height:\s*100vh;\s*height:\s*100dvh;/.test(luxe), "altura dinámica 100dvh (barra del navegador en iOS/Android)");
ok(/body\.luxe-activo\s+#hud\s*\{[^}]*display:\s*none/.test(luxe), "HUD apagado mientras la landing manda (#hud z-10 flotaba encima de la venta z-5)");

/* ---------- 3 · landing.js: puro, esc, sin DOM duro ---------- */
const landingPath = join(root, "js", "ui", "landing.js");
ok(existsSync(landingPath), "js/ui/landing.js existe");
const landing = existsSync(landingPath) ? readFileSync(landingPath, "utf8") : "";
console.log("\n— js/ui/landing.js · pureza —");

ok(!landing.includes("localStorage"), "landing.js no toca localStorage (puro)");
ok(landing.includes("export function contenidoLanding"), "contenidoLanding exportado");
ok(landing.includes("export function instalarReveal"), "instalarReveal exportado");
ok(landing.includes("export function montarLanding"), "montarLanding exportado");
ok(landing.includes("IntersectionObserver") || landing.includes("typeof IntersectionObserver"), "reveal con IntersectionObserver (fallback sin DOM)");

/* ---------- 4 · i18n: TODO texto luxe vive en catálogo ---------- */
const i18n = readFileSync(join(root, "js", "i18n.js"), "utf8");
console.log("\n— i18n · catálogo luxe.* —");

const clavesLuxe = [
  "luxe.hero.kicker", "luxe.hero.tituloA", "luxe.hero.tituloB", "luxe.hero.sub",
  "luxe.hero.cta", "luxe.hero.ctaGhost", "luxe.hero.visualHint",
  "luxe.f1.titulo", "luxe.f1.texto", "luxe.f1.meta",
  "luxe.f2.titulo", "luxe.f2.texto", "luxe.f2.meta",
  "luxe.f3.titulo", "luxe.f3.texto", "luxe.f3.meta",
  "luxe.f4.titulo", "luxe.f4.texto", "luxe.f4.meta",
  "luxe.f5.titulo", "luxe.f5.texto", "luxe.f5.meta",
  "luxe.f6.titulo", "luxe.f6.texto", "luxe.f6.meta",
  "luxe.plan.periodo", "luxe.plan.atleta.nombre", "luxe.plan.pro.nombre", "luxe.plan.centro.nombre",
  "luxe.faq1.q", "luxe.faq1.a", "luxe.faq2.q", "luxe.faq2.a",
  "luxe.faq3.q", "luxe.faq3.a", "luxe.faq4.q", "luxe.faq4.a",
  "luxe.footer.marca", "luxe.footer.nota", "luxe.load.loading", "luxe.load.error",
  "luxe.nav.features", "luxe.nav.planes", "luxe.nav.faq",
];
clavesLuxe.forEach((k) => ok(i18n.includes(`"${k}"`), `clave ${k}`));

/* ---------- 5 · landing-boot: decide sin romper v9 ---------- */
const bootPath = join(root, "js", "ui", "landing-boot.js");
ok(existsSync(bootPath), "js/ui/landing-boot.js existe");
const boot = existsSync(bootPath) ? readFileSync(bootPath, "utf8") : "";
console.log("\n— landing-boot.js · decisiones —");

ok(boot.includes("yaDentro"), "comprueba si el usuario ya entró");
ok(boot.includes("bayona.save.v2"), "lee la partida para saber si onboarded");
ok(boot.includes("removeLanding()") && boot.includes("loadApp()"), "usuario recurrente: sin landing y carga diferida del producto");
ok(!boot.includes("S.init"), "no inicializa el estado (eso es main.js)");

/* ---------- 6 · sw.js: precache v22 ---------- */
const sw = readFileSync(join(root, "sw.js"), "utf8");
console.log("\n— sw.js · precache —");

const shellVersion = Number((sw.match(/bayona-shell-v(\d+)/) || [])[1]);
ok(shellVersion >= 22, `CACHE >= v22 (actual v${shellVersion || "?"})`);
ok(sw.includes('"./css/luxe.css"'), "luxe.css en SHELL");
ok(sw.includes('"./js/ui/landing.js"'), "landing.js en SHELL");
ok(sw.includes('"./js/ui/landing-boot.js"'), "landing-boot.js en SHELL");

/* ---------- 7 · marketing: robots + sitemap + og ---------- */
console.log("\n— marketing · archivos públicos —");

ok(existsSync(join(root, "robots.txt")), "robots.txt existe");
ok(existsSync(join(root, "sitemap.xml")), "sitemap.xml existe");
ok(readFileSync(join(root, "robots.txt"), "utf8").includes("Allow: /"), "robots permite indexado");

const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
ok(manifest.display === "standalone", "manifest standalone (instalable)");
ok(manifest.background_color === "#080a0c", "manifest con fondo luxe");
ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "manifest con 3 iconos");

/* ---------- resultado ---------- */
console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
if (fail > 0) process.exit(1);
