import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  activeOrNextItem, addInboxItem, addPlannerItem, completePlannerItem, datePlusDays,
  dayProgress, exportICS, findConflicts, importICSIntoLife,
  inboxItems, localDateKey, normalizeLifeOS, parseICS, parsePlannerIntent, plannerItemsForDate, removeInboxItem,
  removePlannerItem, updatePlannerItem,
} from "../js/planner.js";
import { INTEGRATIONS, integrationStatus } from "../js/integrations/catalog.js";
import { mergeDeviceCalendarEvents } from "../js/integrations/native-context.js";
import { decideNow } from "../js/now.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
let ok = 0;
const check = (cond, msg) => { assert(cond, msg); ok++; console.log("  ✅", msg); };

console.log("\n🗓️ BAYONA LIFE OS · PLANIFICADOR\n");

let life = normalizeLifeOS({});
check(Array.isArray(life.planner.items) && life.planner.items.length === 0, "estado nuevo tiene agenda vacía");

let a = addPlannerItem(life, {
  title: "Trabajo",
  date: "2026-10-11",
  start: "08:00",
  end: "14:00",
  type: "work",
}, { id: "pl_work" });
life = a.life;
check(a.created && a.item.id === "pl_work", "crea un bloque real del día");

let b = addPlannerItem(life, {
  title: "Gimnasio",
  date: "2026-10-11",
  start: "13:30",
  end: "14:30",
  type: "training",
}, { id: "pl_gym" });
life = b.life;
check(findConflicts(life, "2026-10-11").length === 1, "detecta solapamientos horarios");

let moved = updatePlannerItem(life, "pl_gym", { start: "18:00", end: "19:00" });
life = moved.life;
check(findConflicts(life, "2026-10-11").length === 0, "mover un bloque resuelve el conflicto");
check(plannerItemsForDate(life, "2026-10-11")[1].title === "Gimnasio", "la agenda queda ordenada por hora");

const now = new Date(2026, 9, 11, 8, 30);
const current = activeOrNextItem(life, now);
check(current.state === "active" && current.item.id === "pl_work", "detecta qué bloque está ocurriendo ahora");

let done = completePlannerItem(life, "pl_work", true);
life = done.life;
check(dayProgress(life, "2026-10-11").done === 1, "marcar terminado actualiza progreso del día");

const later = activeOrNextItem(life, new Date(2026, 9, 11, 17, 30));
check(later.state === "next" && later.item.id === "pl_gym" && later.minutesUntil === 30, "detecta el siguiente bloque y cuánto falta");

const decision = decideNow({
  now: new Date(2026, 9, 11, 17, 30),
  profile: { name: "Ana" },
  today: { trained: false },
  readinessDetail: { score: 80 },
  plannerContext: later,
  workout: { id: "op_upper", name: "Superior", min: 45 },
  history: [],
});
check(decision.action === "planner" && /Gimnasio/i.test(decision.title), "BAYONA NOW respeta una cita próxima antes de sugerir otra cosa");

const ics = exportICS(plannerItemsForDate(life, "2026-10-11"), { calendarName: "BAYONA TEST" });
check(ics.includes("BEGIN:VCALENDAR") && ics.includes("SUMMARY:Gimnasio"), "exporta el día a calendario ICS estándar");

const parsed = parseICS(ics);
check(parsed.length === 2, "reimporta los eventos exportados");
check(parsed.some((x) => x.title === "Gimnasio" && x.start === "18:00"), "preserva hora y título al reimportar");

let imported = importICSIntoLife(normalizeLifeOS({}), ics, { source: "ics" });
check(imported.created === 2 && imported.life.planner.items.length === 2, "importación ICS crea los eventos");
const importedAgain = importICSIntoLife(imported.life, ics, { source: "ics" });
check(importedAgain.created === 0 && importedAgain.updated === 2 && importedAgain.life.planner.items.length === 2, "reimportar el mismo calendario no duplica eventos");

const removed = removePlannerItem(life, "pl_work");
check(removed.removed === 1 && plannerItemsForDate(removed.life, "2026-10-11").length === 1, "eliminar bloque no toca los demás");

check(datePlusDays("2026-10-31", 1) === "2026-11-01", "navegación de fecha cruza meses correctamente");
check(localDateKey(new Date(2026, 0, 2, 12)) === "2026-01-02", "fecha local no depende de UTC");

check(INTEGRATIONS.some((x) => x.id === "google_calendar") && INTEGRATIONS.some((x) => x.id === "apple_health"), "catálogo contempla calendario y salud externos");
check(integrationStatus(normalizeLifeOS({}), "ics").connected === true, "ICS funciona sin OAuth");
check(integrationStatus(normalizeLifeOS({}), "google_calendar").connected === false, "una integración OAuth no finge estar conectada");

const intent = parsePlannerIntent("mañana trabajo de 8 a 14, gimnasio a las 18 y llamar a mamá a las 20", {
  now: new Date(2026, 9, 10, 12),
  defaultDurationMin: 60,
});
check(intent.length === 3, "CORE local extrae varios bloques de una frase");
check(intent[0].date === "2026-10-11" && intent[0].start === "08:00" && intent[0].end === "14:00", "respeta fecha y rango explícitos");
check(intent[1].type === "training" && intent[1].start === "18:00", "infiere entrenamiento sin inventar la hora");
check(intent[2].type === "personal" && intent[2].start === "20:00", "identifica un compromiso personal");

const migration = readFileSync(resolve(root, "api/supabase/migrations/0006_life_os.sql"), "utf8");
check(migration.includes("create table if not exists planner_items") && migration.includes("alter table planner_items enable row level security"), "cloud define planner_items con RLS");
check(migration.includes("auth.uid() = user_id"), "RLS limita bloques y conexiones al usuario autenticado");
check(migration.includes("connected_sources") && migration.includes("not (metadata ? 'access_token')"), "metadatos de conexiones rechazan access tokens");

const account = readFileSync(resolve(root, "js/sync/account.js"), "utf8");
check(account.includes("async function pushPlanner()") &&
  account.includes('upsert("planner_items"') &&
  account.includes('on_conflict: "user_id,client_id"') &&
  !account.includes('remove("planner_items"') &&
  !account.includes("const stale ="),
  "sincronización incremental no borra eventos creados en otros dispositivos");
check(account.includes('addEventListener("bayona:planner", sincroSuave)'), "cambios del día entran en la cola de sync");

const sw = readFileSync(resolve(root, "sw.js"), "utf8");
check(sw.includes('"./js/planner.js"') && sw.includes('"./js/ui/planner.js"') && sw.includes('"./js/integrations/catalog.js"'), "Life OS está disponible en el shell offline");

let nativeLife = normalizeLifeOS({});
let mergedNative = mergeDeviceCalendarEvents(nativeLife, [
  { externalId:"42:1000", date:"2026-10-11", start:"09:00", end:"10:00", title:"Reunión", calendar:"Trabajo" },
], { fromDate:"2026-10-11", toDate:"2026-10-12" });
nativeLife = mergedNative.life;
check(mergedNative.count === 1 && nativeLife.planner.items[0].source === "device_calendar", "calendario Android entra con fuente explícita");
mergedNative = mergeDeviceCalendarEvents(nativeLife, [
  { externalId:"42:1000", date:"2026-10-11", start:"09:30", end:"10:30", title:"Reunión movida", calendar:"Trabajo" },
], { fromDate:"2026-10-11", toDate:"2026-10-12" });
check(mergedNative.life.planner.items.length === 1 && mergedNative.life.planner.items[0].start === "09:30", "re-sincronizar actualiza y no duplica eventos nativos");
mergedNative = mergeDeviceCalendarEvents(mergedNative.life, [], { fromDate:"2026-10-11", toDate:"2026-10-12" });
check(mergedNative.life.planner.items.length === 0, "si desaparece del calendario externo, desaparece del espejo del rango");

let inboxLife = normalizeLifeOS({});
let inbox = addInboxItem(inboxLife, { id:"inbox_1", title:"Correo", text:"Responder propuesta mañana", source:"android_share" });
inboxLife = inbox.life;
check(inbox.created && inboxItems(inboxLife).length === 1, "BAYONA Inbox recibe contenido compartido");
const dupInbox = addInboxItem(inboxLife, { id:"inbox_2", title:"Correo", text:"Responder propuesta mañana", source:"android_share" });
check(!dupInbox.created && dupInbox.life.inbox.length === 1, "Inbox deduplica el mismo contenido compartido");
check(removeInboxItem(inboxLife, "inbox_1").removed === 1, "Inbox permite descartar contexto sin tocar el planificador");

const manifest = readFileSync(resolve(root, "mobile/android/app/src/main/AndroidManifest.xml"), "utf8");
const nativePlugin = readFileSync(resolve(root, "mobile/android/app/src/main/java/app/bayona/fit/LifeOSPlugin.java"), "utf8");
const activity = readFileSync(resolve(root, "mobile/android/app/src/main/java/app/bayona/fit/MainActivity.java"), "utf8");
check(manifest.includes("android.permission.READ_CALENDAR") && manifest.includes("android.intent.action.SEND"), "Android declara calendario de lectura + compartir hacia BAYONA");
check(nativePlugin.includes("CalendarContract.Instances") && nativePlugin.includes("consumeShare") && nativePlugin.includes("openMap") && nativePlugin.includes("openMusic"), "plugin nativo implementa calendario, Inbox, Maps y música");
check(activity.includes("registerPlugin(LifeOSPlugin.class)") && activity.includes("onNewIntent"), "MainActivity registra LifeOS y recibe shares con la app abierta");

console.log("\n📊 RESULTADO: " + ok + " comprobaciones · 0 fallos\n");
