// ============================================================
// BAYONA — NÚCLEO DE LA PALETA DE COMANDOS (puro, sin DOM)
// ------------------------------------------------------------
// Lo que se decide AQUÍ y no en la interfaz: cómo se normaliza lo
// que se escribe, cuánto puntúa cada comando, qué atajo de teclado
// es «ese» atajo y cómo se pinta un atajo en pantalla.
//
// Son funciones puras a propósito: se prueban en Node sin navegador
// (tests/paleta-eval.mjs) y la interfaz se limita a pintar lo que
// aquí ya está decidido. Si el criterio de búsqueda viviera en el
// DOM, nadie podría comprobarlo.
// ============================================================

/** nadie teclea 200 caracteres para saltar a una sección */
export const MAX_CONSULTA = 80;
/** resultados a la vez: una lista que hay que_scrollear no es una paleta */
export const MAX_RESULTADOS = 8;

/**
 * Normaliza para COMPARAR, no para mostrar: minúsculas, sin
 * diacríticos («Cuotas» y «cuota» son la misma búsqueda) y sin
 * espacios de más.
 */
export function normaliza(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONSULTA);
}

const palabras = (s) => normaliza(s).split(" ").filter(Boolean);

/** difusa: «cua» encuentra «cuotas» aunque las letras no sean seguidas */
function difusa(q, texto) {
  if (!q) return false;
  let i = 0;
  for (const letra of texto) {
    if (letra === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

/**
 * Puntos de un comando para una consulta. `null` = no aparece.
 * El orden de los puntos ES el orden de preferencia: exacto >
 * prefijo > palabra suelta > alias/grupo > contiene > difusa.
 */
export function puntua(comando, consulta) {
  if (!comando || typeof comando.id !== "string" || !comando.id) return null;
  const q = normaliza(consulta);
  // sin consulta no se busca nada: sale lo DESTACADO, en su orden
  if (!q) return comando.destacado ? 1 : null;
  const id = normaliza(comando.id);
  if (id === q) return 1000;
  const titulo = normaliza(comando.titulo);
  if (titulo === q) return 900;
  if (id.startsWith(q)) return 800;
  if (titulo.startsWith(q)) return 700;
  if (titulo.split(" ").some((p) => p.startsWith(q))) return 600;
  const extra = palabras([...(comando.alias || []), comando.grupo || ""].join(" "));
  if (extra.some((p) => p.startsWith(q))) return 500;
  if (titulo.includes(q)) return 300;
  if (extra.some((p) => p.includes(q))) return 200;
  if (difusa(q, titulo)) return 100;
  return null;
}

/**
 * Los comandos que salen, mejor primero. Nunca dos con el mismo id
 * (un comando registrado dos veces se ve una vez) y nunca más de
 * `limite`, que se acota para que nadie pueda pasarle 10 000.
 */
export function resultados(lista, consulta, opciones = {}) {
  const tope = Math.max(1, Math.min(30, opciones.limite || MAX_RESULTADOS));
  const vistos = new Set();
  const out = [];
  (Array.isArray(lista) ? lista : []).forEach((comando, i) => {
    if (!comando || !comando.id || vistos.has(comando.id)) return;
    const puntos = puntua(comando, consulta);
    if (puntos === null) return;
    vistos.add(comando.id);
    out.push({ comando, puntos, orden: i });
  });
  // empate = el que estaba antes en el registro (nunca «aleatorio»)
  out.sort((a, b) => (b.puntos - a.puntos) || (a.orden - b.orden));
  return out.slice(0, tope);
}

/** mover el cursor dando la vuelta: de la última fila, ↑ pasa a la primera */
export function mueve(actual, delta, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const desde = Number.isFinite(actual) ? actual : 0;
  return ((desde + delta) % total + total) % total;
}

/* ---------- atajos de teclado ---------- */

/** "mod+alt+k" → { mod:true, ctrl:false, alt:true, shift:false, key:"k" } */
export function descomponeAtajo(codigo) {
  const trozos = normaliza(codigo).split("+").map((s) => s.trim()).filter(Boolean);
  const mods = trozos.slice(0, -1);
  return {
    mod: mods.includes("mod"),
    ctrl: mods.includes("ctrl"),
    alt: mods.includes("alt"),
    shift: mods.includes("shift"),
    key: trozos.length ? trozos[trozos.length - 1] : "",
  };
}

/** atajo SIN modificadores: «?», «Escape»… (puede dispararse escribiendo) */
export function esAtajoSuelto(codigo) {
  const a = descomponeAtajo(codigo);
  return !a.mod && !a.ctrl && !a.alt;
}

const DIGITOS = { 1: "digit1", 2: "digit2", 3: "digit3", 4: "digit4", 5: "digit5", 6: "digit6" };

/**
 * ¿Este evento ES ese atajo? Se exige lo declarado y NADA más:
 * `mod+k` no salta al teclear una «k» suelta.
 *
 * `mod` = ⌘ en Mac y Ctrl en el resto: en los dos casos vale
 * cualquiera de los dos, que es como lo interpretan las apps de
 * escritorio. Los dígitos se reconocen también por `event.code`
 * porque en Mac Alt+1 no entrega la tecla «1» sino «¡».
 *
 * El modificador Shift NO se comprueba: «?» ya viene con Shift
 * pulsado en el teclado, y exigirlo rompería el atajo.
 */
export function coincideAtajo(evento, codigo) {
  const a = descomponeAtajo(codigo);
  if (!a.key || !evento) return false;
  const tecla = normaliza(evento.key);
  if (DIGITOS[a.key]) {
    const justo = tecla === a.key || normaliza(evento.code) === DIGITOS[a.key];
    if (!justo) return false;
  } else if (tecla !== a.key) {
    return false;
  }
  const meta = Boolean(evento.metaKey);
  const ctrl = Boolean(evento.ctrlKey);
  const alt = Boolean(evento.altKey);
  if (a.mod !== (meta || ctrl)) return false;
  // con «mod» declarado, el Ctrl de Windows y el ⌘ del Mac valen igual
  if (!a.mod && a.ctrl !== ctrl) return false;
  if (a.alt !== alt) return false;
  return true;
}

/**
 * Cómo se VE un atajo: ["⌘","K"] en Mac, ["Ctrl","K"] en el resto.
 * El símbolo se elige arriba (navigator) y aquí solo se compone.
 */
export function simbolosAtajo(codigo, mod = "ctrl") {
  const a = descomponeAtajo(codigo);
  if (!a.key) return [];
  const out = [];
  if (a.mod) out.push(mod === "meta" ? "⌘" : "Ctrl");
  if (a.ctrl) out.push("Ctrl");
  if (a.alt) out.push("Alt");
  if (a.shift) out.push("⇧");
  if (a.key === "escape") out.push("Esc");
  else if (a.key === "arrowdown") out.push("↓");
  else if (a.key === "arrowup") out.push("↑");
  else if (a.key === "enter") out.push("↵");
  else if (a.key.length === 1) out.push(a.key.toUpperCase());
  else out.push(a.key.charAt(0).toUpperCase() + a.key.slice(1));
  return out;
}
