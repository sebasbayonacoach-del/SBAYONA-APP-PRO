// ============================================================
// BAYONA LIFE OS · Mi Día
// ------------------------------------------------------------
// Una agenda humana: tiempo, prioridades y fuentes en una sola línea.
// Lo que llega de otra app conserva su fuente; BAYONA no lo finge propio.
// ============================================================
import { S } from "../state.js";
import { planDelDia } from "../hoy.js";
import { LIFE_AREAS, growthSuggestions, areaSummary } from "../game/areas.js";
import { lifeMissions } from "../game/missions.js";
import { t, esc } from "../i18n.js";
import {
  addPlannerItem, completePlannerItem, datePlusDays, dayProgress,
  exportICS, findConflicts, importICSIntoLife, inboxItems, localDateKey,
  plannerItemsForDate, plannerItemsForRange, plannerPendingItems, plannerItemIsEditable,
  reprogramPlannerItem, removeInboxItem, removePlannerItem, togglePlannerSubtask, updatePlannerItem,
} from "../planner.js";
import { INTEGRATIONS, INTEGRATION_GROUPS, integrationStatus } from "../integrations/catalog.js";
import {
  addPlannerItemToSystemCalendar, openNativeMap, syncDeviceCalendar,
} from "../integrations/native-context.js";
import {
  BUILDERS, UI, el, elT, hideModal, openSection, showModal, toast,
} from "./shared.js";

let selectedDate = localDateKey();
let growthExpanded = false;
let plannerView = "day";
let lifeMissionsExpanded = false;

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
  if (!item.start) return t(item.allDay ? "planner.allDay" : "planner.noTime");
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
  const areaOptions = ['<option value="">' + esc(t("planner.area.none")) + '</option>']
    .concat(LIFE_AREAS.map((area) => `<option value="${area.id}" ${existing.area === area.id ? "selected" : ""}>${esc(area.short)}</option>`))
    .join("");

  const priorities = ["low", "normal", "high", "critical"].map((key) =>
    `<option value="${key}" ${existing.priority === key ? "selected" : ""}>${esc(t(`planner.priority.${key}`))}</option>`).join("");
  const recurrence = ["none", "daily", "weekdays", "weekly"].map((key) =>
    `<option value="${key}" ${existing.recurrence === key ? "selected" : ""}>${esc(t(`planner.repeat.${key}`))}</option>`).join("");
  const existingSteps = existing.subtasks || [];

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
      <label class="planner-field">
        <span>${esc(t("planner.area.label"))}</span>
        <select id="pl-area">${areaOptions}</select>
      </label>
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
      <div class="planner-form-row">
        <label class="planner-field">
          <span>${esc(t("planner.priority.label"))}</span>
          <select id="pl-priority">${priorities}</select>
        </label>
        <label class="planner-field">
          <span>${esc(t("planner.repeat.label"))}</span>
          <select id="pl-repeat" ${existing.seriesId ? "disabled" : ""}>${recurrence}</select>
        </label>
      </div>
      ${existing.seriesId ? `<p class="planner-hint">${esc(t("planner.repeat.onlyOne"))}</p>` : `
      <label class="planner-field">
        <span>${esc(t("planner.repeat.until"))}</span>
        <input id="pl-until" type="date" min="${esc(existing.date || selectedDate)}" value="${esc(existing.repeatUntil || "")}">
      </label>`}
      <label class="planner-field">
        <span>${esc(t("planner.steps.label"))}</span>
        <textarea id="pl-steps" maxlength="950" rows="3" placeholder="${esc(t("planner.steps.placeholder"))}">${esc(existingSteps.map((step) => step.title).join("\n"))}</textarea>
      </label>
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
    const area = document.getElementById("pl-area");
    const location = document.getElementById("pl-location");
    const notes = document.getElementById("pl-notes");
    const priority = document.getElementById("pl-priority");
    const repeat = document.getElementById("pl-repeat");
    const until = document.getElementById("pl-until");
    const steps = document.getElementById("pl-steps");
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

      const subtasks = steps.value.split(/\r?\n/)
        .map((label) => label.trim()).filter(Boolean).slice(0, 12)
        .map((label, i) => {
          const previous = existingSteps[i];
          return previous?.title === label ? { ...previous } :
            { id: "step_" + (i + 1), title: label, done: false };
        });
      const input = {
        title: rawTitle,
        date: date.value || selectedDate,
        start: start.value || null,
        end: end.value || null,
        allDay: Boolean(existing.allDay && !start.value),
        type: type.value,
        area: area.value || null,
        location: location.value.trim(),
        notes: notes.value.trim(),
        source: existing.source || "manual",
        externalId: existing.externalId || null,
        priority: priority.value,
        subtasks,
        ...(!existing.seriesId ? { recurrence: repeat.value, repeatUntil: until?.value || null } : {}),
        status: existing.status || "planned",
      };

      const result = isEdit
        ? updatePlannerItem(S.data.life, existing.id, input)
        : addPlannerItem(S.data.life, input);
      if (isEdit && !result.changed) {
        error.textContent = t("planner.external.readonly");
        return;
      }
      persist(result.life, isEdit ? "update" : "create");
      selectedDate = input.date;
      hideModal();
      toast(t("planner.toast.savedTitle"), t("planner.toast.savedBody"));
      BUILDERS.planner(document.getElementById("drawer-body"));
    };
  });
}

function removeItem(item) {
  if (!plannerItemIsEditable(item)) return;
  const result = removePlannerItem(S.data.life, item.id);
  persist(result.life, "delete");
  toast(t("planner.toast.deletedTitle"), t("planner.toast.deletedBody"));
  BUILDERS.planner(document.getElementById("drawer-body"));
}

function toggleDone(item) {
  if (!plannerItemIsEditable(item)) return;
  const result = completePlannerItem(S.data.life, item.id, item.status !== "done");
  if (!result.changed) return;
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
      <div class="planner-time">${plannerView !== "day" ? `<small>${esc(item.date.slice(5))}</small>` : ""}${esc(timeRange(item))}</div>
      <div class="planner-item-main">
        <div class="planner-item-top">
          <span class="planner-type">${esc(typeLabel(item.type))}</span>
          ${item.area ? `<span class="planner-area">${esc(LIFE_AREAS.find((a) => a.id === item.area)?.short || "")}</span>` : ""}
          <span class="planner-source">${esc(sourceName(item.source))}</span>
        </div>
        <h4>${esc(item.title)}</h4>
        ${item.location ? `<div class="planner-meta">${esc(item.location)}</div>` : ""}
        ${item.notes ? `<div class="planner-meta">${esc(item.notes)}</div>` : ""}
        ${item.priority === "high" || item.priority === "critical"
          ? `<div class="planner-priority-tag">${esc(t(`planner.priority.${item.priority}`))}</div>` : ""}
        ${item.recurrence !== "none" ? `<span class="planner-repeat-badge">${esc(t(`planner.repeat.${item.recurrence}`))}</span>` : ""}
        ${item.subtasks?.length ? `<div class="planner-subtasks"><small>${item.subtasks.filter((x) => x.done).length}/${item.subtasks.length} ${esc(t("planner.steps.short"))}</small></div>` : ""}
      </div>
      <div class="planner-item-actions"></div>
    `;

    if (item.subtasks?.length) {
      const subList = row.querySelector(".planner-subtasks");
      for (const step of item.subtasks) {
        const label = el("label", "planner-subtask");
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = step.done;
        box.disabled = !plannerItemIsEditable(item);
        box.setAttribute("aria-label", step.title);
        box.onchange = () => {
          const result = togglePlannerSubtask(S.data.life, item.id, step.id);
          if (!result.changed) return;
          persist(result.life, "subtask");
          BUILDERS.planner(document.getElementById("drawer-body"));
        };
        label.append(box, elT("span", "", step.title));
        subList.append(label);
      }
    }
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

    const editable = plannerItemIsEditable(item);
    if (editable) actions.append(done);
    if (item.location) {
      const map = el("button", "planner-icon-btn", "↗");
      map.type = "button";
      map.title = t("planner.action.route");
      map.setAttribute("aria-label", map.title);
      map.onclick = () => openNativeMap(item.location);
      actions.append(map);
    }
    if (item.source !== "device_calendar") {
      const cal = el("button", "planner-icon-btn", "+");
      cal.type = "button";
      cal.title = t("planner.action.systemCalendar");
      cal.setAttribute("aria-label", cal.title);
      cal.onclick = async () => {
        const opened = await addPlannerItemToSystemCalendar(item);
        if (!opened) toast(t("planner.calendar.unavailableTitle"), t("planner.calendar.unavailableBody"), "danger");
      };
      actions.append(cal);
    }
    if (editable) {
      const move = el("button", "planner-icon-btn", "→");
      move.type = "button";
      move.title = t("planner.move.tomorrow");
      move.setAttribute("aria-label", move.title);
      move.onclick = () => {
        const result = reprogramPlannerItem(S.data.life, item.id, datePlusDays(item.date, 1));
        if (!result.changed) return;
        persist(result.life, "reschedule");
        BUILDERS.planner(document.getElementById("drawer-body"));
      };
      actions.append(move, edit, del);
    }
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
          const calendarAction = provider.id === "device_calendar"
            ? `<button class="planner-connect-action" data-provider-action="device_calendar">${esc(t(ready ? "planner.connector.sync" : "planner.connector.connect"))}</button>`
            : `<em class="${ready ? "is-ready" : ""}">${esc(t(ready ? "planner.connector.ready" : "planner.connector.oauth"))}</em>`;
          return `
            <div class="planner-connector">
              <span><strong>${esc(provider.name)}</strong><small>${esc(provider.capabilities.join(" · "))}</small></span>
              ${calendarAction}
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
    document.querySelectorAll("[data-provider-action=\"device_calendar\"]").forEach((button) => {
      button.onclick = async () => {
        button.disabled = true;
        button.textContent = t("planner.connector.syncing");
        const result = await syncDeviceCalendar(S.data.life, { askPermission: true });
        if (result.ok) {
          S.data.life = result.life;
          S.save();
          window.dispatchEvent(new CustomEvent("bayona:planner", { detail: { event: "device-calendar-sync" } }));
          hideModal();
          toast(t("planner.connector.syncedTitle"), t("planner.connector.syncedBody", { count: result.count }));
          BUILDERS.planner(document.getElementById("drawer-body"));
          return;
        }
        button.disabled = false;
        button.textContent = t("planner.connector.connect");
        toast(t("planner.connector.permissionTitle"), t("planner.connector.permissionBody"), "danger");
      };
    });
  });
}

export function plannerPreview(limit = 2) {
  const date = localDateKey();
  const items = plannerItemsForDate(S.data.life, date);
  const p = dayProgress(S.data.life, date);
  const pending = items.filter((x) => x.status === "planned").slice(0, Math.max(1, limit));
  return { date, items, pending, progress: p };
}

function renderInbox(body) {
  const items = inboxItems(S.data.life);
  if (!items.length) return;
  const wrap = el("section", "planner-inbox");
  const head = el("div", "planner-inbox-head", `<span>${esc(t("planner.inbox.kicker"))}</span><b>${items.length}</b>`);
  wrap.appendChild(head);
  items.slice(0, 4).forEach((item) => {
    const card = el("article", "planner-inbox-card");
    const displayTitle = item.title || t("planner.inbox.sharedItem");
    const preview = item.text || item.url || "";
    card.innerHTML = `<strong>${esc(displayTitle)}</strong>${preview ? `<p>${esc(preview.slice(0, 220))}</p>` : ""}`;
    const actions = el("div", "planner-inbox-actions");
    const plan = el("button", "btn btn-primary", t("planner.inbox.plan"));
    plan.type = "button";
    plan.onclick = () => editModal({
      title: item.title || t("planner.inbox.defaultTitle"),
      notes: item.text || item.url || "",
      date: selectedDate,
      source: "manual",
    });
    const ask = el("button", "btn", t("planner.inbox.ask"));
    ask.type = "button";
    ask.onclick = () => {
      const prompt = t("planner.inbox.prompt", { content: (item.text || item.title || item.url || "").slice(0, 900) });
      if (UI.actions.openCoachAsk) return UI.actions.openCoachAsk(prompt);
      openSection("core");
      setTimeout(() => UI.actions.askCoach?.(prompt), 100);
    };
    const dismiss = el("button", "planner-icon-btn", "×");
    dismiss.type = "button";
    dismiss.title = t("planner.inbox.dismiss");
    dismiss.setAttribute("aria-label", dismiss.title);
    dismiss.onclick = () => {
      const result = removeInboxItem(S.data.life, item.id);
      S.data.life = result.life;
      S.save();
      window.dispatchEvent(new CustomEvent("bayona:planner", { detail: { event: "inbox-dismiss" } }));
      BUILDERS.planner(body);
    };
    actions.append(plan, ask, dismiss);
    card.appendChild(actions);
    wrap.appendChild(card);
  });
  body.appendChild(wrap);
}

function renderQuickAdd(body) {
  const form = el("form", "planner-quick-add");
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 90;
  input.required = true;
  input.placeholder = t("planner.quick.placeholder");
  input.setAttribute("aria-label", t("planner.quick.placeholder"));
  const add = el("button", "planner-quick-submit", t("planner.quick.add"));
  add.type = "submit";
  form.onsubmit = (event) => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) return;
    const result = addPlannerItem(S.data.life, {
      title, date: selectedDate, source: "manual",
      allDay: false, start: null, end: null, priority: "normal",
    });
    persist(result.life, "quick-add");
    plannerView = "day";
    BUILDERS.planner(body);
  };
  form.append(input, add);
  body.append(form);
}

function renderDailyMissions(body) {
  if (selectedDate !== localDateKey() || plannerView !== "day") return;
  const missions = planDelDia(S).misiones || [];
  if (!missions.length) return;
  const wrap = el("section", "planner-missions");
  const head = el("div", "planner-missions-head");
  head.append(elT("strong", "", t("planner.missions.title")));
  head.append(elT("small", "", t("planner.missions.sub")));
  wrap.append(head);
  for (const mission of missions) {
    const row = el("div", "planner-mission");
    const info = el("div");
    info.append(elT("strong", "", mission.name));
    info.append(elT("small", "", mission.hint));
    const b = el("button", "", mission.claimed ? t("planner.missions.claimed") :
      mission.done ? t("planner.missions.claim", { xp: mission.xp }) : t("planner.missions.open"));
    b.type = "button";
    b.disabled = Boolean(mission.claimed);
    b.onclick = () => {
      if (mission.done && !mission.claimed) {
        const claimed = S.claimMission(mission.id);
        if (claimed) {
          toast(t("planner.missions.title"), claimed.text + " · +" + claimed.xp + " XP");
          BUILDERS.planner(body);
        }
        return;
      }
      if (mission.id === "m_mente") return openSection("mind");
      if (mission.id === "m_pasos") return openSection("training");
      return openSection("nutrition");
    };
    row.append(info, b);
    wrap.append(row);
  }
  body.append(wrap);
}

function renderLifeMissions(body) {
  if (selectedDate !== localDateKey() || plannerView !== "day") return;
  const progress = lifeMissions({
    life: S.data.life, today: S.data.today, date: selectedDate,
  });
  const wrap = el("details", "planner-life-missions");
  wrap.open = lifeMissionsExpanded;
  wrap.addEventListener("toggle", () => { lifeMissionsExpanded = wrap.open; });
  const summary = el("summary", "planner-life-missions-head");
  summary.append(elT("strong", "", t("game.missions.title")));
  summary.append(elT("span", "", t("game.missions.summary", {
    done: progress.done, total: progress.total,
  })));
  wrap.append(summary);
  wrap.append(elT("p", "planner-life-missions-note", t("game.missions.note")));
  for (const mission of progress.areas) {
    const row = el("div", "planner-life-mission");
    const labels = el("div", "planner-life-mission-info");
    labels.append(elT("strong", "", mission.short));
    const status = mission.done
      ? t(mission.source === "tracked" ? "game.missions.tracked" : "game.missions.confirmed")
      : mission.total ? t("game.missions.pending") : t("game.missions.available");
    labels.append(elT("small", "", status));
    const btn = el("button", "planner-life-mission-action",
      mission.claimed ? t("game.missions.claimed") :
        mission.done ? t("game.missions.reward", { xp: mission.xp }) :
          mission.total ? t("game.missions.view") : t("game.missions.choose"));
    btn.type = "button";
    btn.disabled = mission.claimed;
    btn.onclick = () => {
      if (mission.done) {
        const reward = S.claimAreaMission(mission.id);
        if (reward) {
          toast(t("game.missions.claimSuccess"), "+" + reward.xp + " XP");
          BUILDERS.planner(body);
        }
      } else if (mission.total) {
        wrap.open = false;
        const match = [...body.querySelectorAll(".planner-item")].find((node) =>
          node.querySelector(".planner-area")?.textContent?.trim() === mission.short);
        match?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      } else {
        growthExpanded = true;
        BUILDERS.planner(body);
        const ideas = body.querySelector(".planner-growth");
        if (ideas) ideas.open = true;
      }
    };
    row.append(labels, btn);
    wrap.append(row);
  }
  body.append(wrap);
}

function renderGrowthIdeas(body) {
  const visibleItems = plannerItemsForDate(S.data.life, selectedDate);
  const ideas = growthSuggestions({ life: S.data.life, date: selectedDate, visibleItems });
  const summary = areaSummary(S.data.life, selectedDate, visibleItems);
  const wrap = el("details", "planner-growth");
  wrap.open = growthExpanded;
  wrap.addEventListener("toggle", () => { growthExpanded = wrap.open; });
  const header = el("summary", "planner-growth-summary");
  header.append(elT("strong", "", t("planner.growth.title")));
  header.append(elT("small", "", t("planner.growth.sub")));
  wrap.append(header);
  const grid = el("div", "planner-growth-grid");
  for (const area of LIFE_AREAS) {
    const count = summary.find((x) => x.id === area.id);
    const group = el("section", "planner-growth-area");
    const title = el("div", "planner-growth-area-head");
    title.append(elT("strong", "", area.short));
    title.append(elT("small", "", `${count.done}/${count.total} · ${area.description}`));
    group.append(title);
    for (const idea of ideas.filter((entry) => entry.area === area.id)) {
      const row = el("div", "planner-growth-idea");
      row.append(elT("span", "", idea.title));
      const add = el("button", "planner-growth-add", idea.existingId ? (idea.done ? "✓" : t("planner.growth.added")) : "+");
      add.type = "button";
      add.disabled = Boolean(idea.existingId);
      add.setAttribute("aria-label", idea.existingId ? t("planner.growth.added") : t("planner.growth.addAria", { title: idea.title }));
      add.onclick = () => {
        const result = addPlannerItem(S.data.life, {
          date: selectedDate, title: idea.title, type: idea.type, area: idea.area,
          start: null, end: null, allDay: false, source: "manual",
        });
        persist(result.life, "growth-idea-added");
        growthExpanded = true;
        BUILDERS.planner(body);
      };
      row.append(add);
      group.append(row);
    }
    grid.append(group);
  }
  wrap.append(grid);
  body.append(wrap);
}

BUILDERS.planner = (body) => {
  body.textContent = "";
  S.data.life = S.data.life || { planner:{ items:[] }, integrations:{ connections:{} } };

  const items = plannerView === "week"
    ? plannerItemsForRange(S.data.life, selectedDate, 7)
    : plannerView === "pending" ? plannerPendingItems(S.data.life) : plannerItemsForDate(S.data.life, selectedDate);
  const progress = plannerView === "day" ? dayProgress(S.data.life, selectedDate) : {
    done: items.filter((x) => x.status === "done").length,
    total: items.length,
    pct: items.length ? Math.round(items.filter((x) => x.status === "done").length / items.length * 100) : 0,
  };
  const conflicts = plannerView === "day" ? findConflicts(S.data.life, selectedDate) : [];

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
    selectedDate = datePlusDays(selectedDate, plannerView === "week" ? -7 : -1);
    BUILDERS.planner(body);
  };
  head.querySelector('[data-day="1"]').onclick = () => {
    selectedDate = datePlusDays(selectedDate, plannerView === "week" ? 7 : 1);
    BUILDERS.planner(body);
  };
  head.querySelector('[data-day="0"]').onclick = () => {
    selectedDate = localDateKey();
    BUILDERS.planner(body);
  };
  body.appendChild(head);
  const views = el("div", "planner-view-tabs");
  for (const [key, label] of [["day", "planner.view.day"], ["week", "planner.view.week"], ["pending", "planner.view.pending"]]) {
    const button = el("button", plannerView === key ? "active" : "", t(label));
    button.type = "button";
    button.setAttribute("aria-pressed", String(plannerView === key));
    button.onclick = () => { plannerView = key; BUILDERS.planner(body); };
    views.append(button);
  }
  body.append(views);
  renderQuickAdd(body);
  renderInbox(body);

  const score = el("section", "planner-progress");
  score.innerHTML = `
    <div><span>${esc(t("planner.progress"))}</span><strong>${esc(String(progress.done))}/${esc(String(progress.total))}</strong></div>
    <i><b style="width:${progress.pct}%"></b></i>
    ${conflicts.length ? `<small>${esc(t("planner.conflicts", { count: conflicts.length }))}</small>` : ""}
  `;
  body.appendChild(score);
  renderDailyMissions(body);
  renderLifeMissions(body);
  renderGrowthIdeas(body);

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
