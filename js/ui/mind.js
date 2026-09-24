// ============================================================
// BAYONA — SALA MENTE: respirar, meditar, concentración, gratitud,
// reflexión, diario y autodiálogo. MODO FE opcional (nunca automático).
// Voz privada con consentimiento explícito y guardado real.
// ============================================================
import { S } from "../state.js";
import { AFFIRMATIONS } from "../data.js";
import { mindReward } from "../rewards.js";
import { esc, fmtTime, t } from "../i18n.js";
import { isGranted, setConsent } from "../consents.js";
import {
  UI, $, el, elT, openDrawer, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

const MODES = [
  ["RESPIRACIÓN 4-4-4-4", 2, "Respiración cuadrada para bajar la activación."],
  ["MEDITACIÓN", 5, "Atención plena. La interfaz desaparece: solo quedas tú."],
  ["CONCENTRACIÓN", 5, "Un solo objetivo durante 5 minutos. Sin multitarea."],
  ["GRATITUD", 2, "Tres cosas concretas de hoy. Lo concreto entrena la mente."],
  ["REFLEXIÓN", 3, "Una pregunta, una respuesta honesta. Sin prisa."],
];

BUILDERS.mind = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";
  body.appendChild(el("div", "sec-label", "RESPIRACIÓN Y MEDITACIÓN"));
  MODES.forEach(([name, min, desc]) => {
    const c = el("div", "card");
    c.innerHTML = `<h4>${name}</h4><div class="sub">${desc}</div>`;
    const b = el("button", "btn btn-block", `EMPEZAR · ${min} MIN`);
    b.style.marginTop = "10px";
    b.addEventListener("click", () => runBreath(name, min));
    c.appendChild(b);
    body.appendChild(c);
  });

  // ---------- DIARIO PRIVADO ----------
  body.appendChild(el("div", "sec-label", "DIARIO · SOLO EN TU DISPOSITIVO"));
  const dj = el("div", "card");
  const ta = el("textarea");
  ta.rows = 3;
  ta.placeholder = "¿Qué notas hoy? (privado, se guarda en este dispositivo)";
  ta.style.cssText = "width:100%;box-sizing:border-box;background:var(--panel);color:var(--white);border:1px solid var(--line);border-radius:10px;padding:10px";
  const bSave = el("button", "btn btn-primary btn-block", "GUARDAR EN EL DIARIO");
  bSave.style.marginTop = "8px";
  bSave.onclick = () => {
    const txt = ta.value.trim();
    if (!txt) return;
    S.data.diary = S.data.diary || [];
    S.data.diary.unshift({ at: new Date().toISOString(), text: txt });
    S.data.diary = S.data.diary.slice(0, 100);
    S.save();
    ta.value = "";
    toast("DIARIO GUARDADO", "Entrada privada guardada en este dispositivo.");
  };
  dj.append(ta, bSave);
  const entries = S.data.diary || [];
  if (entries.length) {
    dj.appendChild(el("div", "sec-label", `ÚLTIMAS ENTRADAS (${entries.length})`));
    entries.slice(0, 3).forEach((e) => {
      dj.appendChild(el("div", "sub", `${fmtTime(new Date(e.at))} · ${esc(e.text.slice(0, 120))}`));
    });
  }
  body.appendChild(dj);

  // ---------- AUTODIÁLOGO ----------
  body.appendChild(el("div", "sec-label", "AUTODIÁLOGO · identidad → acción → evidencia"));
  AFFIRMATIONS.forEach((a) => {
    const c = el("div", "card");
    c.innerHTML = `<div class="sub" style="color:var(--white);font-size:13px">“${esc(a)}”</div>`;
    const bRec = el("button", "btn", "◉ GRABAR CON MI VOZ");
    bRec.style.marginTop = "10px";
    bRec.addEventListener("click", () => recordVoice(a));
    c.appendChild(bRec);
    body.appendChild(c);
  });

  // ---------- MENSAJE DEL TÚ DEL PASADO ----------
  body.appendChild(el("div", "sec-label", "MENSAJE DEL TÚ DEL PASADO"));
  const mp = el("div", "card");
  const saved = S.voiceNotes().filter((n) => n.pastMessage);
  mp.innerHTML = `<h4>UN MENSAJE QUE TE ENCUENTRA EN EL FUTURO</h4>
    <div class="sub">${saved.length ? "Guardado: se reproducirá en tu próximo hito." : "Grábalo hoy. BAYONA te lo reproducirá en tu próximo hito (subida de nivel)."}</div>`;
  const bM = el("button", "btn btn-gold btn-block", saved.length ? "GRABAR OTRO MENSAJE" : "GRABAR MENSAJE");
  bM.style.marginTop = "10px";
  bM.addEventListener("click", () => recordVoice("Mensaje del pasado", true));
  mp.appendChild(bM);
  body.appendChild(mp);

  // ---------- MODO FE (opcional, nunca automático) ----------
  body.appendChild(el("div", "sec-label", "MODO FE · OPCIONAL"));
  const faith = el("div", "card");
  faith.innerHTML = `<h4>REFLEXIÓN DE FE</h4>
    <div class="sub">Actívalo solo si lo quieres. Distingue siempre el <b>TEXTO BÍBLICO</b> de la <b>REFLEXIÓN GENERADA POR BAYONA</b>: BAYONA no es voz de Dios ni emite revelaciones.</div>`;
  const bF = el("button", "btn btn-block", "ABRIR REFLEXIÓN DE FE");
  bF.style.marginTop = "10px";
  bF.onclick = () => showModal(`
    <div class="cine-tag">MODO FE · ACTIVADO POR TI</div>
    <div class="cine-title" style="font-size:20px">SILENCIO Y CONFIANZA</div>
    <div class="sub" style="text-align:left"><b>TEXTO BÍBLICO</b> (Reina-Valera 1909, dominio público):<br>
    «Porque yo sé los pensamientos que pienso de vosotros, dice Jehová; pensamientos de paz, y no de mal, para daros el fin que esperáis.» — Jeremías 29:11</div>
    <div class="sub" style="text-align:left"><b>REFLEXIÓN GENERADA POR BAYONA:</b><br>
    Esperar también es una forma de trabajo. Hoy puedes cuidar lo que sí depende de ti: la serie, el agua, el descanso, la palabra amable.</div>
    <button class="btn btn-primary btn-block" id="f-ok">CERRAR</button>`, () => { $("#f-ok").onclick = hideModal; });
  faith.appendChild(bF);
  body.appendChild(faith);
};

function runBreath(name, min) {
  const body = openDrawer(name, "SALA MENTE · interfaz mínima");
  UI.W?.avatar.setAction("meditate");
  let left = min * 60;
  const wrap = el("div", "breath-wrap");
  wrap.innerHTML = `<div class="breath-circle big" id="breath-c">INHALA</div>
    <div class="mono" id="breath-t" style="font-size:20px">${min}:00</div>`;
  body.appendChild(wrap);
  const quit = el("button", "btn btn-block", "TERMINAR SESIÓN");
  body.appendChild(quit);
  const phases = ["INHALA", "MANTÉN", "EXHALA", "MANTÉN"];
  let pi = 0;
  const cycle = setInterval(() => {
    pi = (pi + 1) % 4;
    const c = $("#breath-c");
    if (c) {
      c.textContent = phases[pi];
      c.style.transform = phases[pi] === "INHALA" ? "scale(1.35)" : phases[pi] === "EXHALA" ? "scale(0.8)" : "scale(1.1)";
      c.style.transition = "transform 3.9s cubic-bezier(.4,0,.2,1)";
    }
  }, 4000);
  const tick = setInterval(() => {
    left--;
    const tt = $("#breath-t");
    if (tt) tt.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    if (left <= 0) end(true);
  }, 1000);
  function end(complete) {
    clearInterval(tick); clearInterval(cycle);
    const doneMin = complete ? min : Math.max(1, Math.round((min * 60 - left) / 60));
    // se premian los minutos REALES practicados (nunca más de los hechos)
    const r = S.logMind(doneMin);
    S.logJourney("mind", `${name} · ${doneMin} min${complete ? "" : " (terminada antes)"}`, r.xp);
    showModal(`
      <div class="cine-tag">SESIÓN MENTE REGISTRADA</div>
      <div class="cine-title">SILENCIO</div>
      <div class="cine-sub">${doneMin} minutos reales de ${esc(name.toLowerCase())}. La claridad también se entrena.</div>
      <div class="reward-line"><span>XP MENTE</span><b>+${r.xp}</b></div>
      <button class="btn btn-primary btn-block btn-big" id="m-ok">VOLVER</button>`,
      () => { $("#m-ok").onclick = () => { hideModal(); BUILDERS.mind(); }; });
    UI.W?.avatar.setAction("meditate");
  }
  quit.addEventListener("click", () => end(left <= 0));
}

/** Grabación REAL: se guarda en el dispositivo (máx. 3) con consentimiento explícito. */
function recordVoice(label, isMessage = false) {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    return toast("VOZ", "Grabación no disponible en este entorno.", "danger");
  }
  const start = () => navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const rec = new MediaRecorder(stream);
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((tk) => tk.stop()); // cámara/micro liberados al cerrar
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const fr = new FileReader();
      fr.onload = () => {
        S.addVoiceNote({ label, dataUrl: fr.result, pastMessage: isMessage });
        // honestidad: SOLO el mensaje del pasado se reproduce en el próximo hito (cinematics.js)
        toast(isMessage ? "MENSAJE DEL TÚ DEL PASADO" : "AUTODIÁLOGO",
          isMessage
            ? "Grabado y guardado en este dispositivo. Se reproducirá en tu próximo hito."
            : "Grabado y guardado en este dispositivo.",
          "gold");
      };
      fr.readAsDataURL(blob);
    };
    rec.start();
    toast("GRABANDO", "Di tu mensaje (4 s)…");
    setTimeout(() => rec.stop(), 4000);
  }).catch(() => toast("VOZ", "Permiso de micrófono denegado. Puedes activarlo en Configuración del navegador.", "danger"));

  if (isGranted("voice")) return start();
  showModal(`
    <div class="cine-tag">PERMISO DE VOZ</div>
    <div class="cine-title" style="font-size:20px">¿GRABAR CON TU VOZ?</div>
    <div class="sub">Las grabaciones son <b>privadas</b> y solo se guardan en este dispositivo (máximo 3). Puedes eliminarlas en MÁS → Privacidad.</div>
    <div style="display:flex;gap:8px">
      <button class="btn grow" id="v-no">AHORA NO</button>
      <button class="btn btn-primary grow" id="v-yes">PERMITIR Y GRABAR</button>
    </div>`, () => {
    $("#v-no").onclick = hideModal;
    $("#v-yes").onclick = () => {
      setConsent("voice", true);
      hideModal();
      start();
    };
  });
}
