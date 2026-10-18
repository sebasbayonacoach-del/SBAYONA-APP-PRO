import { t } from "../i18n.js";
// BAYONA APP · Auditoría técnica del catálogo Trainingym.
// Nunca importamos MP4, rutas privadas, eventos.jsonl ni archivos de clientes.
// Los estados provienen exclusivamente del catálogo existente en esta APP.
const STATUSES = [
  ["error", "INCIDENCIAS"],
  ["duplicate", "REFERENCIAS REUTILIZADAS"],
  ["no_video", "SIN ACCIÓN DE VÍDEO"],
  ["ok", "DESCARGAS REGISTRADAS"],
];
const LIMIT = 15;
const norm = value => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const fmt = value => Number(value || 0).toLocaleString("es-ES");
const el = (tag, cls = "", text = "") => {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (text !== "") x.textContent = text;
  return x;
};

export function summarizeTrainingymAudit(records) {
  if (!Array.isArray(records)) throw new Error("Catálogo no disponible");
  const counts = { ok: 0, duplicate: 0, no_video: 0, error: 0 };
  const ids = new Set();
  for (const record of records) {
    if (!record || !Number.isInteger(Number(record.pos)) || ids.has(record.pos)) {
      throw new Error("Registro ausente o posición repetida");
    }
    ids.add(record.pos);
    if (!(record.estado_media in counts)) throw new Error("Estado no reconocido");
    counts[record.estado_media]++;
  }
  return { total: records.length, counts };
}

export function renderTrainingymAudit(records, { onFind = () => {} } = {}) {
  const { total, counts } = summarizeTrainingymAudit(records);
  const container = el("section", "tg-app-audit");
  container.dataset.trainingymAudit = "";
  const heading = el("div", "tg-app-audit-head");
  const headerText = el("div");
  headerText.append(
    el("span", "proplayer-kicker", "AUDITORÍA DE CONTENIDOS · TRAININGYM"),
    el("h3", "", "Control de fichas y vídeos"),
    el("p", "", "Vista del registro técnico ya incluido en BAYONA APP. No comprueba la propiedad ni la licencia de difusión de los vídeos.")
  );
  const tag = el("span", "tg-app-audit-lock", "SOLO ENTRENADOR · LECTURA");
  heading.append(headerText, tag);
  container.append(heading);

  const kpis = el("div", "tg-app-audit-kpis");
  const modes = [["error", "INCIDENCIAS", counts.error],
    ["duplicate", "DUPLICADAS", counts.duplicate],
    ["no_video", "SIN VÍDEO", counts.no_video],
    ["ok", "REGISTRADAS OK", counts.ok],
    ["all", "TOTAL", total]];
  const buttons = [];
  for (const [status, label, count] of modes) {
    const button = el("button", "tg-app-audit-kpi");
    button.type = "button";
    button.dataset.auditStatus = status;
    button.setAttribute("aria-pressed", String(status === "error"));
    button.append(el("strong", "", fmt(count)), el("small", "", label));
    kpis.append(button);
    buttons.push(button);
  }
  container.append(kpis);

  const toolbar = el("div", "tg-app-audit-toolbar");
  const search = document.createElement("input");
  search.type = "search";
  search.dataset.auditSearch = "";
  search.autocomplete = "off";
  search.placeholder = "Buscar ejercicio o ID…";
  search.setAttribute("aria-label", t("trainingym.audit.searchAria"));
  const count = el("span", "tg-app-audit-count");
  count.setAttribute("role", "status");
  count.setAttribute("aria-live", "polite");
  toolbar.append(search, count);
  container.append(toolbar);

  const results = el("div", "tg-app-audit-list");
  results.dataset.auditResults = "";
  container.append(results);
  const pager = el("div", "tg-app-audit-pager");
  const back = el("button", "btn secondary", "ANTERIOR");
  const pageLabel = el("span", "", "");
  const forward = el("button", "btn secondary", "SIGUIENTE");
  back.type = forward.type = "button";
  pager.append(back, pageLabel, forward);
  container.append(pager);
  container.append(el("p", "tg-app-audit-note",
    "Importante: el estado se refiere al catálogo actual, no a una reproducción comprobada ni a permisos comerciales. El inventario original de tu ordenador permanece separado."));

  let status = "error", query = "", page = 0;
  function paint() {
    const matching = records.filter(item =>
      (status === "all" || item.estado_media === status) &&
      (!query || norm([item.nombre, item.source_id, item.pos, item.tipo, item.grupo_muscular].join(" ")).includes(query)));
    const max = Math.max(0, Math.ceil(matching.length / LIMIT) - 1);
    page = Math.min(page, max);
    results.replaceChildren();
    for (const record of matching.slice(page * LIMIT, (page + 1) * LIMIT)) {
      const row = el("article", "tg-app-audit-row");
      const id = el("small", "tg-app-audit-id", "#" + String(record.pos).padStart(4, "0"));
      const info = el("div", "tg-app-audit-info");
      info.append(el("strong", "", String(record.nombre || "Sin nombre")),
        el("span", "", String(record.grupo_muscular || "Músculo no especificado")));
      const statusName = STATUSES.find(([key]) => key === record.estado_media)?.[1] || "ESTADO DESCONOCIDO";
      const state = el("span", "tg-app-audit-state tg-app-audit-state-" + record.estado_media, statusName);
      const find = el("button", "btn secondary tg-app-audit-open", "VER FICHA");
      find.type = "button";
      find.setAttribute("aria-label", "Buscar ejercicio " + record.nombre + " en el catálogo");
      find.addEventListener("click", () => onFind(record));
      row.append(id, info, state, find);
      results.append(row);
    }
    if (!matching.length) results.append(el("p", "tg-app-audit-empty", "No hay fichas que coincidan."));
    count.textContent = fmt(matching.length) + " registros";
    pageLabel.textContent = "Página " + (page + 1) + " de " + (max + 1);
    back.disabled = page <= 0;
    forward.disabled = page >= max;
    buttons.forEach(button => {
      const active = button.dataset.auditStatus === status;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  buttons.forEach(button => button.addEventListener("click", () => {
    status = button.dataset.auditStatus;
    page = 0;
    paint();
  }));
  search.addEventListener("input", () => { query = norm(search.value); page = 0; paint(); });
  back.addEventListener("click", () => { page -= 1; paint(); });
  forward.addEventListener("click", () => { page += 1; paint(); });
  paint();
  return container;
}
