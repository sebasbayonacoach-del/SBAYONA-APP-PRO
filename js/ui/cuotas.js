// ============================================================
// BAYONA · UI/CUOTAS — planes, cuotas y deuda
// ------------------------------------------------------------
// La pantalla que evita la llamada de «me debes el mes»:
// quién debe, cuánto y desde cuándo. El dinero entra por cobros
// REGISTRADOS; sin pasarela conectada se registra a mano y la app
// lo dice. Nunca se finge un cobro automático.
import { G } from "../gym/store.js";
import { dia, deudaDe, PERIODO_LABEL } from "../gym/model.js";
import { BUILDERS, $, el, elT, openSection, showModal, hideModal, toast } from "./shared.js";
import { esc, fmtInt, t, tE } from "../i18n.js";
import { cobrarDesde, planDesde } from "./centro.js";
import { esLinkPago, nombrePasarela } from "../gym/pagos.js";

const eur = (n) => `${fmtInt(Math.round((n + Number.EPSILON) * 100) / 100)} €`;

function modalPlanNuevo(alTerminar) {
  showModal(`
    <div class="cine-tag">PLANES</div>
    <div class="cine-title" style="font-size:18px">Nuevo plan</div>
    <div class="gym-form">
      <label><span>NOMBRE</span><input id="pn-n" type="text" maxlength="60" placeholder="Mensual, Trimestral, Anual…" /></label>
      <label><span>PRECIO (€)</span><input id="pn-p" type="number" min="0" step="0.01" value="49" /></label>
      <label><span>PERIODICIDAD</span><select id="pn-t">${Object.keys(PERIODO_LABEL).map((k) => `<option value="${k}">${PERIODO_LABEL[k]}</option>`).join("")}</select></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="pn-ok">CREAR</button>
      <button class="btn" id="pn-x">CANCELAR</button>
    </div>`, () => {
    $("#pn-x").onclick = hideModal;
    $("#pn-ok").onclick = () => {
      const r = G.altaPlan({ nombre: $("#pn-n").value.trim(), precio: $("#pn-p").value, periodo: $("#pn-t").value });
      if (!r.ok) return toast(t("state.error"), r.error, "danger");
      hideModal();
      toast(t("gym.planCreado"), r.plan.nombre);
      alTerminar && alTerminar();
    };
  });
}

/* ---------- enlace de cobro de un plan ---------- */
function modalEnlace(planId, alTerminar) {
  const plan = G.plan(planId);
  const v = plan.linkPago ? esLinkPago(plan.linkPago) : { ok: false };
  showModal(`
    <div class="cine-tag">${esc(t("gym.link"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(t("gym.link.titulo"))}</div>
    <div class="sub">${esc(t("gym.link.sub"))}</div>
    <div class="gym-form">
      <label><span>${esc(t("gym.link.url"))}</span>
        <input id="pl-u" type="url" inputmode="url" maxlength="2000" placeholder="https://…" value="${plan.linkPago ? esc(plan.linkPago) : ""}" /></label>
    </div>
    <div class="gym-panel"><div class="gym-porque">${esc(t("gym.link.nota"))}</div></div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="pl-ok">${esc(t("gym.link.guardar"))}</button>
      ${plan.linkPago ? `<button class="btn" id="pl-q">${esc(t("gym.link.quitar"))}</button>` : ""}
      <button class="btn" id="pl-x">${esc(t("act.cancel"))}</button>
    </div>`, () => {
    $("#pl-x").onclick = hideModal;
    $("#pl-q")?.addEventListener("click", () => {
      G.enlazarPago(planId, null);
      hideModal();
      toast(t("gym.link.quitado"), "");
      alTerminar && alTerminar();
    });
    $("#pl-ok").onclick = () => {
      const r = G.enlazarPago(planId, $("#pl-u").value);
      if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
      hideModal();
      toast(t("gym.link.guardado"), r.pasarela || "");
      alTerminar && alTerminar();
    };
  });
}

BUILDERS.cuotas = (body) => {
  body.textContent = "";
  const hoy = dia();
  const e = G.estado;

  const filas = e.socios
    .filter((s) => s.estado !== "baja")
    .map((s) => ({ s, plan: G.planDe(s.id), d: G.deudaDe(s.id, hoy) }))
    .sort((a, b) => b.d.importe - a.d.importe);
  const deben = filas.filter((f) => f.d.vencida);
  const total = deben.reduce((a, f) => a + f.d.importe, 0);

  const cabecera = el("div", "gym-kpis");
  const k1 = el("div", "gym-stat");
  k1.append(elT("div", "gym-stat-v", eur(total)), elT("div", "gym-stat-k", t("gym.deudaTotal")));
  const k2 = el("div", "gym-stat");
  k2.append(elT("div", "gym-stat-v", String(deben.length)), elT("div", "gym-stat-k", t("gym.enMora")));
  const k3 = el("div", "gym-stat");
  k3.append(elT("div", "gym-stat-v", eur(e.pagos.filter((p) => String(p.fecha).slice(0, 7) === hoy.slice(0, 7)).reduce((a, p) => a + p.importe, 0))),
    elT("div", "gym-stat-k", t("gym.ingresosMes")));
  cabecera.append(k1, k2, k3);
  body.appendChild(cabecera);

  body.appendChild(elT("div", "sec-label", t("gym.planes")));
  const planes = Object.values(e.planes);
  const cajaPlanes = el("div", "gym-panel");
  if (!planes.length) {
    cajaPlanes.appendChild(elT("div", "gym-porque", t("gym.sinPlanes")));
  } else {
    for (const p of planes) {
      const fila = el("div", "gym-fila");
      fila.append(
        elT("span", "gym-fila-k", p.nombre),
        elT("span", "gym-fila-v", `${eur(p.precio)} / ${G.periodoDe(p)}`),
      );
      cajaPlanes.appendChild(fila);
      const conLink = esLinkPago(p.linkPago).ok;
      const linea = elT("div", "gym-porque", conLink
        ? t("gym.link.activo", { pasarela: nombrePasarela(p.linkPago) })
        : t("gym.link.inactivo"));
      cajaPlanes.appendChild(linea);
      const b = el("button", "btn btn-mini", conLink ? t("gym.link.cambiar") : t("gym.link.enlazar"));
      b.onclick = () => modalEnlace(p.id, () => BUILDERS.cuotas(document.getElementById("drawer-body")));
      cajaPlanes.appendChild(b);
    }
  }
  const nuevoPlan = el("button", "btn btn-block", t("gym.nuevoPlan"));
  nuevoPlan.onclick = () => modalPlanNuevo(() => BUILDERS.cuotas(document.getElementById("drawer-body")));
  cajaPlanes.appendChild(nuevoPlan);
  body.appendChild(cajaPlanes);

  body.appendChild(elT("div", "sec-label", t("gym.cuotasSocios")));
  if (!filas.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.sinSocios"))));
    return;
  }
  for (const { s, plan, d } of filas) {
    const p = el("div", "gym-panel");
    const fila = el("div", "gym-fila");
    fila.append(
      elT("span", "gym-fila-k", s.nombre),
      elT("span", `gym-fila-v ${d.vencida ? "alerta" : ""}`, d.vencida ? eur(d.importe) : t("gym.alDia")),
    );
    p.appendChild(fila);
    // La cifra grande es la DEUDA (todo lo que debe, cuota en curso
    // incluida). El detalle separa lo ya exigible de lo que aún no:
    // son dos números distintos y confundirlos es engañar. Si no debe
    // nada, no se fala de cuotas vencidas: está al día y se dice.
    let detalle = plan ? plan.nombre : t("gym.sinPlan");
    if (d.vencida) {
      detalle += ` · ${d.cuotas} ${t("gym.cuotasVencidas")} ${d.periodos} ${t("gym.informe.de")}`;
      if (d.vencido < d.importe) detalle += ` · ${t("gym.exigible")} ${eur(d.vencido)}`;
    }
    p.appendChild(elT("div", "gym-porque", detalle));
    const acciones = el("div", "gym-fila");
    if (plan) {
      const cobrar = el("button", "btn btn-mini", G.puedeCobrarEnLinea(s.id) ? t("gym.cobro.registrar") : t("gym.registrarCobro"));
      cobrar.onclick = () => cobrarDesde(s.id, () => BUILDERS.cuotas(document.getElementById("drawer-body")));
      acciones.appendChild(cobrar);
    } else {
      const asignar = el("button", "btn btn-mini", t("gym.asignarPlan"));
      asignar.onclick = () => planDesde(s.id, () => BUILDERS.cuotas(document.getElementById("drawer-body")));
      acciones.appendChild(asignar);
    }
    p.appendChild(acciones);
    body.appendChild(p);
  }

  const pie = el("div", "gym-panel");
  pie.appendChild(elT("div", "gym-porque", t("gym.pagosNota")));
  body.appendChild(pie);
};
