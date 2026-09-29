// ============================================================
// coach-ai-eval.mjs — el coach de IA no puede romper lo que ya funciona.
// (node tests/coach-ai-eval.mjs)
//
// Qué fija este archivo:
//   · la puerta de seguridad corre ANTES de cualquier salida a la red,
//     tanto en el cliente como en el proxy de Node;
//   · el contexto solo lleva datos reales: un ausente se dice, no se inventa;
//   · las herramientas son una lista cerrada y se validan antes de ejecutarse;
//   · el parser SSE sobrevive a cortes de chunk a mitad de línea;
//   · sin endpoint o con fallo de red, el coach sigue con el motor local;
//   · el proxy NO necesita clave para responder con seguridad.
//
// Es la red de seguridad de un sistema que llama a un modelo de lenguaje.
// Si esto se rompe, se rompe la promesa de todo el producto.
// ============================================================
import { S } from "../js/state.js";
import * as C from "../js/coach/ai.js";
import {
  decideRoute, createSseParser, normalizeToolCall, toolSchema, buildSystemPrompt,
  trimHistory, contextToPrompt, COACH_TOOLS, TOOL_NAMES, SIN_REGISTRAR,
} from "../js/coach/ai-core.js";
import { detectarRiesgo, PROHIBIDAS_RESPUESTA, RE_PROFESIONAL } from "../js/seguridad-guion.js";

let pass = 0, fail = 0;
const assert = (cond, name, extra = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

console.log("\n🤖 CORE→IA · COACH CONVERSACIONAL\n");

/* ============================================================
   1 · LA SEGURIDAD VA PRIMERO, SIEMPRE
   ============================================================ */
console.log("— puerta de seguridad —");
{
  // frases tomadas del guion real de 30 escenarios, no inventadas aquí
  const frases = [
    "me aprieta el pecho desde hace una hora",            // #5  cardio
    "me cuesta respirar y me ahogo al subir escaleras",  // #6  cardio
    "se me ha salido la rodilla de sitio entrenando",     // #16 musculoesqueletico
    "a veces pienso en hacerme daño",                     // #2  salud mental
    "tuve una convulsion en el gimnasio",                 // #12 neurologico
  ];
  let derivadas = 0;
  const categorias = new Set();
  for (const frase of frases) {
    const r = decideRoute(frase, { cloud: true, online: true });
    if (r.mode === "refer" && r.derivacion?.esDerivacion) { derivadas++; categorias.add(r.deteccion.categoria); }
  }
  assert(derivadas === frases.length,
    `${frases.length}/${frases.length} frases de alarma derivan aunque haya endpoint y red`,
    `(${derivadas}/${frases.length})`);
  assert(categorias.size === 4, `cubren ${categorias.size} categorías distintas de riesgo`,
    [...categorias].join(", "));

  const sinNube = decideRoute("me aprieta el pecho", { cloud: false });
  assert(sinNube.mode === "refer", "deriva igual sin endpoint configurado");

  // la nube nunca se pide para una frase de riesgo
  const inocuas = [
    "hola, ¿qué entreno hoy?",
    "¿cuántas series hago de sentadilla?",
    "quiero ganar masa, ¿cómo organizo la semana?",
    "me duelen las piernas del entrenamiento de ayer",
    "tengo 40 años y quiero empezar a correr",
  ];
  const falsos = inocuas.filter((f) => decideRoute(f, { cloud: true }).mode === "refer");
  assert(falsos.length === 0, `0 falsos positivos en ${inocuas.length} frases normales`,
    falsos.join(" | "));

  // el guion que sale al usuario cumple el contrato de seguridad
  const d = decideRoute("me aprieta el pecho desde hace una hora", {}).derivacion;
  const texto = C.derivacionATexto(d);
  assert(RE_PROFESIONAL.test(texto), "el guion de derivación menciona a quién acudir");
  const prohibida = PROHIBIDAS_RESPUESTA.filter((p) => p.re.test(texto));
  assert(prohibida.length === 0, "el guion de derivación no contiene frases clínicas prohibidas",
    prohibida.map((p) => p.motivo).join(" | "));
  assert(texto.includes("→"), "el guion incluye el recurso concreto, no solo un aviso");
}

/* ============================================================
   2 · EL CONTEXTO NO INVENTA NADA
   ============================================================ */
console.log("\n— contexto real, cero invención —");
{
  S.init();
  S.reset(true);
  S.data.profile.name = "Aurora";
  S.data.profile.goal = "FUERZA";
  S.data.today.sleep = null;      // sin registrar
  S.data.today.energy = null;
  S.data.today.water = 1200;

  const ctx = C.buildCoachContext();
  assert(!!ctx, "el contexto se construye desde el estado real");
  assert(ctx.perfil.nombre === "Aurora", "usa el nombre del perfil");
  assert(ctx.registros.sueno === null, "sueño sin registrar sale como null, no como 0 ni 7");
  assert(ctx.hoy.agua === "1200 ml de 2500", "la hidratación va con su objetivo explícito");

  const p = contextToPrompt(ctx);
  assert(p.includes(SIN_REGISTRAR), `el prompt dice literalmente «${SIN_REGISTRAR}»`);
  assert(p.includes("sueno: sin registrar"), "el ausente se nombra campo a campo");
  assert(!/\bsueno: 0\b/.test(p), "nunca convierte un ausente en un cero");
  assert(contextToPrompt(null).includes("SIN DATOS"), "sin estado, el prompt lo declara");

  // con datos, desaparecen los «sin registrar» de ese campo
  S.data.today.sleep = 7.5;
  const p2 = contextToPrompt(C.buildCoachContext());
  assert(p2.includes("sueno: 7.5") && !p2.includes("sueno: sin registrar"),
    "con dato registrado, el campo muestra el dato real");
}

/* ============================================================
   3 · LAS HERRAMIENTAS SON UNA LISTA CERRADA
   ============================================================ */
console.log("\n— herramientas —");
{
  assert(TOOL_NAMES.length === 6, `seis herramientas (hay ${TOOL_NAMES.length})`);

  const ok = normalizeToolCall("adjust_session", '{"razon":"preparación baja","cambio":"deload"}');
  assert(ok?.name === "adjust_session" && ok.args.cambio === "deload",
    "una herramienta de la lista se valida y parsea sus argumentos");
  assert(ok.label === COACH_TOOLS.adjust_session.label, "la herramienta trae su etiqueta legible");

  // argumentos que llegan como texto roto no rompen nada
  const roto = normalizeToolCall("get_plan_day", "{no es json");
  assert(roto?.name === "get_plan_day" && typeof roto.args === "object", "argumentos corruptos → objeto vacío");

  // allowlist: fuera de lista, null (nunca se ejecuta)
  const fuera = [
    normalizeToolCall("rm_rf", "{}"),
    normalizeToolCall("exfiltrate", "{}"),
    normalizeToolCall("", "{}"),
    normalizeToolCall("__proto__", "{}"),
    normalizeToolCall("constructor", "{}"),
  ];
  assert(fuera.every((x) => x === null), "toda herramienta fuera de la lista se descarta",
    JSON.stringify(fuera));

  // el enum del modelo está acotado
  const cambio = COACH_TOOLS.adjust_session.args.properties.cambio;
  assert(Array.isArray(cambio.enum) && cambio.enum.length === 5,
    "el parámetro `cambio` tiene un enum cerrado de 5 valores");

  // el esquema enviado al modelo no expone nada raro
  const sch = toolSchema();
  assert(sch.function.parameters.properties.herramientas.items.properties.nombre.enum.length === 6,
    "el esquema declara los mismos 6 nombres que la allowlist");
  assert(sch.function.parameters.additionalProperties === false,
    "el esquema es estricto: no acepta campos inventados");
}

/* ============================================================
   4 · EL PROMPT POR CAPAS
   ============================================================ */
console.log("\n— prompt por capas —");
{
  const ctx = C.buildCoachContext();
  const sys = buildSystemPrompt(ctx, "COMANDANTE");
  assert(sys.includes("no diagnostiques") || /REGLAS CLÍNICAS/i.test(sys), "arranca con la política clínica");
  assert(sys.includes("COMANDANTE"), "el tono elegido llega al prompt");
  assert(sys.includes("REGLAS DE VERACIDAD"), "incluye las reglas de veracidad");
  assert(sys.indexOf("REGLAS CLÍNICAS") < sys.indexOf("REGLAS DE VERACIDAD"),
    "el orden es política → tono → veracidad → contexto");
  assert(sys.includes("Aurora"), "el contexto real va en el prompt");
  assert(buildSystemPrompt(ctx, "NOEXISTENTE").includes("MENTOR"),
    "una personalidad desconocida cae en MENTOR en vez de romper");
  assert(!buildSystemPrompt(null, "MENTOR").includes("undefined"), "sin estado no aparece «undefined»");
}

/* ============================================================
   5 · HISTORIAL ACOTADO
   ============================================================ */
console.log("\n— historial —");
{
  const largo = Array.from({ length: 40 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: `m${i}`,
  }));
  const t = trimHistory(largo, 6);
  assert(t.length === 12, `recorta a 6 parejas (${t.length} mensajes)`);
  assert(t[t.length - 1].content === "m39", "conserva lo más reciente");

  const basura = [{ role: "system", content: "hack" }, null, { role: "user" }, { role: "user", content: "ok" }];
  assert(trimHistory(basura, 6).length === 1, "descarta system, nulos y mensajes vacíos");
  assert(trimHistory(undefined, 6).length === 0, "sin historial no rompe");
}

/* ============================================================
   6 · EL PARSER SSE SOBREVIVE A CORTES
   ============================================================ */
console.log("\n— parser SSE —");
{
  // el caso que rompe a los parsers ingenuos: la línea se parte por la mitad
  const crudo = 'data: {"type":"delta","text":"Hola "}\n\ndata: {"type":"delta","text":"Aurora"}\n\ndata: [DONE]\n\n';
  for (const corte of [1, 3, 7, 13, 29, crudo.length]) {
    let acc = "", listo = false;
    const p = createSseParser({ onDelta: (d) => (acc += d), onDone: () => (listo = true) });
    for (let i = 0; i < crudo.length; i += corte) p.feed(crudo.slice(i, i + corte));
    p.flush();
    assert(acc === "Hola Aurora" && listo, `corte cada ${corte} bytes: texto íntegro y [DONE]`);
  }

  // herramienta troceada: nombre y argumentos llegan en trozos distintos
  {
    let tool = null;
    const p = createSseParser({ onTool: (t) => (tool = t) });
    p.feed('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"log_"}}]}}]}\n\n');
    p.feed('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"symptom","arguments":"{\\"zona\\""}}]}}]}\n\n');
    p.feed('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":\\"rodilla\\"}"}}]},"finish_reason":"tool_calls"}]}\n\n');
    p.flush();
    assert(tool?.name === "log_symptom" && tool.args.zona === "rodilla",
      "el nombre troceado se pega y el JSON de argumentos se reensambla", JSON.stringify(tool));
  }

  // una herramienta inventada por el modelo nunca llega a la interfaz
  {
    const recibidos = [];
    const p = createSseParser({ onTool: (t) => t && recibidos.push(t) });
    p.feed('data: {"type":"tool","name":"drop_database","args":{}}\n\ndata: {"type":"tool","name":"get_plan_day","args":{}}\n\n');
    p.flush();
    assert(recibidos.length === 1 && recibidos[0].name === "get_plan_day",
      "una herramienta inventada se filtra en el parser");
  }

  // basura y JSON inválido no rompen el flujo
  {
    let acc = "";
    const p = createSseParser({ onDelta: (d) => (acc += d) });
    p.feed(": comentario\n\n");
    p.feed("data: {roto\n\n");
    p.feed('data: {"type":"delta","text":"sigo"}\n\n');
    p.flush();
    assert(acc === "sigo", "comentarios y JSON inválido se ignoran sin cortar la respuesta");
  }
}

/* ============================================================
   7 · SIN NUBE SIGUE HABIENDO COACH
   ============================================================ */
console.log("\n— repliegue local —");
{
  assert(decideRoute("¿qué entreno hoy?", { cloud: false, online: true }).mode === "local",
    "sin endpoint → motor local");
  assert(decideRoute("¿qué entreno hoy?", { cloud: true, online: false }).mode === "local",
    "sin red → motor local aunque haya endpoint");
  assert(decideRoute("¿qué entreno hoy?", { cloud: true, online: true }).mode === "cloud",
    "con endpoint y red → nube");

  S.init(); S.reset(true);
  S.data.today.water = 800;
  S.data.profile.name = "Aurora";

  // el motor local emite la MISMA interfaz que la nube
  let acc = "", herramientas = 0, done = false;
  const out = await C.runLocal("tengo 20 minutos hoy", {
    speed: 0,
    onDelta: (d) => (acc += d),
    onTool: () => herramientas++,
    onDone: () => (done = true),
  });
  assert(done, "el motor local avisa de que terminó");
  assert(acc === out, "lo emitido por deltas es exactamente lo que devuelve");
  assert(out.length > 40, "produce una respuesta real a partir de los registros");
  assert(/20 minutos/i.test(out), "usa el dato concreto que le damos (20 minutos)");
  assert(herramientas >= 1, "ofrece la adaptación real (sesión corta), no solo texto");
}

/* ============================================================
   8 · EL PROXY DE NODE
   ============================================================ */
console.log("\n— proxy api/coach.js —");
{
  const { default: handler } = await import("../api/coach.js");

  const mkReq = (body, method = "POST") => {
    const h = {};
    return {
      method, headers: {}, socket: { remoteAddress: "1.2.3.4" }, destroyed: false,
      on(ev, fn) { h[ev] = fn; },
      destroy() {},
      _fire() { h.data?.(typeof body === "string" ? body : JSON.stringify(body ?? {})); h.end?.(); },
    };
  };
  const mkRes = () => ({
    statusCode: 0, headers: {}, chunks: [], writableEnded: false,
    setHeader(k, v) { this.headers[k] = v; },
    flushHeaders() {},
    write(c) { this.chunks.push(c); return true; },
    end(c) { if (c) this.chunks.push(c); this.writableEnded = true; },
    get body() { return this.chunks.join(""); },
  });
  const send = (body, method = "POST") => {
    const req = mkReq(body, method);
    const res = mkRes();
    const p = handler(req, res);
    req._fire();
    return p.then(() => res);
  };

  // health
  {
    const res = await send("{}", "GET");
    assert(res.statusCode === 200 && JSON.parse(res.body).ok === false,
      "sin clave, el health responde ok:false (la app cae a local)");
  }

  // la puerta del proxy corre ANTES de mirar la clave
  {
    const res = await send({ message: "me aprieta el pecho y no puedo respirar" });
    const texto = JSON.parse(res.body.split("\n")[0].slice(5)).text;    assert(res.headers["content-type"].includes("text/event-stream"), "responde en SSE");
    assert(RE_PROFESIONAL.test(texto), "el proxy devuelve el guion de derivación ante una alarma");
    assert(!res.body.includes("api.openai.com"), "el proxy no filtra el proveedor al cliente");
  }

  // petición sin modelo configurado → el cliente sabe replegarse
  {
    const res = await send({ message: "hola, ¿qué entreno hoy?" });
    const j = JSON.parse(res.body);
    assert(res.statusCode === 503 && j.fallback === "local",
      "sin clave, una pregunta normal devuelve 503 con señal de repliegue");
  }

  // cuerpo basura
  {
    const res = await send("esto no es json");
    assert(res.statusCode === 400, "cuerpo no-JSON → 400 limpio");
  }

  // mensaje vacío
  {
    const res = await send({ message: "   " });
    assert(res.statusCode === 400, "mensaje vacío → 400 limpio");
  }
}

/* ============================================================
   8b · REGRESIÓN: LAS HERRAMIENTAS NO SE PIERDEN AL CERRAR
   ------------------------------------------------------------
   El stream del proveedor SIEMPRE termina en [DONE]. Si el proxy
   cierra la respuesta en cuanto lo ve, las tool_calls acumuladas
   se quedan por el camino y el coach nunca puede actuar: contesta
   pero no hace nada. Es un fallo silencioso y por eso va fixeado.
   ============================================================ */
console.log("\n— el proxy no pierde herramientas al cerrar —");
{
  const mkRes = () => ({
    statusCode: 0, headers: {}, chunks: [], writableEnded: false,
    setHeader(k, v) { this.headers[k] = v; },
    flushHeaders() {},
    write(c) { this.chunks.push(c); return true; },
    end(c) { if (c) this.chunks.push(c); this.writableEnded = true; },
    get body() { return this.chunks.join(""); },
  });

  const upstreamCon = (chunks) => {
    const rs = new ReadableStream({
      start(ctrl) {
        for (const c of chunks) ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(c)}\n\n`));
        ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        ctrl.close();
      },
    });
    return new Response(rs, { status: 200, headers: { "content-type": "text/event-stream" } });
  };

  const req = (body) => {
    const h = {};
    return { method: "POST", headers: {}, socket: {}, on(e, f) { h[e] = f; }, destroy() {},
      _fire() { h.data?.(JSON.stringify(body)); h.end?.(); } };
  };

  const keyPrevio = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "clave-de-prueba";
  // instancia fresca: el módulo lee la clave al cargarse
  const { default: fresh } = await import(`../api/coach.js?k=${Date.now()}`);

  // upstream que termina en [DONE] DESPUÉS de mandar la tool_call
  const real = globalThis.fetch;
  let pedidos = 0;
  globalThis.fetch = async () => {
    pedidos++;
    return upstreamCon([
      { choices: [{ delta: { content: "Te recorto una serie." } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "adjust_session", arguments: '{"razon":"preparación 42%","cambio":"deload"}' } }] } }] },
      { choices: [{ delta: {}, finish_reason: "tool_calls" }] },
    ]);
  };

  const res = mkRes();
  const r = req({ message: "estoy cansado, ¿hago la sesión entera?", context: null });
  const p = fresh(r, res);
  r._fire();
  await p;
  globalThis.fetch = real;
  if (keyPrevio === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = keyPrevio;

  const eventos = res.body.split("\n").filter(Boolean)
    .map((l) => l.slice(5).trim())
    .filter((d) => d && d !== "[DONE]")
    .map((d) => JSON.parse(d));
  const tools = eventos.filter((e) => e.type === "tool");
  assert(pedidos === 1, "el proxy llamó al proveedor una vez");
  assert(res.body.includes("[DONE]"), "el stream se cierra con [DONE] como debe");
  assert(tools.length === 1, `la tool_call llega al cliente pese al [DONE] (${tools.length})`,
    JSON.stringify(eventos));
  assert(tools[0]?.name === "adjust_session", "el nombre llega íntegro", JSON.stringify(tools[0]));
  assert(tools[0]?.args?.cambio === "deload", "los argumentos llegan parseados");
  assert(typeof tools[0]?.label === "string" && tools[0].label.length > 0, "viaja con su etiqueta");
  assert(
    res.body.indexOf('"type":"tool"') > -1 && res.body.indexOf('"type":"tool"') < res.body.indexOf("[DONE]"),
    "la herramienta sale en el cuerpo ANTES del cierre [DONE], no se queda en el buffer"
  );
}

/* ============================================================
   9 · LA INTERFAZ ESTÁ CONTRATADA CON EL CATÁLOGO Y LA HOJA
   ------------------------------------------------------------
   Aquí no hay navegador, pero los dos fallos más comunes de un
   panel nuevo son mecánicos y se cazan sin abrir nada: una clave
   de t() mal escrita (en pantalla sale «coach.foo» crudo) y una
   clase CSS que no existe (el elemento sale sin estilo).
   ============================================================ */
console.log("\n— contrato interfaz ↔ catálogo ↔ estilos —");
{
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");

  const cat = readFileSync(join(root, "js", "i18n.js"), "utf8");
  const claves = new Set([...cat.matchAll(/^\s*"([a-zA-Z0-9_.]+)":/gm)].map((m) => m[1]));

  const fuente = readFileSync(join(root, "js", "ui", "core.js"), "utf8");
  const usadas = [...fuente.matchAll(/\bt\(\s*"([^"]+)"/g)].map((m) => m[1]);
  const nuevas = [...new Set(usadas.filter((k) => k.startsWith("coach.")))];
  const huerfanas = nuevas.filter((k) => !claves.has(k));
  assert(nuevas.length >= 20, `el panel usa ${nuevas.length} claves del catálogo`);
  assert(huerfanas.length === 0,
    "toda clave coach.* que usa el panel existe en js/i18n.js", huerfanas.join(", "));

  // ninguna variable interpolada huérfana: {m} del texto existe en la clave
  const varsHuerfanas = nuevas.filter((k) => {
    const m = cat.match(new RegExp(`"${k.replace(/\./g, "\\.")}"\\s*:\\s*"([^"]*)"`));
    if (!m) return true;
    const usados = [...m[1].matchAll(/\{(\w+)\}/g)].map((x) => x[1]);
    const enPanel = fuente.split("\n").filter((l) => l.includes(`"${k}"`)).join("\n");
    return usados.some((v) => !new RegExp(`\\b${v}:`).test(enPanel));
  });
  assert(varsHuerfanas.length === 0,
    "toda variable {…} del texto tiene su valor en el panel", varsHuerfanas.join(", "));

  // clases: todo lo que el JS pinta como coach-* tiene estilo
  const css = readFileSync(join(root, "css", "coach.css"), "utf8");
  const usadas2 = [...fuente.matchAll(/["'`\s](coach-[a-z-]+)["'`\s]/g)].map((m) => m[1]);
  const sinEstilo = [...new Set(usadas2)].filter((c) => !css.includes(`.${c}`));
  assert(sinEstilo.length === 0,
    `las ${new Set(usadas2).size} clases coach-* del panel existen en css/coach.css`,
    sinEstilo.join(", "));

  // la hoja se carga de verdad en la app
  const index = readFileSync(join(root, "index.html"), "utf8");
  assert(/<link[^>]+css\/coach\.css/.test(index), "index.html carga css/coach.css");

  // y está en el shell offline: sin ella, el chat pierde estilo sin red
  const sw = readFileSync(join(root, "sw.js"), "utf8");
  assert(sw.includes("./css/coach.css") && sw.includes("./js/coach/ai-core.js") && sw.includes("./js/coach/ai.js"),
    "el service worker precachea estilos y módulos del coach");

  // el texto del modelo NUNCA entra como HTML
  assert(!/innerHTML\s*=\s*`[^`]*\$\{(?:acc|res|out)/.test(fuente),
    "nada de lo que dice el modelo se inyecta como HTML");
  assert(fuente.includes("out.txt.textContent = acc"), "el streaming escribe por textContent");
}

/* ============================================================
   RESULTADO
   ============================================================ */
console.log("\n══════════════════════════════════");
console.log(`  → ${pass} ok · ${fail} fallos`);
assert(
  detectarRiesgo("me aprieta el pecho").riesgo === true,
  "el guion de 30 escenarios sigue siendo la fuente de verdad"
);
process.exit(fail ? 1 : 0);
