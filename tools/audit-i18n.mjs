#!/usr/bin/env node
// ============================================================
// BAYONA — audit-i18n · trinquete de cadenas hardcodeadas
// Creado por el agente de Qoder el 25-09-2026 porque `tests/i18n-eval.mjs`
// (línea 67) invocaba esta herramienta y **nunca existió en ningún commit**:
// eso dejaba la CI en rojo estructural sin importar lo que hiciera la app.
//
// Qué hace: cuenta los literales de texto visibles al usuario que NO pasan por
// t() (es decir, que viven fuera del catálogo de `js/i18n.js`), y falla solo si
// la cifra SUBE por encima de la línea base guardada en
// `tools/audit-i18n.baseline.json`. Es un trinquete: se puede bajar, no subir.
//
// Salida (el formato lo parsea i18n-eval.mjs, no lo cambies sin mirar allí):
//   Cadenas hardcodeadas detectadas: <N>
// ============================================================
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const jsDir = join(root, 'js');
const BASELINE_FILE = join(here, 'audit-i18n.baseline.json');

// Mismo criterio de recorrido que usa i18n-eval: todo .js bajo js/, recursivo,
// menos el propio catálogo.
function listJs(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listJs(p));
    else if (f.endsWith('.js') && f !== 'i18n.js') out.push(p);
  }
  return out;
}

// Quita comentarios para no contar texto de documentación.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/.*$/gm, '$1');
}

// Sumideros donde un literal llega a verse en pantalla.
const SINKS = [
  /\.textContent\s*=\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g,
  /\.(?:innerHTML|outerHTML|innerText)\s*=\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g,
  /\.setAttribute\(\s*(['"])(?:aria-label|title|placeholder|alt)\1\s*,\s*(['"`])((?:\\.|(?!\2)[\s\S])*)\2/g,
  /(?:alert|confirm|prompt)\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g,
  /\b(?:title|label|texto|mensaje|ariaLabel|placeholder)\s*:\s*(['"`])((?:\\.|(?!\1)[\s\S])*)\1/g,
  /aria-label\s*=\s*(['"])((?:\\.|(?!\1)[\s\S])*)\1/g,
];

const esHumanText = (s) => {
  const t = s.trim();
  if (t.length < 4) return false;
  if (/^(https?:|data:|#|\/|\.\.?|_\w+$|\d+$)/.test(t)) return false;
  // solo cuentan cadenas con pinta de frase: dos palabras y/o caracteres del español
  const tienePalabras = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}[^\w]{1,3}[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(t);
  const esSuyo = /[ÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(t) || /\b(el|la|los|las|de|del|tu|tus|para|con|un|una|no|sí|mas|más|y|o|en|por|guardar|continuar|comenzar|cancelar|cerrar|ver|ir|hoy|plan|entreno|ejercicio|serie|repes|peso)\b/.test(t);
  return tienePalabras && esSuyo;
};

let total = 0;
const porArchivo = [];
for (const f of listJs(jsDir)) {
  const src = stripComments(readFileSync(f, 'utf8'));
  let n = 0;
  for (const re of SINKS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const s = (m[m.length - 1] || '');
      if (!esHumanText(s)) continue;
      // una plantilla con ${...} que solo interpola no es texto nuevo si ya va por t()
      if (/\bt\(/.test(s)) continue;
      n++;
    }
  }
  if (n) { porArchivo.push({ archivo: relative(root, f).replace(/\\/g, '/'), cadenas: n }); total += n; }
}

porArchivo.sort((a, b) => b.cadenas - a.cadenas);

let baseline = total;
if (existsSync(BASELINE_FILE)) {
  try {
    const j = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
    if (typeof j.baseline === 'number') baseline = j.baseline;
  } catch { /* si el JSON se corrompe, se vuelve a fijar abajo */ }
} else {
  writeFileSync(BASELINE_FILE, JSON.stringify({
    _nota: 'Línea base del trinquete i18n. Bajarla = progreso. Subirla requiere decisión de Sebastián (objetivo P19: 0).',
    fijada: new Date().toISOString().slice(0, 10),
    fijada_por: 'agente Qoder 25-09-2026 (crea la herramienta que i18n-eval.mjs esperaba)',
    baseline,
  }, null, 2) + '\n', 'utf8');
  console.log(`· línea base nueva fijada en ${baseline} (se guarda en tools/audit-i18n.baseline.json)`);
}

console.log('\n🧪 BAYONA · AUDITORÍA i18n (cadenas fuera del catálogo)');
for (const p of porArchivo.slice(0, 15)) console.log(`   ${String(p.cadenas).padStart(4)}  ${p.archivo}`);
if (porArchivo.length > 15) console.log(`   … y ${porArchivo.length - 15} ficheros más`);
console.log(`Cadenas hardcodeadas detectadas: ${total}`);
console.log(`Línea base: ${baseline} · objetivo P19: 0`);

if (total > baseline) {
  console.log(`❌ REGRESIÓN: +${total - baseline} cadenas visibles fuera del catálogo. Migrar a t("…") en js/i18n.js o justificar el cambio de línea base.`);
  process.exit(1);
}
if (total < baseline) {
  console.log(`✅ Progreso: ${baseline - total} menos que la base. Baja la línea base cuando confirmes (${BASELINE_FILE.replace(root + '/', '')}).`);
}
console.log('✅ audit-i18n sin regresión');
process.exit(0);
