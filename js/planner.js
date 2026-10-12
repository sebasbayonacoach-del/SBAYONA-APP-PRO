import { areaForPlannerType, normalizeLifeArea } from "./game/areas.js";

// ============================================================
// BAYONA LIFE OS · planificador diario universal (dominio puro)
// ------------------------------------------------------------
// Una línea temporal común para lo que nace en BAYONA y para lo que
// llega de calendarios/servicios externos. No toca DOM, storage ni red.
// ============================================================

export const PLANNER_TYPES = Object.freeze([
  "work", "training", "meal", "recovery", "personal", "admin", "focus", "travel", "other",
]);

export const PLANNER_PRIORITIES = Object.freeze(["low", "normal", "high", "critical"]);
export const PLANNER_STATUSES = Object.freeze(["planned", "done", "cancelled"]);
export const PLANNER_RECURRENCES = Object.freeze(["none", "daily", "weekdays", "weekly"]);


const pad = (n) => String(n).padStart(2, "0");
const clean = (v, n = 160) => String(v ?? "").trim().slice(0, n);
const validDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const validTime = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ""));

export function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

export function datePlusDays(key, days = 0) {
  if (!validDate(key)) return localDateKey();
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + Number(days || 0), 12, 0, 0, 0);
  return localDateKey(date);
}

export function timeToMinutes(value) {
  if (!validTime(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(value) {
  const mins = Math.max(0, Math.min(1439, Math.round(Number(value) || 0)));
  return pad(Math.floor(mins / 60)) + ":" + pad(mins % 60);
}

export function inferPlannerType(text = "") {
  const s = String(text).toLocaleLowerCase("es");
  if (/gym|gimnas|entren|correr|run|parkour|deporte|fuerza/.test(s)) return "training";
  if (/comer|comida|desay|almuer|cena|restaurante|mercado/.test(s)) return "meal";
  if (/dormir|sueño|siesta|recuper|movilidad|respirar|descanso/.test(s)) return "recovery";
  if (/trabaj|turno|reuni|cliente|oficina|clase|estudi|curso/.test(s)) return "work";
  if (/viaj|vuelo|tren|metro|bus|coche|uber|camino/.test(s)) return "travel";
  if (/foco|deep work|concentr|programar|escribir/.test(s)) return "focus";
  if (/pagar|banco|documento|trámite|cita/.test(s)) return "admin";
  if (/famil|mamá|mama|papá|papa|amig|pareja|cumple/.test(s)) return "personal";
  return "other";
}


/**
 * Extrae bloques horarios simples de lenguaje natural para el motor LOCAL.
 * No pretende entender todo el idioma: si una hora no es explícita, no inventa.
 * Ej.: "mañana trabajo de 8 a 14, gimnasio a las 18 y llamar a mamá a las 20".
 */
export function parsePlannerIntent(text, { now = new Date(), defaultDurationMin = 60 } = {}) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  const lower = raw.toLocaleLowerCase("es");
  const globalDate = /\bmañana\b|\bmanana\b/.test(lower)
    ? datePlusDays(localDateKey(now), 1)
    : localDateKey(now);

  const segments = raw
    .replace(/\s+y\s+(?=(?:llam|gym|gimnas|entren|trabaj|estudi|com|cena|desay|reuni|cita|ir|hacer|recuper|dorm|viaj))/gi, ", ")
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const out = [];
  const time = (h, m = "00") => {
    const hh = Math.max(0, Math.min(23, Number(h)));
    const mm = Math.max(0, Math.min(59, Number(m || 0)));
    return pad(hh) + ":" + pad(mm);
  };
  const titleOf = (value) => clean(String(value || "")
    .replace(/^\s*(?:hoy|mañana|manana)\s*/i, "")
    .replace(/^\s*(?:tengo que|tengo|quiero|debo)\s+/i, "")
    .replace(/^\s*(?:ir a|ir al|hacer)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim(), 90);

  for (const segment of segments) {
    const date = /\bmañana\b|\bmanana\b/i.test(segment)
      ? datePlusDays(localDateKey(now), 1)
      : /\bhoy\b/i.test(segment) ? localDateKey(now) : globalDate;

    let m = segment.match(/^(.*?)\s+de\s+(\d{1,2})(?::(\d{2}))?\s+a\s+(\d{1,2})(?::(\d{2}))?\s*$/i);
    if (m) {
      const title = titleOf(m[1]);
      if (!title) continue;
      const start = time(m[2], m[3]);
      const end = time(m[4], m[5]);
      if (timeToMinutes(end) <= timeToMinutes(start)) continue;
      out.push({ title, date, start, end, type: inferPlannerType(title), source: "manual" });
      continue;
    }

    m = segment.match(/^(.*?)\s+(?:a\s+las?|@)\s*(\d{1,2})(?::(\d{2}))?\b/i);
    if (m) {
      const title = titleOf(m[1]);
      if (!title) continue;
      const start = time(m[2], m[3]);
      const end = minutesToTime(timeToMinutes(start) + Math.max(10, Math.min(240, Number(defaultDurationMin) || 60)));
      out.push({ title, date, start, end, type: inferPlannerType(title), source: "manual" });
    }
  }

  return out.slice(0, 12);
}

function normalizeSubtasks(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((entry, index) => {
    const value = typeof entry === "string" ? { title: entry } : (entry && typeof entry === "object" ? entry : {});
    return {
      id: clean(value.id || ("step_" + (index + 1)), 50),
      title: clean(value.title, 110),
      done: Boolean(value.done),
    };
  }).filter((step) => step.title);
}

function normalizeExceptions(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [date, patch] of Object.entries(raw).slice(-365)) {
    if (!validDate(date) || !patch || typeof patch !== "object" || Array.isArray(patch)) continue;
    out[date] = {
      ...(validDate(patch.date) ? { date: patch.date } : {}),
      ...(PLANNER_STATUSES.includes(patch.status) ? { status: patch.status } : {}),
      ...(Object.hasOwn(patch, "start") ? { start: validTime(patch.start) ? patch.start : null } : {}),
      ...(Object.hasOwn(patch, "end") ? { end: validTime(patch.end) ? patch.end : null } : {}),
      ...(Object.hasOwn(patch, "subtasks") ? { subtasks: normalizeSubtasks(patch.subtasks) } : {}),
      ...(Object.hasOwn(patch, "title") ? { title: clean(patch.title, 90) } : {}),
      ...(Object.hasOwn(patch, "notes") ? { notes: clean(patch.notes, 500) } : {}),
      ...(PLANNER_PRIORITIES.includes(patch.priority) ? { priority: patch.priority } : {}),
    };
  }
  return out;
}

export function plannerItemIsEditable(item) {
  return item?.source === "manual";
}

export function normalizePlannerItem(raw = {}, fallback = {}) {
  const start = validTime(raw.start) ? raw.start : (validTime(fallback.start) ? fallback.start : null);
  let end = validTime(raw.end) ? raw.end : null;
  if (start && !end && Number.isFinite(Number(raw.durationMin))) {
    end = minutesToTime(timeToMinutes(start) + Math.max(5, Number(raw.durationMin)));
  }
  if (start && end && timeToMinutes(end) <= timeToMinutes(start)) end = null;

  const title = clean(raw.title || fallback.title || "Bloque", 90);
  const type = PLANNER_TYPES.includes(raw.type) ? raw.type : inferPlannerType(title);
  const priority = PLANNER_PRIORITIES.includes(raw.priority) ? raw.priority : "normal";
  const status = PLANNER_STATUSES.includes(raw.status) ? raw.status : "planned";
  const source = clean(raw.source || fallback.source || "manual", 40) || "manual";
  const externalId = clean(raw.externalId || raw.external_id || "", 180) || null;

  return {
    id: clean(raw.id || fallback.id || "", 100) || null,
    date: validDate(raw.date) ? raw.date : (validDate(fallback.date) ? fallback.date : localDateKey()),
    start,
    end,
    allDay: Boolean(raw.allDay || (!start && raw.allDay !== false)),
    title,
    type,
    area: Object.prototype.hasOwnProperty.call(raw, "area")
      ? normalizeLifeArea(raw.area, null)
      : areaForPlannerType(type, title),
    priority,
    status,
    source,
    externalId,
    subtasks: normalizeSubtasks(raw.subtasks),
    recurrence: source === "manual" && PLANNER_RECURRENCES.includes(raw.recurrence) ? raw.recurrence : "none",
    repeatUntil: source === "manual" && validDate(raw.repeatUntil) ? raw.repeatUntil : null,
    exceptions: source === "manual" ? normalizeExceptions(raw.exceptions) : {},
    notes: clean(raw.notes, 500),
    location: clean(raw.location, 180),
    url: /^https?:\/\//i.test(String(raw.url || "")) ? String(raw.url).slice(0, 500) : "",
    createdAt: raw.createdAt || fallback.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function normalizeInboxItem(raw = {}) {
  const text = clean(raw.text || raw.notes || "", 2000);
  const title = clean(raw.title || "", 120);
  const url = /^https?:\/\//i.test(String(raw.url || "")) ? String(raw.url).slice(0, 800) : "";
  return {
    id: clean(raw.id || "", 100) || null,
    title,
    text,
    url,
    source: clean(raw.source || "share", 60) || "share",
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export function normalizeLifeOS(raw = {}) {
  const planner = raw?.planner && typeof raw.planner === "object" ? raw.planner : {};
  const integrations = raw?.integrations && typeof raw.integrations === "object" ? raw.integrations : {};
  const items = (Array.isArray(planner.items) ? planner.items : [])
    .map((x) => normalizePlannerItem(x))
    .filter((x) => x.id && x.title);

  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const key = item.externalId ? item.source + "::" + item.externalId : item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  const inbox = (Array.isArray(raw?.inbox) ? raw.inbox : [])
    .map((x) => normalizeInboxItem(x))
    .filter((x) => x.id && (x.text || x.title || x.url))
    .slice(-200);

  return {
    planner: {
      items: deduped.slice(-1000),
      defaultDurationMin: Math.max(10, Math.min(240, Number(planner.defaultDurationMin) || 60)),
      dayStartsAt: validTime(planner.dayStartsAt) ? planner.dayStartsAt : "07:00",
      dayEndsAt: validTime(planner.dayEndsAt) ? planner.dayEndsAt : "23:00",
    },
    inbox,
    integrations: {
      connections: integrations.connections && typeof integrations.connections === "object"
        ? { ...integrations.connections }
        : {},
      lastImportAt: integrations.lastImportAt || null,
    },
  };
}

function makeId(prefix = "pl") {
  if (globalThis.crypto?.randomUUID) return prefix + "_" + crypto.randomUUID();
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
}

export function addInboxItem(life, input = {}) {
  const target = normalizeLifeOS(life);
  const item = normalizeInboxItem({ ...input, id: input.id || makeId("inbox") });
  if (!item.text && !item.title && !item.url) return { life: target, item: null, created: false };
  const fingerprint = `${item.source}::${item.title}::${item.text}::${item.url}`;
  const duplicate = target.inbox.find((x) => `${x.source}::${x.title}::${x.text}::${x.url}` === fingerprint);
  if (duplicate) return { life: target, item: duplicate, created: false };
  target.inbox.push(item);
  target.inbox = target.inbox.slice(-200);
  return { life: target, item, created: true };
}

export function removeInboxItem(life, id) {
  const target = normalizeLifeOS(life);
  const before = target.inbox.length;
  target.inbox = target.inbox.filter((x) => x.id !== id);
  return { life: target, removed: before - target.inbox.length };
}

export function inboxItems(life) {
  return normalizeLifeOS(life).inbox.slice().reverse();
}

export function addPlannerItem(life, input, opts = {}) {
  const target = normalizeLifeOS(life);
  const id = clean(input?.id || opts.id || "", 100) || makeId();
  const item = normalizePlannerItem({ ...input, id }, { date: opts.date || localDateKey() });

  if (item.externalId) {
    const match = target.planner.items.find((x) => x.source === item.source && x.externalId === item.externalId);
    if (match) {
      Object.assign(match, item, { id: match.id, createdAt: match.createdAt, updatedAt: new Date().toISOString() });
      return { life: target, item: match, created: false };
    }
  }

  target.planner.items.push(item);
  target.planner.items = target.planner.items.slice(-1000);
  return { life: target, item, created: true };
}

function calendarDayNumber(key) {
  if (!validDate(key)) return NaN;
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}

function repetitionMatches(item, date) {
  if (!plannerItemIsEditable(item) || item.recurrence === "none") return false;
  const days = calendarDayNumber(date) - calendarDayNumber(item.date);
  if (!Number.isFinite(days) || days < 0 || (item.repeatUntil && date > item.repeatUntil)) return false;
  if (item.recurrence === "daily") return true;
  const dow = new Date(calendarDayNumber(date) * 86400000).getUTCDay();
  if (item.recurrence === "weekdays") return dow >= 1 && dow <= 5;
  return days % 7 === 0;
}

function occurrence(item, originalDate) {
  const patch = item.exceptions?.[originalDate] || {};
  return {
    ...item, ...patch,
    id: item.id + "~" + originalDate,
    seriesId: item.id,
    occurrenceDate: originalDate,
    date: patch.date || originalDate,
    exceptions: {},
  };
}

function occurrenceId(id) {
  const at = String(id).lastIndexOf("~");
  const originalDate = String(id).slice(at + 1);
  return at > 0 && validDate(originalDate)
    ? { seriesId: String(id).slice(0, at), originalDate } : null;
}

export function updatePlannerItem(life, id, patch = {}) {
  const target = normalizeLifeOS(life);
  const ref = occurrenceId(id);
  if (ref) {
    const template = target.planner.items.find((item) => item.id === ref.seriesId);
    if (!template || !repetitionMatches(template, ref.originalDate)) return { life: target, item: null, changed: false };
    const before = occurrence(template, ref.originalDate);
    const next = normalizePlannerItem({ ...before, ...patch, id: before.id, createdAt: before.createdAt });
    const exceptions = { ...template.exceptions };
    exceptions[ref.originalDate] = {
      date: next.date,
      status: next.status,
      start: next.start,
      end: next.end,
      subtasks: next.subtasks,
      title: next.title,
      notes: next.notes,
      priority: next.priority,
    };
    template.exceptions = normalizeExceptions(exceptions);
    template.updatedAt = new Date().toISOString();
    return { life: target, item: occurrence(template, ref.originalDate), changed: true };
  }
  const index = target.planner.items.findIndex((x) => x.id === id);
  if (index < 0 || !plannerItemIsEditable(target.planner.items[index])) return { life: target, item: null, changed: false };
  const before = target.planner.items[index];
  const next = normalizePlannerItem({ ...before, ...patch, id: before.id, createdAt: before.createdAt });
  target.planner.items[index] = next;
  return { life: target, item: next, changed: true };
}

export function removePlannerItem(life, id) {
  const target = normalizeLifeOS(life);
  const ref = occurrenceId(id);
  if (ref) {
    const r = updatePlannerItem(target, id, { status: "cancelled" });
    return { life: r.life, removed: r.changed ? 1 : 0 };
  }
  const before = target.planner.items.length;
  target.planner.items = target.planner.items.filter((x) => x.id !== id || !plannerItemIsEditable(x));
  return { life: target, removed: before - target.planner.items.length };
}

export function completePlannerItem(life, id, done = true) {
  return updatePlannerItem(life, id, { status: done ? "done" : "planned" });
}

export function togglePlannerSubtask(life, id, stepId) {
  const ref = occurrenceId(id);
  const source = normalizeLifeOS(life);
  const template = source.planner.items.find((item) => item.id === (ref?.seriesId || id));
  if (!template || !plannerItemIsEditable(template)) return { life: source, changed: false };
  const existing = ref ? occurrence(template, ref.originalDate) : template;
  if (!existing.subtasks.some((x) => x.id === stepId)) return { life: source, changed: false };
  const subtasks = existing.subtasks.map((x) => x.id === stepId ? { ...x, done: !x.done } : x);
  return updatePlannerItem(source, id, { subtasks });
}

export function reprogramPlannerItem(life, id, date) {
  if (!validDate(date)) return { life: normalizeLifeOS(life), changed: false };
  return updatePlannerItem(life, id, { date });
}

function itemsForDateNormalized(target, date, includeCancelled = false) {
  const items = [];
  for (const item of target.planner.items) {
    if (item.recurrence !== "none") {
      if (repetitionMatches(item, date)) {
        const instance = occurrence(item, date);
        if (instance.date === date && (includeCancelled || instance.status !== "cancelled")) items.push(instance);
      }
      for (const [original, change] of Object.entries(item.exceptions || {})) {
        if (change.date !== date || !repetitionMatches(item, original) || original === date) continue;
        const instance = occurrence(item, original);
        if (includeCancelled || instance.status !== "cancelled") items.push(instance);
      }
    } else if (item.date === date && (includeCancelled || item.status !== "cancelled")) {
      items.push(item);
    }
  }
  return items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    const am = timeToMinutes(a.start) ?? -1;
    const bm = timeToMinutes(b.start) ?? -1;
    if (am !== bm) return am - bm;
    const p = { critical: 4, high: 3, normal: 2, low: 1 };
    return (p[b.priority] || 0) - (p[a.priority] || 0);
  });
}

export function plannerItemsForDate(life, date = localDateKey(), { includeCancelled = false } = {}) {
  return itemsForDateNormalized(normalizeLifeOS(life), date, includeCancelled);
}

export function plannerItemsForRange(life, start = localDateKey(), days = 7, { pendingOnly = false } = {}) {
  const target = normalizeLifeOS(life);
  const count = Math.max(1, Math.min(90, Math.floor(Number(days) || 7)));
  const out = [];
  for (let offset = 0; offset < count; offset++) {
    const date = datePlusDays(start, offset);
    out.push(...itemsForDateNormalized(target, date).filter((item) => !pendingOnly || item.status === "planned"));
  }
  return out;
}

export function plannerPendingItems(life, today = localDateKey()) {
  const expanded = plannerItemsForRange(life, datePlusDays(today, -14), 60, { pendingOnly: true })
    .filter((item) => item.date <= datePlusDays(today, 45));
  const separate = [];
  const recurring = new Map();
  for (const item of expanded) {
    if (!item.seriesId) {
      separate.push(item);
      continue;
    }
    const existing = recurring.get(item.seriesId);
    // No mostrar 46 repeticiones de una misma tarea diaria:
    // 1 por serie, priorizando hoy, después la más reciente vencida
    // y por último la próxima por hacer.
    const relevance = (candidate) => {
      if (candidate.date === today) return 0;
      if (candidate.date < today)
        return 100 + Math.max(0, calendarDayNumber(today) - calendarDayNumber(candidate.date));
      return 1000 + Math.max(0, calendarDayNumber(candidate.date) - calendarDayNumber(today));
    };
    if (!existing || relevance(item) < relevance(existing)) recurring.set(item.seriesId, item);
  }
  return separate.concat([...recurring.values()])
    .sort((a, b) => {
      const aOverdue = a.date < today ? 0 : a.date === today ? 1 : 2;
      const bOverdue = b.date < today ? 0 : b.date === today ? 1 : 2;
      return aOverdue - bOverdue || a.date.localeCompare(b.date)
        || (a.start || "").localeCompare(b.start || "");
    }).slice(0, 100);
}

export function dayProgress(life, date = localDateKey()) {
  const items = plannerItemsForDate(life, date);
  const actionable = items.filter((x) => x.status !== "cancelled");
  const done = actionable.filter((x) => x.status === "done").length;
  return {
    total: actionable.length,
    done,
    pending: Math.max(0, actionable.length - done),
    pct: actionable.length ? Math.round(done / actionable.length * 100) : 0,
  };
}

export function activeOrNextItem(life, now = new Date()) {
  const date = localDateKey(now);
  const mins = now.getHours() * 60 + now.getMinutes();
  const items = plannerItemsForDate(life, date).filter((x) => x.status === "planned");

  const active = items.find((x) => {
    const start = timeToMinutes(x.start);
    const end = timeToMinutes(x.end);
    return start != null && end != null && start <= mins && mins < end;
  });
  if (active) return { item: active, state: "active", minutesUntil: 0 };

  const next = items
    .filter((x) => timeToMinutes(x.start) != null && timeToMinutes(x.start) >= mins)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))[0] || null;
  return next
    ? { item: next, state: "next", minutesUntil: timeToMinutes(next.start) - mins }
    : { item: null, state: "none", minutesUntil: null };
}

export function findConflicts(life, date = localDateKey()) {
  const timed = plannerItemsForDate(life, date)
    .filter((x) => x.status === "planned" && x.start && x.end);
  const conflicts = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i], b = timed[j];
      if (timeToMinutes(a.start) < timeToMinutes(b.end) && timeToMinutes(b.start) < timeToMinutes(a.end)) {
        conflicts.push([a.id, b.id]);
      }
    }
  }
  return conflicts;
}

function unfoldIcs(text) {
  return String(text || "").replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(value = "") {
  const v = String(value).trim();
  if (/^\d{8}$/.test(v)) {
    return { date: v.slice(0,4) + "-" + v.slice(4,6) + "-" + v.slice(6,8), time: null, allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/);
  if (!m) return null;
  return { date: m[1] + "-" + m[2] + "-" + m[3], time: m[4] + ":" + m[5], allDay: false };
}

function icsUnescape(value = "") {
  return String(value).replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseICS(text, { source = "ics" } = {}) {
  const raw = unfoldIcs(text);
  const blocks = raw.split(/BEGIN:VEVENT\r?\n/i).slice(1);
  const events = [];

  for (const block of blocks) {
    const body = block.split(/END:VEVENT/i)[0] || "";
    const get = (name) => {
      const line = body.split(/\r?\n/).find((x) => x.toUpperCase().startsWith(name + ":") || x.toUpperCase().startsWith(name + ";"));
      return line ? line.slice(line.indexOf(":") + 1).trim() : "";
    };
    const start = parseIcsDate(get("DTSTART"));
    if (!start) continue;
    const endParsed = parseIcsDate(get("DTEND"));
    const summary = icsUnescape(get("SUMMARY")) || "Evento";
    const uid = get("UID") || null;

    events.push(normalizePlannerItem({
      id: uid ? "ics_" + clean(uid, 80).replace(/[^a-zA-Z0-9._-]/g, "_") : makeId("ics"),
      date: start.date,
      start: start.time,
      end: endParsed?.time || null,
      allDay: start.allDay,
      title: summary,
      type: inferPlannerType(summary),
      source,
      externalId: uid,
      location: icsUnescape(get("LOCATION")),
      notes: icsUnescape(get("DESCRIPTION")),
    }));
  }
  return events;
}

function icsEscape(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\,").replace(/;/g, "\;");
}

function compactDate(date) { return String(date || "").replaceAll("-", ""); }
function compactTime(time) { return String(time || "00:00").replace(":", "") + "00"; }

export function exportICS(items = [], { calendarName = "BAYONA" } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BAYONA//Life OS//ES",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:" + icsEscape(calendarName),
  ];

  for (const raw of items) {
    const item = normalizePlannerItem(raw);
    if (item.status === "cancelled") continue;
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + icsEscape(item.externalId || item.id || makeId("bayona")));
    lines.push("DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"));
    if (item.allDay || !item.start) {
      lines.push("DTSTART;VALUE=DATE:" + compactDate(item.date));
      lines.push("DTEND;VALUE=DATE:" + compactDate(datePlusDays(item.date, 1)));
    } else {
      lines.push("DTSTART:" + compactDate(item.date) + "T" + compactTime(item.start));
      if (item.end) lines.push("DTEND:" + compactDate(item.date) + "T" + compactTime(item.end));
    }
    lines.push("SUMMARY:" + icsEscape(item.title));
    if (item.location) lines.push("LOCATION:" + icsEscape(item.location));
    if (item.notes) lines.push("DESCRIPTION:" + icsEscape(item.notes));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function importICSIntoLife(life, text, opts = {}) {
  let target = normalizeLifeOS(life);
  let created = 0, updated = 0;
  for (const item of parseICS(text, opts)) {
    const result = addPlannerItem(target, item);
    target = result.life;
    result.created ? created++ : updated++;
  }
  target.integrations.lastImportAt = new Date().toISOString();
  return { life: target, created, updated };
}
