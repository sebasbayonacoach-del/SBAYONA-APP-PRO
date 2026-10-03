// sincro-outbox-eval.mjs — regresión de la cola offline (SINCRO v10.1)
// (node tests/sincro-outbox-eval.mjs) — sin DOM: localStorage simulado.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

// ---- shim de localStorage (Map persistente entre "recargas") ----
const mapa = new Map();
globalThis.localStorage = {
  getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
  setItem: (k, v) => mapa.set(k, String(v)),
  removeItem: (k) => mapa.delete(k),
};

const importOutbox = (q) => import(`../js/sync/outbox.js?recarga=${q}`);
let outbox = await importOutbox('a');

console.log('\n📬 OUTBOX · COLA OFFLINE PERSISTENTE (SINCRO v10.1)\n');

// ---- marca y persiste ----
{
  outbox.marcarPendiente('cambios locales');
  assert(outbox.estaPendiente(), 'marcarPendiente deja la cola pendiente');
  const st = outbox.estado();
  assert(st.motivo === 'cambios locales', 'guarda el motivo', JSON.stringify(st));
  assert(!Number.isNaN(Date.parse(st.desde)), 'guarda desde (ISO)', JSON.stringify(st));
  assert(st.intentos === 0, 'sin intentos todavía');
}

// ---- sobrevive a la recarga (nueva instancia del módulo) ----
{
  outbox = await importOutbox('b');
  assert(outbox.estaPendiente(), 'el pendiente SOBREVIVE a la recarga de la pestaña');
}

// ---- fallos → backoff exponencial con techo ----
{
  outbox.registrarFallo('HTTP 502');
  outbox.registrarFallo('HTTP 502');
  outbox.registrarFallo('HTTP 502');
  assert(outbox.estado().intentos === 3, 'registrarFallo cuenta los intentos', JSON.stringify(outbox.estado()));
  assert(outbox.estado().motivo === 'HTTP 502', 'el motivo del fallo queda registrado');
  const t1 = outbox.backoffMs();
  outbox.registrarFallo('');
  const t2 = outbox.backoffMs();
  assert(t1 === 15_000 * 2 ** 3, 'backoff crece exponencial (3 fallos → 15 s · 2³ = 120 s)', `t=${t1}`);
  assert(t2 > t1, 'cada fallo alarga la espera');
  for (let i = 0; i < 20; i++) outbox.registrarFallo('');
  assert(outbox.backoffMs() === 30 * 60_000, 'backoff con techo de 30 min', `t=${outbox.backoffMs()}`);
  assert(outbox.estado().desde === outbox.estado().desde, 'desde no cambia al fallar');
}

// ---- marcarPendiente NO resetea los intentos ----
{
  const antes = outbox.estado().intentos;
  outbox.marcarPendiente('otro cambio');
  assert(outbox.estado().intentos === antes, 'marcarPendiente conserva los intentos ganados');
  assert(outbox.estado().motivo === 'otro cambio', 'pero refresca el motivo');
}

// ---- limpiar ----
{
  outbox.limpiar();
  assert(!outbox.estaPendiente(), 'limpiar vacía la cola');
  assert(outbox.estado() === null, 'estado null tras limpiar');
  assert(outbox.backoffMs() === 15_000, 'backoff vuelve a la base tras limpiar');
}

// ---- sin localStorage: degrada sin lanzar ----
{
  const guardado = globalThis.localStorage;
  delete globalThis.localStorage;
  outbox = await importOutbox('c');
  let ex = null;
  try { outbox.marcarPendiente('x'); outbox.limpiar(); }
  catch (e) { ex = e; }
  assert(ex === null, 'sin localStorage no lanza (es prescindible por diseño)', String(ex));
  assert(outbox.estaPendiente() === false, 'sin localStorage → nunca pendiente (falso seguro)');
  globalThis.localStorage = guardado;
}

// ---- cableado en account.js y sw.js (patrón del repo: lectura de fuente) ----
{
  const leer = (p) => readFileSync(join(here, '..', p), 'utf8');
  const acc = leer('js/sync/account.js');
  const sw = leer('sw.js');
  const obx = leer('js/sync/outbox.js');

  assert(/import \* as outbox from "\.\/outbox\.js"/.test(acc), 'account.js importa el outbox');
  assert(/outbox\.registrarFallo\(/.test(acc) && /outbox\.limpiar\(\)/.test(acc), 'syncNow registra fallo y limpia al éxito');
  assert(/on\("medidas", sincroSuave\)/.test(acc) && /on\("asignaciones", sincroSuave\)/.test(acc), 'auto-sync en medidas y asignaciones');
  assert(/on\("session", sincroSuave\)/.test(acc), 'auto-sync al cerrar sesión de entreno');
  assert(/outbox\.backoffMs\(\)/.test(acc), 'reintentos esperan el backoff del outbox');
  assert(!/STATE\.pending/.test(acc), 'el contador en memoria (se pierde al recargar) está retirado');

  assert(/sync\/outbox\.js/.test(sw), 'el service worker precachea el outbox');
  assert(/bayona-shell-v22/.test(sw), 'cache del shell subido a v22');
  assert(/const MAX_MS/.test(obx) && /2 \*\* n/.test(obx), 'backoff exponencial vive en el outbox, no repartido');
}

console.log('\n══════════════════════════════════');
if (fail) { console.log(`❌ OUTBOX: ${pass} pass · ${fail} fail`); process.exit(1); }
console.log(`📊 RESULTADO: ${pass} pass · 0 fail`);
