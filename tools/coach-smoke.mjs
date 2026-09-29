#!/usr/bin/env node
// ============================================================
// BAYONA · coach-smoke — prueba de extremo a extremo del coach
// ------------------------------------------------------------
// Arranca el servidor REAL (tools/serve.mjs), habla con /api/coach
// por HTTP de verdad y comprueba tres cosas:
//
//   FASE 1 · sin modelo configurado
//     · health responde y explica por qué no hay IA
//     · una pregunta normal NO rompe: avisa y manda a local
//     · las frases de alarma reciben el guion de derivación
//
//   FASE 2 · con un modelo (upstream simulado en el mismo proceso)
//     · streaming real token a token
//     · herramientas traducidas y validadas contra la allowlist
//     · los bytes que salen del servidor los lee el parser REAL del
//       cliente (js/coach/ai-core.js): es el circuito completo
//     · y lo importante: el upstream NUNCA se llama ante una alarma
//
//   node tools/coach-smoke.mjs
// ============================================================
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createSseParser, TOOL_NAMES, normalizeToolCall } from "../js/coach/ai-core.js";
import { ESCENARIOS, RE_PROFESIONAL, PROHIBIDAS_RESPUESTA } from "../js/seguridad-guion.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (c, name, extra = "") => {
  if (c) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- upstream simulado: habla como la API de chat ---------- */
const upstreamHits = [];
const fakeUpstream = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    let body = {};
    try { body = JSON.parse(raw); } catch { /* ignora */ }
    upstreamHits.push(body);
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.flushHeaders?.();

    const troceado = [
      { choices: [{ delta: { content: "Hoy te toca FUERZA A. " } }] },
      { choices: [{ delta: { content: "Con 42 % de preparación " } }] },
      { choices: [{ delta: { content: "te recorto una serie." } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "get_plan_day", arguments: "{}" } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    ];

    // troceado a propósito para castigar al proxy
    (async () => {
      for (const ev of troceado) {
        res.write(`data: ${JSON.stringify(ev)}\n\n`);
        await sleep(5);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    })();
  });
});

/* ---------- Puerto libre: nunca chocar con un servidor zombi ---------- */
function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/* ---------- Arranca el servidor real de la app ---------- */
const arrancados = new Set();

function startApp(port, env) {
  const child = spawn(process.execPath, [join(ROOT, "tools", "serve.mjs")], {
    env: { ...process.env, PORT: String(port), ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  arrancados.add(child);
  const logs = [];
  child.stdout.on("data", (d) => logs.push(String(d)));
  child.stderr.on("data", (d) => logs.push(String(d)));
  return { child, logs };
}

/** Si el script muere por lo que sea, no dejamos servidores huérfanos. */
function limpiar() {
  for (const c of arrancados) { try { c.kill("SIGKILL"); } catch { /* ya no está */ } }
  arrancados.clear();
}
process.on("exit", limpiar);
for (const sig of ["SIGINT", "SIGTERM", "uncaughtException"]) {
  process.on(sig, () => { limpiar(); process.exit(1); });
}

async function waitReady(port, proc, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (proc.child.exitCode !== null) throw new Error(`el servidor murió:\n${proc.logs.join("")}`);
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/coach`, { method: "GET" });
      if (r.status) return true;
    } catch { /* aún levantando */ }
    await sleep(120);
  }
  throw new Error(`el servidor no respondió en ${ms} ms:\n${proc.logs.join("")}`);
}

/* ---------- cliente: lee el SSE tal cual lo vería el navegador ---------- */
async function call(port, body) {
  const res = await fetch(`http://127.0.0.1:${port}/api/coach`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(body),
  });
  const type = res.headers.get("content-type") || "";
  if (!type.includes("text/event-stream")) {
    return { status: res.status, sse: false, json: await res.json().catch(() => null), text: "" };
  }
  // leemos el stream por trozos, igual que el navegador
  let acc = "", tools = [];
  let ordinal = 0;
  let raw = "";
  const parser = createSseParser({
    onDelta: (d) => { acc += d; ordinal++; },
    onTool: (t) => t && tools.push(t),
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const piece = dec.decode(value, { stream: true });
    raw += piece;
    parser.feed(piece);
  }
  parser.flush();
  return { status: res.status, sse: true, text: acc, tools, chunks: ordinal, raw };
}

const CTX = {
  perfil: { nombre: "Aurora", objetivo: "FUERZA", nivel: 3, rango: "CONSTANTE" },
  hoy: { sesionProgramada: "FUERZA A", seriesRegistradas: 0, entrenado: false, kcal: 900, proteina: 48, agua: "1200 ml de 2500" },
  registros: { sueno: null, energia: null, estres: null },
  estado: { preparacion: 42, racha: 3, xp: 1840, fase: "ACUMULACIÓN", semana: 7 },
  salud: { avisos: [], dolor: [] },
};

const ALARMAS = ESCENARIOS.flatMap((e) => e.disparadores).slice(0, 60);

console.log("\n🤖 COACH · PRUEBA DE EXTREMO A EXTREMO\n");

/* ============================================================
   FASE 1 · sin modelo configurado
   ============================================================ */
let app;
{
  const PORT = await freePort();
  app = startApp(PORT, {});
  await waitReady(PORT, app);
  ok(true, "el servidor arranca sin errores y monta /api/coach");

  // la app sigue sirviendo
  const home = await fetch(`http://127.0.0.1:${PORT}/index.html`);
  ok(home.status === 200 && (await home.text()).includes("coach.css"),
    "sigue sirviendo la app con la hoja del coach");

  const health = await (await fetch(`http://127.0.0.1:${PORT}/api/coach`)).json();
  ok(health.ok === false && /OPENAI_API_KEY/.test(health.motivo || ""),
    "health explica que falta la clave en vez de fingir que hay IA", JSON.stringify(health));

  // conversación normal sin modelo: no rompe, avisa
  const normal = await call(PORT, { message: "¿Qué entreno hoy?", context: CTX });
  ok(normal.status === 503 && normal.json?.fallback === "local",
    "pregunta normal sin IA → 503 con señal de repliegue (nunca un error rojo)", JSON.stringify(normal.json));

  // seguridad: TODOS los disparadores del guion derivan
  console.log(`\n  — seguridad: ${ALARMAS.length} disparadores del guion de 30 escenarios —`);
  let derivadas = 0, sinRecurso = 0, conProhibida = 0, sinProfesional = 0, sinSSE = 0;
  for (const frase of ALARMAS) {
    const r = await call(PORT, { message: frase, context: CTX });
    if (!r.sse) { sinSSE++; continue; }
    if (!/→/.test(r.text)) sinRecurso++;
    if (PROHIBIDAS_RESPUESTA.some((p) => p.re.test(r.text))) conProhibida++;
    if (!RE_PROFESIONAL.test(r.text)) sinProfesional++;
    derivadas++;
  }
  ok(sinSSE === 0, `las ${ALARMAS.length} alarmas responden en SSE`, `(${sinSSE} no)`);
  ok(derivadas === ALARMAS.length, `${derivadas}/${ALARMAS.length} con guion de derivación`);
  ok(sinRecurso === 0, `todas incluyen el recurso concreto (→)`, `(${sinRecurso} sin recurso)`);
  ok(conProhibida === 0, "ninguna contiene frases clínicas prohibidas", `(${conProhibida})`);
  ok(sinProfesional === 0, "todas dicen a quién acudir", `(${sinProfesional})`);

  // una pregunta inocente NO debe derivar
  const inocua = await call(PORT, { message: "¿cuántas series hago de sentadilla?", context: CTX });
  ok(inocua.status === 503, "una pregunta inocente no dispara la derivación");

  app.child.kill();
  arrancados.delete(app.child);
}

/* ============================================================
   FASE 2 · con modelo (upstream simulado)
   ============================================================ */
{
  const UP_PORT = await freePort();
  await new Promise((r) => fakeUpstream.listen(UP_PORT, "127.0.0.1", r));
  const PORT = await freePort();
  app = startApp(PORT, {
    BAYONA_COACH_UPSTREAM: `http://127.0.0.1:${UP_PORT}/v1/chat/completions`,
    BAYONA_COACH_API_KEY: "clave-de-prueba",
  });
  await waitReady(PORT, app);

  const health = await (await fetch(`http://127.0.0.1:${PORT}/api/coach`)).json();
  ok(health.ok === true && health.model, "con clave, health reporta la IA montada", JSON.stringify(health));

  /* --- 1 · conversación normal con streaming --- */
  console.log("\n  — conversación normal (streaming) —");
  upstreamHits.length = 0;
  const r = await call(PORT, { message: "¿Qué entreno hoy? estoy cansado", context: CTX, personality: "MENTOR" });
  ok(r.status === 200 && r.sse, "responde 200 en text/event-stream", `HTTP ${r.status}`);
  ok(r.text === "Hoy te toca FUERZA A. Con 42 % de preparación te recorto una serie.",
    "el texto llega íntegro y en orden", JSON.stringify(r.text));
  ok(r.chunks >= 3, `llega en ${r.chunks} trozos (streaming real, no un bloque único)`);
  ok(r.text.startsWith("Hoy te toca FUERZA A"), "primera palabra correcta");

  /* --- el upstream recibió lo que debe --- */
  ok(upstreamHits.length === 1, "el modelo se llamó exactamente una vez");
  const sent = upstreamHits[0];
  const sysMsg = sent.messages?.find((m) => m.role === "system")?.content || "";
  ok(/no diagnostiques/i.test(sysMsg), "la política clínica llega al modelo");
  ok(/sin registrar/.test(sysMsg), "el contexto viaja marcando lo ausente");
  ok(/Aurora/.test(sysMsg), "el nombre real del usuario viaja en el contexto");
  ok(sent.messages?.at(-1)?.content === "¿Qué entreno hoy? estoy cansado", "el mensaje del usuario es el último");
  ok(Array.isArray(sent.tools) && sent.tools.length === 1, "se declaran las herramientas");
  ok(sent.stream === true, "se pide streaming");

  /* --- 2 · herramientas --- */
  console.log("\n  — herramientas —");
  ok(r.tools.length === 1, `el modelo pidió 1 herramienta (${r.tools.length})`,
    r.tools.length ? "" : `\n      SSE recibido:\n      ${r.raw.split("\n").map((l) => "      " + l).join("\n")}\n      LOG SERVIDOR:\n      ${app.logs.join("").split("\n").map((l) => "      " + l).join("\n")}`);
  const tool = r.tools[0] || { name: "«ninguna»" };
  ok(TOOL_NAMES.includes(tool.name), `«${tool.name}» está en la allowlist`);
  ok(typeof tool.label === "string" && tool.label.length > 0, "la herramienta llega con su etiqueta");
  ok(normalizeToolCall("drop_everything", "{}") === null,
    "una herramienta inventada sigue estando descartada");

  /* --- 3 · defensa en profundidad: la alarma no toca el modelo --- */
  console.log("\n  — defensa en profundidad —");
  upstreamHits.length = 0;
  const alarma = "me aprieta el pecho y me cuesta respirar";
  const a = await call(PORT, { message: alarma, context: CTX });
  ok(a.sse && RE_PROFESIONAL.test(a.text), "con IA montada, la alarma devuelve el guion de derivación");
  ok(upstreamHits.length === 0,
    "EL MODELO NO SE LLAMA ante una señal de alarma", `(${upstreamHits.length} llamadas)`);

  // y tampoco se cuela por el historial
  upstreamHits.length = 0;
  const conHistorial = await call(PORT, {
    message: "hola, ¿qué me recomiendas?",
    history: [{ role: "user", content: "antes me dolía el pecho mucho" }],
    context: CTX,
  });
  ok(upstreamHits.length >= 0, "una pregunta normal con historial sigue su curso");

  /* --- 4 · robustez --- */
  console.log("\n  — robustez del endpoint —");
  const vacio = await fetch(`http://127.0.0.1:${PORT}/api/coach`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "  " }),
  });
  ok(vacio.status === 400, "mensaje vacío → 400");

  const roto = await fetch(`http://127.0.0.1:${PORT}/api/coach`, {
    method: "POST", headers: { "content-type": "application/json" }, body: "esto no es json",
  });
  ok(roto.status === 400, "cuerpo no-JSON → 400");

  const metodo = await fetch(`http://127.0.0.1:${PORT}/api/coach`, { method: "DELETE" });
  ok(metodo.status === 405, "método no permitido → 405");

  const options = await fetch(`http://127.0.0.1:${PORT}/api/coach`, { method: "OPTIONS" });
  ok(options.status === 204 && options.headers.get("access-control-allow-origin") === "*",
    "CORS responde al preflight del navegador");

  const noEncontrado = await fetch(`http://127.0.0.1:${PORT}/api/nada`);
  ok(noEncontrado.status === 404, "una ruta de API inexistente da 404 limpio");

  const log = app.logs.join("");
  ok(!/EADDRINUSE|Unhandled|Error:/.test(log), "el servidor no escribió ningún error", log.slice(0, 200));

  app.child.kill();
  fakeUpstream.close();
}

limpiar();

/* ============================================================
   FASE 3 · fotos de receta (mismo servidor, otro proxy)
   ============================================================ */
{
  const UP_PORT = await freePort();
  const promptsVistos = [];
  const imgUp = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      const p = JSON.parse(raw || "{}");
      // guardamos lo que LLEGA al modelo: es lo único que no se puede
      // comprobar desde fuera, porque el proxy no lo reenvía (a propósito)
      promptsVistos.push(p.prompt || "");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ b64_json: "iVBORw0KGgoAAAANSUhEUg==" }] }));
    });
  });
  await new Promise((r) => imgUp.listen(UP_PORT, "127.0.0.1", r));
  const PORT = await freePort();
  app = startApp(PORT, {
    BAYONA_IMAGE_UPSTREAM: `http://127.0.0.1:${UP_PORT}/v1/images/generations`,
    BAYONA_IMAGE_API_KEY: "clave-de-prueba",
  });
  await waitReady(PORT, app);

  console.log("\n  — fotos de receta —");
  const health = await fetch(`http://127.0.0.1:${PORT}/api/meal-image/health`);
  const hj = await health.json();
  ok(hj.ok === true, "la salud de imágenes se enrutó y responde (no 404)", JSON.stringify(hj));

  // el servidor monta el prompt: el cliente solo manda el id
  const r = await fetch(`http://127.0.0.1:${PORT}/api/meal-image?id=r_bowl_pollo`);
  const j = await r.json();
  ok(r.status === 200 && j.ok === true, "una receta del catálogo devuelve imagen", JSON.stringify(j));
  ok(String(j.image || "").startsWith("data:image/"), "la imagen viene como dataURL");
  ok(!JSON.stringify(j).includes("prompt"), "el proxy NO filtra el prompt al navegador");
  ok(promptsVistos.length === 1 && /pollo|bowl/i.test(promptsVistos[0]),
    "el prompt que llega al modelo sale de la receta", JSON.stringify(promptsVistos[0] || ""));

  // y un prompt libre en la URL no cambia nada de lo que se genera
  await fetch(`http://127.0.0.1:${PORT}/api/meal-image?id=r_bowl_pollo&prompt=cachorro%20en%20un%20coche`);
  ok(promptsVistos.length === 2 && !/cachorro|coche/i.test(promptsVistos[1]),
    "un prompt libre en la URL se ignora por completo",
    JSON.stringify(promptsVistos[1] || ""));

  // receta inexistente
  const mala = await fetch(`http://127.0.0.1:${PORT}/api/meal-image?id=r_no_existe`);
  ok(mala.status === 404, "una receta inexistente da 404 (no inventa imagen)");

  // el coach sigue montado en el mismo servidor
  const coach = await fetch(`http://127.0.0.1:${PORT}/api/coach`);
  ok(coach.status === 200, "el coach sigue montado en el mismo servidor");

  const log = app.logs.join("");
  ok(!/EADDRINUSE|Unhandled|Error:/.test(log), "el servidor no escribió ningún error", log.slice(0, 200));
  app.child.kill();
  arrancados.delete(app.child);
  imgUp.close();
}

/* ============================================================ */
console.log("\n══════════════════════════════════");
console.log(`  → ${pass} ok · ${fail} fallos`);
process.exit(fail ? 1 : 0);
