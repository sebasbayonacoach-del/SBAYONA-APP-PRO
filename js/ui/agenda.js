// ============================================================
// BAYONA · UI/AGENDA — clases, reservas y aforo
// ------------------------------------------------------------
// Lo que ve el socio en su app y lo que ve el entrenador en el
// centro: las clases de hoy y de los próximos días, cuánta gente
// hay en cada una y quién se queda sin sitio.
//
// Las reglas del dominio mandan: no se sobrevende, no se solapan
// clases del mismo socio y no se reserva dos veces. Si una reserva
// falla, la app DICE POR QUÉ.
import { G } from "../gym/store.js";
import { dia, sumarDias, plazasLibres, reservasDe, puedeReservar, seSolapan } from "../gym/model.js";
import { BUILDERS, $, el, elT, UI, showModal, hideModal, toast } from "./shared.js";
import { esc, t, tE } from "../i18n.js";
import { crearClase } from "./centro.js";

/**
 * Por qué no se puede reservar, en palabras. El CÓDIGO lo pone el
 * dominio (`puedeReservar`) y la frase vive en el catálogo
 * (`gym.error.*`): una sola lista, sin dos verdades.
 */
const motivo = (m) => tE(m || "reserva-no-validada");

/* ---------- detalle de una clase ---------- */
function detalle(claseId) {
  const clase = G.clase(claseId);
  if (!clase) return;
  const body = document.getElementById("drawer-body");
  body.textContent = "";
  const e = G.estado;
  const res = reservasDe(clase.id, e.reservas);
  const libres = plazasLibres(clase, e.reservas);

  const volver = el("button", "btn btn-ghost btn-block", t("act.back"));
  volver.onclick = () => BUILDERS.agenda(body);
  body.appendChild(volver);

  const cab = el("div", "gym-cabecera");
  cab.append(elT("div", "gym-cabecera-n", clase.nombre), el("span", "gym-pill", `${clase.hora} · ${clase.minutos} min`));
  cab.appendChild(elT("div", "gym-porque",
    [clase.dia === dia() ? t("gym.hoy") : clase.dia, clase.entrenador || t("gym.sinEntrenador")].join(" · ")));
  body.appendChild(cab);

  const aforo = el("div", "gym-panel");
  const fila = el("div", "gym-fila");
  fila.append(elT("span", "gym-fila-k", t("gym.aforo")), elT("span", "gym-fila-v", `${res.length}/${clase.aforo}`));
  aforo.appendChild(fila);
  const barra = el("div", "gym-barra");
  const fill = el("i");
  fill.style.width = `${Math.min(100, Math.round((res.length / Math.max(1, clase.aforo)) * 100))}%`;
  barra.appendChild(fill);
  aforo.appendChild(barra);
  if (libres === 0) aforo.appendChild(elT("div", "gym-porque alerta", t("gym.completa")));
  body.appendChild(aforo);

  body.appendChild(elT("div", "sec-label", t("gym.apuntados")));
  if (!res.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.sinReservas"))));
  } else {
    for (const r of res) {
      const s = G.socio(r.socioId);
      if (!s) continue;
      const p = el("div", "gym-panel gym-persona");
      const f = el("div", "gym-fila");
      f.append(elT("span", "gym-fila-k", s.nombre), G.dentro(s.id) ? el("span", "gym-pill ok", t("gym.dentro")) : el("span", "gym-pill quiet", t("gym.pendiente")));
      p.appendChild(f);
      const b = el("button", "btn btn-mini", t("gym.cancelarReserva"));
      b.onclick = () => {
        const r2 = G.cancelarReserva(r.id);
        if (!r2.ok) return toast(t("state.error"), tE(r2.error), "danger");
        toast(t("gym.reservaCancelada"), s.nombre);
        detalle(clase.id);
      };
      p.appendChild(b);
      body.appendChild(p);
    }
  }

  body.appendChild(elT("div", "sec-label", t("gym.apuntar")));
  const form = el("div", "gym-panel");
  const sel = el("select");
  sel.setAttribute("aria-label", t("gym.apuntar"));
  const candidatos = G.estado.socios.filter((s) => s.estado === "activo");
  if (!candidatos.length) {
    form.appendChild(elT("div", "gym-porque", t("gym.sinSocios")));
  } else {
    sel.innerHTML = candidatos.map((s) => `<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join("");
    form.appendChild(sel);
    const apuntar = el("button", "btn btn-primary btn-block", t("gym.apuntar"));
    apuntar.onclick = () => {
      const v = puedeReservar(clase, G.socio(sel.value), e);
      if (!v.ok) {
        // aquí se explica el porqué, no un «error»
        return toast(t("gym.noSePuede"), motivo(v.motivo), "danger");
      }
      const r = G.reservar(clase.id, sel.value);
      if (!r.ok) return toast(t("state.error"), motivo(r.error), "danger");
      toast(t("gym.apuntado"), G.socio(sel.value).nombre);
      detalle(clase.id);
    };
    form.appendChild(apuntar);
  }
  body.appendChild(form);
}

UI.actions.verClase = detalle;

/* ---------- listado ---------- */
BUILDERS.agenda = (body) => {
  body = body || document.getElementById("drawer-body");
  body.textContent = "";
  const hoy = dia();
  const e = G.estado;

  const acciones = el("div", "gym-acciones");
  const nueva = el("button", "btn btn-primary", t("gym.nuevaClase"));
  nueva.onclick = () => crearClase();
  acciones.appendChild(nueva);
  body.appendChild(acciones);

  const proximos = [];
  for (let i = 0; i < 7; i++) proximos.push(sumarDias(hoy, i));

  for (const d of proximos) {
    const clases = e.clases.filter((c) => c.dia === d).sort((a, b) => a.hora.localeCompare(b.hora));
    body.appendChild(elT("div", "sec-label", d === hoy ? t("gym.hoy") : new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { weekday: "long", day: "numeric" })));
    if (!clases.length) {
      body.appendChild(el("div", "gym-panel", `<div class="sub">${esc(t("gym.sinClasesDia"))}</div>`));
      continue;
    }
    for (const c of clases) {
      const res = reservasDe(c.id, e.reservas);
      const libres = plazasLibres(c, e.reservas);
      const p = el("div", "gym-panel gym-clase");
      const fila = el("div", "gym-fila");
      fila.append(
        elT("span", "gym-fila-k", `${c.hora} · ${c.nombre}`),
        elT("span", "gym-fila-v", `${res.length}/${c.aforo}`),
      );
      p.appendChild(fila);
      const bar = el("div", "gym-barra");
      const fill = el("i");
      fill.style.width = `${Math.min(100, Math.round((res.length / Math.max(1, c.aforo)) * 100))}%`;
      bar.appendChild(fill);
      p.appendChild(bar);
      p.appendChild(elT("div", "gym-porque",
        [c.entrenador || t("gym.sinEntrenador"), libres === 0 ? t("gym.completa") : t("gym.libres", { n: libres })].join(" · ")));
      const b = el("button", "btn btn-mini", t("gym.gestionar"));
      b.onclick = () => detalle(c.id);
      p.appendChild(b);
      body.appendChild(p);
    }
  }

  if (!e.clases.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.sinClasesDia"))));
  }
};

export { detalle as detalleClase, seSolapan };
