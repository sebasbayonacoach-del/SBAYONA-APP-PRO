// BAYONA APP 6.0 · recordatorios accionables del día.
// Sin backend push este módulo solo entrega avisos cuando la aplicación está ejecutándose.
// No solicita permisos automáticamente, no envía consejos médicos ni inventa tareas.
import { planDelDia } from "../hoy.js";
import { scopedStorage } from "../sync/identity.js";

const STORAGE_KEY = "bayona.reminders.sent.v1";
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const windows = Object.freeze({ morning: [8 * 60, 11 * 60 + 30], evening: [20 * 60, 23 * 60 + 30] });

export function dayKey(date = new Date()) {
  const n = (x) => String(x).padStart(2, "0");
  return date.getFullYear() + "-" + n(date.getMonth() + 1) + "-" + n(date.getDate());
}

function minuteOfDay(date) { return date.getHours() * 60 + date.getMinutes(); }
function pendingItem(plan, id) {
  return (plan?.grupos || []).flatMap((g) => g.items || []).find((item) => item?.id === id && !item.done);
}

/** Devuelve como máximo un aviso accionable, nunca uno genérico de relleno. */
export function dueDailyReminder({ plan, preferences = {}, now = new Date(), sent = [] } = {}) {
  if (!preferences.asked || !(preferences.morning || preferences.preTraining || preferences.evening)) return null;
  const minute = minuteOfDay(now);
  const seen = new Set(sent);
  const date = dayKey(now);
  const next = plan?.siguiente;
  const workout = pendingItem(plan, "sesion");

  if (preferences.morning && minute >= windows.morning[0] && minute <= windows.morning[1] && next && !seen.has(date + ":morning")) {
    return { id: date + ":morning", title: "BAYONA · Tu siguiente paso", body: "Tienes una acción pendiente en tu plan. Abre BAYONA para verla.", detail: next.titulo, url: "./index.html?go=daily" };
  }

  const requestedTime = TIME_PATTERN.test(preferences.preTrainingAt || "") ? preferences.preTrainingAt : null;
  if (preferences.preTraining && requestedTime && workout && !seen.has(date + ":preTraining")) {
    const [h, m] = requestedTime.split(":").map(Number);
    const at = h * 60 + m;
    if (minute >= at && minute <= at + 45) {
      return { id: date + ":preTraining", title: "BAYONA · Entrenamiento pendiente", body: "Tu sesión programada sigue pendiente. Revisa tu rutina antes de empezar.", detail: workout.titulo, url: "./index.html?go=training" };
    }
  }

  const checkin = pendingItem(plan, "checkin");
  if (preferences.evening && minute >= windows.evening[0] && minute <= windows.evening[1] && checkin && !seen.has(date + ":evening")) {
    return { id: date + ":evening", title: "BAYONA · Cierra tu día", body: "Aún puedes registrar cómo te has encontrado hoy. Te lleva unos segundos.", detail: checkin.titulo, url: "./index.html?go=daily" };
  }
  return null;
}

function readSent(store) {
  try {
    const value = JSON.parse(store?.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string").slice(-24) : [];
  } catch { return []; }
}
function writeSent(store, items) {
  try { store?.setItem(STORAGE_KEY, JSON.stringify(items.slice(-24))); } catch { /* almacenamiento bloqueado: no ocultar fallos */ }
}

async function sendSystemNotice(notice) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const options = { body: notice.body, icon: "./icon-192.png", badge: "./icon-192.png", tag: notice.id, renotify: false, data: { url: notice.url } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.("./");
    if (reg?.showNotification) { await reg.showNotification(notice.title, options); return true; }
    // Solo para navegadores de escritorio; Android exige service worker.
    if (typeof window !== "undefined" && !/Android|iPhone|iPad/i.test(navigator.userAgent || "")) {
      new Notification(notice.title, options);
      return true;
    }
  } catch { /* el navegador puede bloquear la notificación aunque haya permiso */ }
  return false;
}

export function startDailyReminders(S) {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  let busy = false;
  let stopped = false;
  const check = async () => {
    if (busy || stopped || !["affiliate", "athlete"].includes(document.body?.dataset.entryRole)) return;
    if (!S.data?.profile?.onboarded) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    busy = true;
    try {
      const store = scopedStorage();
      const sent = readSent(store);
      const notice = dueDailyReminder({ plan: planDelDia(S), preferences: S.data.profile.notificationPreferences, sent });
      if (notice && await sendSystemNotice(notice)) writeSent(store, [...sent, notice.id]);
    } catch { /* un aviso nunca rompe la sesión */ }
    finally { busy = false; }
  };
  const onVisibility = () => { if (!document.hidden) void check(); };
  const onFocus = () => { void check(); };
  window.addEventListener("bayona:notification-preferences", onFocus);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  const interval = window.setInterval(check, 60000);
  const boot = window.setTimeout(check, 2400);
  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.clearTimeout(boot);
    window.removeEventListener("bayona:notification-preferences", onFocus);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Controles explícitos y reversibles; nunca habilitamos notificaciones por defecto. */
export function appendReminderSettings(body, S, toast) {
  if (!body || typeof document === "undefined") return;
  const prefs = S.data?.profile?.notificationPreferences || {};
  const card = document.createElement("section");
  card.className = "card";
  const title = document.createElement("h4"); title.textContent = "AVISOS QUE SÍ SIRVEN";
  const info = document.createElement("p");
  info.className = "sub";
  info.textContent = "Recibe avisos de acciones reales: tu siguiente tarea, una sesión pendiente y el check-in. Máximo uno por momento elegido.";
  card.append(title, info);
  const rows = [
    ["morning", "Al empezar el día (08:00–11:30)"],
    ["preTraining", "Antes de entrenar (elige la hora)"],
    ["evening", "Al cerrar el día (20:00–23:30)"],
  ];
  const inputs = {};
  for (const [key, label] of rows) {
    const row = document.createElement("label");
    row.className = "bayona-reminder-choice";
    const input = document.createElement("input");
    input.type = "checkbox"; input.checked = Boolean(prefs[key]);
    inputs[key] = input;
    const span = document.createElement("span"); span.textContent = label;
    row.append(input, span);
    card.append(row);
  }
  const timeLabel = document.createElement("label");
  timeLabel.className = "bayona-reminder-time";
  timeLabel.textContent = "Hora aproximada de tu entrenamiento";
  const time = document.createElement("input");
  time.type = "time"; time.value = TIME_PATTERN.test(prefs.preTrainingAt || "") ? prefs.preTrainingAt : "18:00";
  time.setAttribute("aria-label", "Hora del recordatorio de entrenamiento");
  timeLabel.append(time); card.append(timeLabel);
  const status = document.createElement("p");
  status.className = "bayona-reminder-note";
  status.textContent = "Versión actual: avisos mientras BAYONA está ejecutándose. Para recibirlos con la app cerrada falta activar el servicio push del servidor.";
  card.append(status);
  const button = document.createElement("button");
  button.type = "button"; button.className = "btn btn-primary btn-block";
  button.textContent = "GUARDAR RECORDATORIOS";
  button.style.marginTop = "10px";
  button.onclick = async () => {
    const selected = rows.some(([key]) => inputs[key].checked);
    const next = { ...prefs, morning: inputs.morning.checked, preTraining: inputs.preTraining.checked, evening: inputs.evening.checked,
      preTrainingAt: inputs.preTraining.checked && TIME_PATTERN.test(time.value) ? time.value : "", asked: true };
    S.data.profile.notificationPreferences = next;
    S.save();
    if (selected && typeof Notification !== "undefined" && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* permiso voluntario */ }
    }
    window.dispatchEvent(new Event("bayona:notification-preferences"));
    const permission = typeof Notification === "undefined" ? "no disponible" : Notification.permission;
    toast("RECORDATORIOS GUARDADOS", selected ? "Permiso del dispositivo: " + permission + ". Avisos mientras BAYONA esté abierta." : "Todos los recordatorios desactivados.");
  };
  card.append(button);
  body.appendChild(card);
}
