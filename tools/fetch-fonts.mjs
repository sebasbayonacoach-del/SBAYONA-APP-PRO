#!/usr/bin/env node
// ============================================================
// BAYONA · fetch-fonts — auto-aloja la tipografía de la app
// ------------------------------------------------------------------
// Firma tipográfica "CLAUDE" (Anthropic): Styrene B (grotesca) +
// Tiempos Text (serif editorial). Ambas son comerciales, así que la
// app las declara PRIMERO en la pila (si están licenciadas en el
// dispositivo se usan) y auto-aloja sus gemelas libres más cercanas:
//   · Instrument Sans  → sustituto de Styrene B (grotesca neutra)
//   · Newsreader       → sustituto de Tiempos Text (serif editorial)
//   · Space Mono       → datos numéricos (cuotas, XP, cargas)
// Solo subconjunto latin (es-ES). Los .woff2 viven en fonts/.
// USO: node tools/fetch-fonts.mjs   (idempotente)
// ============================================================
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "fonts");
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const CSS_URL =
  "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400..700&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400&family=Space+Mono:wght@400;700&display=swap";

mkdirSync(OUT, { recursive: true });

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();

// solo bloques latin (español vive en U+0000-00FF): menos peso, misma app
const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)]
  .filter((m) => m[1] === "latin")
  .map((m) => m[2]);

const seen = new Map(); // url -> nombre de fichero local
let out = `/* ============================================================\n   BAYONA · tipografía auto-alojada (generada por tools/fetch-fonts.mjs)\n   Firma CLAUDE: Styrene B / Tiempos Text con gemelas libres.\n   ============================================================ */\n`;

for (const block of blocks) {
  const url = block.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) continue;
  if (!seen.has(url)) {
    const fam = block.match(/font-family:\s*'([^']+)'/)[1].toLowerCase().replace(/\s+/g, "-");
    const file = `${fam}-${basename(url).slice(0, 10)}.woff2`;
    const dest = join(OUT, file);
    if (!existsSync(dest)) {
      const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
      writeFileSync(dest, buf);
      console.log(`  ⬇  fonts/${file}  ${(buf.length / 1024).toFixed(0)} KB`);
    }
    seen.set(url, file);
  }
  out += "\n" + block
    .replace(/url\(https:[^)]+\)/, `url(./${seen.get(url)})`)
    .replace(/\s+unicode-range:[^;]+;/, "");
}

writeFileSync(join(OUT, "fonts.css"), out);
console.log(`\n✅ fonts/fonts.css · ${seen.size} ficheros woff2 (subconjunto latin)`);
