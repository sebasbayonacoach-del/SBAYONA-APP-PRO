// ============================================================
// BAYONA — UI/TRABAJO · productividad saludable (escritorio/foco)
// ------------------------------------------------------------
// «BAYONA también me cuida mientras trabajo»: bloques de foco 25/5,
// pausas activas de escritorio, checklist de postura, respiración e
// hidratación. Todo con registro REAL y tope sano diario (RULES.work).
// ============================================================
import { S, on } from "../state.js";
import { RULES } from "../rewards.js";
import { esc, fmtInt } from "../i18n.js";
import {
  UI, $, el, elT, openSection, showModal, hideModal, toast, BUILDERS,
} from "./shared.js";

const FOCO_MIN = 25;
const PAUSAS = [
  { k: "CUELLO", txt: "Gira la cabeza suavemente a cada lado · 20 s. Sin forzar." },
  { k: "HOMBROS", txt: "10 rotaciones de hombros hacia atrás. Respira mientras lo haces." },
  { k: "ESPALDA", txt: "Ponte de pie, manos en la cadera, extensión suave · 20 s." },
];

let focoInt = null;
let focoEnd = 0;

export function renderTrabajo(body) {
  body = body || $("#drawer-body");
  body.textContent = "";
  const t = S.data.today;

  const head = el("div", "card");
  head.innerHTML = `
    <div class="card-row">
      <span class="pill gold">EQUILIBRIO · ${esc(t.workBlocks || 0)}/${RULES.work.foco.cap} BLOQUES</span>
      <span class="pill blue">${esc(t.activePauses || 0)}/${RULES.work.pausa.cap} PAUSAS</span>
    </div>
    <div class="mc-title" style="margin-top:10px">TRABAJA SIN RENDIRTE LA SALUD</div>
    <div class="mc-sub">Foco profundo con pausas reales. Tu espalda, tus ojos y tu cabeza también entrenan hoy.</div>`;
  body.appendChild(head);

  // ---- BLOQUE DE FOCO ----
  const foco = el("div", "card");
  foco.innerHTML = `
    <div class="sec-label" style="margin-top:0">BLOQUE DE FOCO · ${FOCO_MIN} MIN</div>
    <div class="mc-sub">Trabajo concentrado sin interrupciones. Al terminar: pausa activa (bono con tope de ${RULES.work.foco.cap}/día).</div>
    <div class="foco-timer mono" id="foco-clock">25:00</div>`;
  const fb = el("button", "btn btn-primary btn-block", focoInt ? "BLOQUE EN CURSO…" : "EMPEZAR BLOQUE DE FOCO");
  if (focoInt) fb.disabled = true;
  fb.addEventListener("click", () => { startFoco(); renderTrabajo(body); });
  foco.appendChild(fb);
  if (focoInt) {
    const stop = el("button", "btn btn-block", "TERMINAR ANTES DE TIEMPO (SIN BONO)");
    stop.addEventListener("click", () => {
      clearInterval(focoInt); focoInt = null;
      toast("BLOQUE CORTADO", "Guardamos el intento sin bono: la constancia se construye completa.");
      renderTrabajo(body);
    });
    foco.appendChild(stop);
  }
  body.appendChild(foco);

  // ---- PAUSA ACTIVA ----
  const pausa = el("div", "card");
  pausa.innerHTML = `
    <div class="sec-label" style="margin-top:0">PAUSA ACTIVA · 3 MIN</div>
    <div class="mc-sub">Tres movimientos de escritorio. Te pediremos que lo confirmes: BAYONA no registra lo que no haces.</div>`;
  const pb = el("button", "btn btn-block", "VER LOS 3 MOVIMIENTOS");
  pb.addEventListener("click", () => pausaModal(body));
  pausa.appendChild(pb);
  body.appendChild(pausa);

  // ---- POSTURA ----
  const post = el("div", "card");
  post.innerHTML = `
    <div class="sec-label" style="margin-top:0">CHECKLIST DE POSTURA · ${esc(t.postureChecks || 0)} HOY</div>
    <div class="mc-sub">Cuatro puntos, diez segundos. Sin XP: esto es registro honesto, no un juego.</div>`;
  const qb = el("button", "btn btn-block", "REVISAR MI POSTURA");
  qb.addEventListener("click", () => posturaModal(body));
  post.appendChild(qb);
  body.appendChild(post);

  // ---- ACCESOS DIRECTOS ----
  const row = el("div", "card");
  row.innerHTML = `<div class="sec-label" style="margin-top:0">MANTENTE EN FORMA</div>`;
  const b1 = el("button", "btn btn-block", "RESPIRACIÓN DE FOCO · 1 MIN");
  b1.addEventListener("click", () => { S.logMind(1); toast("RESPIRACIÓN REGISTRADA", "1 min de descanso consciente · +6 XP"); openSection("mind"); });
  const b2 = el("button", "btn btn-block", "+250 ML DE AGUA (LO QUE BEBES)");
  b2.addEventListener("click", () => {
    const r = S.drink(250);
    toast("HIDRATACIÓN REGISTRADA", `+250 ml · +${r.xp} XP`);
    renderTrabajo(body);
  });
  row.append(b1, b2);
  body.appendChild(row);
}

// ---------- BLOQUE DE FOCO (temporizador real) ----------
function startFoco() {
  if (focoInt) return;
  focoEnd = Date.now() + FOCO_MIN * 60000;
  focoInt = setInterval(() => {
    const left = Math.max(0, focoEnd - Date.now());
    const clock = $("#foco-clock");
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    if (clock) clock.textContent = `${mm}:${ss}`;
    if (left <= 0) {
      clearInterval(focoInt); focoInt = null;
      const r = S.logFocusBlock();
      if (r) toast("BLOQUE DE FOCO COMPLETADO", `${r.text} · +${r.xp} XP. Ahora, pausa activa.`);
      else toast("BLOQUE COMPLETADO", "Ya has llegado al tope sano de hoy (6 bloques). Sigue a tu ritmo.");
      UI.W?.avatar.setAction("wave");
      setTimeout(() => UI.W?.avatar.setAction("idle"), 1800);
    }
  }, 500);
}

// ---------- PAUSA ACTIVA (confirmación honesta) ----------
function pausaModal(body) {
  showModal(`
    <div class="cine-tag">PAUSA ACTIVA</div>
    <div class="cine-title" style="font-size:22px">3 MOVIMIENTOS · 3 MIN</div>
    ${PAUSAS.map((p) => `<div class="kv" style="margin-top:10px"><span class="k">${p.k}</span><span class="v" style="font-family:inherit">${p.txt}</span></div>`).join("")}
    <div style="height:12px"></div>
    <button class="btn btn-primary btn-block" id="pz-ok">LOS HECHO · REGISTRAR PAUSA</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="pz-no">TODAVÍA NO</button>
  `, () => {
    $("#pz-no").onclick = hideModal;
    $("#pz-ok").onclick = () => {
      hideModal();
      const r = S.logActivePause();
      if (r) toast("PAUSA REGISTRADA", `${r.text} · +${r.xp} XP`);
      else toast("PAUSA REGISTRADA", "Tope sano de hoy alcanzado (8 pausas): el premio ya está completo.");
      UI.W?.avatar.setAction("stretch");
      setTimeout(() => UI.W?.avatar.setAction("idle"), 2500);
      renderTrabajo(body);
    };
  });
}

// ---------- POSTURA (checklist, sin XP) ----------
function posturaModal(body) {
  const items = [
    "La pantalla está a la altura de mis ojos",
    "La espalda apoya en el respaldo",
    "Los hombros están sueltos (no encogidos)",
    "Los pies apoyan en el suelo",
  ];
  showModal(`
    <div class="cine-tag">POSTURA DE ESCRITORIO</div>
    <div class="cine-title" style="font-size:22px">REVISA EN 10 SEGUNDOS</div>
    ${items.map((x, i) => `<label class="checkin-row" style="flex-direction:row;align-items:center;gap:10px;margin-top:10px"><input type="checkbox" id="pt-${i}" style="width:22px;height:22px" /><span style="font-family:inherit;font-size:13px;letter-spacing:0">${x}</span></label>`).join("")}
    <div style="height:12px"></div>
    <button class="btn btn-primary btn-block" id="pt-save">GUARDAR CHECKLIST</button>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="pt-cancel">CANCELAR</button>
  `, () => {
    $("#pt-cancel").onclick = hideModal;
    $("#pt-save").onclick = () => {
      const done = items.filter((_, i) => $("#pt-" + i).checked).length;
      hideModal();
      S.logPostureCheck();
      toast("POSTURA REGISTRADA", `${done}/4 puntos bien ahora mismo. Ajusta lo que haga falta.`);
      renderTrabajo(body);
    };
  });
}

BUILDERS.trabajo = (body) => renderTrabajo(body);
on("today", () => {
  const active = document.querySelector(".rail-btn.active")?.dataset.go;
  if (active === "trabajo" && $("#drawer")?.classList.contains("open")) renderTrabajo();
});
