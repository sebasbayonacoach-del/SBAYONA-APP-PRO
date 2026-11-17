import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const handlers = new Map();
const notices = [];
const opened = [];
const scope = "https://bayona.example/app/";
const self = {
  location: { origin: "https://bayona.example" },
  registration: { scope, async showNotification(title, options) { notices.push({ title, options }); } },
  clients: {
    async matchAll() { return []; },
    async openWindow(url) { opened.push(url); return { url }; },
  },
  addEventListener(type, fn) { handlers.set(type, fn); },
};
runInNewContext(readFileSync(join(root, "sw.js"), "utf8"), {
  self, URL, Request, Response, console,
  location: self.location,
  caches: {}, fetch: async () => ({ status: 200 }),
});

let passed = 0;
async function push(value, malformed = false) {
  let held = Promise.resolve();
  handlers.get("push")({
    data: value == null ? undefined : { json() { if (malformed) throw Error("invalid"); return value; } },
    waitUntil(promise) { held = promise; },
  });
  await held;
}
function ok(condition, label) { assert.ok(condition, label); passed++; }
function valid(type, day = "2026-11-17") { return { source: "bayona", version: 1, type, day }; }

ok(handlers.has("push") && handlers.has("notificationclick"), "push y clic disponibles");
await push(null);
ok(notices.length === 0, "sin datos no muestra aviso");
await push({}, true);
ok(notices.length === 0, "payload JSON corrupto no muestra aviso");
await push({ ...valid("morning"), source: "otro" });
ok(notices.length === 0, "origen inválido no muestra aviso");
await push({ ...valid("morning"), version: 2 });
ok(notices.length === 0, "versión futura no aceptada");
await push(valid("unknown"));
ok(notices.length === 0, "tipo desconocido no muestra aviso");
await push(valid("morning", "../../etc"));
ok(notices.length === 0, "fecha inválida no muestra aviso");

await push({ ...valid("morning"), title: "Diagnóstico de salud", body: "datos privados", url: "https://evil.example" });
ok(notices.length === 1, "mañana notifica");
ok(!JSON.stringify(notices).includes("datos privados") && !JSON.stringify(notices).includes("evil.example"), "no muestra datos inyectados");
ok(notices[0].options.tag === "bayona-push:morning:2026-11-17", "etiqueta estable antiduplicados");
ok(notices[0].options.data.url === "./index.html?go=daily", "ruta mañana interna");

await push(valid("preTraining"));
ok(notices.length === 2 && notices[1].options.data.url.includes("go=training"), "entrenamiento abre su sección");
await push(valid("evening"));
ok(notices.length === 3 && notices[2].options.data.url.includes("go=daily"), "cierre abre hoy");
ok(notices.every((n) => !("requireInteraction" in n.options) && n.options.renotify === false), "no interrumpe persistentemente");

let pending;
handlers.get("notificationclick")({
  notification: { close() {}, data: notices[1].options.data },
  waitUntil(p) { pending = p; },
});
await pending;
ok(opened.length === 1 && opened[0].startsWith(scope) && opened[0].includes("go=training"), "clic abre ruta de la PWA");

handlers.get("notificationclick")({
  notification: { close() {}, data: { url: "https://malicioso.example/" } },
  waitUntil(p) { pending = p; },
});
ok(opened.length === 1, "clic no permite abrir otro origen");
console.log("APP 7.0 push-worker: " + passed + " comprobaciones PASS");
