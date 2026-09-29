// ============================================================
// BAYONA · UI/PORTAL — lo que ve el socio
// ------------------------------------------------------------
// La otra mitad de un software de gimnasio: no solo la pantalla del
// entrenador, sino la del SOCIO en su móvil. Esta vista es
// exactamente eso: su plan, su deuda (con su aviso), sus reservas
// (reservar y cancelar), su historial de visitas, lo que le ha
// dicho su entrenador y su programa de entrenamiento.
//
// Se elige un socio para ver SU portal. Sin socios de prueba: si no
// hay socios reales, se dice.
import { G } from "../gym/store.js";
import { dia, plazasLibres, puedeReservar, reservasDe } from "../gym/model.js";
import { WORKOUTS } from "../data.js";
import { BUILDERS, $, el, elT, showModal, hideModal, toast, openSection } from "./shared.js";
import { esc, t, tE } from "../i18n.js";
import { codigoAcceso } from "../gym/acceso.js";

let socioVisto = null;

const elSocio = () => socioVisto && G.socio(socioVisto);

/* ---------- cabecera: a quién se está mirando ---------- */
function selector(body) {
  const box = el("div", "gym-panel");
  const sel = el("select");
  sel.setAttribute("aria-label", t("gym.portal.quien"));
  sel.innerHTML = `<option value="">${esc(t("gym.portal.elige"))}</option>` +
    G.estado.socios.map((s) => `<option value="${esc(s.id)}" ${socioVisto === s.id ? "selected" : ""}>${esc(s.nombre)}</option>`).join("");
  sel.onchange = () => { socioVisto = sel.value || null; render(body); };
  box.appendChild(sel);
  body.appendChild(box);
}

function render(body) {
  body.textContent = "";
  const hoy = dia();
  selector(body);

  const s = elSocio();
  if (!s) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.portal.sinSocios"))));
    return;
  }

  const plan = G.planDe(s.id);
  const deuda = G.deudaDe(s.id, hoy);

  const cab = el("div", "gym-cabecera");
  cab.append(elT("div", "gym-cabecera-n", s.nombre), el("span", "gym-pill", t("gym.portal.miPortal")));
  cab.appendChild(elT("div", "gym-porque", s.objetivo || t("gym.sinDatos")));
  body.appendChild(cab);

  // ---- aviso de pago (lo primero que ve si debe algo) ----
  if (deuda.vencida) {
    const av = el("div", "gym-panel gym-alerta");
    av.appendChild(elT("div", "gym-fila-k", t("gym.portal.deudas")));
    av.appendChild(elT("div", "gym-porque alerta", t("gym.debe", { n: deuda.importe.toFixed(2).replace(".", ",") })));
    body.appendChild(av);
  }

  // ---- su membresía ----
  body.appendChild(elT("div", "sec-label", t("gym.portal.membresia")));
  const mem = el("div", "gym-panel");
  const f1 = el("div", "gym-fila");
  f1.append(elT("span", "gym-fila-k", t("gym.plan")), elT("span", "gym-fila-v", plan ? `${plan.nombre} · ${G.periodoDe(plan)}` : t("gym.sinPlan")));
  mem.appendChild(f1);
  const f2 = el("div", "gym-fila");
  f2.append(elT("span", "gym-fila-k", t("gym.portal.codigo")), elT("span", "gym-fila-v mono", codigoAcceso(s.id, "bayona") || "—"));
  mem.appendChild(f2);
  const f3 = el("div", "gym-fila");
  f3.append(elT("span", "gym-fila-k", t("gym.portal.cuenta")), elT("span", "gym-fila-v", deuda.aFavor > 0 ? t("gym.saldoFavor") : t("gym.alDia")));
  mem.appendChild(f3);
  body.appendChild(mem);

  // ---- su programa de entrenamiento ----
  body.appendChild(elT("div", "sec-label", t("gym.portal.programa")));
  const prog = el("div", "gym-panel");
  const actual = G.programa(s.id);
  const w = WORKOUTS[actual];
  prog.appendChild(elT("div", "gym-fila-k", w ? w.name : t("gym.portal.sinPrograma")));
  if (w) prog.appendChild(elT("div", "gym-porque", `${w.min} min · ${w.exercises.length} ejercicios · ${w.tag || ""}`));
  const cambiar = el("button", "btn btn-mini", t("gym.portal.elegirPrograma"));
  cambiar.onclick = () => modalPrograma(s.id, () => render(body));
  prog.appendChild(cambiar);
  body.appendChild(prog);

  // ---- sus reservas ----
  body.appendChild(elT("div", "sec-label", t("gym.portal.misClases")));
  const suyas = G.estado.reservas.filter((r) => r.socioId === s.id && r.estado !== "cancelada");
  if (!suyas.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.portal.sinReservas"))));
  } else {
    for (const r of suyas) {
      const c = G.clase(r.claseId);
      if (!c) continue;
      const p = el("div", "gym-panel");
      const f = el("div", "gym-fila");
      f.append(
        elT("span", "gym-fila-k", `${c.dia === hoy ? t("gym.hoy") : c.dia} · ${c.hora} · ${c.nombre}`),
        elT("span", "gym-fila-v", `${reservasDe(c.id, G.estado.reservas).length}/${c.aforo}`),
      );
      p.appendChild(f);
      const b = el("button", "btn btn-mini", t("gym.cancelarReserva"));
      b.onclick = () => {
        const r2 = G.cancelarReserva(r.id);
        if (!r2.ok) return toast(t("state.error"), tE(r2.error), "danger");
        toast(t("gym.reservaCancelada"), c.nombre);
        render(body);
      };
      p.appendChild(b);
      body.appendChild(p);
    }
  }

  // ---- apuntarse ----
  const apuntar = el("button", "btn btn-primary btn-block", t("gym.portal.apuntarse"));
  apuntar.onclick = () => modalReservar(s.id, () => render(body));
  body.appendChild(apuntar);

  // ---- su historial ----
  body.appendChild(elT("div", "sec-label", t("gym.portal.historial")));
  const hist = el("div", "gym-panel");
  const ultimos = G.estado.accesos.filter((a) => a.socioId === s.id).slice(-8).reverse();
  if (!ultimos.length) hist.appendChild(elT("div", "gym-porque", t("state.notLogged")));
  for (const a of ultimos) {
    const f = el("div", "gym-fila");
    f.append(
      elT("span", "gym-fila-k", a.entrada.slice(0, 10)),
      elT("span", "gym-fila-v", a.salida ? `${a.entrada.slice(11, 16)} → ${a.salida.slice(11, 16)}` : t("gym.portal.dentro")),
    );
    hist.appendChild(f);
  }
  body.appendChild(hist);

  // ---- lo que le ha dicho su entrenador ----
  const notas = G.notas(s.id);
  body.appendChild(elT("div", "sec-label", t("gym.portal.mensajes")));
  const cajaNotas = el("div", "gym-panel");
  if (!notas.length) cajaNotas.appendChild(elT("div", "gym-porque", t("gym.sinNotas")));
  for (const n of notas.slice(0, 10)) {
    cajaNotas.appendChild(elT("div", "gym-texto-aviso", n.texto));
    cajaNotas.appendChild(elT("div", "gym-porque", n.de.slice(0, 10)));
  }
  body.appendChild(cajaNotas);
}

BUILDERS.portal = (body) => render(body || $("#drawer-body"));

/* ---------- modales ---------- */
function modalPrograma(socioId, alTerminar) {
  const claves = Object.keys(WORKOUTS);
  showModal(`
    <div class="cine-tag">${esc(t("gym.portal.programa"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(t("gym.portal.elegirPrograma"))}</div>
    <div class="gym-form">
      <label><span>${esc(t("gym.portal.programa"))}</span>
        <select id="pp-p"><option value="">${esc(t("gym.portal.sinPrograma"))}</option>
        ${claves.map((k) => `<option value="${k}" ${G.programa(socioId) === k ? "selected" : ""}>${esc(WORKOUTS[k].name)}</option>`).join("")}
        </select></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="pp-ok">${esc(t("gym.guardar"))}</button>
      <button class="btn" id="pp-x">${esc(t("act.cancel"))}</button>
    </div>`, () => {
    $("#pp-x").onclick = hideModal;
    $("#pp-ok").onclick = () => {
      const v = $("#pp-p").value;
      const r = G.asignarPrograma(socioId, v || null);
      if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
      hideModal();
      toast(t("gym.portal.programa"), WORKOUTS[v]?.name || "");
      alTerminar && alTerminar();
    };
  });
}

function modalReservar(socioId, alTerminar) {
  const s = G.socio(socioId);
  const hoy = dia();
  const proximas = G.estado.clases
    .filter((c) => c.dia >= hoy && !c.cancelada)
    .sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
  if (!proximas.length) {
    return showModal(`
      <div class="cine-tag">${esc(t("gym.portal.misClases"))}</div>
      <div class="cine-title" style="font-size:18px">${esc(t("gym.portal.sinClasesProximas"))}</div>
      <div class="gym-acciones"><button class="btn" id="pr-x">${esc(t("act.close"))}</button></div>`,
      () => { $("#pr-x").onclick = hideModal; });
  }
  showModal(`
    <div class="cine-tag">${esc(t("gym.portal.apuntarse"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(s?.nombre || "")}</div>
    <div class="gym-form">
      <label><span>${esc(t("gym.portal.clase"))}</span>
        <select id="pr-c">${proximas.map((c) => {
          const libres = plazasLibres(c, G.estado.reservas);
          return `<option value="${esc(c.id)}">${esc(c.dia)} ${esc(c.hora)} · ${esc(c.nombre)} (${libres} libres)</option>`;
        }).join("")}</select></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="pr-ok">${esc(t("gym.portal.reservar"))}</button>
      <button class="btn" id="pr-x">${esc(t("act.cancel"))}</button>
    </div>`, () => {
    $("#pr-x").onclick = hideModal;
    $("#pr-ok").onclick = () => {
      const c = G.clase($("#pr-c").value);
      const v = puedeReservar(c, s, G.estado, hoy);
      if (!v.ok) return toast(t("gym.noSePuede"), tE(v.motivo), "danger");
      const r = G.reservar(c.id, socioId);
      if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
      hideModal();
      toast(t("gym.apuntado"), c.nombre);
      alTerminar && alTerminar();
    };
  });
}

export const abrirPortalSocio = (id) => { socioVisto = id; openSection("portal"); };
