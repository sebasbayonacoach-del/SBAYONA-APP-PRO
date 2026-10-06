// ============================================================
// BAYONA — ONBOARDING v2 · una pregunta por pantalla
// ------------------------------------------------------------
// Menos formulario, más app. La configuración avanzada (foto, medidas,
// permisos y preferencias) vive después en Perfil, de forma progresiva.
// ============================================================
import { S } from "./state.js";
import { esc } from "./i18n.js";
import {
  GOALS, EXPERIENCE, AVAILABILITY, EQUIPMENT, validateProfile,
} from "./personalization.js";

const GOAL_META = [
  ["COMPOSICIÓN CORPORAL", "◒", "Composición"],
  ["HIPERTROFIA MUSCULAR", "⬡", "Músculo"],
  ["FUERZA Y POTENCIA", "⚡", "Fuerza"],
  ["RESISTENCIA Y CONDICIÓN FÍSICA", "∞", "Resistencia"],
  ["MOVILIDAD Y FUNCIÓN", "↔", "Moverme mejor"],
  ["RENDIMIENTO DEPORTIVO", "◆", "Rendimiento"],
  ["BIENESTAR Y ADHERENCIA", "○", "Sentirme mejor"],
];

const AVAIL_META = [
  ["2 DÍAS/SEMANA", "2", "días"],
  ["3 DÍAS/SEMANA", "3", "días"],
  ["4-5 DÍAS/SEMANA", "4–5", "días"],
  ["CASI A DIARIO", "6+", "días"],
];

const EQUIP_META = [
  ["SIN EQUIPAMIENTO", "⌂", "En casa"],
  ["MANCUERNAS/BANDAS", "◫", "Equipo básico"],
  ["GIMNASIO COMPLETO", "▦", "Gimnasio"],
];

const DURATION_META = [
  ["15", "15", "min"],
  ["30", "30", "min"],
  ["45", "45", "min"],
  ["60", "60", "min"],
];

const TOTAL = 6;
const st = {
  step: 0,
  name: "",
  goal: "BIENESTAR Y ADHERENCIA",
  experience: EXPERIENCE[1],
  availability: AVAILABILITY[1],
  equipment: EQUIPMENT[1],
  sessionMinutes: "30",
};

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
};

function progress() {
  const pct = Math.round(((st.step + 1) / TOTAL) * 100);
  return `
    <div class="ob-top">
      <span>BAYONA</span>
      <span>${st.step + 1} / ${TOTAL}</span>
    </div>
    <div class="ob-progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <span class="sr-only">Paso ${st.step + 1} de ${TOTAL}</span>`;
}

function optionGrid(key, rows, label) {
  return `<div class="ob-choice-grid" role="group" aria-label="${esc(label)}">${rows.map(([value, icon, title]) => `
    <button type="button" class="ob-choice ${st[key] === value ? "on" : ""}" data-k="${key}" data-v="${esc(value)}" aria-pressed="${st[key] === value}">
      <span class="ob-choice-icon" aria-hidden="true">${icon}</span>
      <strong>${esc(title)}</strong>
    </button>`).join("")}</div>`;
}

function footer({ next = true, done = false, back = true } = {}) {
  return `<div class="ob-actions">
    ${back ? '<button class="ob-back" id="ob-back" type="button" aria-label="Volver">←</button>' : '<span></span>'}
    ${done
      ? '<button class="ob-primary" id="ob-done" type="button">ENTRAR A BAYONA</button>'
      : next ? '<button class="ob-primary" id="ob-next" type="button">CONTINUAR</button>' : ''}
  </div>`;
}

function view() {
  if (st.step === 0) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-symbol">◈</div>
      <div class="ob-kicker">TU APP · TU RITMO</div>
      <h2>¿Cómo te llamamos?</h2>
      <p>Solo para que BAYONA se sienta tuya.</p>
      <label class="sr-only" for="ob-name">Nombre o apodo</label>
      <input id="ob-name" maxlength="18" autocomplete="given-name" placeholder="Tu nombre o apodo" value="${esc(st.name)}" />
    </div>
    ${footer({ back:false })}`;

  if (st.step === 1) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">TU OBJETIVO</div>
      <h2>¿Qué quieres mejorar?</h2>
      <p>Elige una prioridad. Podrás cambiarla después.</p>
      ${optionGrid("goal", GOAL_META, "Objetivo principal")}
    </div>
    ${footer()}`;

  if (st.step === 2) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">TU SEMANA</div>
      <h2>¿Cuántos días encajan contigo?</h2>
      <p>El plan se adapta a tu vida, no al revés.</p>
      ${optionGrid("availability", AVAIL_META, "Días disponibles")}
    </div>
    ${footer()}`;

  if (st.step === 3) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">TU ESPACIO</div>
      <h2>¿Dónde vas a entrenar?</h2>
      <p>Esto cambia los ejercicios, no tu objetivo.</p>
      ${optionGrid("equipment", EQUIP_META, "Equipamiento disponible")}
    </div>
    ${footer()}`;

  if (st.step === 4) return `
    ${progress()}
    <div class="ob-stage">
      <div class="ob-kicker">TU TIEMPO</div>
      <h2>¿Cuánto dura una sesión ideal?</h2>
      <p>Una estimación. BAYONA ajusta la carga del día.</p>
      ${optionGrid("sessionMinutes", DURATION_META, "Duración aproximada")}
    </div>
    ${footer()}`;

  const goalLabel = GOAL_META.find(([v]) => v === st.goal)?.[2] || st.goal;
  const equipLabel = EQUIP_META.find(([v]) => v === st.equipment)?.[2] || st.equipment;
  return `
    ${progress()}
    <div class="ob-stage ob-finish">
      <div class="ob-ready-mark">✓</div>
      <div class="ob-kicker">LISTO</div>
      <h2>Tu espacio está preparado.</h2>
      <p>Hoy verás solo lo importante. El resto aparece cuando lo necesites.</p>
      <div class="ob-summary">
        <span><small>OBJETIVO</small><b>${esc(goalLabel)}</b></span>
        <span><small>RITMO</small><b>${esc(st.availability.replace("/SEMANA", ""))}</b></span>
        <span><small>ESPACIO</small><b>${esc(equipLabel)}</b></span>
        <span><small>SESIÓN</small><b>${esc(st.sessionMinutes)} min</b></span>
      </div>
    </div>
    ${footer({ done:true })}`;
}

function render(box) {
  box.innerHTML = view();
  const q = (s) => box.querySelector(s);

  box.querySelectorAll("[data-k]").forEach((button) => {
    button.onclick = () => {
      st[button.dataset.k] = button.dataset.v;
      render(box);
    };
  });

  const name = q("#ob-name");
  if (name) {
    name.oninput = () => { st.name = name.value; };
    name.onkeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        q("#ob-next")?.click();
      }
    };
  }

  q("#ob-next") && (q("#ob-next").onclick = () => {
    if (st.step === 0) st.name = q("#ob-name")?.value.trim() || "";
    st.step = Math.min(TOTAL - 1, st.step + 1);
    render(box);
  });

  q("#ob-back") && (q("#ob-back").onclick = () => {
    st.step = Math.max(0, st.step - 1);
    render(box);
  });

  q("#ob-done") && (q("#ob-done").onclick = () => {
    const profile = validateProfile({
      name: st.name || "TÚ",
      goal: st.goal,
      experience: st.experience,
      availability: st.availability,
      equipment: st.equipment,
      sessionMinutes: Number(st.sessionMinutes),
    });
    completar({
      ...profile,
      skin: 0,
      face: null,
      skinHex: null,
      avatar3d: null,
      consents: { vision:false, health:false, avatar_3d:false },
    });
  });

  (q("#ob-name") || q(".ob-choice.on") || q("#ob-done") || q("#ob-next"))?.focus?.({ preventScroll:true });
}

function completar(perfil) {
  S.onboard(perfil);
  S.addXP(25, "discipline");
  document.getElementById("ob-layer")?.remove();

  import("./ui.js").then(({ toast }) => {
    toast("TODO LISTO", perfil.name && perfil.name !== "TÚ" ? `Bienvenido, ${perfil.name}.` : "Tu día empieza aquí.", "gold");
  });

  // Primera llegada: orientación, no una sesión abierta sin contexto.
  import("./ui/shared.js").then(({ openSection }) => {
    setTimeout(() => openSection("hoy"), 180);
  });
}

// Conservado para compatibilidad/test; ya no se ofrece como atajo visual.
export function perfilRapido() {
  return {
    name: "TÚ",
    goal: "BIENESTAR Y ADHERENCIA",
    experience: EXPERIENCE[1],
    availability: AVAILABILITY[1],
    equipment: EQUIPMENT[1],
    sessionMinutes: 30,
    skin: 0,
    face: null,
    skinHex: null,
    avatar3d: null,
    consents: { vision:false, health:false, avatar_3d:false },
  };
}
export const G2_TOQUES_RAPIDO = null;

const css = `
#ob-layer{
  position:fixed;inset:0;z-index:120;display:grid;place-items:center;padding:18px;
  background:radial-gradient(circle at 50% 10%,rgba(255,106,0,.08),transparent 28%),#070809;
  font-family:var(--sans)
}
#ob-box{
  width:min(520px,100%);min-height:min(680px,calc(100dvh - 36px));display:grid;
  grid-template-rows:auto 1fr auto;padding:22px;border:1px solid #23272a;border-radius:26px;
  background:linear-gradient(160deg,rgba(255,255,255,.025),transparent 38%),#0b0d0e;
  color:#f3f1ec;box-shadow:0 32px 90px rgba(0,0,0,.48);overflow:auto
}
.ob-top{display:flex;justify-content:space-between;gap:12px;color:#6d7478;font:800 8px/1 var(--sans);letter-spacing:.16em}
.ob-top span:first-child{color:#d9d7d1}
.ob-progress{height:2px;margin-top:14px;background:#202427;overflow:hidden;border-radius:999px}
.ob-progress i{display:block;height:100%;background:#ff6a00;transition:width .28s ease}
.ob-stage{display:flex;flex-direction:column;justify-content:center;min-height:0;padding:34px 10px}
.ob-symbol{width:52px;height:52px;display:grid;place-items:center;margin-bottom:28px;border:1px solid #34393c;border-radius:16px;color:#ff7416;background:#111416;font-size:22px}
.ob-kicker{margin-bottom:10px;color:#ff7a1a;font:800 8px/1.3 var(--sans);letter-spacing:.16em}
#ob-box h2{max-width:430px;margin:0;color:#f5f3ee;font:650 clamp(34px,8vw,48px)/.98 var(--serif);letter-spacing:-.045em}
#ob-box p{max-width:410px;margin:14px 0 0;color:#7f888c;font:450 13px/1.55 var(--sans)}
#ob-name{width:100%;margin-top:30px;padding:18px 4px;border:0;border-bottom:1px solid #34393c;background:transparent;color:#fff;font:600 24px/1 var(--serif);outline:none}
#ob-name:focus{border-color:#ff6a00}
#ob-name::placeholder{color:#4f565a}
.ob-choice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:30px}
.ob-choice{min-height:96px;padding:14px;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:14px;border:1px solid #24292c;border-radius:16px;background:#0f1112;color:#aeb4b7;text-align:left;cursor:pointer;transition:.18s ease}
.ob-choice:hover,.ob-choice:focus-visible{border-color:#654023;outline:none;transform:translateY(-1px)}
.ob-choice.on{border-color:#a64d1b;background:linear-gradient(145deg,rgba(255,106,0,.10),transparent 55%),#111315;color:#fff;box-shadow:inset 2px 0 #ff6a00}
.ob-choice-icon{color:#ff7416;font:600 21px/1 var(--sans)}
.ob-choice strong{font:650 13px/1.2 var(--sans)}
.ob-actions{display:grid;grid-template-columns:48px 1fr;gap:10px;align-items:center;padding-top:16px;border-top:1px solid #1f2325}
.ob-actions>span{width:48px}
.ob-back,.ob-primary{min-height:48px;border-radius:12px;cursor:pointer}
.ob-back{border:1px solid #292e31;background:#0d0f10;color:#8b9397;font-size:17px}
.ob-primary{border:1px solid #ff6a00;background:#ff6a00;color:#08090a;font:850 9px/1 var(--sans);letter-spacing:.14em}
.ob-ready-mark{width:58px;height:58px;display:grid;place-items:center;margin-bottom:24px;border-radius:50%;background:#ff6a00;color:#08090a;font-size:24px;font-weight:900}
.ob-summary{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin-top:28px;border:1px solid #24282a;border-radius:14px;overflow:hidden;background:#24282a}
.ob-summary span{display:grid;gap:7px;padding:13px;background:#0e1011}
.ob-summary small{color:#626a6e;font:750 7px/1 var(--sans);letter-spacing:.12em}
.ob-summary b{color:#e9e7e2;font:650 11px/1.25 var(--sans)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
@media(max-width:620px){
  #ob-layer{padding:0;place-items:stretch}
  #ob-box{width:100%;min-height:100dvh;border:0;border-radius:0;padding:18px 16px 16px}
  .ob-stage{padding:28px 2px 20px}
  #ob-box h2{font-size:clamp(34px,11vw,44px)}
  .ob-choice-grid{margin-top:24px;gap:8px}
  .ob-choice{min-height:84px;padding:12px}
  .ob-summary{margin-top:22px}
}
`;

function boot(retries = 20) {
  if (document.getElementById("ob-layer")) return;
  if (!S.data) {
    if (retries > 0) setTimeout(() => boot(retries - 1), 250);
    return;
  }
  if (S.data.profile?.onboarded) return;

  // El mundo profesional no comparte onboarding con el usuario final.
  if (document.body.dataset.entryRole === "coach") return;

  if (!document.body.classList.contains("entered")) {
    window.addEventListener("bayona:entered", () => boot(retries), { once:true });
    return;
  }
  if (document.body.dataset.entryRole === "coach") return;

  if (!document.getElementById("ob-v2-style")) {
    const style = el(`<style id="ob-v2-style">${css}</style>`);
    document.head.appendChild(style);
  }
  const layer = el('<div id="ob-layer" role="dialog" aria-modal="true" aria-label="Configurar BAYONA"><div id="ob-box"></div></div>');
  layer.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...layer.querySelectorAll("button,input,[tabindex]")].filter((n) => !n.disabled && n.tabIndex >= 0 && n.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  document.body.appendChild(layer);
  render(layer.querySelector("#ob-box"));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}

export { st as __obState, view as __obView };
