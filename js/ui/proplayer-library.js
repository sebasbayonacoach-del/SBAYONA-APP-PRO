// BAYONA / PROPLAYER — biblioteca privada de ejercicios Trainingym.
// El catálogo y los MP4 permanecen fuera de Git. Este módulo solo consume
// el puente local private-trainingym/ cuando existe en el dispositivo.
import { BUILDERS, $, el, elT, openSection, showModal, hideModal } from "./shared.js";

const CATALOG_URL = "./private-trainingym/catalog.json";
const MEDIA_BASE = "./private-trainingym/media/";
const PAGE_SIZE = 30;

let catalogCache = null;
let catalogPromise = null;

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function formatCount(value) {
  return String(Math.max(0, Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

async function loadCatalog(force = false) {
  if (force) {
    catalogCache = null;
    catalogPromise = null;
  }
  if (catalogCache) return catalogCache;
  if (!catalogPromise) {
    catalogPromise = fetch(CATALOG_URL, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Biblioteca privada no vinculada (" + response.status + ")");
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length !== 3141) {
          throw new Error("Catálogo inválido: se esperaban 3.141 ejercicios.");
        }
        catalogCache = data;
        return data;
      })
      .finally(() => {
        catalogPromise = null;
      });
  }
  return catalogPromise;
}

function makeChip(text, tone = "") {
  const x = elT("span", "proplayer-chip " + tone, text);
  return x;
}

function makeMetric(label, value, note = "") {
  const card = el("article", "proplayer-metric");
  card.append(
    elT("span", "proplayer-metric-label", label),
    elT("strong", "proplayer-metric-value", value),
    elT("small", "proplayer-metric-note", note)
  );
  return card;
}

function distinct(data, key, fallback = "") {
  const values = new Set();
  for (const item of data) {
    const raw = item[key];
    if (Array.isArray(raw)) raw.forEach((x) => x && values.add(x));
    else if (raw) values.add(raw);
    else if (fallback) values.add(fallback);
  }
  return [...values].sort((a, b) => String(a).localeCompare(String(b), "es"));
}

function fillSelect(select, values, title) {
  select.replaceChildren(new Option(title, ""));
  values.forEach((value) => select.appendChild(new Option(value, value)));
}

function field(labelText, control) {
  const wrap = el("div", "proplayer-field");
  const label = elT("label", "", labelText);
  label.htmlFor = control.id;
  wrap.append(label, control);
  return wrap;
}

function backTarget() {
  return document.body.dataset.oneContext === "coach" ? "coachos" : "training";
}

function mediaUrl(file) {
  return MEDIA_BASE + encodeURIComponent(file);
}

function playVideo(record) {
  showModal('<div class="proplayer-video-modal" data-proplayer-video></div>', () => {
    const host = document.querySelector("[data-proplayer-video]");
    if (!host) return;

    const close = elT("button", "btn", "CERRAR");
    close.type = "button";
    close.addEventListener("click", hideModal);

    const kicker = elT("div", "proplayer-kicker", "BAYONA / PROPLAYER · DEMOSTRACIÓN");
    const title = elT("h3", "proplayer-video-title", record.nombre);
    const meta = el("div", "proplayer-video-meta");
    meta.append(
      makeChip(record.tipo || "SIN TIPO", "amber"),
      makeChip(record.grupo_muscular || "SIN ASIGNAR"),
      ...record.nivel_esfuerzo.map((x) => makeChip(x, "amber")),
      ...record.perfil_resistencia.map((x) => makeChip(x))
    );

    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = mediaUrl(record.video_archivo_local);
    video.setAttribute("aria-label", "Demostración de " + record.nombre);

    const state = elT("p", "proplayer-video-state", "MP4 local verificado · no se publica con el repositorio.");
    video.addEventListener("error", () => {
      state.textContent = "No se pudo abrir este MP4 desde la biblioteca local.";
      state.classList.add("danger");
    });

    const actions = el("div", "proplayer-video-actions");
    actions.append(close);
    host.append(kicker, title, meta, video, state, actions);
    video.focus({ preventScroll: true });
  });
}

function csvCell(value) {
  let text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportSelection(rows) {
  const cols = [
    "pos", "source_id", "nombre", "tipo", "grupo_muscular",
    "nivel_esfuerzo", "perfil_resistencia", "etiquetas",
    "estado_media", "video_disponible_local",
  ];
  const csv = [
    cols.join(";"),
    ...rows.map((row) => cols.map((key) => csvCell(row[key])).join(";")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "BAYONA_PROPLAYER_seleccion_" + rows.length + ".csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function renderLibrary(body, data) {
  const root = el("div", "proplayer-library");

  const hero = el("section", "proplayer-hero");
  const heroCopy = el("div", "proplayer-hero-copy");
  heroCopy.append(
    elT("div", "proplayer-kicker", "WHERE SCIENCE MEETS MOVEMENT · PROPLAYER"),
    elT("h2", "proplayer-title", "3.141 EJERCICIOS. UNA SOLA BIBLIOTECA."),
    elT(
      "p",
      "proplayer-lead",
      "Catálogo técnico integrado en BAYONA: fuerza, movilidad y cardio con filtros cruzados. Los medios permanecen privados y se cargan solo cuando los solicitas."
    )
  );

  const heroActions = el("div", "proplayer-actions");
  const back = elT("button", "btn", document.body.dataset.oneContext === "coach" ? "VOLVER A COACH" : "VOLVER A ENTRENAR");
  back.type = "button";
  back.addEventListener("click", () => openSection(backTarget()));
  const refresh = elT("button", "btn secondary", "RECARGAR CATÁLOGO");
  refresh.type = "button";
  refresh.addEventListener("click", () => {
    loadCatalog(true)
      .then((next) => renderLibrary(body, next))
      .catch((error) => renderLoadError(body, error));
  });
  heroActions.append(back, refresh);
  heroCopy.append(heroActions);
  hero.append(heroCopy);
  root.append(hero);

  const playable = data.filter((x) => x.video_disponible_local).length;
  const uniqueMedia = new Set(data.filter((x) => x.video_archivo_local).map((x) => x.video_archivo_local)).size;
  const missing = data.length - playable;
  const metrics = el("div", "proplayer-metrics");
  metrics.append(
    makeMetric("EJERCICIOS", formatCount(data.length), "catálogo auditado"),
    makeMetric("FICHAS CON VÍDEO", formatCount(playable), "incluye duplicados reutilizados"),
    makeMetric("MP4 ÚNICOS", formatCount(uniqueMedia), "sin duplicar almacenamiento"),
    makeMetric("SIN MP4", formatCount(missing), "ausente o con incidencia")
  );
  root.append(metrics);

  const workspace = el("div", "proplayer-workspace");
  const filters = el("aside", "proplayer-filters");
  filters.append(
    elT("div", "proplayer-kicker", "FILTROS TÉCNICOS"),
    elT("p", "proplayer-filter-copy", "Los filtros se combinan entre sí. Los campos no verificados no se inventan.")
  );

  const search = document.createElement("input");
  search.id = "proplayer-search";
  search.type = "search";
  search.autocomplete = "off";
  search.placeholder = "Nombre, músculo, material...";
  filters.append(field("BUSCAR EJERCICIO", search));

  const type = document.createElement("select"); type.id = "proplayer-type";
  const muscle = document.createElement("select"); muscle.id = "proplayer-muscle";
  const effort = document.createElement("select"); effort.id = "proplayer-effort";
  const resistance = document.createElement("select"); resistance.id = "proplayer-resistance";
  const tag = document.createElement("select"); tag.id = "proplayer-tag";
  const availability = document.createElement("select"); availability.id = "proplayer-availability";

  fillSelect(type, distinct(data, "tipo"), "Todos los tipos");
  fillSelect(muscle, distinct(data, "grupo_muscular", "SIN ASIGNAR"), "Todos los músculos");
  fillSelect(effort, distinct(data, "nivel_esfuerzo"), "Todos los niveles");
  fillSelect(resistance, distinct(data, "perfil_resistencia"), "Todos los perfiles");
  fillSelect(tag, distinct(data, "etiquetas"), "Todas las etiquetas");
  availability.append(
    new Option("Todos los registros", ""),
    new Option("Con vídeo reproducible", "video"),
    new Option("MP4 original verificado", "ok"),
    new Option("Duplicado reutilizado", "duplicate"),
    new Option("Sin vídeo en origen", "no_video"),
    new Option("Incidencia de descarga", "error")
  );

  filters.append(
    field("TIPO", type),
    field("GRUPO MUSCULAR", muscle),
    field("ESFUERZO", effort),
    field("RESISTENCIA", resistance),
    field("ETIQUETA", tag),
    field("DISPONIBILIDAD", availability)
  );

  const filterActions = el("div", "proplayer-filter-actions");
  const reset = elT("button", "btn secondary", "RESTABLECER");
  const exportBtn = elT("button", "btn", "EXPORTAR CSV");
  reset.type = exportBtn.type = "button";
  filterActions.append(reset, exportBtn);
  filters.append(filterActions);

  const resultsArea = el("section", "proplayer-results");
  const controls = el("div", "proplayer-controls");
  const count = elT("div", "proplayer-count", "");
  const stateText = elT("div", "proplayer-state", "Catálogo local validado");
  controls.append(count, stateText);
  const cards = el("div", "proplayer-cards");
  const pager = el("div", "proplayer-pager");
  const prev = elT("button", "btn secondary", "ANTERIOR");
  const pageLabel = elT("span", "proplayer-page-label", "");
  const next = elT("button", "btn secondary", "SIGUIENTE");
  prev.type = next.type = "button";
  pager.append(prev, pageLabel, next);
  const disclaimer = elT(
    "div",
    "proplayer-disclaimer",
    "Uso privado: BAYONA reproduce los medios verificados desde este PC. No se incluyen en Git ni se publican hasta confirmar derechos de redistribución."
  );
  resultsArea.append(controls, cards, pager, disclaimer);
  workspace.append(filters, resultsArea);
  root.append(workspace);

  body.textContent = "";
  body.append(root);

  const view = { page: 1, rows: data };

  function draw() {
    const q = norm(search.value);
    const selectedType = type.value;
    const selectedMuscle = muscle.value;
    const selectedEffort = effort.value;
    const selectedResistance = resistance.value;
    const selectedTag = tag.value;
    const selectedAvailability = availability.value;

    view.rows = data.filter((record) => {
      if (selectedType && record.tipo !== selectedType) return false;
      if (selectedMuscle && (record.grupo_muscular || "SIN ASIGNAR") !== selectedMuscle) return false;
      if (selectedEffort && !record.nivel_esfuerzo.includes(selectedEffort)) return false;
      if (selectedResistance && !record.perfil_resistencia.includes(selectedResistance)) return false;
      if (selectedTag && !record.etiquetas.includes(selectedTag)) return false;
      if (selectedAvailability === "video" && !record.video_disponible_local) return false;
      if (["ok", "duplicate", "no_video", "error"].includes(selectedAvailability) && record.estado_media !== selectedAvailability) return false;
      if (!q) return true;
      return norm([
        record.nombre,
        record.tipo,
        record.grupo_muscular,
        record.nivel_esfuerzo.join(" "),
        record.perfil_resistencia.join(" "),
        record.etiquetas.join(" "),
      ].join(" ")).includes(q);
    });

    const pages = Math.max(1, Math.ceil(view.rows.length / PAGE_SIZE));
    view.page = Math.min(view.page, pages);
    const first = view.rows.length ? (view.page - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(view.rows.length, view.page * PAGE_SIZE);
    count.textContent = formatCount(view.rows.length) + " coincidencias · " + (first ? first + "–" + last : "sin resultados");
    pageLabel.textContent = view.page + " / " + pages;
    prev.disabled = view.page <= 1;
    next.disabled = view.page >= pages;

    cards.replaceChildren();
    const pageRows = view.rows.slice((view.page - 1) * PAGE_SIZE, view.page * PAGE_SIZE);
    for (const record of pageRows) {
      const card = el("article", "proplayer-card");
      const art = el("div", "proplayer-art");
      art.append(
        elT("span", "", "#" + String(record.pos).padStart(4, "0") + (record.source_id ? " · ID " + record.source_id : " · SIN ID")),
        elT("strong", "", record.tipo === "Cardio" ? "C" : record.tipo === "Movilidad" ? "M" : "F")
      );
      const titleNode = elT("h3", "", record.nombre);
      const chips = el("div", "proplayer-chips");
      chips.append(makeChip(record.tipo || "SIN TIPO", "amber"));
      chips.append(makeChip(record.grupo_muscular || "SIN ASIGNAR"));
      record.nivel_esfuerzo.forEach((x) => chips.append(makeChip(x, "amber")));
      record.perfil_resistencia.slice(0, 2).forEach((x) => chips.append(makeChip(x)));
      record.etiquetas.slice(0, 2).forEach((x) => chips.append(makeChip(x)));

      const foot = el("div", "proplayer-card-bottom");
      const mediaState = record.estado_media === "duplicate"
        ? "MP4 reutilizado"
        : record.video_disponible_local
          ? "MP4 verificado"
          : record.estado_media === "error"
            ? "Incidencia"
            : "Sin MP4";
      foot.append(elT("span", "", mediaState));
      const play = elT("button", "", record.video_disponible_local ? "REPRODUCIR" : "NO DISPONIBLE");
      play.type = "button";
      play.disabled = !record.video_disponible_local;
      if (!play.disabled) play.addEventListener("click", () => playVideo(record));
      foot.append(play);
      card.append(art, titleNode, chips, foot);
      cards.append(card);
    }

    if (!pageRows.length) {
      cards.append(elT("div", "proplayer-empty", "No hay ejercicios que coincidan con estos filtros."));
    }
  }

  const controlsList = [search, type, muscle, effort, resistance, tag, availability];
  controlsList.forEach((control) => {
    control.addEventListener(control === search ? "input" : "change", () => {
      view.page = 1;
      draw();
    });
  });
  reset.addEventListener("click", () => {
    controlsList.forEach((control) => { control.value = ""; });
    view.page = 1;
    draw();
  });
  exportBtn.addEventListener("click", () => exportSelection(view.rows));
  prev.addEventListener("click", () => {
    view.page = Math.max(1, view.page - 1);
    draw();
    controls.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  next.addEventListener("click", () => {
    view.page += 1;
    draw();
    controls.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  draw();
}

function renderLoadError(body, error) {
  body.textContent = "";
  const box = el("section", "proplayer-load-error");
  box.append(
    elT("div", "proplayer-kicker", "BAYONA / PROPLAYER"),
    elT("h3", "", "La biblioteca privada no está conectada en este dispositivo."),
    elT(
      "p",
      "",
      "El módulo está instalado, pero el catálogo local de Trainingym no está disponible. Los medios no se descargan desde Internet ni se sustituyen por otros ejercicios."
    ),
    elT("code", "", error?.message || "Catálogo no disponible")
  );
  const row = el("div", "proplayer-actions");
  const back = elT("button", "btn secondary", "VOLVER");
  back.type = "button";
  back.addEventListener("click", () => openSection(backTarget()));
  const retry = elT("button", "btn", "REINTENTAR");
  retry.type = "button";
  retry.addEventListener("click", () => {
    loadCatalog(true)
      .then((data) => renderLibrary(body, data))
      .catch((nextError) => renderLoadError(body, nextError));
  });
  row.append(back, retry);
  box.append(row);
  body.append(box);
}

BUILDERS.library = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  const loading = el("section", "proplayer-loading");
  loading.append(
    elT("div", "proplayer-kicker", "BAYONA / PROPLAYER"),
    elT("h3", "", "Cargando biblioteca técnica…"),
    elT("p", "", "Leyendo 3.141 fichas sin cargar los vídeos en memoria.")
  );
  body.append(loading);

  loadCatalog()
    .then((data) => {
      if (!body.isConnected) return;
      renderLibrary(body, data);
    })
    .catch((error) => {
      if (!body.isConnected) return;
      renderLoadError(body, error);
    });
};
