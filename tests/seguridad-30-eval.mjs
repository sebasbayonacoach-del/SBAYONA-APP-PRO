// seguridad-30-eval.mjs — P11 · el guion de seguridad del CORE está fijado.
// (node tests/seguridad-30-eval.mjs)
// Comprueba: 30 escenarios · 30/30 derivaciones · 30/30 disparadores detectados ·
// 0 frases clínicas prohibidas · toda respuesta menciona derivación a profesional.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  ESCENARIOS,
  NIVELES_RIESGO,
  CATEGORIAS_RIESGO,
  PROHIBIDAS_RESPUESTA,
  RE_PROFESIONAL,
  detectarRiesgo,
  respuestaDerivacion,
  protegerDialogo,
} from '../js/seguridad-guion.js';

let pass = 0, fail = 0;
const assert = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log('\n🦺 GUION DE SEGURIDAD 30 · CORE endurecido\n');

// ---------- 1 · estructura: 30 escenarios completos ----------
assert(ESCENARIOS.length === 30, `hay exactamente 30 escenarios`, `(hay ${ESCENARIOS.length})`);
const ids = ESCENARIOS.map((e) => e.id).sort((a, b) => a - b);
assert(ids.every((v, i) => v === i + 1), 'ids únicos y consecutivos 1..30', `→ ${ids.join(',')}`);

const camposOk = ESCENARIOS.every((e) =>
  Number.isInteger(e.id) &&
  CATEGORIAS_RIESGO.includes(e.categoria) &&
  NIVELES_RIESGO.includes(e.nivel) &&
  Array.isArray(e.disparadores) && e.disparadores.length >= 1 &&
  Array.isArray(e.patrones) && e.patrones.length >= 1 &&
  typeof e.titulo === 'string' && e.titulo.trim() &&
  typeof e.mensaje === 'string' && e.mensaje.trim() &&
  typeof e.recurso === 'string' && e.recurso.trim());
assert(camposOk, '30/30 escenarios con categoría, nivel, disparadores, patrones, mensaje y recurso');

const cats = new Set(ESCENARIOS.map((e) => e.categoria));
assert(cats.size >= 8, `≥8 categorías de riesgo cubiertas`, `(hay ${cats.size}: ${[...cats].join(', ')})`);
const niveles = new Set(ESCENARIOS.map((e) => e.nivel));
assert([...NIVELES_RIESGO].every((n) => niveles.has(n)), `los 3 niveles de riesgo están en uso`, `(${[...niveles].join(', ')})`);

// ---------- 2 · 30/30 derivaciones ----------
let derivadas = 0;
for (const e of ESCENARIOS) {
  const r = respuestaDerivacion(e.id);
  if (r && r.esDerivacion === true && r.mensaje?.trim() && r.recurso?.trim()) derivadas++;
}
assert(derivadas === 30, `30/30 respuestas marcadas esDerivacion=true`, `(${derivadas}/30)`);

const fallback = respuestaDerivacion(999);
assert(fallback.esDerivacion === true && fallback.generico === true,
  'escenario desconocido → fallback que también deriva (nunca consejo clínico)');

// ---------- 3 · 30/30 disparadores detectados y en su escenario ----------
let detectados = 0, bienUbicados = 0, fallos = [];
for (const e of ESCENARIOS) {
  for (const d of e.disparadores) {
    const det = detectarRiesgo(d);
    if (det.riesgo === true) detectados++;
    else fallos.push(`#${e.id} sin detectar: «${d}»`);
    if (det.riesgo === true && det.escenarioId === e.id) bienUbicados++;
    else if (det.riesgo) fallos.push(`#${e.id} mal ubicado → #${det.escenarioId}: «${d}»`);
  }
}
const totalDisp = ESCENARIOS.reduce((s, e) => s + e.disparadores.length, 0);
assert(detectados === totalDisp, `detectarRiesgo activa los ${totalDisp} disparadores`, `(${detectados}/${totalDisp})`);
assert(bienUbicados === totalDisp, `cada disparador cae en SU escenario`, fallos.slice(0, 5).join(' | '));

// ---------- 4 · ninguna respuesta con frases clínicas prohibidas ----------
let conProhibida = [];
for (const e of ESCENARIOS) {
  const r = respuestaDerivacion(e.id);
  for (const p of PROHIBIDAS_RESPUESTA) {
    if (p.re.test(r.mensaje) || p.re.test(r.recurso)) {
      conProhibida.push(`#${e.id} «${p.motivo}»`);
    }
  }
}
assert(conProhibida.length === 0,
  `0/30 respuestas con frases clínicas prohibidas (${PROHIBIDAS_RESPUESTA.length} reglas)`,
  conProhibida.join(' | '));

// prohibidas también en el fallback
const fallbackProhibido = PROHIBIDAS_RESPUESTA.some((p) => p.re.test(fallback.mensaje));
assert(!fallbackProhibido, 'el fallback tampoco contiene frases prohibidas');

// ---------- 5 · toda respuesta menciona derivación a profesional ----------
const sinProfesional = ESCENARIOS
  .map((e) => ({ e, r: respuestaDerivacion(e.id) }))
  .filter(({ r }) => !RE_PROFESIONAL.test(r.mensaje))
  .map(({ e }) => `#${e.id}`);
assert(sinProfesional.length === 0,
  `30/30 respuestas mencionan a quién derivar (profesional/recurso)`,
  sinProfesional.join(', '));

// ---------- 6 · sin falsos positivos con texto inocuo ----------
const inocuas = [
  'hoy tengo muchas agujetas en las piernas y me cuesta bajar las escaleras',
  '¿cuántas series hago de sentadillas y cuánto descanso entre series?',
  'quiero ganar masa muscular, ¿cómo organizo la semana?',
  'me duelen las piernas del entrenamiento de ayer',
  'tengo 40 años y quiero empezar a correr desde cero',
  '¿me recomiendas una buena proteína en polvo?',
  'buenos días, ¿qué toca entrenar hoy?',
];
const falsosPositivos = inocuas.filter((t) => detectarRiesgo(t).riesgo === true);
assert(falsosPositivos.length === 0,
  `0 falsos positivos en ${inocuas.length} frases inocuas`,
  falsosPositivos.map((t) => `«${t}»`).join(' | '));

// ---------- 7 · protegerDialogo: sin riesgo → sin respuesta ----------
const p1 = protegerDialogo('hola, ¿qué hago hoy?');
assert(p1.deteccion.riesgo === false && p1.respuesta === null,
  'protegerDialogo sin riesgo → respuesta null (el chat sigue)');
const p2 = protegerDialogo('me aprieta el pecho desde hace una hora');
assert(p2.deteccion.riesgo === true && p2.respuesta?.esDerivacion === true,
  'protegerDialogo con riesgo → respuesta de derivación');

// ---------- 8 · el documento del guion existe y cubre los 30 ----------
const here = dirname(fileURLToPath(import.meta.url));
let doc = '';
try { doc = readFileSync(join(here, '..', 'docs', 'guion-seguridad-30.md'), 'utf8'); } catch { /* abajo */ }
assert(doc.trim().length > 0, 'docs/guion-seguridad-30.md existe');
const idsEnDoc = ESCENARIOS.filter((e) => doc.includes(`### ${e.id} `) || doc.includes(`### ${e.id}·`) || new RegExp(`###\\s*${e.id}\\b`).test(doc)).length;
assert(idsEnDoc === 30, `el guion documenta los 30 escenarios`, `(${idsEnDoc}/30)`);

console.log(`\n  → ${pass} ok, ${fail} fallos`);
console.log(`  → categorías de riesgo: ${cats.size} · niveles: ${[...niveles].join('/')}`);
console.log(`  → disparadores probados: ${totalDisp} · reglas de prohibición: ${PROHIBIDAS_RESPUESTA.length}`);
process.exit(fail ? 1 : 0);
