// onboarding-eval.mjs — regresión del ingreso/onboarding (P02, G2)
// (node tests/onboarding-eval.mjs)
// Sin navegador: el HTML del onboarding se renderiza en node (view() es puro)
// y se comprueba el grafo de acciones: portada → primera acción real.
import { readFileSync } from "node:fs";
import { __obState, __obView, perfilRapido, G2_TOQUES_RAPIDO } from "../js/onboarding.js";

let pass = 0, fail = 0;
const assert = (cond, name, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log("\n🚪 ONBOARDING · EVAL DE INGRESO (G2) Y ACCESIBILIDAD\n");

const vista = (paso) => { __obState.step = paso; return __obView(); };
const html = [0, 1, 2, 3].map(vista);
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const mainEntry = readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const luxeCss = readFileSync(new URL("../css/luxe.css", import.meta.url), "utf8");

// ── G2 · portada → primera acción real en ≤ 3 toques ─────────────────────
{
  // grafo de acciones: portada →(1) ENTRAR → paso 0 →(1) EMPEZAR YA → acción real
  assert(index.includes('id="entry-go"') && index.includes('id="entry-coach"'), "la portada ofrece acceso por rol: afiliado o coach");
  assert(index.includes("APP ENTRENADOR + ATLETA") && index.includes("TRAINING OS"), "el ingreso se presenta como producto entrenador/gym");
  assert(mainEntry.includes("Boolean(storedRole)") && mainEntry.includes('const storedRole = localStorage.getItem(roleKey)'),
    "solo un rol realmente usado puede marcarse como ÚLTIMO ACCESO");
  assert(index.includes('id="entry-resume"') && mainEntry.includes("resume.hidden = !storedRole"),
    "el acceso rápido solo aparece cuando existe un rol anterior real");
  assert(mainEntry.includes('if (e.key === "1") return enter("affiliate")') &&
    mainEntry.includes('if (e.key === "2") return enter("coach")'),
    "teclado de app: 1 entra como atleta y 2 como coach");
  assert(luxeCss.includes("body.luxe-activo #entry { display: none !important; }"),
    "la landing pública oculta de verdad la puerta de la app");
  assert(html[0].includes('id="ob-fast"'), "el camino rápido está en el PRIMER paso (sin pasos previos)");
  assert(G2_TOQUES_RAPIDO === 2 && G2_TOQUES_RAPIDO <= 3, `G2: camino rápido = ${G2_TOQUES_RAPIDO} toques (≤ 3)`);
  assert(!/id="ob-name"[^>]*required/.test(html[0]) && !html[0].includes("required"),
    "0 campos obligatorios en el camino rápido (proxy de los 30 s)");
  assert(html[0].includes('id="ob-next"'), "el camino guiado sigue disponible (CONTINUAR)");
}

// ── recorrido guiado completo, paso a paso ───────────────────────────────
{
  assert(html[0].includes('id="ob-next"') && !html[0].includes('id="ob-back"'), "paso 0: avanza y sin retroceso (es el primero)");
  for (const p of [1, 2]) {
    assert(html[p].includes('id="ob-next"') && html[p].includes('id="ob-back"'), `paso ${p}: CONTINUAR + ATRÁS (lo escrito se conserva)`);
  }
  assert(html[3].includes('id="ob-done"') && html[3].includes('id="ob-back"'), "paso final: EMPEZAR MI CAMINO + ATRÁS");
  assert(html.every((h) => h.includes('id="ob-dots"')), "los 4 pasos muestran su progreso");
  assert(html.every((h) => h.includes("Paso ") && h.includes("de 4")), "progreso anunciado a lectores de pantalla (sr-only)");
}

// ── accesibilidad: labels, ARIA, foco y teclado ──────────────────────────
{
  assert(html[0].includes('for="ob-name"') && html[0].includes('id="ob-name"'), "el nombre tiene <label for> asociado");
  assert((html[0].match(/aria-label="Tono de piel/g) || []).length === 6, "los 6 tonos de piel tienen nombre accesible");
  assert(html[0].includes('aria-pressed="true"') || html[0].includes('aria-pressed="false"'), "tonos de piel con aria-pressed");
  for (const p of [0, 1, 2]) {
    assert(html[p].includes("aria-pressed="), `paso ${p}: los chips declaran su estado (aria-pressed)`);
    assert(html[p].includes('role="group"') && html[p].includes("aria-labelledby="), `paso ${p}: chips agrupados y etiquetados`);
  }
  assert(!html[3].includes('<div class="ob-check">') && (html[3].match(/<label class="ob-check">/g) || []).length === 2,
    "los permisos son <label>: hacer clic en el texto activa el checkbox");
  assert(html[0].includes('<label class="ob-check">'), "permiso Avatar 3D también es <label>");
  const src = readFileSync(new URL("../js/onboarding.js", import.meta.url), "utf8");
  assert(src.includes("preventScroll: true") && src.includes(".focus("), "cada paso deja el foco en la acción primaria");
  assert(src.includes('e.key === "Enter"'), "teclado: Enter en el nombre avanza de paso");
  assert(src.includes('aria-modal="true"'), "el diálogo es modal declarado (aria-modal)");
  assert(src.includes("focus-visible"), "foco visible estilizado (:focus-visible)");
}

// ── camino rápido honesto: valores por defecto, CERO consentimientos ─────
{
  const p = perfilRapido();
  assert(p.name === "ATLETA" && p.goal === "FUERZA" && p.availability === "3 DÍAS/SEMANA", "perfil rápido con defaults declarados en el copy");
  assert(p.consents.vision === false && p.consents.health === false && p.consents.avatar_3d === false,
    "el camino rápido NO concede permisos (lo que no se ha pedido no se concede)");
  assert(!p.face && !p.avatar3d, "sin foto ni avatar 3D inventados");
  assert(html[0].includes("objetivo FUERZA") && html[0].includes("3 días/semana"), "el copy del camino rápido dice exactamente qué defaults aplica");
}

// ── sanitizado: el dato de usuario nunca se inyecta crudo ────────────────
{
  const guardado = __obState.name;
  __obState.name = '<script>alert(1)</script>';
  const h = vista(0);
  assert(!h.includes("<script>"), "el nombre del usuario se escapa (sin HTML crudo)");
  assert(h.includes("&lt;script&gt;"), "y se ve igual de honesto escapado");
  __obState.name = guardado;
}

console.log(`\n📊 RESULTADO: ${pass} pass · ${fail} fail\n`);
process.exit(fail ? 1 : 0);
