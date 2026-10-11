// ============================================================
// BAYONA LIFE OS · contexto nativo del dispositivo
// ------------------------------------------------------------
// Une Android Calendar + intents del sistema con el planificador.
// El permiso de calendario SOLO se solicita por una acción explícita.
// ============================================================
import {
  addInboxItem, addPlannerItem, inferPlannerType, normalizeLifeOS, localDateKey,
} from "../planner.js";

export const DEVICE_CALENDAR_ID = "device_calendar";

function plugin() {
  return globalThis.Capacitor?.Plugins?.LifeOS || null;
}

export function nativeLifeOSAvailable() {
  return Boolean(plugin());
}

export async function calendarPermissionStatus() {
  const p = plugin();
  if (!p?.permissionStatus) return { available: false, state: "unavailable" };
  try {
    const out = await p.permissionStatus();
    return { available: true, state: String(out?.calendar || "prompt").toLowerCase() };
  } catch {
    return { available: true, state: "unknown" };
  }
}

function dateFromMs(ms) {
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime())) return localDateKey();
  return localDateKey(d);
}

/**
 * Mezcla un espejo de eventos externos sin duplicados.
 * Dentro del rango consultado, lo borrado en el calendario externo desaparece.
 * El estado "done" se conserva si el usuario ya lo marcó en BAYONA.
 */
export function mergeDeviceCalendarEvents(life, events = [], range = {}) {
  const target = normalizeLifeOS(life);
  const fromDate = range.fromDate || "0000-00-00";
  const toDate = range.toDate || "9999-99-99";
  const incoming = (Array.isArray(events) ? events : []).filter((e) => e?.externalId && e?.date);
  const incomingIds = new Set(incoming.map((e) => String(e.externalId)));
  const previousByExternal = new Map(
    target.planner.items
      .filter((x) => x.source === DEVICE_CALENDAR_ID && x.externalId)
      .map((x) => [String(x.externalId), x])
  );

  target.planner.items = target.planner.items.filter((item) => {
    if (item.source !== DEVICE_CALENDAR_ID) return true;
    if (item.date < fromDate || item.date > toDate) return true;
    return incomingIds.has(String(item.externalId));
  });

  let created = 0, updated = 0;
  for (const raw of incoming) {
    const previous = previousByExternal.get(String(raw.externalId));
    const result = addPlannerItem(target, {
      title: String(raw.title || "Evento de calendario").trim() || "Evento de calendario",
      date: raw.date,
      start: raw.start || null,
      end: raw.end || null,
      allDay: Boolean(raw.allDay),
      type: inferPlannerType(`${raw.title || ""} ${raw.calendar || ""}`),
      priority: previous?.priority || "normal",
      status: previous?.status === "done" ? "done" : "planned",
      source: DEVICE_CALENDAR_ID,
      externalId: String(raw.externalId),
      location: raw.location || "",
      notes: raw.notes || "",
    });
    target.planner.items = result.life.planner.items;
    result.created ? created++ : updated++;
  }

  target.integrations.connections[DEVICE_CALENDAR_ID] = {
    connected: true,
    provider: DEVICE_CALENDAR_ID,
    lastSyncAt: new Date().toISOString(),
    count: incoming.length,
  };
  target.integrations.lastImportAt = new Date().toISOString();
  return { life: target, created, updated, count: incoming.length };
}

export async function syncDeviceCalendar(life, { askPermission = false, daysBefore = 7, daysAfter = 30 } = {}) {
  const p = plugin();
  if (!p) return { ok: false, reason: "not-native", life: normalizeLifeOS(life) };

  let permission = await calendarPermissionStatus();
  if (permission.state !== "granted" && askPermission) {
    try {
      const out = await p.requestCalendarPermission();
      permission = { available: true, state: String(out?.calendar || "prompt").toLowerCase() };
    } catch {
      permission = { available: true, state: "denied" };
    }
  }
  if (permission.state !== "granted") {
    return { ok: false, reason: permission.state || "permission", permission, life: normalizeLifeOS(life) };
  }

  const now = Date.now();
  const day = 86400000;
  const fromMs = now - Math.max(0, daysBefore) * day;
  const toMs = now + Math.max(1, daysAfter) * day;
  const fromDate = dateFromMs(fromMs);
  const toDate = dateFromMs(toMs);

  try {
    const payload = await p.calendarEvents({ fromMs, toMs });
    const merged = mergeDeviceCalendarEvents(life, payload?.events || [], { fromDate, toDate });
    return { ok: true, permission, ...merged };
  } catch (error) {
    return { ok: false, reason: "read-failed", error, permission, life: normalizeLifeOS(life) };
  }
}

export async function consumeNativeShare(life) {
  const p = plugin();
  const target = normalizeLifeOS(life);
  if (!p?.consumeShare) return { ok: false, reason: "not-native", life: target, created: false };
  try {
    const payload = await p.consumeShare();
    if (!payload?.shared) return { ok: true, life: target, created: false };
    const text = String(payload.text || "").trim();
    const title = String(payload.title || "").trim();
    const url = (text.match(/https?:\/\/[^\s<>()]+/i) || [])[0] || "";
    const result = addInboxItem(target, { title, text, url, source: "android_share" });
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, reason: "share-read-failed", error, life: target, created: false };
  }
}

export async function openNativeMap(query) {
  const q = String(query || "").trim();
  if (!q) return false;
  const p = plugin();
  if (p?.openMap) {
    try { await p.openMap({ query: q }); return true; } catch { /* fallback web */ }
  }
  if (typeof window !== "undefined") {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, "_blank", "noopener");
    return true;
  }
  return false;
}

export async function openNativeMusic(query = "workout") {
  const q = String(query || "workout").trim() || "workout";
  const p = plugin();
  if (p?.openMusic) {
    try { await p.openMusic({ query: q }); return true; } catch { /* fallback web */ }
  }
  if (typeof window !== "undefined") {
    window.open(`https://open.spotify.com/search/${encodeURIComponent(q)}`, "_blank", "noopener");
    return true;
  }
  return false;
}

function localEpoch(date, time = "00:00") {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = String(time || "00:00").match(/^(\d{2}):(\d{2})$/);
  if (!m || !t) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]), 0, 0);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
}

export async function addPlannerItemToSystemCalendar(item) {
  const p = plugin();
  if (!p?.createCalendarEvent || !item?.date) return false;
  const allDay = Boolean(item.allDay || !item.start);
  const beginMs = localEpoch(item.date, allDay ? "00:00" : item.start);
  if (beginMs == null) return false;
  const endMs = item.end
    ? localEpoch(item.date, item.end)
    : beginMs + (allDay ? 86400000 : 3600000);
  try {
    await p.createCalendarEvent({
      title: item.title || "BAYONA", beginMs, endMs, allDay,
      location: item.location || "", notes: item.notes || "",
    });
    return true;
  } catch { return false; }
}

export async function openNativeSettings() {
  const p = plugin();
  if (!p?.appSettings) return false;
  try { await p.appSettings(); return true; } catch { return false; }
}
