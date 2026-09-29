// ============================================================
// BAYONA · CORE→IA — coach/ai-core.js
// ------------------------------------------------------------
// El núcleo PURO del coach: sin DOM, sin localStorage, sin fetch.
// Por eso lo pueden importar los dos lados:
//
//   · el navegador  (js/coach/ai.js) → para montar la conversación
//   · el proxy Node (api/coach.js)    → para filtrar antes del modelo
//
// Si algo de este fichero tocara el entorno, el proxy dejaría de
// arrancar. Esa es la mitad de la garantía.
// ============================================================
import { protegerDialogo } from "../seguridad-guion.js";
import { CLINICAL_POLICY } from "./coachStub.js";
import { t } from "../i18n.js";

/* ============================================================
   1 · PUERTA DE SEGURIDAD
   ============================================================ */

/**
 * Decide la ruta de un mensaje SIN tocar la red.
 * @param {string} text
 * @param {{cloud?:boolean, online?:boolean}} opts
 * @returns {{mode:'refer'|'cloud'|'local', reason:string, derivacion?:object, deteccion?:object}}
 */
export function decideRoute(text, opts = {}) {
  const { cloud = false, online = true } = opts;

  // La seguridad va PRIMERO, siempre, aunque haya endpoint y red.
  const gate = protegerDialogo(text || "");
  if (gate.respuesta) {
    return {
      mode: "refer",
      reason: `riesgo:${gate.deteccion.categoria || "desconocido"}`,
      derivacion: gate.respuesta,
      deteccion: gate.deteccion,
    };
  }

  if (cloud && online) return { mode: "cloud", reason: "endpoint" };
  if (!online) return { mode: "local", reason: "offline" };
  return { mode: "local", reason: "sin-endpoint" };
}

/** Deriva el guion de seguridad a texto de burbuja (una sola pieza). */
export function derivacionATexto(d) {
  if (!d) return "";
  return d.generico || !d.recurso ? d.mensaje : `${d.mensaje}\n\n→ ${d.recurso}`;
}

/* ============================================================
   2 · CONTEXTO REAL (cero invención)
   ============================================================ */

export const SIN_REGISTRAR = "sin registrar";

/** Serializa el contexto para el prompt. Un ausente SIEMPRE se dice. */
export function contextToPrompt(ctx) {
  if (!ctx) return "SIN DATOS: el usuario todavía no ha registrado nada en la app.";
  const flat = (obj) =>
    Object.entries(obj)
      .map(([k, v]) => {
        if (v === null || v === undefined || v === "") return `${k}: ${SIN_REGISTRAR}`;
        if (Array.isArray(v)) return `${k}: ${v.join("; ") || "ninguno"}`;
        return `${k}: ${v}`;
      })
      .join(" · ");
  return [
    `PERFIL → ${flat(ctx.perfil)}`,
    `HOY → ${flat(ctx.hoy)}`,
    `REGISTROS DE HOY → ${flat(ctx.registros)}`,
    `ESTADO → ${flat(ctx.estado)}`,
    `SALUD → ${flat(ctx.salud)}`,
  ].join("\n");
}

/* ============================================================
   3 · HERRAMIENTAS (allowlist cerrada)
   ============================================================ */

const CORTA = { type: "string", description: "corta, en español" };

/** Única lista de herramientas. El modelo solo puede pedir estas siete. */
export const COACH_TOOLS = {
  get_plan_day: {
    label: "Consultar tu plan de hoy",
    desc: "Muestra qué entrenamiento tienes programado hoy y cómo se ha recortado por tu estado real.",
    args: { type: "object", properties: {}, additionalProperties: false },
  },
  assign_routine: {
    label: t("coach.toolAssignRoutine"),
    desc: "Programa una sesión del catálogo (hoy o un día concreto) en el plan del usuario, con una nota opcional. Es la rutina que el usuario va a ver en su HOY y a ejecutar tal cual.",
    args: {
      type: "object",
      properties: {
        workoutId: {
          type: "string",
          enum: ["op_upper", "op_lower", "op_full", "bodyweight", "mobility_flow"],
        },
        dia: { type: "string", description: "AAAA-MM-DD. Si lo omites, es hoy." },
        nota: CORTA,
        razon: CORTA,
      },
      required: ["workoutId"],
      additionalProperties: false,
    },
  },
  adjust_session: {
    label: "Ajustar tu sesión",
    desc: "Propone recortar, cambiar, saltar, añadir o alargar la sesión de hoy. El recorte se aplica de verdad al abrirla.",
    args: {
      type: "object",
      properties: {
        razon: CORTA,
        cambio: { type: "string", enum: ["deload", "swap", "skip", "add", "extend"] },
      },
      required: ["razon"],
      additionalProperties: false,
    },
  },
  log_symptom: {
    label: "Registrar una molestia",
    desc: "Guarda la zona y la intensidad (0-3) que describe el usuario para proteger la zona en próximas sesiones.",
    args: {
      type: "object",
      properties: {
        zona: CORTA,
        intensidad: { type: "string", enum: ["0", "1", "2", "3"] },
        nota: CORTA,
      },
      required: ["zona"],
      additionalProperties: false,
    },
  },
  escalate_referral: {
    label: "Derivar a un profesional",
    desc: "Deriva a atención profesional. Úsala ante cualquier señal de alarma; nunca diagnostiques.",
    args: {
      type: "object",
      properties: { dominio: CORTA, urgencia: { type: "string", enum: ["amber", "red"] } },
      required: ["dominio"],
      additionalProperties: false,
    },
  },
  nutrition_suggest: {
    label: "Proponer la próxima comida",
    desc: "Sugiere qué comer en la siguiente comida a partir de lo que ya ha registrado hoy.",
    args: {
      type: "object",
      properties: {
        conCalorias: { type: "boolean" },
        preferencias: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  explain_evidence: {
    label: "Explicar la evidencia",
    desc: "Explica por qué una decisión de entrenamiento se toma así, citando consenso (UEFA 2025, ACSM, ISSN, OMS).",
    args: { type: "object", properties: { tema: CORTA }, required: ["tema"], additionalProperties: false },
  },
};

export const TOOL_NAMES = Object.keys(COACH_TOOLS);

/** Esquema que se manda a la API de chat. */
export function toolSchema() {
  return {
    type: "function",
    function: {
      name: "reply",
      description: "Responde al usuario en español (es-ES) usando su contexto real.",
      parameters: {
        type: "object",
        properties: {
          texto: { type: "string", description: "Lo que le dices al usuario. Tono directo, 2-4 frases. Sin emojis." },
          herramientas: {
            type: "array",
            description: "Herramientas a ejecutar en su dispositivo, solo si hacen falta.",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string", enum: TOOL_NAMES },
                argumentos: { type: "object" },
              },
              required: ["nombre"],
              additionalProperties: false,
            },
          },
        },
        required: ["texto"],
        additionalProperties: false,
      },
    },
  };
}

/** Valida una herramienta pedida por el modelo. Nombre fuera de la lista → null. */
export function normalizeToolCall(name, rawArgs) {
  if (!TOOL_NAMES.includes(name)) return null;
  let args = rawArgs;
  if (typeof args === "string") {
    try { args = JSON.parse(args || "{}"); } catch { args = {}; }
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) args = {};
  return { name, label: COACH_TOOLS[name].label, args };
}

/* ============================================================
   4 · PROMPT POR CAPAS
   ============================================================ */

export const TONE = {
  COMANDANTE: "Tono COMANDANTE: frases cortas, imperativas, sin adornos. Prioriza lo que hay que hacer AHORA.",
  MENTOR: "Tono MENTOR: cálido y directo. Explica el porqué en una frase. Nunca regañes.",
  CIENTÍFICO: "Tono CIENTÍFICO: cifras y mecanismo. Cita el origen del criterio. No adornes.",
  COMPAÑERO: "Tono COMPAÑERO: como un igual que entrena contigo. Cercano, sin juicios.",
  MINIMALISTA: "Tono MINIMALISTA: la respuesta más corta que resuelve. Sin rodeos.",
};

export const HONESTY = `REGLAS DE VERACIDAD (no negociables):
- Si un dato aparece como «${SIN_REGISTRAR}», DILO. No lo estimes, no lo supongas, no lo rellenes.
- No diagnostiques, no prometas resultados y no nombres enfermedades.
- Si derivaste al usuario a un profesional, no le des ninguna alternativa para «ahorrarse» esa derivación.
- Si no sabes algo, dilo y di qué registro lo resolvería.`;

export function buildSystemPrompt(ctx, personality = "MENTOR") {
  return [
    CLINICAL_POLICY,
    TONE[personality] || TONE.MENTOR,
    HONESTY,
    `CONTEXTO REAL DEL USUARIO:\n${contextToPrompt(ctx)}`,
  ].join("\n\n");
}

/** Recorta el historial a las últimas N parejas user/assistant. */
export function trimHistory(history, maxTurns = 6) {
  const h = (history || []).filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content);
  return h.slice(-(maxTurns * 2));
}

/* ============================================================
   5 · PARSER SSE (puro, tolerante a cortes)
   ============================================================ */

/**
 * Crea un parser de Server-Sent Events que sobrevive a cortes de chunk
 * a mitad de línea — pasa constantemente en 4G.
 *
 * Acepta dos formatos: el nativo de BAYONA ({type:"delta"|"tool"|...})
 * y el crudo de OpenAI (choices[0].delta), por si algún proxy
 * distinto sirve la respuesta sin traducir.
 *
 * @param {{onDelta?:Function, onTool?:Function, onError?:Function, onDone?:Function}} handlers
 */
export function createSseParser(handlers = {}) {
  const { onDelta, onTool, onError, onDone } = handlers;
  let buffer = "";
  // los tool_calls llegan troceados y se identifican por `index`
  const pending = {};
  let flushed = false;

  const flushTools = () => {
    if (flushed) return;
    flushed = true;
    for (const k of Object.keys(pending)) {
      const p = pending[k];
      if (p.name) onTool?.(normalizeToolCall(p.name, p.args));
    }
  };

  const handleEvent = (raw) => {
    const payload = raw
      .split("\n")
      .filter((l) => l.trim().startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .join("\n");
    if (!payload) return;
    if (payload === "[DONE]") { flushTools(); onDone?.(); return; }

    let ev;
    try { ev = JSON.parse(payload); } catch { return; }

    if (ev.type && ev.type !== "chunk") {
      if (ev.type === "delta" && ev.text) onDelta?.(ev.text);
      else if (ev.type === "tool" && ev.name) onTool?.(normalizeToolCall(ev.name, ev.args));
      else if (ev.type === "error") onError?.(ev.message || "Error del coach");
      return;
    }

    // Forma nativa del proveedor (por si el proxy no la traduce)
    const choice = ev.choices?.[0];
    const delta = choice?.delta || {};
    if (typeof delta.content === "string" && delta.content) onDelta?.(delta.content);
    for (const tc of delta.tool_calls || []) {
      const i = tc.index ?? 0;
      pending[i] = pending[i] || { name: "", args: "" };
      if (tc.function?.name) pending[i].name += tc.function.name;
      if (tc.function?.arguments) pending[i].args += tc.function.arguments;
    }
    if (choice?.finish_reason === "tool_calls") flushTools();
  };

  const drain = (final) => {
    const parts = buffer.split("\n\n");
    // el último trozo puede estar incompleto: vuelve al buffer
    buffer = final ? "" : parts.pop();
    for (const p of parts) if (p.trim()) handleEvent(p.trim());
  };

  return {
    pending,
    feed(chunk) {
      buffer += chunk;
      drain(false);
    },
    flush() {
      drain(true);
      flushTools();
    },
  };
}
