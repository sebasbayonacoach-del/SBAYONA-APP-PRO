// ============================================================
// BAYONA — CORE: coach conversacional
// ------------------------------------------------------------
// La conversación es el producto. Este panel la monta entera:
//
//   · indicador HONESTO del motor (IA en streaming o reglas locales)
//   · burbujas con streaming token a token y cursor de escritura
//   · tarjetas de herramienta: cuando el coach hace algo, se ve
//   · banner de derivación: si el guion de seguridad salta, salta
//     entero y con su recurso, nunca escondido
//   · historial persistente, para que la conversación no se pierda
//   · móvil primero: textarea que crece, Enter envía, Shift+Enter
//     salta de línea, ycomposer pegado al pulgar
//
// La lógica (puerta de seguridad, contexto, herramientas) NO vive
// aquí: está en js/coach/ai.js y su núcleo puro en ai-core.js.
// ============================================================
import { S, todayKey } from "../state.js";
import { UI, $, el, elT, BUILDERS, openSection, toast } from "./shared.js";
import { t, esc } from "../i18n.js";
import { askCore, buildCoachContext, probeCloud } from "../coach/ai.js";
import { WORKOUTS } from "../data.js";
import { validaAsignacion } from "../coachos.js";
import { coachMemoryFacts, toolEvidence, proposalFromTool } from "../coach/memory.js";

const STORE = "bayona.coach.chat.v1";
const MAX_TURNS = 40;

/* ---------- estado del panel (sobrevive a navegación y recarga) ---------- */
const chat = {
  turns: load(),
  cloud: false,
  probed: false,
  busy: false,
};
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(v) ? v.slice(-MAX_TURNS) : [];
  } catch { return []; }
}
function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(chat.turns.slice(-MAX_TURNS))); }
  catch { /* sin storage: la conversación sigue en memoria */ }
}

/* ---------- Personality ---------- */
const PERSONALIDADES = ["COMANDANTE", "MENTOR", "CIENTÍFICO", "COMPAÑERO", "MINIMALISTA"];

/* ---------- Propuestas contextuales (salen de TUS datos, no de una lista fija) ---------- */
function sugerencias() {
  const ctx = buildCoachContext();
  if (!ctx) return [];
  const out = [];
  if (ctx.registros.sueno === null) out.push(t("coach.sug.noSleep"));
  if (ctx.estado.preparacion != null && ctx.estado.preparacion < 55) out.push(t("coach.sug.tired"));
  if (ctx.hoy.proteina < 90) out.push(t("coach.sug.eat"));
  out.push(t("coach.sug.minutes", { m: 10 + (chat.turns.length % 4) * 5 }));
  out.push(ctx.hoy.entrenado ? t("coach.sug.already") : t("coach.sug.why"));
  return out.slice(0, 4);
}

/* ============================================================
   BUILDER
   ============================================================ */
BUILDERS.core = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  body.classList.add("coach-body");

  /* ---------- cabecera: quién responde ahora ---------- */
  const head = el("div", "coach-head");
  const orb = el("button", "coach-orb");
  const dot = el("span", "coach-dot");
  const who = el("div", "grow");
  const name = elT("h4", "", "CORE");
  const state = elT("div", "sub coach-state", t("coach.probing"));
  who.append(name, state);
  const engine = el("span", "pill blue coach-engine", t("coach.engineLocal"));
  orb.append(dot, who, engine);
  orb.title = t("coach.orbTitle");
  orb.setAttribute("aria-label", t("coach.orbTitle"));
  orb.onclick = async () => {
    orb.classList.add("busy");
    chat.cloud = await probeCloud();
    chat.probed = true;
    paintEngine();
    orb.classList.remove("busy");
  };
  head.appendChild(orb);
  body.appendChild(head);

  const aviso = el("div", "coach-note", t("coach.note"));
  body.appendChild(aviso);

  /* ---------- memoria explicable ---------- */
  const memoryBox = el("section", "coach-memory");
  body.appendChild(memoryBox);
  function paintMemory() {
    const facts = coachMemoryFacts(S.data, 6);
    memoryBox.textContent = "";
    const head = el("div", "coach-memory-head");
    head.append(
      elT("small", "", t("coach.memory.title")),
      elT("span", "", t("coach.memory.sub"))
    );
    memoryBox.appendChild(head);
    if (!facts.length) {
      memoryBox.appendChild(elT("div", "coach-memory-empty", t("coach.memory.empty")));
      return;
    }
    const list = el("div", "coach-memory-list");
    facts.forEach((fact) => {
      const row = el("article", "coach-memory-row");
      const badge = elT("span", `coach-memory-basis ${fact.basis}`,
        t(fact.basis === "derived" ? "coach.memory.derived" : fact.basis === "coach" ? "coach.memory.coach" : "coach.memory.registered"));
      const txt = elT("strong", "", fact.summary);
      row.append(badge, txt);
      if (fact.evidence?.length) row.appendChild(elT("small", "", fact.evidence.slice(0,2).join(" · ")));
      list.appendChild(row);
    });
    memoryBox.appendChild(list);
  }
  paintMemory();

  /* ---------- personalidad ---------- */
  body.appendChild(el("div", "sec-label", t("coach.personality")));
  const pers = el("div", "quickq coach-pers");
  const paintPers = () => {
    [...pers.children].forEach((b) => {
      const on = b.textContent === S.data.profile.coach;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };
  PERSONALIDADES.forEach((p) => {
    const b = el("button", "", p);
    b.onclick = () => { S.data.profile.coach = p; S.save(); paintPers(); };
    pers.appendChild(b);
  });
  body.appendChild(pers);
  paintPers();

  /* ---------- conversación ---------- */
  body.appendChild(el("div", "sec-label", t("coach.conversation")));
  const log = el("div", "chatlog coach-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  body.appendChild(log);

  const quick = el("div", "quickq coach-quick");
  body.appendChild(quick);

  /* ---------- composer ---------- */
  const row = el("div", "chatrow coach-row");
  const input = el("textarea", "coach-input");
  input.rows = 1;
  input.placeholder = t("coach.placeholder");
  input.setAttribute("aria-label", t("coach.inputLabel"));
  input.enterkeyhint = "send";
  const sendB = el("button", "btn btn-primary coach-send", "➤");
  sendB.setAttribute("aria-label", t("coach.send"));
  row.append(input, sendB);
  body.appendChild(row);

  /* ---------- pintado ---------- */
  function paintEngine() {
    const enNube = chat.cloud && navigator.onLine !== false;
    engine.textContent = enNube ? t("coach.engineCloud") : t("coach.engineLocal");
    engine.className = `pill ${enNube ? "gold" : "blue"} coach-engine`;
    state.textContent = enNube
      ? t("coach.stateCloud", { name: S.data.profile.name || t("coach.tu") })
      : chat.probed ? t("coach.stateLocalProbed") : t("coach.stateLocal");
    orb.classList.toggle("live", enNube);
  }

  function paintQuick() {
    quick.textContent = "";
    sugerencias().forEach((q) => {
      const b = el("button", "", q);
      b.onclick = () => send(q);
      quick.appendChild(b);
    });
  }

  /** burbuja simple. El texto NUNCA entra como HTML. */
  function bubble(kind, text, extraCls = "") {
    const wrap = el("div", `coach-msg ${kind} ${extraCls}`.trim());
    wrap.appendChild(el("div", "coach-av", kind === "me" ? t("coach.youShort") : "◈"));
    const bub = el("div", "coach-bub");
    const txt = elT("span", "coach-text", text);
    bub.appendChild(txt);
    wrap.appendChild(bub);
    log.appendChild(wrap);
    scroll();
    return { wrap, bub, txt };
  }

  /** tarjeta de herramienta: se ve lo que el coach ha hecho de verdad */
  function toolCard(tool) {
    const card = el("div", "coach-tool");
    const proposal = proposalFromTool(tool);
    const memoryEvent = proposal ? S.rememberCoachEvent(proposal) : null;
    const evidence = toolEvidence(tool.name, tool.args || {}, S.data);

    card.appendChild(el("div", "coach-tool-l", t("coach.tool")));
    card.appendChild(elT("div", "coach-tool-t", tool.label));
    if (memoryEvent) card.appendChild(elT("div", "coach-proposal-status pending", t("coach.proposal.pending")));
    if (evidence.length) {
      const why = el("div", "coach-evidence");
      why.appendChild(elT("small", "", t("coach.evidence.title")));
      evidence.forEach((item) => {
        const row = el("div", "coach-evidence-row");
        row.append(
          elT("span", `coach-memory-basis ${item.basis}`,
            t(item.basis === "coach" ? "coach.memory.coach" : item.basis === "derived" ? "coach.memory.derived" : "coach.memory.registered")),
          elT("strong", "", `${item.label}: ${item.value}`)
        );
        why.appendChild(row);
      });
      card.appendChild(why);
    }
    if (tool.args?.razon) card.appendChild(elT("div", "coach-tool-r", tool.args.razon));
    if (tool.args?.zona) card.appendChild(elT("div", "coach-tool-r", `${tool.args.zona}${tool.args.intensidad ? ` · ${tool.args.intensidad}/3` : ""}`));
    if (tool.args?.tema) card.appendChild(elT("div", "coach-tool-r", tool.args.tema));

    // acción real, solo cuando el coach propone algo aplicable
    if (tool.name === "assign_routine" && tool.args?.workoutId && WORKOUTS[tool.args.workoutId]) {
      const w = WORKOUTS[tool.args.workoutId];
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(tool.args.dia || "") ? tool.args.dia : todayKey();
      card.appendChild(elT("div", "coach-tool-r",
        `${esc(w.name)} · ${esc(w.min)} min · ${esc(dia)}${tool.args.nota ? ` · «${esc(tool.args.nota)}»` : ""}`));
      const b = el("button", "btn btn-primary", t("coach.assignToPlan"));
      b.onclick = () => {
        const v = validaAsignacion({ clienteId: "local", workoutId: tool.args.workoutId, dia, nota: tool.args.nota || "" });
        if (!v.ok) return toast(t("state.error"), v.error, "danger");
        S.addAsignacion({ clienteId: "local", workoutId: tool.args.workoutId, dia, nota: tool.args.nota || "" });
        if (memoryEvent) S.updateCoachMemoryStatus(memoryEvent.id, "applied");
        b.textContent = t("coach.assigned");
        b.disabled = true;
        paintMemory();
        toast(t("coach.assigned"), t("coach.assignedNote", { name: w.name }));
      };
      card.appendChild(b);
    }
    if (tool.name === "open_short_session" && tool.args?.workout) {
      const b = el("button", "btn btn-primary", t("coach.applySession"));
      b.onclick = () => UI.actions.startWorkout?.(tool.args.workout);
      card.appendChild(b);
    }
    if (tool.name === "view_adjusted_session") {
      const b = el("button", "btn", t("coach.viewMission"));
      b.onclick = () => UI.actions.openTraining?.(S.todayWorkout()?.id);
      card.appendChild(b);
    }
    if (tool.name === "get_plan_day") {
      const b = el("button", "btn", t("coach.openPlan"));
      b.onclick = () => openSection("plan");
      card.appendChild(b);
    }
    if (tool.name === "log_symptom" && tool.args?.zona) {
      const b = el("button", "btn", t("coach.saveSymptom"));
      b.onclick = () => {
        S.data.healthFlags = {
          at: new Date().toISOString().slice(0, 10),
          redFlags: S.data.healthFlags?.redFlags || [],
          pain: [...new Set([...(S.data.healthFlags?.pain || []), tool.args.zona])],
        };
        S.save();
        if (memoryEvent) S.updateCoachMemoryStatus(memoryEvent.id, "applied");
        b.textContent = t("coach.saved");
        b.disabled = true;
        paintMemory();
      };
      card.appendChild(b);
    }
    if (tool.name === "escalate_referral") {
      const b = el("button", "btn btn-danger", t("coach.findHelp"));
      b.onclick = () => openSection("more");
      card.appendChild(b);
    }
    if (tool.name === "nutrition_suggest") {
      const b = el("button", "btn", t("coach.openKitchen"));
      b.onclick = () => {
        if (memoryEvent) S.updateCoachMemoryStatus(memoryEvent.id, "accepted");
        paintMemory();
        openSection("nutrition");
      };
      card.appendChild(b);
    }
    if (tool.name === "adjust_session") {
      const review = el("button", "btn", t("coach.proposal.review"));
      review.onclick = () => UI.actions.openTraining?.(S.todayWorkout()?.id);
      card.appendChild(review);
      if (memoryEvent) {
        const reject = el("button", "btn", t("coach.proposal.reject"));
        reject.onclick = () => {
          S.updateCoachMemoryStatus(memoryEvent.id, "rejected");
          reject.disabled = true;
          review.disabled = true;
          card.querySelector(".coach-proposal-status")?.classList.replace("pending","rejected");
          const status = card.querySelector(".coach-proposal-status");
          if (status) status.textContent = t("coach.proposal.rejected");
          paintMemory();
        };
        card.appendChild(reject);
      }
    }

    log.appendChild(card);
    scroll();
    return card;
  }

  function scroll() {
    log.scrollTop = log.scrollHeight;
  }

  function busy(on) {
    chat.busy = on;
    body.classList.toggle("is-busy", on);
    sendB.disabled = on;
    input.disabled = on;
    orb.classList.toggle("thinking", on);
  }

  /* ---------- primera carga ---------- */
  if (!chat.turns.length) {
    const ctx = buildCoachContext();
    const perdido = ctx?.registros?.sueno == null;
    bubble("core", perdido
      ? t("coach.hello", { name: S.data.profile.name || t("coach.tu") }) + " " + t("coach.helloNoSleep")
      : t("coach.hello", { name: S.data.profile.name || t("coach.tu") }));
  } else {
    chat.turns.forEach((m) => bubble(m.role === "user" ? "me" : "core", m.text, m.kind || ""));
  }
  paintQuick();
  paintEngine();

  /* primer sondeo: una sola vez, sin bloquear la conversación */
  if (!chat.probed) {
    probeCloud().then((ok) => { chat.cloud = ok; chat.probed = true; paintEngine(); });
  }

  /* ============================================================
     ENVÍO
     ============================================================ */
  async function send(text) {
    const msg = (text ?? input.value).trim();
    if (!msg || chat.busy) return;

    chat.turns.push({ role: "user", text: msg });
    bubble("me", msg);
    input.value = "";
    autoGrow();
    paintQuick();
    busy(true);
    UI.W?.setCoreMood("alert");

    const out = bubble("core", "", "streaming");
    const caret = el("i", "coach-caret");
    out.bub.appendChild(caret);
    let acc = "";

    const onDelta = (d) => {
      acc += d;
      // el texto va SIEMPRE por textContent: nada de HTML con lo que dice el modelo
      out.txt.textContent = acc;
      scroll();
    };
    const onTool = (tool) => { if (tool) toolCard(tool); };

    try {
      const history = chat.turns
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
      history.pop(); // el que acabamos de añadir, va aparte

      const res = await askCore(msg, {
        history,
        cloud: chat.cloud,
        onDelta,
        onTool,
        onStatus: ({ mode }) => { if (mode === "cloud") paintEngine(); },
      });

      caret.remove();
      if (!acc) out.txt.textContent = t("coach.empty");

      chat.turns.push({
        role: "assistant",
        text: acc,
        kind: res.mode === "refer" ? "risk" : res.mode === "cloud" ? "cloud" : "local",
      });
      if (res.mode === "refer") out.wrap.classList.add("risk");
      if (res.mode === "local" && res.reason === "fallo-red") {
        out.wrap.classList.add("degraded");
        bubble("core", t("coach.degraded"), "sys");
      }
      persist();
      paintEngine();
    } catch (e) {
      caret.remove();
      out.wrap.classList.add("risk");
      out.txt.textContent = t("coach.error");
    } finally {
      busy(false);
      UI.W?.setCoreMood("calm");
      paintQuick();
      input.focus({ preventScroll: true });
    }
  }

  /* ---------- eventos del composer ---------- */
  function autoGrow() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }
  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  });
  sendB.addEventListener("click", () => send());

  // puente para otros contextos (p. ej. «PREGUNTA AL COACH» dentro de la sesión)
  UI.actions.askCoach = send;
  UI.actions.coachCloud = () => chat.cloud;
};

/** Abre CORE y envía una pregunta contextual (entrenamiento, trabajo, noche…). */
UI.actions.openCoachAsk = (q) => {
  openSection("core");
  requestAnimationFrame(() => UI.actions.askCoach?.(q));
};
