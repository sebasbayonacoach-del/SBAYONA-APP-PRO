// ============================================================
// BAYONA · UI/CENTRO — centro de mando del gimnasio
// ------------------------------------------------------------
// La pantalla que un dueño de gimnasio abre a las 8 de la mañana:
// cuánta gente hay dentro, quién no ha venido, quién debe,
// quién está a punto de darse de baja y por qué.
//
// TODO lo que se ve sale de datos reales registrados. Un KPI sin
// datos se dice «sin datos», nunca se rellena con una estimación.
import { G } from "../gym/store.js";
import { kpis, dia, haceCuanto, reservasDe, riesgoBaja } from "../gym/model.js";
import { BUILDERS, $, el, elT, openSection, showModal, hideModal, toast, UI } from "./shared.js";
import { esc, fmtInt, t, tE } from "../i18n.js";
import { abrirPortalSocio } from "./portal.js";
import { nombrePasarela } from "../gym/pagos.js";

/* ---------- piezas ---------- */
function stat(valor, etiqueta, nota) {
  const c = el("div", "gym-stat");
  c.append(elT("div", "gym-stat-v", valor), elT("div", "gym-stat-k", etiqueta));
  if (nota) c.append(elT("div", "gym-stat-n", nota));
  return c;
}
function fila(k, v) {
  const r = el("div", "gym-fila");
  r.append(elT("span", "gym-fila-k", k), elT("span", "gym-fila-v", v));
  return r;
}
const nivelPill = (nivel) => {
  const mapa = { alto: "danger", medio: "", bajo: "ok", "sin-datos": "quiet" };
  const txt = { alto: "RIESGO ALTO", medio: "VIGILAR", bajo: "ESTABLE", "sin-datos": "SIN DATOS", baja: "DADO DE BAJA" };
  return el("span", `gym-pill ${mapa[nivel] || ""}`, txt[nivel] || String(nivel).toUpperCase());
};

/* ============================================================
   1 · CENTRO DE MANDO
   ============================================================ */

/** El índice del centro: seis secciones, como en cualquier software
 *  de gestión. El raíl lateral se queda corto a propósito (seis
 *  destinos); el resto se entra desde aquí. */
const SECCIONES = [
  ["socios", "gym.socios", "gym.informe.subSocios"],
  ["cuotas", "gym.cuotasIndice", "gym.informe.subCuotas"],
  ["agenda", "gym.agendaIndice", "gym.informe.subAgenda"],
  ["acceso", "gym.puerta.titulo", "gym.informe.subAcceso"],
  ["portal", "gym.portal", "gym.informe.subPortal"],
  ["informes", "gym.informe", "gym.informe.subInformes"],
];

function indice(body) {
  const rutas = el("div", "gym-rutas");
  for (const [clave, titulo, sub] of SECCIONES) {
    const b = el("button", "gym-ruta", `<strong>${esc(t(titulo))}</strong><small>${esc(t(sub))}</small>`);
    b.onclick = () => openSection(clave);
    rutas.appendChild(b);
  }
  body.appendChild(rutas);
}

function mando(body) {
  body.textContent = "";
  const hoy = dia();
  const e = G.estado;
  const k = kpis(e, hoy);
  const dentro = e.socios.filter((s) => G.dentro(s.id));

  indice(body);

  body.appendChild(elT("div", "sec-label", t("gym.hoy")));
  const cabecera = el("div", "gym-kpis");
  cabecera.append(
    stat(fmtInt(k.activos), t("gym.activos"), `${fmtInt(k.socios)} en total`),
    stat(fmtInt(k.dentro), t("gym.dentro"), k.dentro ? null : t("gym.nadieDentro")),
    stat(`${k.ocupacion} %`, t("gym.ocupacion"), t("gym.ocupacionNota")),
    stat(`${fmtInt(k.ingresosMes)} €`, t("gym.ingresosMes"), t("gym.ingresosNota")),
  );
  body.appendChild(cabecera);

  if (k.enMora || k.deudaTotal > 0) {
    body.appendChild(elT("div", "sec-label", t("gym.cobros")));
    const d = el("div", "gym-panel");
    d.append(fila(t("gym.enMora"), String(k.enMora)));
    d.append(fila(t("gym.deudaTotal"), `${fmtInt(k.deudaTotal)} €`));
    d.appendChild(el("button", "btn btn-block", t("gym.verCuotas"))).onclick = () => openSection("cuotas");
    body.appendChild(d);
  }

  // ---- quién está en riesgo, con el POR QUÉ ----
  body.appendChild(elT("div", "sec-label", t("gym.riesgo")));
  const enRiesgo = e.socios
    .filter((s) => s.estado === "activo")
    .map((s) => ({ socio: s, r: riesgoBaja(s, e, hoy) }))
    .filter((x) => x.r.nivel === "alto" || x.r.nivel === "medio")
    .sort((a, b) => b.r.puntos - a.r.puntos);

  if (!enRiesgo.length) {
    body.appendChild(el("div", "gym-panel", `<div class="sub">${esc(t("gym.sinRiesgo"))}</div>`));
  } else {
    for (const { socio, r } of enRiesgo) {
      const p = el("div", "gym-panel gym-ficha-mini");
      const cab = el("div", "gym-fila");
      cab.append(elT("span", "gym-fila-k", socio.nombre), nivelPill(r.nivel));
      p.appendChild(cab);
      p.append(elT("div", "gym-porque", r.motivos.map((m) => m.texto).join(" · ")));
      const b = el("button", "btn btn-mini", t("gym.verFicha"));
      b.onclick = () => ficha(socio.id);
      p.appendChild(b);
      body.appendChild(p);
    }
  }

  // ---- clases de hoy ----
  const hoyClases = e.clases.filter((c) => c.dia === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  body.appendChild(elT("div", "sec-label", t("gym.agendaHoy")));
  if (!hoyClases.length) {
    body.appendChild(el("div", "gym-panel", `<div class="sub">${esc(t("gym.sinClasesHoy"))}</div>`));
  } else {
    for (const c of hoyClases) {
      const res = reservasDe(c.id, e.reservas).length;
      const p = el("div", "gym-panel gym-clase");
      const cab = el("div", "gym-fila");
      cab.append(elT("span", "gym-fila-k", `${c.hora} · ${c.nombre}`), elT("span", "gym-fila-v", `${res}/${c.aforo}`));
      p.appendChild(cab);
      const bar = el("div", "gym-barra");
      const fill = el("i");
      fill.style.width = `${Math.min(100, Math.round((res / Math.max(1, c.aforo)) * 100))}%`;
      bar.appendChild(fill);
      p.appendChild(bar);
      p.appendChild(elT("div", "gym-porque", c.entrenador || t("gym.sinEntrenador")));
      const b = el("button", "btn btn-mini", t("gym.gestionar"));
      b.onclick = () => { openSection("agenda"); UI.actions.verClase?.(c.id); };
      p.appendChild(b);
      body.appendChild(p);
    }
  }

  // ---- accesos ----
  const acciones = el("div", "gym-acciones");
  const bAcceso = el("button", "btn btn-primary", t("gym.acceso"));
  bAcceso.onclick = modalAcceso;
  acciones.appendChild(bAcceso);
  acciones.appendChild(Object.assign(el("button", "btn", t("gym.socios")), { onclick: () => openSection("socios") }));
  acciones.appendChild(Object.assign(el("button", "btn", t("gym.nuevaClase")), { onclick: modalClase }));
  acciones.appendChild(Object.assign(el("button", "btn", t("gym.puerta.abrir")), { onclick: () => openSection("acceso") }));
  acciones.appendChild(Object.assign(el("button", "btn", t("gym.informe")), { onclick: () => openSection("informes") }));
  body.appendChild(acciones);
  if (!e.socios.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.vacio"))));
  }
}

/* ============================================================
   2 · SOCIOS
   ============================================================ */
function listaSocios(body, filtro = "") {
  body.textContent = "";
  const hoy = dia();
  const busca = filtro.trim().toLowerCase();

  const barra = el("div", "gym-buscador");
  const inp = el("input");
  inp.type = "search";
  inp.placeholder = t("gym.buscar");
  inp.value = filtro;
  inp.setAttribute("aria-label", t("gym.buscar"));
  inp.oninput = () => {
    clearTimeout(barra._t);
    barra._t = setTimeout(() => listaSocios(body, inp.value), 160);
  };
  barra.appendChild(inp);
  const nuevo = el("button", "btn btn-primary", t("gym.altaSocio"));
  nuevo.onclick = () => modalSocio(null, body);
  barra.appendChild(nuevo);
  body.appendChild(barra);

  const socios = G.estado.socios
    .filter((s) => !busca || s.nombre.toLowerCase().includes(busca))
    .map((s) => ({ s, r: riesgoBaja(s, G.estado, hoy) }))
    .sort((a, b) => (b.r.puntos - a.r.puntos) || a.s.nombre.localeCompare(b.s.nombre));

  if (!socios.length) {
    body.appendChild(el("div", "gym-vacio", esc(busca ? t("gym.sinSociosBusqueda") : t("gym.sinSocios"))));
    return;
  }
  for (const { s, r } of socios) {
    const p = el("div", "gym-panel gym-persona");
    const cab = el("div", "gym-fila");
    cab.append(
      elT("span", "gym-fila-k", s.nombre),
      s.estado === "activo" ? nivelPill(r.nivel) : el("span", "gym-pill quiet", s.estado.toUpperCase()),
    );
    p.appendChild(cab);
    const plan = G.planDe(s.id);
    const deuda = G.deudaDe(s.id, hoy);
    p.appendChild(elT("div", "gym-porque",
      [plan ? plan.nombre : t("gym.sinPlan"), `${G.visitas(s.id, 30)} visitas/30 d`, deuda.vencida ? t("gym.debe", { n: deuda.vencido.toFixed(2).replace(".", ",") }) : null]
        .filter(Boolean).join(" · ")));
    const b = el("button", "btn btn-mini", t("gym.verFicha"));
    b.onclick = () => ficha(s.id);
    p.appendChild(b);
    body.appendChild(p);
  }
}

BUILDERS.socios = (body) => listaSocios(body);

/* ============================================================
   3 · FICHA DEL SOCIO
   ============================================================ */
function ficha(socioId) {
  const s = G.socio(socioId);
  if (!s) return toast(t("state.error"), t("gym.noSocio"), "danger");
  const body = openSection("socios");
  body.textContent = "";
  const hoy = dia();
  const r = riesgoBaja(s, G.estado, hoy);
  const plan = G.planDe(s.id);
  const deuda = G.deudaDe(s.id, hoy);
  const visitas = G.visitas(s.id, 30);
  const ultimoAcceso = [...G.estado.accesos].reverse().find((a) => a.socioId === s.id);

  const volver = el("button", "btn btn-ghost btn-block", t("act.back"));
  volver.onclick = () => listaSocios(body);
  body.appendChild(volver);

  const cab = el("div", "gym-cabecera");
  cab.append(elT("div", "gym-cabecera-n", s.nombre), nivelPill(r.nivel));
  cab.appendChild(elT("div", "gym-porque", [s.objetivo, s.email, s.telefono].filter(Boolean).join(" · ") || t("gym.sinDatos")));
  body.appendChild(cab);

  body.appendChild(elT("div", "sec-label", t("gym.actividad")));
  const act = el("div", "gym-panel");
  act.append(fila(t("gym.visitas30"), String(visitas)));
  act.append(fila(t("gym.ultimaVisita"), ultimoAcceso ? haceCuanto(ultimoAcceso.entrada.slice(0, 10), hoy) : t("state.notLogged")));
  act.append(fila(t("gym.estado"), s.estado.toUpperCase()));
  const bAcc = el("button", "btn btn-block", G.dentro(s.id) ? t("gym.marcarSalida") : t("gym.marcarEntrada"));
  bAcc.onclick = () => {
    const r2 = G.registrarAcceso(s.id, G.dentro(s.id) ? "salida" : "entrada");
    if (!r2.ok) return toast(t("state.error"), tE(r2.error), "danger");
    toast(t("gym.acceso"), G.dentro(s.id) ? t("gym.entradaRegistrada") : t("gym.salidaRegistrada"));
    ficha(s.id);
  };
  act.appendChild(bAcc);
  body.appendChild(act);

  body.appendChild(elT("div", "sec-label", t("gym.membresia")));
  const mem = el("div", "gym-panel");
  mem.append(fila(t("gym.plan"), plan ? `${plan.nombre} · ${plan.precio} € / ${G.periodoDe(plan)}` : t("gym.sinPlan")));
  if (plan) {
    mem.append(fila(t("gym.cuotasDebidas"), String(deuda.cuotas)));
    mem.append(fila(t("gym.deuda"), deuda.importe > 0 ? `${deuda.importe.toFixed(2).replace(".", ",")} €` : t("gym.alDia")));
    if (deuda.aFavor > 0) mem.append(fila(t("gym.saldoFavor"), `${deuda.aFavor.toFixed(2).replace(".", ",")} €`));
    const cobrar = el("button", "btn btn-primary btn-block", t("gym.registrarCobro"));
    cobrar.onclick = () => modalCobro(s.id, () => ficha(s.id));
    mem.appendChild(cobrar);
  } else {
    const b = el("button", "btn btn-block", t("gym.asignarPlan"));
    b.onclick = () => modalPlan(s.id, () => ficha(s.id));
    mem.appendChild(b);
  }
  body.appendChild(mem);

  if (r.motivos.length) {
    body.appendChild(elT("div", "sec-label", t("gym.porqueTitle")));
    const q = el("div", "gym-panel");
    for (const m of r.motivos) q.appendChild(elT("div", "gym-porque", `· ${m.texto}`));
    body.appendChild(q);
  }

  body.appendChild(elT("div", "sec-label", t("gym.notas")));
  const notas = el("div", "gym-panel");
  const form = el("div", "gym-nota-form");
  const inp = el("input");
  inp.type = "text";
  inp.placeholder = t("gym.notaPlaceholder");
  inp.maxLength = 500;
  inp.setAttribute("aria-label", t("gym.notaPlaceholder"));
  const enviar = el("button", "btn btn-primary", t("gym.guardar"));
  enviar.onclick = () => {
    const r2 = G.anotar(s.id, inp.value);
    if (!r2.ok) return toast(t("state.error"), tE(r2.error), "danger");
    inp.value = "";
    ficha(s.id);
  };
  form.append(inp, enviar);
  notas.appendChild(form);
  const lista = G.notas(s.id);
  if (!lista.length) notas.appendChild(elT("div", "gym-porque", t("gym.sinNotas")));
  for (const n of lista.slice(0, 20)) {
    notas.appendChild(elT("div", "gym-porque", `${n.texto} · ${haceCuanto(n.de.slice(0, 10), hoy)}`));
  }
  body.appendChild(notas);

  const acciones = el("div", "gym-acciones");
  acciones.appendChild(Object.assign(el("button", "btn", t("gym.portal.ver")), { onclick: () => abrirPortalSocio(s.id) }));
  if (s.estado === "activo") {
    const b = el("button", "btn btn-danger", t("gym.darDeBaja"));
    b.onclick = () => { G.darDeBaja(s.id); toast(t("gym.bajaHecha"), s.nombre); ficha(s.id); };
    acciones.appendChild(b);
  } else {
    const b = el("button", "btn", t("gym.reactivar"));
    b.onclick = () => { G.reactivar(s.id); toast(t("gym.reactivado"), s.nombre); ficha(s.id); };
    acciones.appendChild(b);
  }
  body.appendChild(acciones);
}

BUILDERS.centro = (body) => mando(body);

/* ============================================================
   4 · MODALES
   ============================================================ */
function modalSocio(socio, cerrar) {
  showModal(`
    <div class="cine-tag">${socio ? "EDITAR SOCIO" : "ALTA DE SOCIO"}</div>
    <div class="cine-title" style="font-size:18px">${socio ? esc(socio.nombre) : "Nuevo socio"}</div>
    <div class="sub">Solo datos que de verdad sabemos. Lo que no se rellena, queda vacío y se dice.</div>
    <div class="gym-form">
      <label><span>NOMBRE</span><input id="gs-n" type="text" maxlength="80" value="${socio ? esc(socio.nombre) : ""}" /></label>
      <label><span>TELÉFONO</span><input id="gs-t" type="tel" maxlength="30" value="${socio ? esc(socio.telefono || "") : ""}" /></label>
      <label><span>EMAIL</span><input id="gs-e" type="email" maxlength="120" value="${socio ? esc(socio.email || "") : ""}" /></label>
      <label><span>OBJETIVO</span><input id="gs-o" type="text" maxlength="80" value="${socio ? esc(socio.objetivo || "") : ""}" placeholder="Fuerza, pérdida de peso, salud…" /></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="gs-ok">GUARDAR</button>
      <button class="btn" id="gs-c">CANCELAR</button>
    </div>`, () => {
    const v = (id) => ($(`#${id}`)?.value || "").trim();
    $("#gs-c").onclick = hideModal;
    $("#gs-ok").onclick = () => {
      const datos = { nombre: v("gs-n"), telefono: v("gs-t"), email: v("gs-e"), objetivo: v("gs-o") };
      if (!datos.nombre) return toast(t("state.error"), t("gym.error.nombre-vacio"), "danger");
      const r = socio ? G.editarSocio(socio.id, datos) : G.altaSocio(datos);
      if (!r.ok) return toast(t("state.error"), r.error, "danger");
      hideModal();
      toast(socio ? t("gym.actualizado") : t("gym.altaHecha"), datos.nombre);
      socio ? ficha(socio.id) : listaSocios(cerrar || document.getElementById("drawer-body"));
    };
  });
}

function modalPlan(socioId, alTerminar) {
  const planes = Object.values(G.estado.planes);
  if (!planes.length) {
    return showModal(`
      <div class="cine-tag">MEMBRESÍA</div>
      <div class="cine-title" style="font-size:18px">Primero, un plan</div>
      <div class="sub">No hay ningún plan creado todavía. Crea uno (precio y periodicidad) y asígnaselo al socio.</div>
      <div class="gym-acciones"><button class="btn btn-primary" id="gp-c">ENTENDIDO</button></div>`, () => { $("#gp-c").onclick = hideModal; });
  }
  showModal(`
    <div class="cine-tag">MEMBRESÍA</div>
    <div class="cine-title" style="font-size:18px">Plan del socio</div>
    <div class="gym-form">
      <label><span>PLAN</span><select id="gp-p">${planes.map((p) => `<option value="${esc(p.id)}" ${G.estado.membresias[socioId] === p.id ? "selected" : ""}>${esc(p.nombre)} · ${p.precio} € / ${esc(p.periodo)}</option>`).join("")}</select></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="gp-ok">ASIGNAR</button>
      <button class="btn" id="gp-c">CANCELAR</button>
    </div>`, () => {
    $("#gp-c").onclick = hideModal;
    $("#gp-ok").onclick = () => {
      const r = G.asignarPlan(socioId, $("#gp-p").value);
      if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
      hideModal();
      toast(t("gym.planAsignado"), "");
      alTerminar && alTerminar();
    };
  });
}

function modalCobro(socioId, alTerminar) {
  const deuda = G.deudaDe(socioId);
  const plan = G.planDe(socioId);
  const enLinea = G.puedeCobrarEnLinea(socioId);
  const pasarela = plan ? nombrePasarela(plan.linkPago) : "";
  const nota = enLinea
    ? t("gym.cobro.notaEnLinea", { pasarela })
    : t("gym.cobro.notaManual");
  showModal(`
    <div class="cine-tag">${esc(t("gym.cobro"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(t("gym.cobro.registrar"))}</div>
    <div class="sub">${esc(nota)}</div>
    ${enLinea ? `<div class="gym-acciones"><button class="btn" id="gc-abrir">${esc(t("gym.cobro.abrir", { pasarela }))}</button></div>` : ""}
    <div class="gym-form">
      <label><span>${esc(t("gym.cobro.importe"))}</span><input id="gc-i" type="number" min="0.01" step="0.01" value="${deuda.importe || ""}" /></label>
      <label><span>${esc(t("gym.cobro.referencia"))}</span><input id="gc-r" type="text" maxlength="60" placeholder="${esc(t("gym.cobro.referenciaPh"))}" /></label>
      <label><span>${esc(t("gym.cobro.concepto"))}</span><input id="gc-c" type="text" maxlength="120" placeholder="${esc(t("gym.cobro.conceptoPh"))}" /></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="gc-ok">${esc(t("gym.registrarCobro"))}</button>
      <button class="btn" id="gc-x">${esc(t("act.cancel"))}</button>
    </div>`, () => {
    $("#gc-x").onclick = hideModal;
    $("#gc-abrir")?.addEventListener("click", () => {
      // Se abre la página de la PASARELA, no una de la app: el socio
      // paga en su banco. `noopener` para que la pestaña no nos
      // alcance con `window.opener`.
      window.open(plan.linkPago, "_blank", "noopener,noreferrer");
      toast(t("gym.cobro.abierto"), pasarela);
    });
    $("#gc-ok").onclick = () => {
      const ref = $("#gc-r").value;
      // La referencia es lo que la pasarela devuelve. Sin ella el
      // cobro queda como manual: no se inventa de dónde vino.
      const r = G.registrarPago({
        socioId, importe: $("#gc-i").value, concepto: $("#gc-c").value,
        pasarela: enLinea && ref.trim() ? pasarela : "manual",
        referencia: ref,
      });
      if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
      hideModal();
      toast(t("gym.cobroRegistrado"), r.pago.referencia ? `${r.pago.importe} € · ${r.pago.referencia}` : `${r.pago.importe} €`);
      alTerminar && alTerminar();
    };
  });
}

function modalClase() {
  showModal(`
    <div class="cine-tag">AGENDA</div>
    <div class="cine-title" style="font-size:18px">Nueva clase</div>
    <div class="gym-form">
      <label><span>NOMBRE</span><input id="gc-n" type="text" maxlength="60" placeholder="Tren superior, Mobility, Spinning…" /></label>
      <label><span>ENTRENADOR</span><input id="gc-e" type="text" maxlength="60" /></label>
      <label><span>DÍA</span><input id="gc-d" type="date" value="${dia()}" /></label>
      <label><span>HORA</span><input id="gc-h" type="time" value="19:00" /></label>
      <label><span>MINUTOS</span><input id="gc-m" type="number" min="10" max="180" step="5" value="60" /></label>
      <label><span>AFORO</span><input id="gc-a" type="number" min="1" max="200" step="1" value="12" /></label>
    </div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="gcl-ok">CREAR</button>
      <button class="btn" id="gcl-x">CANCELAR</button>
    </div>`, () => {
    $("#gcl-x").onclick = hideModal;
    $("#gcl-ok").onclick = () => {
      const r = G.altaClase({
        nombre: $("#gc-n").value.trim(), entrenador: $("#gc-e").value.trim(),
        dia: $("#gc-d").value, hora: $("#gc-h").value,
        minutos: Number($("#gc-m").value), aforo: Number($("#gc-a").value),
      });
      if (!r.ok) return toast(t("state.error"), r.error, "danger");
      hideModal();
      toast(t("gym.claseCreada"), r.clase.nombre);
      openSection("agenda");
    };
  });
}

function modalAcceso() {
  const dentro = G.estado.socios.filter((s) => G.dentro(s.id));
  showModal(`
    <div class="cine-tag">CONTROL DE ACCESO</div>
    <div class="cine-title" style="font-size:18px">${t("gym.quienEntra")}</div>
    <div class="gym-form">
      <label><span>SOCIO</span><select id="ga-s">${G.estado.socios.map((s) => `<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join("")}</select></label>
    </div>
    <div class="sub">${dentro.length ? esc(t("gym.dentroAhora") + ": " + dentro.map((s) => s.nombre).join(", ")) : esc(t("gym.nadieDentro"))}</div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="ga-ok">${esc(t("gym.marcarEntrada"))}</button>
      <button class="btn" id="ga-x">CANCELAR</button>
    </div>`, () => {
    $("#ga-x").onclick = hideModal;
    $("#ga-ok").onclick = () => {
      const id = $("#ga-s").value;
      const r = G.registrarAcceso(id, G.dentro(id) ? "salida" : "entrada");
      if (!r.ok) return toast(t("state.error"), tE(r.error), "danger");
      hideModal();
      toast(t("gym.acceso"), G.dentro(id) ? t("gym.entradaRegistrada") : t("gym.salidaRegistrada"));
      mando(document.getElementById("drawer-body"));
    };
  });
}

export const abrirFicha = ficha;
export const crearClase = modalClase;
export const registrarAccesoDesde = modalAcceso;
export const cobrarDesde = (socioId, alTerminar) => modalCobro(socioId, alTerminar);
export const planDesde = (socioId, alTerminar) => modalPlan(socioId, alTerminar);
export const altaSocioDesde = (body) => modalSocio(null, body);
