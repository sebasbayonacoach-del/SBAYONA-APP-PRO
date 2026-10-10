// BAYONA / PROPLAYER — biblioteca técnica propiedad de BAYONA.
// El catálogo se integra como dominio de entrenamiento; los MP4 se cargan bajo demanda.
import { S } from "../state.js";
import { esc, t } from "../i18n.js";
import { BUILDERS, $, el, elT, openSection, showModal, hideModal, toast } from "./shared.js";
import { linkedClients, saveCloudRoutine, assignCloudRoutine } from "../sync/coaching.js";

const CATALOG_URL = "./trainingym/catalog.json";
const MEDIA_BASE = "./private-trainingym/media/";
const CDN_MEDIA_BASE = "https://acajakbiebfp9udy.public.blob.vercel-storage.com/proplayer/";
const LOCAL_MEDIA = ["localhost", "127.0.0.1", "::1"].includes(globalThis.location?.hostname || "");
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
        if (!response.ok) throw new Error("Catálogo PROPLAYER no disponible (" + response.status + ")");
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

function canPlay(record) {
  return !!record?.video_url || (!!record?.video_disponible_local && !!record?.video_archivo_local);
}

function mediaUrl(record) {
  if (record?.video_url) return record.video_url;
  const name = encodeURIComponent(record?.video_archivo_local || "");
  return LOCAL_MEDIA ? MEDIA_BASE + name : CDN_MEDIA_BASE + name;
}

function routineKey(record) {
  return "pp_" + String(record.pos || record.source_id || record.nombre).replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function dateKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

async function openRoutineBuilder(records, onSaved) {
  if (!records.length) return toast("SELECCIONA EJERCICIOS", "Añade al menos un ejercicio desde PROPLAYER.");
  const rows = records.slice(0, 12);
  const cloudClients = await linkedClients().catch(() => []);
  const clientOptions = [
    ...cloudClients.map((c) => "<option value=\"" + esc(c.client_id) + "\">" + esc(c.name) + " · NUBE</option>"),
    "<option value=\"local\">" + (cloudClients.length ? "MI PERFIL LOCAL · PRUEBA" : "CLIENTE LOCAL · ESTE DISPOSITIVO") + "</option>",
  ].join("");
  const dayOptions = [[0, "HOY"], [1, "MAÑANA"], [2, "PASADO MAÑANA"]]
    .map(([offset, label]) => "<option value=\"" + dateKey(offset) + "\">" + label + " · " + dateKey(offset) + "</option>").join("");
  const exerciseRows = rows.map((record, i) => {
    const timed = record.tipo === "Movilidad";
    const defaultReps = timed ? 45 : 10;
    return "<article class=\"proplayer-routine-row\" data-routine-row=\"" + i + "\" data-record-index=\"" + i + "\">" +
      "<div class=\"proplayer-routine-row-head\"><span class=\"ppr-row-num\">" + String(i + 1).padStart(2, "0") + "</span><strong>" + esc(record.nombre) + "</strong><small>" + esc(record.grupo_muscular || "SIN ASIGNAR") + "</small>" +
      "<div class=\"ppr-row-controls\" aria-label=\"Orden del ejercicio\">" +
      "<button type=\"button\" data-ppr-action=\"up\" aria-label=\"Subir ejercicio\">↑</button>" +
      "<button type=\"button\" data-ppr-action=\"down\" aria-label=\"Bajar ejercicio\">↓</button>" +
      "<button type=\"button\" data-ppr-action=\"duplicate\" aria-label=\"Duplicar ejercicio\">⧉</button>" +
      "<button type=\"button\" data-ppr-action=\"remove\" aria-label=\"Eliminar ejercicio\">×</button>" +
      "</div></div>" +
      "<div class=\"proplayer-routine-fields\">" +
      "<label>SERIES<input class=\"ppr-sets\" type=\"number\" min=\"1\" max=\"8\" value=\"3\"></label>" +
      "<label>REPS / SEG<input class=\"ppr-reps\" type=\"number\" min=\"1\" max=\"600\" value=\"" + defaultReps + "\"></label>" +
      "<label>RIR<select class=\"ppr-rir\"><option>0</option><option>1</option><option selected>2</option><option>3</option><option>4</option></select></label>" +
      "<label>DESCANSO<input class=\"ppr-rest\" type=\"number\" min=\"0\" max=\"600\" value=\"90\"></label>" +
      "<label>CARGA KG<input class=\"ppr-kg\" type=\"number\" min=\"0\" max=\"1000\" step=\"0.5\" value=\"0\"></label>" +
      "<label class=\"ppr-time-label\"><input class=\"ppr-timed\" type=\"checkbox\" " + (timed ? "checked" : "") + "> MEDIR POR TIEMPO</label>" +
      "</div></article>";
  }).join("");
  const html = "<div class=\"proplayer-routine-modal\" data-proplayer-routine>" +
    "<div class=\"proplayer-kicker\">COACH STUDIO / PROPLAYER</div>" +
    "<h3>CONSTRUIR RUTINA</h3>" +
    "<p class=\"proplayer-routine-copy\">Define la sesión, reordena ejercicios, duplica bloques cuando lo necesites y ajusta series, repeticiones o tiempo, RIR, descanso y carga. Puedes asignarla al dispositivo o a un cliente BAYONA vinculado.</p>" +
    "<div class=\"proplayer-routine-meta\">" +
    "<label>NOMBRE<input id=\"ppr-name\" maxlength=\"80\" value=\"RUTINA PROPLAYER\"></label>" +
    "<label>CLIENTE<select id=\"ppr-client\">" + clientOptions + "</select></label>" +
    "<label>DURACIÓN<input id=\"ppr-min\" type=\"number\" min=\"5\" max=\"180\" value=\"" + Math.max(15, rows.length * 6) + "\"></label>" +
    "<label>DÍA<select id=\"ppr-day\">" + dayOptions + "</select></label>" +
    "</div><div class=\"proplayer-routine-list\">" + exerciseRows + "</div>" +
    "<div class=\"proplayer-routine-actions\"><button class=\"btn secondary\" id=\"ppr-cancel\">CANCELAR</button><button class=\"btn btn-primary\" id=\"ppr-save\">GUARDAR Y ASIGNAR</button></div></div>";
  showModal(html, () => {
    $("#ppr-cancel").onclick = hideModal;
    const list = document.querySelector(".proplayer-routine-list");
    const renumberRows = () => {
      const nodes = [...list.querySelectorAll("[data-routine-row]")];
      nodes.forEach((node, i) => {
        node.dataset.routineRow = String(i);
        const num = node.querySelector(".ppr-row-num");
        if (num) num.textContent = String(i + 1).padStart(2, "0");
        const up = node.querySelector('[data-ppr-action="up"]');
        const down = node.querySelector('[data-ppr-action="down"]');
        if (up) up.disabled = i === 0;
        if (down) down.disabled = i === nodes.length - 1;
      });
    };
    list.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-ppr-action]");
      if (!btn) return;
      const row = btn.closest("[data-routine-row]");
      if (!row) return;
      const action = btn.dataset.pprAction;
      if (action === "up") {
        const prev = row.previousElementSibling;
        if (prev) list.insertBefore(row, prev);
      } else if (action === "down") {
        const next = row.nextElementSibling;
        if (next) list.insertBefore(next, row);
      } else if (action === "duplicate") {
        const count = list.querySelectorAll("[data-routine-row]").length;
        if (count >= 12) return toast("MÁXIMO 12", "Una rutina PROPLAYER admite hasta 12 ejercicios.", "danger");
        const clone = row.cloneNode(true);
        row.after(clone);
      } else if (action === "remove") {
        const count = list.querySelectorAll("[data-routine-row]").length;
        if (count <= 1) return toast("MÍNIMO 1", "La rutina debe conservar al menos un ejercicio.", "danger");
        row.remove();
      }
      renumberRows();
    });
    renumberRows();

    $("#ppr-save").onclick = async () => {
      const nodes = [...document.querySelectorAll("[data-routine-row]")];
      const exercises = nodes.map((node) => {
        const record = rows[Number(node.dataset.recordIndex)];
        return {
          ex: routineKey(record), sourceId: record.source_id, pos: record.pos,
          name: record.nombre, muscle: record.grupo_muscular || "FULL", type: record.tipo || "Fuerza",
          sets: Number(node.querySelector(".ppr-sets").value), reps: Number(node.querySelector(".ppr-reps").value),
          rir: Number(node.querySelector(".ppr-rir").value), rest: Number(node.querySelector(".ppr-rest").value),
          kg: Number(node.querySelector(".ppr-kg").value), timed: node.querySelector(".ppr-timed").checked,
          videoFile: record.video_archivo_local || null,
          videoUrl: canPlay(record) ? mediaUrl(record) : null,
        };
      });
      const bad = exercises.some((e) => !Number.isFinite(e.sets) || e.sets < 1 || e.sets > 8 || !Number.isFinite(e.reps) || e.reps < 1 || e.reps > 600 || !Number.isFinite(e.rir) || e.rir < 0 || e.rir > 4 || !Number.isFinite(e.rest) || e.rest < 0 || e.rest > 600 || !Number.isFinite(e.kg) || e.kg < 0 || e.kg > 1000);
      if (bad) return toast("REVISA LA RUTINA", "Hay valores fuera de rango.", "danger");
      const routine = S.saveCustomRoutine({ name: $("#ppr-name").value, min: Number($("#ppr-min").value), exercises });
      if (!routine) return toast("NO GUARDADA", "La rutina necesita entre 1 y 12 ejercicios.", "danger");
      const dia = $("#ppr-day").value;
      const clientId = $("#ppr-client")?.value || "local";
      if (clientId === "local") {
        S.addAsignacion({ clienteId: "local", workoutId: routine.id, customRoutineId: routine.id, dia, nota: "Rutina creada desde PROPLAYER.", origen: "proplayer", autor: "Coach Studio" });
        hideModal();
        toast("RUTINA ASIGNADA", routine.name + " · " + dia + " · " + routine.exercises.length + " ejercicios.");
        onSaved?.(routine);
        return;
      }

      const saveBtn = $("#ppr-save");
      saveBtn.disabled = true;
      saveBtn.textContent = "ENVIANDO…";
      try {
        const cloudRoutine = await saveCloudRoutine({
          clientId,
          name: routine.name,
          min: routine.min,
          exercises: routine.exercises,
        });
        if (!cloudRoutine?.id) throw new Error("No se pudo crear la rutina en la nube.");
        await assignCloudRoutine({
          clientId,
          routineId: cloudRoutine.id,
          scheduledFor: dia,
          note: "Rutina creada desde PROPLAYER.",
        });
        hideModal();
        toast("RUTINA ENVIADA", routine.name + " · " + dia + " · cliente vinculado.");
        onSaved?.(routine);
      } catch (e) {
        saveBtn.disabled = false;
        saveBtn.textContent = "GUARDAR Y ASIGNAR";
        toast("NO ENVIADA", e.message || "No se pudo asignar la rutina en la nube.", "danger");
      }
    };
  });
}

function playVideo(record) {
  showModal('<div class="proplayer-video-modal" data-proplayer-video></div>', () => {
    const host = document.querySelector("[data-proplayer-video]");
    if (!host) return;

    const close = elT("button", "btn", "CERRAR");
    close.type = "button";
    close.addEventListener("click", hideModal);

    const kicker = elT("div", "proplayer-kicker", "BAYONA / PROPLAYER · DEMOSTRACIÓN");
    const modalHead = el("div", "proplayer-video-head");
    modalHead.append(kicker, close);
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
    video.src = mediaUrl(record);
    video.setAttribute("aria-label", "Demostración de " + record.nombre);

    // Los clips PROPLAYER se almacenan fuera de la APK. No afirmar que
    // funcionan sin red, que la app posee derechos sobre ellos o que el
    // enlace está operativo hasta que el navegador confirme metadatos.
    const state = elT("p", "proplayer-video-state", t("proplayer.video.external"));
    video.addEventListener("loadedmetadata", () => {
      state.textContent = t("proplayer.video.ready");
      state.classList.remove("danger");
    });
    video.addEventListener("error", () => {
      state.textContent = t("proplayer.video.failed");
      state.classList.add("danger");
    });

    host.append(modalHead, title, meta, video, state);
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
  const isCoach = document.body.dataset.oneContext === "coach";
  const selected = new Map();
  let buildButton = null;

  const hero = el("section", "proplayer-hero");
  const heroCopy = el("div", "proplayer-hero-copy");
  heroCopy.append(
    elT("div", "proplayer-kicker", "WHERE SCIENCE MEETS MOVEMENT · PROPLAYER"),
    elT("h2", "proplayer-title", "3.141 EJERCICIOS. UNA SOLA BIBLIOTECA."),
    elT(
      "p",
      "proplayer-lead",
      "Catálogo técnico integrado en BAYONA: fuerza, movilidad y cardio con filtros cruzados. Como Coach puedes seleccionar ejercicios, parametrizarlos y asignar una rutina completa."
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
  if (isCoach) {
    buildButton = elT("button", "btn btn-primary proplayer-build-btn", "CREAR RUTINA · 0");
    buildButton.type = "button";
    buildButton.disabled = true;
    buildButton.addEventListener("click", () => openRoutineBuilder([...selected.values()], () => {
      selected.clear();
      draw();
    }));
    heroActions.append(buildButton);
  }
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
  root.append(elT("p", "proplayer-network-note", t("proplayer.catalog.network")));

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
  const stateText = elT("div", "proplayer-state", "Catálogo PROPLAYER validado");
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
    "Biblioteca confirmada por su propietario para uso en BAYONA. Los vídeos se mantienen separados del código y se cargan bajo demanda para no inflar la aplicación."
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

    if (buildButton) {
      buildButton.textContent = "CREAR RUTINA · " + selected.size;
      buildButton.disabled = selected.size === 0;
      stateText.textContent = selected.size ? selected.size + " ejercicio(s) seleccionados para rutina" : "Catálogo validado · selecciona hasta 12 ejercicios";
    }
    cards.replaceChildren();
    const pageRows = view.rows.slice((view.page - 1) * PAGE_SIZE, view.page * PAGE_SIZE);
    for (const record of pageRows) {
      const key = routineKey(record);
      const card = el("article", "proplayer-card" + (selected.has(key) ? " selected-for-routine" : ""));
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
          ? "Vídeo en línea"
          : record.estado_media === "error"
            ? "Incidencia"
            : "Sin MP4";
      foot.append(elT("span", "", mediaState));
      const playableHere = canPlay(record);
      const play = elT("button", "", playableHere ? "REPRODUCIR" : record.video_disponible_local ? "VÍDEO EN CDN" : "NO DISPONIBLE");
      play.type = "button";
      play.disabled = !playableHere;
      if (!play.disabled) play.addEventListener("click", () => playVideo(record));
      foot.append(play);
      if (isCoach) {
        const add = elT("button", "proplayer-add-routine", selected.has(key) ? "QUITAR" : "AÑADIR");
        add.type = "button";
        add.addEventListener("click", () => {
          if (selected.has(key)) selected.delete(key);
          else {
            if (selected.size >= 12) return toast("MÁXIMO 12", "Una rutina PROPLAYER admite hasta 12 ejercicios.", "danger");
            selected.set(key, record);
          }
          draw();
        });
        foot.append(add);
      }
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
    elT("h3", "", "El catálogo PROPLAYER no está disponible en este dispositivo."),
    elT(
      "p",
      "",
      "El módulo está instalado, pero no se pudo cargar el catálogo PROPLAYER. BAYONA no inventa ejercicios sustitutos."
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
