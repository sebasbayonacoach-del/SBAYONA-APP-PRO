import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS } from "../js/data.js";
import { SHOP_PRODUCTS, shopProduct, shopProductUrl } from "../js/shop-catalog.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
let ok = 0;
const check = (condition, message) => {
  assert(condition, message);
  ok++;
  console.log("  ✅", message);
};

console.log("\n🛍️ ARMARIO ↔ TIENDA · CONTRATO COMERCIAL");

check(SHOP_PRODUCTS.length === 39, "la app refleja los 39 productos canónicos de la web");
check(new Set(SHOP_PRODUCTS.map((p) => p.id)).size === SHOP_PRODUCTS.length, "ids comerciales únicos");
check(SHOP_PRODUCTS.every((p) => p.name && p.priceDisplay && p.eurDisplay), "cada producto tiene nombre y precio visible");
check(SHOP_PRODUCTS.every((p) => new URL(p.shopUrl).hostname === "bayona-jet.vercel.app"), "todos los enlaces apuntan al dominio BAYONA");
check(SHOP_PRODUCTS.every((p) => new URL(p.shopUrl).searchParams.get("product") === p.id), "cada enlace profundo abre su producto exacto");

const physical = ITEMS.filter((item) => item.physical);
check(physical.length > 0, "el armario conserva artículos físicos");
check(physical.every((item) => item.shopId), "todo artículo físico del Armario tiene producto real asociado");
check(physical.every((item) => shopProduct(item.shopId)), "ningún gemelo físico apunta a un producto inexistente");
check(physical.every((item) => item.name.toLocaleUpperCase("es") === shopProduct(item.shopId).name.toLocaleUpperCase("es")), "Armario y Tienda usan el mismo nombre comercial");
check(physical.every((item) => shopProductUrl(item.shopId).includes(`product=${encodeURIComponent(item.shopId)}`)), "cada gemelo físico abre directamente su ficha");

const digitalOnly = ITEMS.filter((item) => !item.physical);
check(digitalOnly.every((item) => !item.shopId), "los objetos solo digitales no fingen estar a la venta");

const armory = readFileSync(resolve(root, "js/ui/armory.js"), "utf8");
check(armory.includes('if (!it?.physical || !product)'), "el canje físico rechaza objetos solo digitales");
check(!armory.includes('if (!owned) return phygitalFlow(it);'), "se eliminó el canje genérico de cualquier objeto bloqueado");
check(armory.includes("VER TIENDA BAYONA"), "el Armario explica y enlaza la Tienda real");
check(armory.includes("DESBLOQUEO POR PROGRESO"), "los bloqueos digitales explican cómo se consiguen");

const fitness = readFileSync(resolve(root, "js/ui/fitness.js"), "utf8");
const navBlock = fitness.match(/nav\.innerHTML=\[([\s\S]*?)\]\.map/)?.[1] || "";
const primaryDestinations = [...navBlock.matchAll(/\['([^']+)'\s*,\s*'([^']+)'\]/g)].map((m) => m[1]);
check(JSON.stringify(primaryDestinations) === JSON.stringify(["hoy", "training", "progress", "profile"]), "navegación cliente mantiene solo Inicio / Entrenar / Progreso / Perfil");

const i18n = readFileSync(resolve(root, "js/i18n.js"), "utf8");
check(!i18n.includes('"nav.armory": "ARMERÍA"'), "no quedan dos nombres Armario/Armería");
check(i18n.includes('"hub.quick.rewards.title": "Armario"'), "el acceso secundario dice Armario, no Recompensas");

const entryHtml = readFileSync(resolve(root, "index.html"), "utf8");
check(entryHtml.includes("ENTRENO</span><span>NUTRICIÓN</span><span>RECUPERACIÓN</span><span>PROGRESO"), "la portada previa al rol solo presenta funciones de cliente");
check(!entryHtml.includes("<span>PROPLAYER</span><span>RUTINAS</span><span>PROGRESO</span><span>CLIENTES</span>"), "la portada ya no mezcla clientes/coach antes de elegir rol");
check(entryHtml.includes('id="entry-platform"'), "la superficie muestra plataforma dinámica en lugar de PWA fijo");
const landingBoot = readFileSync(resolve(root, "js/ui/landing-boot.js"), "utf8");
check(landingBoot.includes("nativeShell") && landingBoot.includes('getPlatform?.()'), "Android/iOS se detectan como app nativa y saltan marketing");

const sw = readFileSync(resolve(root, "sw.js"), "utf8");
check(sw.includes('"./js/shop-catalog.js"'), "catálogo comercial disponible en el shell offline");

const pack = readFileSync(resolve(root, "mobile/pack-web.mjs"), "utf8");
check(pack.includes("'trainingym'"), "la APK empaqueta también el catálogo PROPLAYER");
const gradle = readFileSync(resolve(root, "mobile/android/app/build.gradle"), "utf8");
check(gradle.includes('versionCode 4') && gradle.includes('versionName "1.0.3-beta"'), "Android queda versionado como 1.0.3-beta");

console.log(`\n📊 RESULTADO: ${ok} comprobaciones · 0 fallos\n`);
