// ============================================================
// BAYONA · UI/ACCESO — la puerta
// ------------------------------------------------------------
// La pantalla que mira quien abre el gimnasio a las 7 de la mañana:
// se teclea el código (o se elige al socio si el lector no está), y
// la app dice SÍ o NO, con el motivo. El bloqueo por impago es
// explícito y se puede levantar con la deferencia que sea.
import { G } from "../gym/store.js";
import { codigoAcceso, validarAcceso, avisosPendientes } from "../gym/acceso.js";
import { dia } from "../gym/model.js";
import { BUILDERS, $, el, elT, showModal, hideModal, toast, openSection } from "./shared.js";
import { esc, t, tE, tR } from "../i18n.js";

const SECRET = "bayona";
const motivo = (codigo) => tR(codigo);

/** Etiqueta de cada tipo de aviso. Se escriben una a una, a propósito:
 *  una clave construida con «+» no la encuentra el revisor de i18n. */
const TIPO_AVISO = {
  impago: "gym.aviso.impago",
  inactivo: "gym.aviso.inactivo",
  "plan-proximo": "gym.aviso.plan-proximo",
  "vence-hoy": "gym.aviso.vence-hoy",
};
const etiquetaAviso = (tipo) => t(TIPO_AVISO[tipo] || "gym.informe");

/* ---------- una validación ---------- */
function pasarValidacion(resultado) {
  const box = el("div", "gym-decision");
  const ok = resultado.ok;
  box.classList.add(ok ? "ok" : "no");
  box.appendChild(elT("div", "gym-decision-v", ok ? t("gym.puerta.pasa") : t("gym.puerta.noPasa")));
  if (resultado.socio) {
    box.appendChild(elT("div", "gym-decision-n", resultado.socio.nombre));
    const plan = G.planDe(resultado.socio.id);
    box.appendChild(elT("div", "gym-porque", plan ? plan.nombre : t("gym.sinPlan")));
  }
  if (resultado.motivo) {
    box.appendChild(elT("div", "gym-porque", motivo(resultado.motivo)));
  }
  if (resultado.detalle) box.appendChild(elT("div", "gym-porque alerta", resultado.detalle));
  return box;
}

function validar(codigo, ignorarImpago = false) {
  const r = validarAcceso(codigo, G.estado, { hoy: dia(), ignorarImpago, secreto: SECRET });
  if (r.ok) {
    // se ficha de verdad: si el guardado falla, la puerta NO dice «pasa»
    const acc = G.registrarAcceso(r.socio.id, "entrada");
    if (acc.ok) return r;
    return {
      ok: false,
      socio: r.socio,
      motivo: acc.error === "ya-esta-dentro" ? "ya-dentro" : null,
      detalle: acc.error === "ya-esta-dentro" ? null : tE(acc.error),
    };
  }
  return r;
}

/* ---------- modal de la puerta ---------- */
export function modalPuerta() {
  showModal(`
    <div class="cine-tag">${esc(t("gym.puerta.titulo"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(t("gym.puerta.sub"))}</div>
    <div class="sub">${esc(t("gym.puerta.nota"))}</div>
    <div class="gym-form">
      <label><span>${esc(t("gym.puerta.codigo"))}</span>
        <input id="pu-c" type="text" inputmode="text" autocapitalize="characters" maxlength="9" placeholder="ABCD-1234" /></label>
    </div>
    <div id="pu-dec"></div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="pu-ok">${esc(t("gym.puerta.validar"))}</button>
      <button class="btn" id="pu-x">${esc(t("act.close"))}</button>
    </div>`, () => {
    const dec = $("#pu-dec");
    const entrada = $("#pu-c");
    entrada.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("#pu-ok").click(); } };
    $("#pu-x").onclick = hideModal;
    $("#pu-ok").onclick = () => {
      const r = validar(entrada.value);
      dec.textContent = "";
      dec.appendChild(pasarValidacion(r));
      entrada.value = "";
      entrada.focus();
    };
    entrada.focus();
  });
}

/* ============================================================
   LA PANTALLA DE ACCESO
   ============================================================ */
BUILDERS.acceso = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  const hoy = dia();
  const dentro = G.estado.socios.filter((s) => G.dentro(s.id));

  const acciones = el("div", "gym-acciones");
  const bPuerta = el("button", "btn btn-primary", t("gym.puerta.abrir"));
  bPuerta.onclick = modalPuerta;
  acciones.appendChild(bPuerta);
  body.appendChild(acciones);

  body.appendChild(elT("div", "sec-label", t("gym.puerta.dentroAhora")));
  if (!dentro.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.nadieDentro"))));
  } else {
    const panel = el("div", "gym-panel");
    for (const s of dentro) {
      const f = el("div", "gym-fila");
      f.append(elT("span", "gym-fila-k", s.nombre), elT("span", "gym-fila-v", codigoAcceso(s.id, SECRET) || "—"));
      panel.appendChild(f);
    }
    body.appendChild(panel);
  }

  // ---- búsqueda por código o nombre ----
  body.appendChild(elT("div", "sec-label", t("gym.puerta.buscar")));
  const barra = el("div", "gym-buscador");
  const inp = el("input");
  inp.type = "search";
  inp.placeholder = t("gym.puerta.buscarPlaceholder");
  inp.setAttribute("aria-label", t("gym.puerta.buscarPlaceholder"));
  const listaBox = el("div", "gym-panel");
  listaBox.hidden = true;

  const buscar = () => {
    const q = inp.value.trim().toUpperCase();
    listaBox.textContent = "";
    if (!q) { listaBox.hidden = true; return; }
    const porNombre = G.estado.socios.filter((s) => s.nombre.toUpperCase().includes(q));
    const porCodigo = validarAcceso(q, G.estado, { hoy, secreto: SECRET });
    const ids = new Set([...porNombre.map((s) => s.id), ...(porCodigo.socio ? [porCodigo.socio.id] : [])]);
    if (!ids.size) { listaBox.hidden = false; listaBox.appendChild(elT("div", "gym-porque", t("gym.puerta.sinCoincidencia"))); return; }
    listaBox.hidden = false;
    for (const s of G.estado.socios.filter((x) => ids.has(x.id))) {
      const f = el("div", "gym-fila");
      f.append(elT("span", "gym-fila-k", s.nombre), elT("span", "gym-fila-v", codigoAcceso(s.id, SECRET) || "—"));
      const b = el("button", "btn btn-mini", G.dentro(s.id) ? t("gym.marcarSalida") : t("gym.puerta.pasar"));
      b.onclick = () => {
        if (G.dentro(s.id)) {
          const r = G.registrarAcceso(s.id, "salida");
          if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
          toast(t("gym.salidaRegistrada"), s.nombre);
        } else {
          const r = validar(codigoAcceso(s.id, SECRET));
          if (!r.ok) {
            return showModal(`
              <div class="cine-tag">${esc(t("gym.puerta.noPasa"))}</div>
              <div class="cine-title" style="font-size:18px">${esc(s.nombre)}</div>
              <div class="sub">${esc(motivo(r.motivo))}${r.detalle ? " · " + esc(r.detalle) : ""}</div>
              <div class="gym-acciones">
                ${r.motivo === "impagado" ? `<button class="btn btn-primary" id="pu-deuda">${esc(t("gym.puerta.verDeuda"))}</button>` : ""}
                ${r.motivo === "impagado" ? `<button class="btn" id="pu-pasa">${esc(t("gym.puerta.deferir"))}</button>` : ""}
                <button class="btn" id="pu-no">${esc(t("act.cancel"))}</button>
              </div>`, () => {
              $("#pu-no").onclick = hideModal;
              $("#pu-deuda")?.addEventListener("click", () => { hideModal(); openSection("cuotas"); });
              $("#pu-pasa")?.addEventListener("click", () => {
                const rr = validar(codigoAcceso(s.id, SECRET), true);
                hideModal();
                toast(rr.ok ? t("gym.puerta.pasa") : t("gym.puerta.noPasa"), rr.ok ? s.nombre : motivo(rr.motivo));
                BODY_REFRESH();
              });
            });
          }
        }
        BODY_REFRESH();
      };
      f.appendChild(b);
      listaBox.appendChild(f);
    }
  };
  inp.oninput = () => { clearTimeout(barra._t); barra._t = setTimeout(buscar, 160); };
  barra.append(inp, listaBox);
  body.appendChild(barra);

  // ---- avisos ----
  const avisos = avisosPendientes(G.estado, hoy);
  body.appendChild(elT("div", "sec-label", t("gym.avisos")));
  if (!avisos.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.sinAvisos"))));
  } else {
    for (const a of avisos) {
      const s = G.socio(a.socioId);
      const p = el("div", "gym-panel");
      const f = el("div", "gym-fila");
      f.append(elT("span", "gym-fila-k", s ? s.nombre : "—"), el("span", "gym-pill", etiquetaAviso(a.tipo)));
      p.appendChild(f);
      p.appendChild(elT("div", "gym-porque", a.motivo));
      p.appendChild(elT("div", "gym-texto-aviso", a.texto));
      const b = el("button", "btn btn-mini", t("gym.copiar"));
      b.onclick = async () => {
        try {
          await navigator.clipboard.writeText(a.texto);
          toast(t("gym.copiado"), "");
        } catch {
          // sin permiso de portapapeles: se le da el texto para copiar a mano
          showModal(`<div class="cine-tag">${esc(t("gym.avisos"))}</div><div class="cine-title" style="font-size:18px">${esc(s ? s.nombre : "")}</div><div class="gym-texto-aviso" style="font-size:14px">${esc(a.texto)}</div>`, () => { $("#modal-box button")?.addEventListener("click", hideModal); });
        }
      };
      p.appendChild(b);
      body.appendChild(p);
    }
  }
  body.appendChild(el("div", "gym-panel", `<div class="gym-porque">${esc(t("gym.avisosNota"))}</div>`));
};

const BODY_REFRESH = () => {
  const b = document.getElementById("drawer-body");
  if (b) BUILDERS.acceso(b);
};

export { validar, codigoAcceso, SECRET };
