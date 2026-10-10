// mobile/pack-web.mjs — empaqueta la app web en mobile/web-build/ para Capacitor.
// Uso: node mobile/pack-web.mjs   (o: npm run mobile:pack)
import { cpSync, copyFileSync, readFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'mobile', 'web-build');

const INCLUDE = ['index.html', 'misiones.html', 'manifest.webmanifest', 'css', 'js', 'media', 'vendor', 'docs', 'fonts', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });

for (const item of INCLUDE) {
  const src = join(root, item);
  if (!existsSync(src)) { console.warn(`⚠️  omitido (no existe): ${item}`); continue; }
  cpSync(src, join(out, item), { recursive: true });
  console.log(`✓ ${item}`);
}

console.log(`\n✅ web-build listo en mobile/web-build/ → npx cap sync`);

// PROPLAYER es un catálogo PÚBLICO de fichas; los 1.607 MP4 permanecen en
// el CDN y no se copian al APK. Es vital tener este JSON dentro del contenedor:
// sin él el cliente Android muestra "Catálogo no disponible" incluso online.
const catalogPath = join(root, 'trainingym', 'catalog.json');
if (!existsSync(catalogPath)) throw new Error('Falta el catálogo PROPLAYER original; no crear una APK incompleta.');
const records = JSON.parse(readFileSync(catalogPath, 'utf8'));
if (!Array.isArray(records) || records.length !== 3141) throw new Error('PROPLAYER: se esperaban 3.141 fichas verificadas.');
const catalogDest = join(out, 'trainingym');
mkdirSync(catalogDest, { recursive: true });
copyFileSync(catalogPath, join(catalogDest, 'catalog.json'));
console.log('✓ trainingym/catalog.json · ' + records.length + ' fichas (solo metadatos; sin MP4 ajenos)');
