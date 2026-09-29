// ============================================================
// BAYONA · UI/INFORMES — el mes, en cifras
// ------------------------------------------------------------
// La pantalla que se abre el día 1. Cuánto entró, cuántas visitas
// hubo, qué clases se llenan y a quién hay que llamar hoy.
//
// Dos reglas que no se rompen aquí:
//   1 · solo números que salen de registros reales. Un mes sin
//     cobros sale a 0, no «estimado».
//   2 · la exportación es un CSV que se genera AQUÍ y se descarga
//     del navegador. Sin servidor: se abre con una hoja de cálculo
//     y se lleva a la gestoría, que es de donde sale.
import { G } from "../gym/store.js";
import { dia } from "../gym/model.js";
import {
  facturacionMensual, asistenciaDiaria, ocupacionClases,
  watchlist, morosos, resumenMensual, aCSV,
} from "../gym/informes.js";
import { BUILDERS, $, el, elT, openSection, showModal, hideModal, toast } from "./shared.js";
import { esc, fmtInt, t } from "../i18n.js";

const eur = (n) => `${fmtInt(n)} €`;

/* ---------- piezas ---------- */
function stat(valor, etiqueta, nota) {
  const c = el("div", "gym-stat");
  c.append(elT("div", "gym-stat-v", valor), elT("div", "gym-stat-k", etiqueta));
  if (nota) c.appendChild(elT("div", "gym-stat-n", nota));
  return c;
}

/** Barra horizontal con etiqueta, valor y proporción. */
function barra(etiqueta, valor, total, sufijo = "") {
  const p = el("div", "gym-panel");
  const f = el("div", "gym-fila");
  f.append(elT("span", "gym-fila-k", etiqueta), elT("span", "gym-fila-v", `${fmtInt(valor)}${sufijo}`));
  p.appendChild(f);
  const b = el("div", "gym-barra");
  const i = el("i");
  i.style.width = `${Math.min(100, Math.round((valor / Math.max(1, total)) * 100))}%`;
  b.appendChild(i);
  p.appendChild(b);
  return p;
}

const nombre = (id) => G.socio(id)?.nombre || "—";

/* ---------- descarga del CSV ---------- */
function descargar(nombreFichero, contenido) {
  // Se genera el fichero en el navegador. Sin servidor y sin subir
  // datos de socios a ningún sitio: el CSV nace y muere aquí.
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreFichero;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ============================================================
   1 · INFORME MENSUAL
   ============================================================ */
function mensual(body) {
  const hoy = dia();
  const r = resumenMensual(G.estado, null, hoy);
  const e = G.estado;
  const cabeza = el("div", "gym-cabecera");
  cabeza.append(elT("div", "gym-cabecera-n", G.nombre()), elT("div", "gym-porque", t("gym.informe.mes", { mes: r.mes })));
  body.appendChild(cabeza);

  const k = el("div", "gym-kpis");
  k.append(
    stat(eur(r.cobros), t("gym.informe.cobrado"), `${fmtInt(r.operaciones)} cobros`),
    stat(eur(r.ticket), t("gym.informe.ticketMedio"), t("gym.informe.ticketNota")),
    stat(fmtInt(r.visitas), t("gym.informe.visitas"), t("gym.informe.visitasNota")),
    stat(fmtInt(r.sociosActivos), t("gym.activos"), `${fmtInt(r.nuevos)} ${t("gym.informe.nuevos")}`),
  );
  body.appendChild(k);

  // ---- facturación de los últimos meses ----
  body.appendChild(elT("div", "sec-label", t("gym.informe.facturacion")));
  const serie = facturacionMensual(G.estado, 6, hoy);
  const max = Math.max(1, ...serie.map((m) => m.importe));
  for (const m of serie) body.appendChild(barra(m.mes, m.importe, max, " €"));
  body.appendChild(elT("div", "gym-porque", t("gym.informe.facturacionNota")));

  // ---- asistencia por día ----
  body.appendChild(elT("div", "sec-label", t("gym.informe.asistencia")));
  const dias = asistenciaDiaria(G.estado, 14, hoy);
  const maxVisitas = Math.max(1, ...dias.map((d) => d.visitas));
  for (const d of dias) body.appendChild(barra(d.dia, d.visitas, maxVisitas));

  // ---- ocupación de lo que viene ----
  body.appendChild(elT("div", "sec-label", t("gym.informe.ocupacion")));
  const clases = ocupacionClases(G.estado, hoy);
  if (!clases.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.sinClasesHoy"))));
  } else {
    for (const c of clases.slice(0, 8)) {
      const p = el("div", "gym-panel");
      const f = el("div", "gym-fila");
      f.append(elT("span", "gym-fila-k", `${c.dia} · ${c.hora} · ${c.nombre}`), elT("span", "gym-fila-v", `${c.ocupadas}/${c.aforo} · ${c.pct} %`));
      p.appendChild(f);
      const b = el("div", "gym-barra");
      const i = el("i");
      i.style.width = `${Math.min(100, c.pct)}%`;
      b.appendChild(i);
      p.appendChild(b);
      body.appendChild(p);
    }
  }
  return r;
}

/* ============================================================
   2 · A QUIÉN HAY QUE LLAMAR HOY
   ============================================================ */
function llamadas(body) {
  const hoy = dia();
  body.appendChild(elT("div", "sec-label", t("gym.informe.llamarHoy")));
  const lista = watchlist(G.estado, hoy);
  if (!lista.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.sinRiesgo"))));
  } else {
    for (const x of lista) {
      const p = el("div", "gym-panel");
      const f = el("div", "gym-fila");
      f.append(
        elT("span", "gym-fila-k", x.socio.nombre),
        el("span", `gym-pill ${x.riesgo.nivel === "alto" ? "danger" : ""}`, `${fmtInt(x.riesgo.puntos)} ${t("gym.informe.puntos")}`),
      );
      p.appendChild(f);
      if (x.riesgo.motivos.length) p.appendChild(elT("div", "gym-porque", x.riesgo.motivos.map((m) => m.texto).join(" · ")));
      p.appendChild(elT("div", "gym-porque", t("gym.informe.visitasSocio", { n: fmtInt(x.visitas) })));
      body.appendChild(p);
    }
  }

  body.appendChild(elT("div", "sec-label", t("gym.cobros")));
  const mor = morosos(G.estado, hoy);
  if (!mor.length) {
    body.appendChild(el("div", "gym-vacio", esc(t("gym.informe.nadieDebe"))));
  } else {
    for (const x of mor) {
      const p = el("div", "gym-panel");
      const f = el("div", "gym-fila");
      f.append(
        elT("span", "gym-fila-k", x.socio.nombre),
        elT("span", "gym-fila-v alerta", `${x.deuda.cuotas} ${t("gym.informe.cuotas")} · ${eur(x.deuda.vencido)}`),
      );
      p.appendChild(f);
      p.appendChild(elT("div", "gym-porque", t("gym.informe.moraDias", { n: x.dias })));
      p.appendChild(Object.assign(el("button", "btn btn-mini", t("gym.informe.verCuota")), { onclick: () => openSection("cuotas") }));
      body.appendChild(p);
    }
  }
}

/* ============================================================
   3 · EXPORTAR
   ============================================================ */
function exportar(body) {
  body.appendChild(elT("div", "sec-label", t("gym.informe.exportar")));
  const panel = el("div", "gym-panel");
  panel.appendChild(elT("div", "gym-porque", t("gym.informe.exportarNota")));

  const hojas = [
    {
      clave: "socios",
      titulo: t("gym.informe.hojaSocios"),
      filas: () => G.estado.socios.map((s) => ({
        nombre: s.nombre,
        estado: s.estado,
        alta: s.alta,
        telefono: s.telefono || "",
        email: s.email || "",
        plan: G.planDe(s.id)?.nombre || "",
      })),
    },
    {
      clave: "pagos",
      titulo: t("gym.informe.hojaPagos"),
      filas: () => G.estado.pagos.map((p) => ({
        fecha: String(p.fecha || "").slice(0, 10),
        socio: nombre(p.socioId),
        importe: p.importe,
        pasarela: p.pasarela || "manual",
        concepto: p.concepto || "",
      })),
    },
    {
      clave: "accesos",
      titulo: t("gym.informe.hojaAccesos"),
      filas: () => G.estado.accesos.map((a) => ({
        entrada: a.entrada,
        salida: a.salida || "",
        socio: nombre(a.socioId),
      })),
    },
  ];

  for (const h of hojas) {
    const b = el("button", "btn btn-block", h.titulo);
    b.onclick = () => {
      const filas = h.filas();
      if (!filas.length) return toast(t("state.empty"), t("gym.informe.sinFilas"), "danger");
      descargar(`bayona-${h.clave}-${dia()}.csv`, aCSV(filas));
      toast(t("gym.informe.descargado"), `${filas.length} ${t("gym.informe.filas")}`);
    };
    panel.appendChild(b);
  }
  body.appendChild(panel);
  body.appendChild(el("div", "gym-panel", `<div class="gym-porque">${esc(t("gym.informe.exportarPrivacy"))}</div>`));
}

/* ============================================================
   PANTALLA
   ============================================================ */
BUILDERS.informes = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  if (!G.estado.socios.length) {
    body.appendChild(elT("div", "sec-label", t("gym.informe")));
    body.appendChild(el("div", "gym-vacio", esc(t("gym.vacio"))));
    return;
  }
  mensual(body);
  llamadas(body);
  exportar(body);
  body.appendChild(Object.assign(el("button", "btn btn-ghost btn-block", t("gym.informe.volverCentro")), { onclick: () => openSection("centro") }));
};

/* Modal de confirmación de la descarga: bajar datos de socios a un
   fichero es una decisión, no un clic perdido. */
export function modalExportar() {
  showModal(`
    <div class="cine-tag">${esc(t("gym.informe.exportar"))}</div>
    <div class="cine-title" style="font-size:18px">${esc(t("gym.informe.exportarTitle"))}</div>
    <div class="sub">${esc(t("gym.informe.exportarPrivacy"))}</div>
    <div class="gym-acciones">
      <button class="btn btn-primary" id="ex-ok">${esc(t("gym.informe.entendido"))}</button>
      <button class="btn" id="ex-x">${esc(t("act.close"))}</button>
    </div>`, () => {
    $("#ex-ok").onclick = () => { hideModal(); openSection("informes"); };
    $("#ex-x").onclick = hideModal;
  });
}
