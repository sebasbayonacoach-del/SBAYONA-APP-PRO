// ============================================================
// BAYONA — api/coach.js · PROXY del coach (Node)
// ------------------------------------------------------------
// Qué es: un traductor de tokens. Recibe el mensaje + el contexto
// real que el navegador ya calculó, y devuelve la respuesta del
// modelo EN STREAMING (SSE).
//
// Qué NO es, a propósito:
//   · No tiene base de datos.
//   · No autentica a nadie.
//   · No muta nada. Las herramientas las ejecuta el DISPOSITIVO.
//   · No recibe datos de salud: solo el contexto que el propio
//     usuario ya ve en su pantalla.
//
// La clave vive en process.env.OPENAI_API_KEY y jamás se envía
// al navegador. Si no está, /api/coach responde {ok:false} y la
// app se queda en su motor de reglas local (que ya funciona).
//
// El guion de seguridad de 30 escenarios se vuelve a ejecutar AQUÍ,
// aunque ya se ejecutara en el cliente: defensa en profundidad. Si
// alguien llama a este endpoint directamente con una frase de
// alarma, sale el guion de derivación, no el modelo.
//
// DOS FORMAS DE EJECUTAR:
//   1) Vercel (api/ es una convención nativa) + OPENAI_API_KEY.
//   2) Local:  node api/coach.js   →  http://localhost:8787/coach
//      útil para desarrollo y para las pruebas.
//
// CUALQUIER endpoint compatible con la API de chat de OpenAI vale:
//   BAYONA_COACH_UPSTREAM=https://tu-gateway/v1/chat/completions
//   BAYONA_COACH_API_KEY=...        (si no, usa OPENAI_API_KEY)
// ============================================================
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import {
  derivacionATexto, toolSchema, normalizeToolCall, buildSystemPrompt, trimHistory,
} from "../js/coach/ai-core.js";
import { protegerDialogo } from "../js/seguridad-guion.js";
import {
  applyCors, securityHeaders, rateLimited, clientIp, readJson, verifySupabaseUser,
} from "./_security.js";

const OPENAI_URL = process.env.BAYONA_COACH_UPSTREAM || "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.BAYONA_COACH_API_KEY || process.env.OPENAI_API_KEY;
const MODEL = process.env.BAYONA_COACH_MODEL || "gpt-4o-mini";
const MAX_HISTORY = 6;
const BODY_LIMIT = 24 * 1024;

/* ---------- respuesta + SSE ---------- */
const json = (res, code, obj) => {
  securityHeaders(res);
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
};

function openSse(res) {
  securityHeaders(res);
  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream; charset=utf-8");
  res.setHeader("cache-control", "no-cache, no-transform");
  res.setHeader("connection", "keep-alive");
  res.setHeader("x-accel-buffering", "no");
  res.flushHeaders?.();
}
const sse = (res, ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`);
const sseEnd = (res) => {
  res.write("data: [DONE]\n\n");
  res.end();
};

/* ---------- handler (compatible Vercel y Node puro) ---------- */
export default async function handler(req, res) {
  if (!applyCors(req, res)) return json(res, 403, { ok: false, error: "origen no permitido" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  // health: la app lo llama para saber si la IA está montada
  if (req.method === "GET") {
    const ready = Boolean(API_KEY);
    return json(res, 200, {
      ok: ready,
      model: ready ? MODEL : null,
      motivo: ready ? null : "falta OPENAI_API_KEY en el servidor",
    });
  }
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "método no permitido" });

  let body;
  try { body = await readJson(req, BODY_LIMIT); }
  catch { return json(res, 400, { ok: false, error: "petición inválida" }); }

  const message = String(body.message || "").slice(0, 4000).trim();
  if (!message) return json(res, 400, { ok: false, error: "mensaje vacío" });

  // DEFENSA EN PROFUNDIDAD · el mismo guion que corre en el cliente.
  // Va ANTES de mirar la clave: aunque el proxy esté sin configurar,
  // una frase de alarma recibe el guion de derivación, no un error.
  const gate = protegerDialogo(message);
  if (gate.respuesta) {
    openSse(res);
    sse(res, { type: "delta", text: derivacionATexto(gate.respuesta) });
    return sseEnd(res);
  }

  if (!API_KEY) {
    return json(res, 503, { ok: false, error: "coach sin configurar", fallback: "local" });
  }

  // En producción, la IA cloud requiere una sesión BAYONA válida.
  // Se puede desactivar explícitamente solo para entornos de desarrollo.
  if (process.env.BAYONA_COACH_REQUIRE_AUTH !== "0") {
    const auth = await verifySupabaseUser(req);
    if (!auth.ok) return json(res, auth.status, { ok: false, error: "sesión requerida", fallback: "local" });
  }

  const ip = clientIp(req);
  if (rateLimited(`coach:${ip}`, { max: 30, windowMs: 60_000 })) {
    return json(res, 429, { ok: false, error: "demasiadas peticiones, espera un momento" });
  }

  const history = trimHistory(body.history, MAX_HISTORY).map((m) => ({
    role: m.role,
    content: String(m.content).slice(0, 4000),
  }));

  const payload = {
    model: MODEL,
    stream: true,
    temperature: 0.4,
    max_tokens: 500,
    messages: [
      { role: "system", content: buildSystemPrompt(body.context, body.personality) },
      ...history,
      { role: "user", content: message },
    ],
    tools: [toolSchema()],
    tool_choice: "auto",
  };

  openSse(res);
  let aborted = false;
  req.on("aborted", () => { aborted = true; });

  const pending = {};
  let flushed = false;

  /**
   * Vuelca las herramientas acumuladas. OJO: el stream del proveedor
   * SIEMPRE termina en [DONE], así que si esto no se llama en TODOS
   * los caminos de salida, la última tool_call se pierde y el coach
   * se queda con las manos atadas.
   */
  const flushTools = () => {
    if (flushed) return;
    flushed = true;
    for (const k of Object.keys(pending)) {
      const p = pending[k];
      if (!p.name) continue;
      const t = normalizeToolCall(p.name, p.args);
      if (t) sse(res, { type: "tool", name: t.name, label: t.label, args: t.args });
    }
  };

  /** Camino de salida único: avisa, vuelca herramientas y cierra. */
  const close = (ev) => {
    if (res.writableEnded) return;
    if (ev) sse(res, ev);
    flushTools();
    sseEnd(res);
  };

  let upstream;
  try {
    upstream = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    if (!aborted) close({ type: "error", message: "no se pudo contactar con el modelo" });
    return;
  }

  if (!upstream.ok || !upstream.body) {
    if (!aborted) close({ type: "error", message: `el modelo respondió ${upstream.status}` });
    return;
  }

  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  let buf = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done || aborted) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() || "";
      for (const line of parts) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const data = l.slice(5).trim();
        if (data === "[DONE]") { await reader.cancel().catch(() => {}); close(); return; }
        let ev;
        try { ev = JSON.parse(data); } catch { continue; }
        const delta = ev.choices?.[0]?.delta;
        if (typeof delta?.content === "string" && delta.content) sse(res, { type: "delta", text: delta.content });
        for (const tc of delta?.tool_calls || []) {
          const i = tc.index ?? 0;
          pending[i] = pending[i] || { name: "", args: "" };
          if (tc.function?.name) pending[i].name += tc.function.name;
          if (tc.function?.arguments) pending[i].args += tc.function.arguments;
        }
        // el proveedor ya ha cerrado la respuesta: liberamos lo acumulado
        if (ev.choices?.[0]?.finish_reason) flushTools();
      }
    }
    flushTools();
  } catch {
    if (!aborted) close({ type: "error", message: "se interrumpió la respuesta" });
    return;
  } finally {
    if (!aborted) close();
  }
}

/* ---------- servidor local (node api/coach.js) ---------- */
const esFichero =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (esFichero) {
  const port = Number(process.env.PORT || process.env.BAYONA_COACH_PORT || 8787);
  const srv = createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/health") return json(res, 200, { ok: true, server: "bayona-coach" });
    if (url.pathname === "/coach" || url.pathname === "/api/coach") return handler(req, res);
    return json(res, 404, { ok: false, error: "no encontrado" });
  });
  srv.listen(port, () => {
    const listo = API_KEY ? `IA lista (${MODEL})` : "sin OPENAI_API_KEY → la app usará su motor local";
    console.log(`\n  CORE → coach proxy en http://localhost:${port}/coach`);
    console.log(`  ${listo}\n`);
  });
}
