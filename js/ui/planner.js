// ============================================================
// BAYONA LIFE OS · Mi Día
// ------------------------------------------------------------
// Una agenda humana: tiempo, prioridades y fuentes en una sola línea.
// Lo que llega de otra app conserva su fuente; BAYONA no lo finge propio.
// ============================================================
import { S } from "../state.js";
import { t, esc } from "../i18n.js";
import {
  addPlannerItem, completePlannerItem, datePlusDays, dayProgress,
  exportICS, findConflicts, importICSIntoLife, localDateKey,
  plannerItemsForDate, removePlannerItem, updatePlannerItem,
} from "../planner.js";
import { INTEGRATIONS, INTEGRATION_GROUPS, integrationStatus } from "../integrations/catalog.js";
import {
  BUILDERS, UI, el, elT, hideModal, openSection, showModal, toast,
} from "./shared.js";

let selectedDate = localDateKey();

const TYPE_KEYS = {
  work: "planner.type.work",
  training: "planner.type.training",
  meal: "planner.type.meal",
  recovery: "planner.type.recovery",
  personal: "planner.type.personal",
  admin: "planner.type.admin",
  focus: "planner.type.focus",
  travel: "planner.type.travel",
  other: "planner.type.other",
};

const GROUP_KEYS = {
  calendar: "planner.group.calendar",
  tasks: "planner.group.tasks",
  communication: "planner.group.communication",
  health: "planner.group.health",
  mobility: "planner.group.mobility",
  media: "planner.group.media",
  universal: "planner.group.universal",
};

function typeLabel(type) {
  return t(TYPE_KEYS[type] || TYPE_KEYS.other);
}

function sourceName(source) {
  const provider = INTEGRATIONS.find((x) => x.id === source);
  if (provider) return provider.name;
  if (source === "manual") return t("planner.source.manual");
  return String(source || "BAYONA").replaceAll("_", " ").toUpperCase();
}

function humanDate(date) {
  const [y, m, d] = String(date).split("-").map(Number);
  const value = new Date(y, m - 1, d, 12);
  return value.toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function timeRange(item) {
  if (item.allDay || !item.start) return t("planner.allDay");
  return item.end ? `${item.start}–${item.end}` : item.start;
}

function persist(nextLife, event = "planner") {
  S.data.life = nextLife;
  S.save();
  window.dispatchEvent(new CustomEvent("bayona:planner", { detail: { event } }));
}

function editModal(item = null) {
  const existing = item || {};
  const isEdit = Boolean(existing.id);
  const typeOptions = Object.keys(TYPE_KEYS)
    .map((key) => `<option value="${key}" ${existing.type === key ? "selected" : ""}>${esc(typeLabel(key))}</option>`)
    .join("");

  showModal(`
    <div class="planner-modal">
      <div class="cine-tag">${esc(t(isEdit ? "planner.edit.kicker" : "planner.add.kicker"))}</div>
      <div class="cine-title" style="font-size:26px">${esc(t(isEdit ? "planner.edit.title" : "planner.add.title"))}</div>
      <label class="planner-field">
        <span>${esc(t("planner.field.title"))}</span>
        <input id="pl-title" maxlength="90" value="${esc(existing.title || "")}" placeholder="${esc(t("planner.field.titlePlaceholder"))}">
      </label>
      <div class="planner-form-row">
        <label class="planner-field">
          <span>${esc(t("planner.field.date"))}</span>
          <input id="pl-date" type="date" value="${esc(existing.date || selectedDate)}">
        </label>
        <label class="planner-field">
          <span>${esc(t("planner.field.type"))}</span>
          <select id="pl-type">${typeOptions}</select>
        </label>
      </div>
      <div class="planner-form-row">
        <label class="planner-field">
          <span>${esc(t("planner.field.start"))}</span>
          <input id="pl-start" type="time" value="${esc(existing.start || "")}">
        </label>
        <label class="planner-field">
          <span>${esc(t("planner.field.end"))}</span>
          <input id="pl-end" type="time" value="${esc(existing.end || "")}">
        </label>
      </div>
      <label class="planner-field">
        <span>${esc(t("planner.field.location"))}</span>
        <input id="pl-location" maxlength="180" value="${esc(existing.location || "")}" placeholder="${esc(t("planner.field.locationPlaceholder"))}">
      </label>
      <label class="planner-field">
        <span>${esc(t("planner.field.notes"))}</span>
        <textarea id="pl-notes" maxlength="500" rows="3" placeholder="${esc(t("planner.field.notesPlaceholder"))}">${esc(existing.notes || "")}</textarea>
      </label>
      <div id="pl-error" class="media-caption" role="status"></div>
      <div class="planner-modal-actions">
        <button class="btn" id="pl-cancel">${esc(t("planner.cancel"))}</button>
        <button class="btn btn-primary" id="pl-save">${esc(t("planner.save"))}</button>
      </div>
    </div>
  `, () => {
    const title = document.getElementById("pl-title");
    const date = document.getElementById("pl-date");
    const start = document.getElementById("pl-start");
    const end = document.getElementById("pl-end");
    const type = document.getElementById("pl-type");
    const location = document.getElementById("pl-location");
    const notes = document.getElementById("pl-notes");
    const error = document.getElementById("pl-error");

    document.getElementById("pl-cancel").onclick = hideModal;
    document.getElementById("pl-save").onclick = () => {
      const rawTitle = title.value.trim();
      if (!rawTitle) {
        error.textContent = t("planner.error.title");
        title.focus();
        return;
      }
      if (start.value && end.value && end.value <= start.value) {
        error.textContent = t("planner.error.time");
        end.focus();
        return;
      }

      const input = {
        title: rawTitle,
        date: date.value || selectedDate,
        start: start.value || null,
        end: end.value || null,
        allDay: !start.value,
        type: type.value,
        location: location.value.trim(),
        notes: notes.value.trim(),
        source: existing.source || "manual",
        externalId: existing.externalId || null,
        priority: existing.priority || "normal",
        status: existing.status || "planned",
      };

      const result = isEdit
        ? updatePlannerItem(S.data.life, existing.id, input)
        : addPlannerItem(S.data.life, input);
      persist(result.life, isEdit ? "update" : "create");
      selectedDate = input.date;
      hideModal();
      toast(t("planner.toast.savedTitle"), t("planner.toast.savedBody"));
      BUILDERS.planner(document.getElementById("drawer-body"));
    };
  });
}

function removeItem(item) {
  const result = removePlannerItem(S.data.life, item.id);
  persist(result.life, "delete");
  toast(t("planner.toast.deletedTitle"), t("planner.toast.deletedBody"));
  BUILDERS.planner(document.getElementById("drawer-body"));
}

function toggleDone(item) {
  const result = completePlannerItem(S.data.life, item.id, item.status !== "done");
  persist(result.life, "complete");
  BUILDERS.planner(document.getElementById("drawer-body"));
}

function renderTimeline(body, items) {
  const list = el("section", "planner-timeline");
  if (!items.length) {
    list.appendChild(el("div", "planner-empty", `
      <strong>${esc(t("planner.empty.title"))}</strong>
      <span>${esc(t("planner.empty.body"))}</span>
    `));
    body.appendChild(list);
    return;
  }

  for (const item of items) {
    const row = el("article", `planner-item type-${item.type} ${item.status === "done" ? "is-done" : ""}`);
    row.innerHTML = `
      <div class="planner-time">${esc(timeRange(item))}</div>
      <div class="planner-item-main">
        <div class="planner-item-top">
          <span class="planner-type">${esc(typeLabel(item.type))}</span>
          <span class="planner-source">${esc(sourceName(item.source))}</span>
        </div>
        <h4>${esc(item.title)}</h4>
        ${item.location ? `<div class="planner-meta">${esc(item.location)}</div>` : ""}
        ${item.notes ? `<div class="planner-meta">${esc(item.notes)}</div>` : ""}
      </div>
      <div class="planner-item-actions"></div>
    `;

    const actions = row.querySelector(".planner-item-actions");
    const done = el("button", "planner-icon-btn", item.status === "done" ? "↺" : "✓");
    done.type = "button";
    done.title = t(item.status === "done" ? "planner.action.undo" : "planner.action.done");
    done.setAttribute("aria-label", done.title);
    done.onclick = () => toggleDone(item);

    const edit = el("button", "planner-icon-btn", "✎");
    edit.type = "button";
    edit.title = t("planner.action.edit");
    edit.setAttribute("aria-label", edit.title);
    edit.onclick = () => editModal(item);

    const del = el("button", "planner-icon-btn", "×");
    del.type = "button";
    del.title = t("planner.action.delete");
    del.setAttribute("aria-label", del.title);
    del.onclick = () => removeItem(item);

    actions.append(done, edit, del);
    list.appendChild(row);
  }
  body.appendChild(list);
}

function importCalendar() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".ics,text/calendar";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = importICSIntoLife(S.data.life, text, { source: "ics" });
      persist(result.life, "import");
      toast(
        t("planner.import.doneTitle"),
        t("planner.import.doneBody", { created: result.created, updated: result.updated })
      );
      BUILDERS.planner(document.getElementById("drawer-body"));
    } catch {
      toast(t("planner.import.errorTitle"), t("planner.import.errorBody"), "danger");
    }
  };
  input.click();
}

function exportDay() {
  const items = plannerItemsForDate(S.data.life, selectedDate);
  const ics = exportICS(items, { calendarName: "BAYONA · " + selectedDate });
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `BAYONA-${selectedDate}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(t("planner.export.doneTitle"), t("planner.export.doneBody"));
}

function connectionsModal() {
  const groups = INTEGRATION_GROUPS.map((group) => {
    const providers = INTEGRATIONS.filter((x) => x.group === group);
    return `
      <section class="planner-connect-group">
        <h4>${esc(t(GROUP_KEYS[group]))}</h4>
        ${providers.map((provider) => {
          const status = integrationStatus(S.data.life, provider.id);
          const ready = status.connected;
          return `
            <div class="planner-connector">
              <span><strong>${esc(provider.name)}</strong><small>${esc(provider.capabilities.join(" · "))}</small></span>
              <em class="${ready ? "is-ready" : ""}">${esc(t(ready ? "planner.connector.ready" : "planner.connector.oauth"))}</em>
            </div>
          `;
        }).join("")}
      </section>
    `;
  }).join("");

  showModal(`
    <div class="planner-connections">
      <div class="cine-tag">${esc(t("planner.connections.kicker"))}</div>
      <div class="cine-title" style="font-size:26px">${esc(t("planner.connections.title"))}</div>
      <p class="sub">${esc(t("planner.connections.body"))}</p>
      <div class="planner-connect-scroll">${groups}</div>
      <button class="btn btn-primary btn-block" id="pl-connect-close">${esc(t("planner.connections.close"))}</button>
    </div>
  `, () => {
    document.getElementById("pl-connect-close").onclick = hideModal;
  });
}

export function plannerPreview(limit = 2) {
  const date = localDateKey();
  const items = plannerItemsForDate(S.data.life, date);
  const p = dayProgress(S.data.life, date);
  const pending = items.filter((x) => x.status === "planned").slice(0, Math.max(1, limit));
  return { date, items, pending, progress: p };
}

BUILDERS.planner = (body) => {
  body.textContent = "";
  S.data.life = S.data.life || { planner:{ items:[] }, integrations:{ connections:{} } };

  const items = plannerItemsForDate(S.data.life, selectedDate);
  const progress = dayProgress(S.data.life, selectedDate);
  const conflicts = findConflicts(S.data.life, selectedDate);

  const head = el("section", "planner-head");
  head.innerHTML = `
    <span class="fit-eyebrow">${esc(t("planner.kicker"))}</span>
    <h3>${esc(t("planner.title"))}</h3>
    <p>${esc(t("planner.body"))}</p>
    <div class="planner-date-nav">
      <button type="button" data-day="-1" aria-label="${esc(t("planner.previous"))}">←</button>
      <button type="button" data-day="0" class="planner-date-main">
        <strong>${esc(humanDate(selectedDate))}</strong>
        <small>${esc(t("planner.today"))}</small>
      </button>
      <button type="button" data-day="1" aria-label="${esc(t("planner.next"))}">→</button>
    </div>
  `;
  head.querySelector('[data-day="-1"]').onclick = () => {
    selectedDate = datePlusDays(selectedDate, -1);
    BUILDERS.planner(body);
  };
  head.querySelector('[data-day="1"]').onclick = () => {
    selectedDate = datePlusDays(selectedDate, 1);
    BUILDERS.planner(body);
  };
  head.querySelector('[data-day="0"]').onclick = () => {
    selectedDate = localDateKey();
    BUILDERS.planner(body);
  };
  body.appendChild(head);

  const score = el("section", "planner-progress");
  score.innerHTML = `
    <div><span>${esc(t("planner.progress"))}</span><strong>${esc(String(progress.done))}/${esc(String(progress.total))}</strong></div>
    <i><b style="width:${progress.pct}%"></b></i>
    ${conflicts.length ? `<small>${esc(t("planner.conflicts", { count: conflicts.length }))}</small>` : ""}
  `;
  body.appendChild(score);

  const actions = el("section", "planner-actions");
  const add = el("button", "btn btn-primary", t("planner.add.button"));
  const imp = el("button", "btn", t("planner.import.button"));
  const exp = el("button", "btn", t("planner.export.button"));
  add.onclick = () => editModal();
  imp.onclick = importCalendar;
  exp.onclick = exportDay;
  actions.append(add, imp, exp);
  body.appendChild(actions);

  renderTimeline(body, items);

  const connections = el("button", "planner-connections-card");
  connections.type = "button";
  connections.innerHTML = `
    <span><small>${esc(t("planner.connections.kicker"))}</small><strong>${esc(t("planner.connections.cardTitle"))}</strong></span>
    <span>${esc(t("planner.connections.cardBody"))}</span>
    <b>→</b>
  `;
  connections.onclick = connectionsModal;
  body.appendChild(connections);

  const ask = el("button", "planner-ai-card");
  ask.type = "button";
  ask.innerHTML = `
    <span>◈</span>
    <span><strong>${esc(t("planner.ai.title"))}</strong><small>${esc(t("planner.ai.body"))}</small></span>
  `;
  ask.onclick = () => {
    if (UI.actions.openCoachAsk) return UI.actions.openCoachAsk(t("planner.ai.prompt"));
    openSection("core");
    setTimeout(() => UI.actions.askCoach?.(t("planner.ai.prompt")), 100);
  };
  body.appendChild(ask);
};

export function openPlanner(date = localDateKey()) {
  selectedDate = date;
  openSection("planner");
}
