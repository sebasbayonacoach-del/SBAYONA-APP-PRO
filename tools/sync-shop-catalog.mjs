// Sincroniza la fuente comercial canónica de la web hacia la app.
// Uso: node tools/sync-shop-catalog.mjs
// Opcional: BAYONA_WEB_REPO=/ruta/al/repo-web
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, "..");
const webRoot = process.env.BAYONA_WEB_REPO
  || resolve(homedir(), "TRABAJO/02_DESARROLLO/01_BAYONA/SBAYONA-WEB-PRIME-20261004");
const source = resolve(webRoot, "src/config/shopProducts.js");
const target = resolve(appRoot, "js/shop-catalog.js");

if (!existsSync(source)) {
  throw new Error(`No encuentro el catálogo web canónico en ${source}. Define BAYONA_WEB_REPO si cambió de ubicación.`);
}

const { shopProducts } = await import(`${pathToFileURL(source).href}?sync=${Date.now()}`);
if (!Array.isArray(shopProducts) || shopProducts.length < 1) {
  throw new Error("El catálogo web no contiene productos.");
}

const rows = shopProducts.map(({
  id, name, category, collection, collectionId, priceDisplay,
  eurDisplay, usdDisplay, description, shopUrl,
}) => ({
  id, name, category, collection, collectionId, priceDisplay,
  eurDisplay, usdDisplay, description, shopUrl,
}));

const duplicate = rows.find((row, index) => rows.findIndex((x) => x.id === row.id) !== index);
if (duplicate) throw new Error(`ID de tienda duplicado: ${duplicate.id}`);
if (rows.some((row) => !row.shopUrl || !row.shopUrl.includes(`product=${encodeURIComponent(row.id)}`))) {
  throw new Error("Hay productos sin enlace profundo canónico.");
}

const output = `// AUTO-GENERADO desde la tienda web BAYONA.
// Fuente: SBAYONA-WEB-PRIME/src/config/shopProducts.js
// No inventar productos aquí. Ejecuta: node tools/sync-shop-catalog.mjs
export const SHOP_BASE_URL = "https://bayona-jet.vercel.app/shop";

export const SHOP_PRODUCTS = Object.freeze(${JSON.stringify(rows, null, 2)}.map((item) => Object.freeze(item)));

const BY_ID = new Map(SHOP_PRODUCTS.map((item) => [item.id, item]));
export function shopProduct(id) { return BY_ID.get(id) || null; }
export function shopProductUrl(id) {
  return BY_ID.get(id)?.shopUrl
    || (id ? SHOP_BASE_URL + "?product=" + encodeURIComponent(id) : SHOP_BASE_URL);
}
`;

writeFileSync(target, output);
console.log(`✓ ${rows.length} productos sincronizados → ${target}`);
