// ============================================================
// BAYONA — CORE: asistente LOCAL (reglas, sin nube). Transparente y seguro.
// 1) Screening determinista de seguridad (coachStub) ANTES que cualquier respuesta.
// 2) Nunca inventa datos: solo usa tus registros reales.
// 3) Adaptaciones reales (sesión corta, volumen autoregulado) o honestidad.
// ============================================================
import { S } from "../state.js";
import { coreReply } from "../data.js";
import { screenMessage } from "../coach/coachStub.js";
import { shortSession, todaysSession } from "../engine.js";
import { esc, t } from "../i18n.js";
import {
  UI, $, el, elT, BUILDERS, openSection,
} from "./shared.js";

const QUICK = [
  "Hoy tengo solo 30 minutos",
  "Estoy cansado",
  "¿Por qué esta semana hay menos volumen?",
  "¿Qué como hoy?",
];

BUILDERS.core = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  const orbBtn = el("button", "core-orb-btn");
  orbBtn.innerHTML = `<span class="core-dot"></span><div class="grow" style="text-align:left"><h4>CORE</h4><div class="sub">Asistente local · entrenamiento · recuperación · nutrición</div></div><span class="pill blue">LOCAL</span>`;
  body.appendChild(orbBtn);
  body.appendChild(el("div", "media-caption",
    "CORE funciona con reglas en tu dispositivo: sin conexión a servicios externos. No diagnostica; ante señales de alarma deriva a un profesional."));

  body.appendChild(el("div", "sec-label", "PERSONALIDAD"));
  const pers = el("div", "quickq");
  ["COMANDANTE", "MENTOR", "CIENTÍFICO", "COMPAÑERO", "MINIMALISTA"].forEach((p) => {
    const b = el("button", "", p);
    if (S.data.profile.coach === p) { b.style.color = "var(--gold)"; b.style.borderColor = "var(--gold)"; }
    b.addEventListener("click", () => { S.data.profile.coach = p; S.save(); BUILDERS.core(); });
    pers.appendChild(b);
  });
  body.appendChild(pers);

  body.appendChild(el("div", "sec-label", "CONVERSACIÓN"));
  const log = el("div", "chatlog");
  log.appendChild(elT("div", "msg core",
    "Estoy contigo en el mundo BAYONA. Pregúntame por tu entrenamiento, tu recuperación o por qué tu plan cambia cada semana."));
  body.appendChild(log);

  const quick = el("div", "quickq");
  QUICK.forEach((q) => {
    const b = el("button", "", q);
    b.addEventListener("click", () => send(q));
    quick.appendChild(b);
  });
  body.appendChild(quick);

  const row = el("div", "chatrow");
  const input = el("input");
  input.placeholder = "Escribe a CORE…";
  input.setAttribute("aria-label", "Mensaje para CORE");
  const sendB = el("button", "btn btn-primary", "➤");
  row.append(input, sendB);
  body.appendChild(row);

  function bubble(kind, text) {
    log.appendChild(elT("div", `msg ${kind}`, text)); // textContent: nunca HTML con texto de usuario
    log.scrollTop = log.scrollHeight;
  }

  function actionBtn(label, fn) {
    const wrap = el("div", "msg core");
    const b = el("button", "btn btn-primary", label);
    b.style.marginTop = "6px";
    b.onclick = fn;
    wrap.appendChild(b);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
  }

  function send(text) {
    if (!text || !text.trim()) return;
    bubble("me", text.trim());
    input.value = "";

    // 1) SEGURIDAD PRIMERO (mismo filtro que evalúan las pruebas)
    const screen = screenMessage(text);
    if (screen.risk !== "none") {
      bubble("core alert", screen.reply);
      if (screen.risk === "red") {
        bubble("core", "He detenido aquí cualquier sugerencia de entrenamiento. Busca ayuda humana hoy mismo.");
      } else {
        bubble("core", "Puedo adaptar tu sesión para proteger la zona cuando me digas qué molesta.");
      }
      return;
    }

    // 2) adaptaciones REALES (no solo texto)
    const mins = parseInt((text.match(/(\d{1,3})\s*(min|minuto|minutos)/i) || [])[1], 10);
    const ctx = {
      readiness: S.readiness(), streak: S.data.streak, water: S.data.today.water,
      sleep: S.data.today.sleep, soreness: S.data.today.soreness, energy: S.data.today.energy,
      todayWorkout: S.todayWorkout()?.name || null, trained: S.data.today.trained,
      level: S.level().lvl, mins: Number.isFinite(mins) ? mins : null,
      phase: S.phase().name, week: S.data.plan.week,
      kcal: S.data.today.kcal, p: S.data.today.p, kcalGoal: 2400, pGoal: 150,
    };
    UI.W?.setCoreMood("alert");
    setTimeout(() => {
      bubble("core", coreReply(text, ctx));
      UI.W?.setCoreMood("calm");
      if (Number.isFinite(mins) && mins >= 10 && mins <= 45) {
        const s = shortSession(mins);
        actionBtn(`APLICAR: ${s.name}`, () => UI.actions.startWorkout?.(s));
      }
      if (/cansad|fatig|sin energ|agotad/i.test(text)) {
        const auto = todaysSession();
        if (auto?.applied) actionBtn("VER MI MISIÓN RECORREGADA", () => UI.actions.openTraining?.(auto.workout.id));
      }
    }, 550);
  }
  sendB.addEventListener("click", () => send(input.value));
  input.addEventListener("keydown", (e) => e.key === "Enter" && send(input.value));

  // puente para otros contextos (p. ej. «PREGUNTA AL COACH» dentro de la sesión)
  UI.actions.askCoach = send;
};

/** Abre CORE y envía una pregunta contextual (entrenamiento, trabajo, noche…). */
UI.actions.openCoachAsk = (q) => {
  openSection("core");
  requestAnimationFrame(() => UI.actions.askCoach?.(q));
};
