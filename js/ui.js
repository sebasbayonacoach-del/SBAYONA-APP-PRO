// ============================================================
// BAYONA — UI LAYER (shell): panel lateral, misión, HUD mínimo
// WORLD-FIRST UI: el avatar es primero y se mueve libre.
// TODO el contenido vive en el PANEL LATERAL (#drawer):
// misión del día, métricas vivas, nivel y mundos.
// ============================================================
import { S, on } from "./state.js";
import { previewWorkoutXP, workoutCompleteReward } from "./rewards.js";
import { esc, fmtInt, t } from "./i18n.js";
import { planDelDia } from "./hoy.js";
import { contextoDelDia } from "./contexto.js";
import {
  UI, $, el, elT, BUILDERS, enterHome, closeDrawer, reopenPanel, openSection,
  showModal, hideModal, toast, xpBurst, wireModalLayer,
} from "./ui/shared.js";
import { showDayRecap, showLevelUp, showPR } from "./ui/cinematics.js";

// mundos (imports con efecto: registran sus BUILDERS)
import "./ui/hoy.js";
import "./ui/trabajo.js";
import "./ui/training.js";
import "./ui/proplayer-library.js";
import "./ui/nutrition.js";
import "./ui/recovery.js";
import "./ui/mind.js";
import "./ui/plan.js";
import "./ui/coachos.js";
import "./ui/armory.js";
import "./ui/progress.js";
import "./ui/core.js";
import "./ui/more.js";
import "./ui/personal.js";
import "./ui/appearance.js";
import "./ui/first-run-tour.js";
import "./sync/account.js";
// CENTRO · gestión del gimnasio (socios, cuotas, agenda, acceso, portal, informes)
import "./gym/store.js";
import "./ui/centro.js";
import "./ui/cuotas.js";
import "./ui/agenda.js";
import "./ui/acceso.js";
import "./ui/portal.js";
import "./ui/informes.js";
// TECLADO · paleta de comandos (⌘K / Ctrl+K) y atajos directos
import { installPaleta } from "./ui/command.js";

export function initUI(world) {
  UI.W = world;
  wireHud();
  installPaleta();
  wireModalLayer();
  on("xp", ({ amount }) => { refreshHud(); xpBurst(amount); });
  on("wallet", refreshHud);
  on("today", refreshHud);
  on("session", refreshHud);
  on("levelup", ({ lvl }) => showLevelUp(lvl));
  on("itemUnlock", ({ id }) => toast("OBJETO DESBLOQUEADO", S.item(id)?.name || id, "gold"));
  on("outfit", refreshHud);
  on("set", ({ pr, exKey }) => { if (pr) showPR(exKey, pr); });

  refreshHud();
  enterHome(true);
  // reanudación de sesión persistente (sobrevive a recargas)
  const act = S.getActiveSession();
  if (act && act.status !== "completada" && act.status !== "abandonada") {
    UI.session = act;
    toast("SESIÓN GUARDADA", `Tienes «${act.name}» ${act.status}. Reanúdala en ENTRENAR.`);
  }
}

// ============================================================
// HUD MÍNIMO (barra superior) — null-safe: el detalle vive en el panel
// ============================================================
function setTxt(sel, v) { const n = $(sel); if (n) n.textContent = v; }
function setW(sel, pct) { const n = $(sel); if (n) n.style.width = `${Math.round(pct)}%`; }

export function refreshHud() {
  const L = S.level();
  setTxt("#lvl-num", L.lvl);
  setTxt("#rank-name", S.rank());
  setW("#xp-fill", (L.cur / L.need) * 100);
  setTxt("#xp-txt", `${fmtInt(L.cur)} / ${fmtInt(L.need)} XP`);
  setTxt("#cur-points", fmtInt(S.data.points));
  setTxt("#cur-credits", fmtInt(S.data.credits));

  // métricas del panel (solo existen al pintar INICIO)
  const rd = S.readiness();
  setTxt("#v-readiness", rd == null ? "—" : rd + "%");
  setW("#b-readiness", rd ?? 0);
  const mrd = $("#m-readiness");
  if (mrd) mrd.title = rd == null ? t("state.notLogged") : "Preparación estimada con tus registros";
  setTxt("#v-streak", S.data.streak + " D");
  setTxt("#v-steps", fmtInt(S.data.today.steps));
  setW("#b-steps", Math.min(100, Math.round((S.data.today.steps / 10000) * 100)));
  setTxt("#v-water", fmtInt(S.data.today.water) + " ml");
  setW("#b-water", S.hydrationPct());
  setTxt("#home-level", `NIVEL ${L.lvl} · ${S.rank()}`);
  setW("#home-xpbar", (L.cur / L.need) * 100);
  setTxt("#home-xp", `${fmtInt(L.cur)} / ${fmtInt(L.need)} XP`);
  setTxt("#home-points", fmtInt(S.data.points));
  setTxt("#home-credits", fmtInt(S.data.credits));
  updateMissionCard();
}

function updateMissionCard() {
  const mc = $("#mc-title");
  if (!mc) return; // el panel no está en INICIO: nada que actualizar
  const t2 = S.data.today;
  const day = S.dayNumber();
  const act = UI.session || S.getActiveSession();
  const plan = planDelDia(S);
  const ctx = contextoDelDia({
    hora: new Date().getHours(),
    nombre: S.data.profile.name,
    siguiente: plan.siguiente,
    sesionEnCurso: !!(act && act.status !== "completada" && act.status !== "abandonada"),
    trained: t2.trained,
  });
  setTxt("#mc-saludo", ctx.saludo);
  setTxt("#mc-tag", `DÍA ${day} · ${ctx.etiqueta}`);
  const cta = $("#mc-cta");

  if (act && act.status !== "completada" && act.status !== "abandonada") {
    mc.textContent = act.name;
    setTxt("#mc-sub", `Sesión ${act.status} · ${act.logged}/${act.plannedSets} series · ${fmtInt(act.xpAcc || 0)} XP`);
    cta.textContent = act.status === "pausada" ? "REANUDAR SESIÓN" : "CONTINUAR SESIÓN";
    cta.dataset.mode = "resume";
    return;
  }
  cta.dataset.mode = "";
  const w = S.todayWorkout();
  const dayDone = t2.trained && t2.water >= 1500 && t2.mobility;
  setTxt("#mc-hoy", `VER MI DÍA · ${plan.hechos}/${plan.total}`);
  if (dayDone) {
    mc.textContent = "DÍA COMPLETADO";
    setTxt("#mc-sub", "Has cerrado la misión diaria. El personaje descansa contigo.");
    cta.textContent = "RESUMEN DEL DÍA";
  } else if (w) {
    mc.textContent = w.name;
    const bonus = workoutCompleteReward({ minutes: w.min, loggedSets: 0, plannedSets: 0 });
    const bits = [];
    if (!t2.trained) bits.push(`${w.min} min · ~${fmtInt(previewWorkoutXP(w).xp)} XP + ${bonus.xp} XP de cierre`);
    if (t2.trained) bits.push("Sesión completada hoy ✓");
    if (t2.water < 1500) bits.push(`hidratación ${fmtInt(t2.water)}/1.500 ml`);
    if (!t2.mobility) bits.push("movilidad pendiente");
    setTxt("#mc-sub", bits.join(" · "));
    cta.textContent = t2.trained ? "VER PROGRESO" : "EMPEZAR SESIÓN DE HOY";
  } else {
    mc.textContent = "DÍA DE RECUPERACIÓN";
    setTxt("#mc-sub", "La disciplina también es parar. Movilidad + respiración.");
    cta.textContent = "FLUJO DE RECUPERACIÓN";
  }
}

// ============================================================
// PANEL · INICIO — misión + métricas + nivel (todo en el panel lateral)
// ============================================================
BUILDERS.home = (body) => {
  body = body || $("#drawer-body");
  body.textContent = "";

  // ---- MISIÓN (héroe) ----
  const mission = el("div", "");
  mission.id = "mission-card";
  mission.innerHTML = `
    <div class="mc-saludo" id="mc-saludo"></div>
    <div class="mc-tag mono" id="mc-tag">DÍA 1 · MISIÓN</div>
    <div class="mc-title" id="mc-title">EMPEZAR</div>
    <div class="mc-sub" id="mc-sub">Tu historia empieza hoy.</div>
    <button class="btn btn-primary" id="mc-hoy">VER MI DÍA</button>
    <button class="btn btn-ghost" id="mc-cta">EMPEZAR MI CAMINO</button>`;
  body.appendChild(mission);

  // ---- MÉTRICAS VIVAS ----
  body.appendChild(el("div", "sec-label", "EN VIVO"));
  const grid = el("div", "metrics");
  grid.innerHTML = `
    <button class="metric" id="m-readiness">
      <span class="m-k">PREPARACIÓN</span>
      <span class="m-v mono" id="v-readiness">--%</span>
      <span class="m-bar"><i id="b-readiness"></i></span>
    </button>
    <button class="metric" id="m-streak">
      <span class="m-k">RACHA</span>
      <span class="m-v mono" id="v-streak">0 D</span>
    </button>
    <button class="metric" id="m-steps">
      <span class="m-k">PASOS</span>
      <span class="m-v mono" id="v-steps">0</span>
      <span class="m-bar"><i id="b-steps"></i></span>
    </button>
    <button class="metric" id="m-hydration">
      <span class="m-k">HIDRATACIÓN</span>
      <span class="m-v mono" id="v-water">0 ml</span>
      <span class="m-bar"><i id="b-water"></i></span>
    </button>`;
  body.appendChild(grid);

  // ---- NIVEL & MONEDA ----
  body.appendChild(el("div", "sec-label", "PROGRESO"));
  const lv = el("div", "card");
  lv.innerHTML = `
    <div class="card-row">
      <h4 id="home-level">NIVEL 1 · INICIADO</h4>
      <span class="pill gold">◆ <span id="home-points">0</span> · ✦ <span id="home-credits">0</span></span>
    </div>
    <div class="mbar" style="margin-top:12px"><i id="home-xpbar"></i></div>
    <div class="sub mono" id="home-xp" style="font-size:10px;letter-spacing:.12em">0 / 250 XP</div>`;
  body.appendChild(lv);

  refreshHud();
};

// ============================================================
// WIRING · por delegación (el panel se repinta: los handlers no se pierden)
// ============================================================
function missionCTA() {
  const mode = $("#mc-cta")?.dataset.mode;
  if (mode === "resume") return UI.actions.resumeSession?.();
  const t2 = S.data.today;
  if (t2.trained && t2.water >= 1500 && t2.mobility) return showDayRecap();
  const w = S.todayWorkout();
  if (w && !t2.trained) return UI.actions.openTraining?.(w.id);
  if (w) return openSection("progress");
  return UI.actions.openTraining?.("mobility_flow");
}

const HOT = {
  "mc-cta": missionCTA,
  "mc-hoy": () => openSection("hoy"),
  "m-readiness": () => openSection("recovery"),
  "m-streak": () => openSection("more"),
  "m-steps": quickSteps,
  "m-hydration": () => {
    const r = S.drink(250);
    toast("HIDRATACIÓN REGISTRADA", `+250 ml · +${r.xp} XP`);
    UI.W?.avatar.setAction("drink");
    setTimeout(() => UI.W?.avatar.setAction("idle"), 2200);
  },
};

function wireHud() {
  // delegación: sobrevive a repintados del panel
  document.addEventListener("click", (e) => {
    const node = e.target.closest("[id]");
    if (node && HOT[node.id]) { HOT[node.id](); return; }
  });
  $("#level-chip").addEventListener("click", () => openSection("progress"));
  $("#mode-chip").addEventListener("click", () => {
    import("./ui/appearance.js").then(({ setMode, getAppearance }) => {
      const next = getAppearance().mode === "cine" ? "noche" : "cine";
      setMode(next);
    });
  });
  $("#drawer-close").addEventListener("click", () => {
    const d = $("#drawer");
    if (d.classList.contains("open")) closeDrawer();
    else reopenPanel();
  });
  document.querySelectorAll(".rail-btn").forEach((b) =>
    b.addEventListener("click", () => {
      const go = b.dataset.go;
      if (go === "social") return toast("COMUNIDAD", "Fuera de esta versión: sin funciones sociales hasta estabilizar el recorrido principal.");
      openSection(go === "journey" ? "progress" : go);
    })
  );
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      const nav = b.dataset.nav;
      if (nav === "home") return enterHome();
      openSection(nav);
    })
  );
}

/** Registrar caminata/pasos: el usuario indica lo que REALMENTE ha hecho. */
function quickSteps() {
  showModal(`
    <div class="cine-tag">REGISTRAR MOVIMIENTO REAL</div>
    <div class="cine-title" style="font-size:22px">¿CUÁNTO HAS CAMINADO?</div>
    <div class="cine-sub">Solo lo que hayas hecho de verdad. BAYONA no inventa pasos.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn grow" data-n="1000">1.000</button>
      <button class="btn grow" data-n="3000">3.000</button>
      <button class="btn grow" data-n="6000">6.000</button>
    </div>
    <div style="height:10px"></div>
    <div style="display:flex;gap:8px">
      <input id="qs-custom" type="number" inputmode="numeric" min="1" max="40000" placeholder="otros…" style="flex:1" />
      <button class="btn btn-primary" id="qs-ok">REGISTRAR</button>
    </div>
    <div style="height:8px"></div>
    <button class="btn btn-block" id="qs-cancel">CANCELAR</button>
  `, () => {
    const doLog = (n) => {
      if (!n || n < 1) return;
      const r = S.addSteps(Math.min(40000, Math.round(n)));
      hideModal();
      toast("MOVIMIENTO REGISTRADO", `+${fmtInt(n)} pasos · +${r.xp} XP`);
      UI.W?.avatar.setAction("walk");
      setTimeout(() => UI.W?.avatar.setAction("idle"), 2500);
    };
    $("#modal-box").querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => doLog(+b.dataset.n)));
    $("#qs-ok").onclick = () => doLog(+$("#qs-custom").value);
    $("#qs-cancel").onclick = hideModal;
  });
}

export { toast };
