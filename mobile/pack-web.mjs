// mobile/pack-web.mjs — empaqueta la app web en mobile/web-build/ para Capacitor.
// Uso: node mobile/pack-web.mjs   (o: npm run mobile:pack)
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'mobile', 'web-build');

const INCLUDE = ['index.html', 'manifest.webmanifest', 'css', 'js', 'media', 'trainingym', 'vendor', 'docs', 'fonts', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });

for (const item of INCLUDE) {
  const src = join(root, item);
  if (!existsSync(src)) { console.warn(`⚠️  omitido (no existe): ${item}`); continue; }
  cpSync(src, join(out, item), { recursive: true });
  console.log(`✓ ${item}`);
}

console.log(`\n✅ web-build listo en mobile/web-build/ → npx cap sync`);
