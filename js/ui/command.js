// ============================================================
// BAYONA — PALETA DE COMANDOS (⌘K) Y TECLADO
// ------------------------------------------------------------
// El software que se usa ocho horas al día se maneja con las manos
// en el teclado, no con el ratón. Aquí hay tres cosas:
//
//   1 · UNA PALETA (⌘K / Ctrl+K): escribes y sales a donde quieras.
//       Secciones, acciones del centro y los socios por su nombre.
//   2 · UNAS POCAS TECLAS DIRECTAS: Alt+1…6 saltan al raíl.
//   3 · UNA HOJA DE ATAJOS (tecla ?) construida A PARTIR del
//       registro de comandos: no hay una lista de atajos escrita a
//       mano que se pueda quedar vieja.
//
// El criterio de búsqueda NO vive aquí: está en `js/comandos.js`,
// que es puro y se puede probar sin navegador. Aquí solo se pinta.
// ============================================================
import { t, esc } from "../i18n.js";
import {
  $, el, elT, openSection, showModal, hideModal, trapFoco, TITLES,
} from "./shared.js";
import {
  resultados, mueve, coincideAtajo, simbolosAtajo, esAtajoSuelto,
  normaliza, MAX_RESULTADOS,
} from "../comandos.js";
import { G } from "../gym/store.js";
import {
  abrirFicha, altaSocioDesde, crearClase, registrarAccesoDesde,
} from "./centro.js";

/* ============================================================
   1 · EL REGISTRO
   ------------------------------------------------------------
   Un comando es { id, titulo, grupo, atajo, destacado, ejecutar }.
   `id` es único y estable; el título ya viene resuelto del
   catálogo. Registrar dos veces el mismo id lo sustituye: así una
   pantalla puede añadir el suyo sin romper la paleta.
   ============================================================ */
const REGISTRO = new Map();

/** @returns {boolean} si el comando era utilizable */
export function registra(comando) {
  if (!comando || typeof comando.id !== "string" || !comando.id) return false;
  if (typeof comando.ejecutar !== "function") return false;
  REGISTRO.set(comando.id, comando);
  return true;
}

export const comandos = () => [...REGISTRO.values()];
export const comando = (id) => REGISTRO.get(id) || null;

/** el raíl, en el orden en que se ve */
const RAIL = ["hoy", "training", "progress", "wellbeing", "profile", "centro"];
/** el centro, que son las secciones de dentro */
const DEL_CENTRO = ["socios", "cuotas", "agenda", "acceso", "portal", "informes"];

for (const [i, clave] of RAIL.entries()) {
  registra({
    id: `ir:${clave}`,
    titulo: (TITLES[clave] || ["", ""])[0],
    grupo: t("cmd.grupo.ir"),
    atajo: `alt+${i + 1}`,
    destacado: true,
    ejecutar: () => openSection(clave),
  });
}
for (const clave of DEL_CENTRO) {
  registra({
    id: `ir:${clave}`,
    titulo: (TITLES[clave] || ["", ""])[0],
    grupo: t("cmd.grupo.centro"),
    ejecutar: () => openSection(clave),
  });
}
registra({
  id: "accion:alta", titulo: t("cmd.altaSocio"), grupo: t("cmd.grupo.acciones"),
  destacado: true, ejecutar: () => altaSocioDesde($("#drawer-body")),
});
registra({
  id: "accion:acceso", titulo: t("cmd.acceso"), grupo: t("cmd.grupo.acciones"),
  destacado: true, ejecutar: () => registrarAccesoDesde(),
});
registra({
  id: "accion:clase", titulo: t("cmd.clase"), grupo: t("cmd.grupo.acciones"),
  ejecutar: () => crearClase(),
});
registra({
  id: "ayuda:atajos", titulo: t("cmd.atajos"), grupo: t("cmd.grupo.ayuda"),
  atajo: "?", ejecutar: () => hojaAtajos(),
});

/* ============================================================
   2 · LA CAPA
   ============================================================ */
let capa = null, entrada = null, lista = null;
let visibles = [], activo = 0, devuelto = null, montado = false;

/** ¿Estamos en la app? Antes de ENTRAR la paleta no existe. */
const dentro = () => Boolean(document.body?.classList?.contains?.("entered"));
/** ¿Hay un modal abierto? Encima de un modal no se apila otra capa. */
const modalAbierto = () => {
  const l = document.getElementById("modal-layer");
  return Boolean(l && !l.classList.contains("hidden"));
};
/** Se está escribiendo en un campo: ahí «?» es una «?», no un atajo. */
const enCampo = (n) => Boolean(n && (
  n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.tagName === "SELECT" || n.isContentEditable
));

/** ⌘ en Mac, Ctrl en el resto: se decide UNA vez y se usa en todas partes. */
const MOD = /mac|iphone|ipad|ipod/i.test(
  (typeof navigator === "undefined" ? "" : navigator.userAgent) || "",
) ? "meta" : "ctrl";

export const abierta = () => Boolean(capa && !capa.classList.contains("hidden"));

function ensure() {
  if (montado) return capa;
  capa = el("div", "hidden");
  capa.id = "cmd-layer";
  capa.setAttribute("role", "dialog");
  capa.setAttribute("aria-modal", "true");
  capa.setAttribute("aria-label", t("cmd.titulo"));

  const caja = el("div");
  caja.id = "cmd-box";

  const cabeza = el("div", "cmd-cabecera");
  entrada = document.createElement("input");
  entrada.id = "cmd-q";
  entrada.type = "text";
  entrada.autocomplete = "off";
  entrada.spellcheck = false;
  entrada.setAttribute("role", "combobox");
  entrada.setAttribute("aria-expanded", "true");
  entrada.setAttribute("aria-controls", "cmd-lista");
  entrada.setAttribute("aria-autocomplete", "list");
  entrada.setAttribute("aria-label", t("cmd.buscar"));
  entrada.setAttribute("placeholder", t("cmd.placeholder"));
  cabeza.appendChild(entrada);

  lista = el("div");
  lista.id = "cmd-lista";
  lista.setAttribute("role", "listbox");
  lista.setAttribute("aria-label", t("cmd.resultados"));

  const pie = el("div", "cmd-pie");
  for (const [teclas, que] of [
    [["↑", "↓"], t("cmd.pie.mover")],
    [["↵"], t("cmd.pie.abrir")],
    [["Esc"], t("cmd.pie.cerrar")],
  ]) {
    const grupo = el("span", "cmd-pie-g");
    teclas.forEach((k) => grupo.appendChild(elT("kbd", "", k)));
    grupo.appendChild(elT("span", "", que));
    pie.appendChild(grupo);
  }

  caja.append(cabeza, lista, pie);
  capa.appendChild(caja);
  document.body.appendChild(capa);
  capa.addEventListener("click", (e) => { if (e.target === capa) cierra(); });
  entrada.addEventListener("input", () => { activo = 0; pinta(); });
  entrada.addEventListener("keydown", enTecla);
  montado = true;
  return capa;
}

/* ============================================================
   3 · PINTAR
   ------------------------------------------------------------
   `filasDe` y `pintaLista` están separadas a propósito: la
   estructura de una fila se puede comprobar sin navegador, y
   `pintaLista` es la única parte que toca el DOM.
   ============================================================ */

/** resultados → filas con todo lo que hay que dibujar */
export function filasDe(listaResultados, activo = 0) {
  return (listaResultados || []).map((r, i) => {
    const c = r.comando || r;
    return {
      id: c.id,
      titulo: String(c.titulo ?? ""),
      grupo: String(c.grupo ?? ""),
      atajo: c.atajo ? simbolosAtajo(c.atajo, MOD) : [],
      seleccionada: i === activo,
    };
  });
}

/** Dibuja las filas. Devuelve cuántas ha pintado (0 = estado vacío). */
export function pintaLista(capaLista, filas, activo = 0) {
  if (!capaLista) return 0;
  capaLista.textContent = "";
  if (!filas || !filas.length) {
    capaLista.appendChild(elT("div", "cmd-vacio", t("cmd.vacio")));
    return 0;
  }
  filas.forEach((fila, i) => {
    const marcada = fila.seleccionada === undefined ? i === activo : fila.seleccionada;
    const n = el("div", `cmd-fila${marcada ? " activa" : ""}`);
    n.id = `cmd-op-${i}`;
    n.dataset.i = String(i);
    n.setAttribute("role", "option");
    n.setAttribute("aria-selected", marcada ? "true" : "false");
    n.appendChild(elT("span", "cmd-fila-t", fila.titulo));
    if (fila.grupo) n.appendChild(elT("span", "cmd-fila-g", fila.grupo));
    if (fila.atajo && fila.atajo.length) {
      const cont = el("span", "cmd-atajo");
      fila.atajo.forEach((s) => cont.appendChild(elT("kbd", "", s)));
      n.appendChild(cont);
    }
    n.onclick = () => ejecuta(i);
    capaLista.appendChild(n);
  });
  return filas.length;
}

/** Los socios también se buscan: escribir un nombre abre su ficha. */
export function comandosDeSocios(consulta) {
  const q = normaliza(consulta);
  if (!q) return [];
  return G.estado.socios
    .filter((s) => normaliza(s.nombre).includes(q) || normaliza(s.telefono || "").includes(q))
    .slice(0, 4)
    .map((s) => ({
      id: `socio:${s.id}`,
      titulo: s.nombre,
      grupo: t("cmd.grupo.socios"),
      ejecutar: () => abrirFicha(s.id),
    }));
}

function pinta() {
  const q = entrada ? entrada.value : "";
  visibles = resultados(comandos().concat(comandosDeSocios(q)), q, { limite: MAX_RESULTADOS });
  activo = Math.min(activo, Math.max(0, visibles.length - 1));
  pintaLista(lista, filasDe(visibles, activo), activo);
  // el cursor se lee en el input, no en un nodo: quien navega con
  // lector de pantalla oye cuál de las dos filas está marcada
  if (entrada) entrada.setAttribute("aria-activedescendant", visibles.length ? `cmd-op-${activo}` : "");
  // al bajar con las flechas, la fila activa tiene que verse
  const marcada = lista && lista.children ? lista.children[activo] : null;
  if (marcada && typeof marcada.scrollIntoView === "function") {
    try { marcada.scrollIntoView({ block: "nearest" }); } catch { /* navegador viejo */ }
  }
  return visibles.length;
}

function ejecuta(i) {
  const elegido = visibles[i];
  cierra();
  if (elegido && typeof elegido.comando.ejecutar === "function") elegido.comando.ejecutar();
}

/* ============================================================
   4 · ABRIR Y CERRAR
   ============================================================ */
export function abre(inicial = "") {
  ensure();
  if (!dentro()) return false;
  devuelto = document.activeElement;
  capa.classList.remove("hidden");
  if (entrada.value !== inicial) entrada.value = inicial;
  activo = 0;
  pinta();
  entrada.focus();
  return true;
}

export function cierra() {
  if (!capa || !abierta()) return;
  capa.classList.add("hidden");
  lista && (lista.textContent = "");
  visibles = [];
  activo = 0;
  // el foco vuelve a donde estaba: sin esto el teclado «desaparece»
  if (devuelto && typeof devuelto.focus === "function") devuelto.focus();
  devuelto = null;
}

/** teclado DENTRO de la paleta */
function enTecla(e) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    activo = mueve(activo, e.key === "ArrowDown" ? 1 : -1, visibles.length);
    pinta();
    return;
  }
  if (e.key === "Home" || e.key === "End") {
    e.preventDefault();
    activo = e.key === "Home" ? 0 : Math.max(0, visibles.length - 1);
    pinta();
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    ejecuta(activo);
    return;
  }
  if (e.key === "Escape") {
    e.preventDefault();
    cierra();
    return;
  }
  if (e.key === "Tab") trapFoco($("#cmd-box"), e);
}

/** teclado de la app entera */
function enGlobal(e) {
  if (e.defaultPrevented || e.isComposing) return;
  if (coincideAtajo(e, "mod+k")) {
    e.preventDefault();
    if (abierta()) cierra(); else abre();
    return;
  }
  // con la paleta abierta manda la paleta,Escape incluido
  if (abierta()) {
    if (e.key === "Escape") { e.preventDefault(); cierra(); }
    return;
  }
  if (modalAbierto() || !dentro()) return;
  for (const c of comandos()) {
    if (!c.atajo) continue;
    // un atajo suelto («?») no puede saltar mientras se escribe
    if (esAtajoSuelto(c.atajo) && enCampo(e.target)) continue;
    if (coincideAtajo(e, c.atajo)) {
      e.preventDefault();
      c.ejecutar();
      return;
    }
  }
}

/* ============================================================
   5 · HOJA DE ATAJOS · se genera del registro, no se escribe
   ============================================================ */
export function hojaAtajos() {
  const conAtajo = comandos().filter((c) => c.atajo);
  const fila = (titulo, simbolos) => `<div class="kv"><span class="k">${esc(titulo)}</span><span class="v">${
    simbolos.map((s) => `<kbd>${esc(s)}</kbd>`).join("")
  }</span></div>`;
  // las dos teclas que NO son comandos (la propia paleta y Escape)
  // también salen: si la ayuda se escribe a medias, miente.
  const sueltas = [
    fila(t("cmd.buscar"), simbolosAtajo("mod+k", MOD)),
    fila(t("cmd.pie.cerrar"), simbolosAtajo("escape", MOD)),
  ];
  showModal(`
    <div class="cine-tag">${esc(t("cmd.grupo.ayuda"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(t("cmd.atajos.titulo"))}</div>
    <div class="sub">${esc(t("cmd.atajos.nota"))}</div>
    <div class="cmd-atajos">${sueltas.concat(conAtajo.map((c) => fila(c.titulo, simbolosAtajo(c.atajo, MOD)))).join("")}</div>
    <div class="gym-acciones"><button class="btn btn-primary" id="cmd-cerrar">${esc(t("act.close"))}</button></div>`,
  () => { const b = $("#cmd-cerrar"); if (b) b.onclick = hideModal; });
}

/* ============================================================
   6 · INSTALACIÓN
   ============================================================ */
export function installPaleta() {
  ensure();
  document.addEventListener("keydown", enGlobal);
  const chip = document.getElementById("cmd-chip");
  if (chip) {
    chip.setAttribute("aria-label", t("cmd.boton"));
    chip.setAttribute("title", t("cmd.boton"));
    chip.setAttribute("aria-keyshortcuts", "Meta+K Control+K");
    chip.textContent = "";
    simbolosAtajo("mod+k", MOD).forEach((s) => chip.appendChild(elT("kbd", "", s)));
    chip.addEventListener("click", () => abre());
  }
  return chip;
}
